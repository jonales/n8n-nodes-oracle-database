import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import oracledb, { BindParameters, Connection } from 'oracledb';
import { OracleConnectionPool } from './core';

// Constante para DB_TYPE_VECTOR (Oracle 23ai+)
const DB_TYPE_VECTOR = (oracledb as any).DB_TYPE_VECTOR || 2023;

// Métricas de distância suportadas pelo Oracle AI Vector Search
// (equivalentes aos operadores <=>, <#> e <-> do pgvector — ver Cap. 4 da pesquisa)
const ALLOWED_DISTANCE_METRICS = ['COSINE', 'EUCLIDEAN', 'DOT', 'MANHATTAN', 'HAMMING'] as const;
type DistanceMetric = (typeof ALLOWED_DISTANCE_METRICS)[number];

const ALLOWED_INDEX_TYPES = ['HNSW', 'IVF'] as const;
type IndexType = (typeof ALLOWED_INDEX_TYPES)[number];

const IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{0,127}$/;
// Path de metadado tipo "source" ou "user.role" — apenas segmentos alfanuméricos/underscore
const METADATA_KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/**
 * Valida um identificador (nome de tabela/índice) antes de ser interpolado em SQL.
 * Toda operação que monta SQL dinâmico com o nome da coleção PRECISA passar por aqui —
 * sem isso, `collectionName` vira um vetor de SQL injection (ex: "docs; DROP TABLE x--").
 */
function validateIdentifier(name: string, label = 'Collection Name'): string {
  if (!name || !IDENTIFIER_REGEX.test(name)) {
    throw new Error(
      `${label} inválido: deve começar com letra e conter apenas letras, números e underscore (máx. 128 caracteres). Valor recebido: "${name}"`,
    );
  }
  return name;
}

function validateDistanceMetric(metric: string): DistanceMetric {
  const upper = (metric || 'COSINE').toUpperCase();
  if (!ALLOWED_DISTANCE_METRICS.includes(upper as DistanceMetric)) {
    throw new Error(
      `Métrica de distância inválida: "${metric}". Valores aceitos: ${ALLOWED_DISTANCE_METRICS.join(', ')}`,
    );
  }
  return upper as DistanceMetric;
}

function validateIndexType(type: string): IndexType {
  const upper = (type || 'HNSW').toUpperCase();
  if (!ALLOWED_INDEX_TYPES.includes(upper as IndexType)) {
    throw new Error(`Tipo de índice inválido: "${type}". Valores aceitos: ${ALLOWED_INDEX_TYPES.join(', ')}`);
  }
  return upper as IndexType;
}

/**
 * Constrói uma cláusula WHERE de filtro de metadados equivalente ao `filter JSONB` do
 * Supabase (Cap. 7 da pesquisa: `WHERE metadata @> filter`). O Oracle não tem operador de
 * "contains" direto para JSON como o Postgres, então aqui fazemos igualdade por chave
 * usando JSON_VALUE, o que cobre o caso de uso mais comum (filtro por campos simples de
 * metadado, ex: { "source": "manual.pdf" }).
 */
function buildMetadataFilter(filter: Record<string, unknown> | undefined): {
  clause: string;
  binds: Record<string, unknown>;
} {
  if (!filter || Object.keys(filter).length === 0) {
    return { clause: '', binds: {} };
  }

  const clauses: string[] = [];
  const binds: Record<string, unknown> = {};

  Object.entries(filter).forEach(([key, value], index) => {
    if (!METADATA_KEY_REGEX.test(key)) {
      throw new Error(
        `Chave de filtro de metadado inválida: "${key}". Use apenas letras, números, underscore e ponto (para paths aninhados).`,
      );
    }
    if (value === null || value === undefined) {
      return;
    }
    const bindName = `fval${index}`;
    const jsonPath = `$.${key.split('.').map(seg => `"${seg}"`).join('.')}`;
    clauses.push(`JSON_VALUE(metadata, '${jsonPath}') = :${bindName}`);
    binds[bindName] = typeof value === 'object' ? JSON.stringify(value) : value;
  });

  if (clauses.length === 0) {
    return { clause: '', binds: {} };
  }

  return { clause: `AND ${clauses.join(' AND ')}`, binds };
}

interface DocumentInput {
  id: string;
  content: string;
  metadata: string;
  embedding: number[];
}

function parseDocumentFromInput(
  json: Record<string, unknown>,
  fallbackId: string,
  extraMetadata: Record<string, unknown>,
): DocumentInput {
  const id = json.id != null ? String(json.id) : fallbackId;
  const content = json.content != null ? String(json.content) : '';
  const embedding = (json.embedding ?? json.vector) as unknown;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Embedding/vector é obrigatório e deve ser um array');
  }
  if (embedding.some(val => typeof val !== 'number' || Number.isNaN(val))) {
    throw new Error('Embedding deve conter apenas números válidos');
  }

  const metadataObj =
    json.metadata && typeof json.metadata === 'object' ? (json.metadata as Record<string, unknown>) : {};

  const metadata = JSON.stringify({ ...extraMetadata, ...metadataObj });

  return { id, content, metadata, embedding: embedding as number[] };
}

export class OracleVectorStoreOperations {
  private executeFunctions: IExecuteFunctions;

  constructor(executeFunctions: IExecuteFunctions) {
    this.executeFunctions = executeFunctions;
  }

  // ──────────────────────────────────────────────────────────────────────
  // SETUP COLLECTION
  // Cap. 2 (estrutura de tabela) + Cap. 5/14.4 (índices HNSW/IVF via DBMS_VECTOR)
  // ──────────────────────────────────────────────────────────────────────
  async setupCollection(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const vectorDimension = this.executeFunctions.getNodeParameter('vectorDimension', 0) as number;
    const indexType = validateIndexType(
      this.executeFunctions.getNodeParameter('indexType', 0, 'HNSW') as string,
    );
    const distanceMetric = validateDistanceMetric(
      this.executeFunctions.getNodeParameter('distanceMetric', 0, 'COSINE') as string,
    );
    const targetAccuracy = Math.max(
      1,
      Math.min(100, this.executeFunctions.getNodeParameter('targetAccuracy', 0, 95) as number),
    );

    if (vectorDimension <= 0 || vectorDimension > 65536) {
      throw new Error('Dimensão do vetor deve estar entre 1 e 65536');
    }

    try {
      const versionResult = await connection.execute(`SELECT version FROM v$instance`);
      const versionString = (versionResult.rows?.[0] as any)?.[0] as string;
      const majorVersion = parseInt(versionString.split('.')[0], 10);

      if (majorVersion < 23) {
        throw new Error(
          `Oracle Vector Store requer Oracle Database 23ai ou superior. Versão atual: ${versionString}`,
        );
      }

      const createTableSQL = `
        DECLARE
          table_exists NUMBER;
        BEGIN
          SELECT COUNT(*) INTO table_exists FROM user_tables WHERE table_name = UPPER('${collectionName}');
          IF table_exists = 0 THEN
            EXECUTE IMMEDIATE '
              CREATE TABLE ${collectionName} (
                id VARCHAR2(255) PRIMARY KEY,
                content CLOB NOT NULL,
                embedding VECTOR(${vectorDimension}, FLOAT32) NOT NULL,
                metadata CLOB CHECK (metadata IS JSON),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            ';
          END IF;
        END;
      `;
      await connection.execute(createTableSQL);

      // Índice vetorial via DBMS_VECTOR.CREATE_INDEX — suporta HNSW (in-memory, alta
      // performance de leitura) e IVF (neighbor partitions, melhor para datasets muito
      // grandes que não cabem em memória). Ver Cap. 5 e 14.4 da pesquisa.
      const indexName = `idx_${collectionName}_embedding`;
      const indexParams =
        indexType === 'HNSW'
          ? `JSON_OBJECT('type' VALUE 'HNSW', 'distance' VALUE '${distanceMetric}', 'target_accuracy' VALUE ${targetAccuracy})`
          : `JSON_OBJECT('type' VALUE 'IVF', 'distance' VALUE '${distanceMetric}', 'target_accuracy' VALUE ${targetAccuracy})`;

      const createIndexSQL = `
        DECLARE
          index_exists NUMBER;
        BEGIN
          SELECT COUNT(*) INTO index_exists FROM user_indexes WHERE index_name = UPPER('${indexName}');
          IF index_exists = 0 THEN
            DBMS_VECTOR.CREATE_INDEX(
              idx_name    => '${indexName}',
              table_name  => '${collectionName}',
              column_name => 'embedding',
              idx_type    => '${indexType}',
              params      => ${indexParams}
            );
          END IF;
        END;
      `;
      await connection.execute(createIndexSQL);
      await connection.commit();

      return this.executeFunctions.helpers.returnJsonArray([
        {
          success: true,
          message: `Coleção ${collectionName} configurada com sucesso`,
          collectionName,
          vectorDimension,
          indexType,
          distanceMetric,
          targetAccuracy,
          operation: 'setup',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error: unknown) {
      throw new Error(`Erro ao configurar coleção: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // ADD DOCUMENTS (batch real via executeMany)
  // Cap. 3 (batch insert) + Cap. 14.3 (procedure de insert em lote no Supabase/Oracle)
  // ──────────────────────────────────────────────────────────────────────
  async addDocument(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const inputData = this.executeFunctions.getInputData();

    if (!inputData || inputData.length === 0) {
      throw new Error('Nenhum dado de entrada fornecido');
    }

    const extraMetadata = {
      timestamp: new Date().toISOString(),
      nodeId: this.executeFunctions.getNode().parameters.id,
      workflowId: this.executeFunctions.getWorkflow().id,
    };

    const validDocs: DocumentInput[] = [];
    const results: any[] = [];

    inputData.forEach((item: INodeExecutionData, i: number) => {
      try {
        if (!item?.json) {
          throw new Error('Nenhum dado de documento fornecido');
        }
        const doc = parseDocumentFromInput(
          item.json as Record<string, unknown>,
          String(Date.now() + i),
          extraMetadata,
        );
        validDocs.push(doc);
        results[i] = { pending: true, documentId: doc.id, index: i };
      } catch (error: unknown) {
        results[i] = {
          success: false,
          error: `Item ${i}: ${error instanceof Error ? error.message : String(error)}`,
          index: i,
        };
      }
    });

    if (validDocs.length > 0) {
      try {
        const insertSQL = `
          INSERT INTO ${collectionName} (id, content, embedding, metadata)
          VALUES (:id, :content, :embedding, :metadata)
        `;

        const binds = validDocs.map(doc => ({
          id: doc.id,
          content: doc.content,
          embedding: { type: DB_TYPE_VECTOR, val: doc.embedding },
          metadata: doc.metadata,
        }));

        const execManyResult = await connection.executeMany(insertSQL, binds, {
          autoCommit: true,
          bindDefs: {
            id: { type: oracledb.STRING, maxSize: 255 },
            content: { type: oracledb.CLOB },
            embedding: { type: DB_TYPE_VECTOR },
            metadata: { type: oracledb.CLOB },
          },
        });

        let docCursor = 0;
        for (let i = 0; i < results.length; i++) {
          if (results[i]?.pending) {
            const doc = validDocs[docCursor];
            results[i] = {
              success: true,
              documentId: doc.id,
              content: doc.content.substring(0, 100) + (doc.content.length > 100 ? '...' : ''),
              embeddingDimension: doc.embedding.length,
              operation: 'addDocument',
              index: i,
            };
            docCursor++;
          }
        }
        void execManyResult;
      } catch (error: unknown) {
        // Se o INSERT em lote falhar (ex: PK duplicada em um dos itens), reporta o erro
        // para todos os itens que estavam pendentes em vez de silenciosamente perdê-los.
        const message = error instanceof Error ? error.message : String(error);
        for (let i = 0; i < results.length; i++) {
          if (results[i]?.pending) {
            results[i] = { success: false, error: `Item ${i}: ${message}`, index: i };
          }
        }
      }
    }

    return this.executeFunctions.helpers.returnJsonArray(results);
  }

  // ──────────────────────────────────────────────────────────────────────
  // UPSERT DOCUMENT
  // Cap. 3 (Upsert) — equivalente a `supabase.from('documents').upsert(...)`
  // ──────────────────────────────────────────────────────────────────────
  async upsertDocument(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const inputData = this.executeFunctions.getInputData();

    if (!inputData || inputData.length === 0) {
      throw new Error('Nenhum dado de entrada fornecido');
    }

    const extraMetadata = {
      timestamp: new Date().toISOString(),
      nodeId: this.executeFunctions.getNode().parameters.id,
      workflowId: this.executeFunctions.getWorkflow().id,
    };

    const results: any[] = [];

    for (let i = 0; i < inputData.length; i++) {
      try {
        const json = inputData[i]?.json;
        if (!json) {
          throw new Error('Nenhum dado de documento fornecido');
        }
        if (json.id == null) {
          throw new Error('Upsert requer um "id" explícito para identificar conflito');
        }
        const doc = parseDocumentFromInput(json as Record<string, unknown>, '', extraMetadata);

        const mergeSQL = `
          MERGE INTO ${collectionName} t
          USING (SELECT :id AS id FROM dual) s
          ON (t.id = s.id)
          WHEN MATCHED THEN UPDATE SET
            content = :content,
            embedding = :embedding,
            metadata = :metadata,
            updated_at = CURRENT_TIMESTAMP
          WHEN NOT MATCHED THEN INSERT (id, content, embedding, metadata)
            VALUES (:id, :content, :embedding, :metadata)
        `;

        const bindParams: BindParameters = {
          id: doc.id,
          content: doc.content,
          embedding: { type: DB_TYPE_VECTOR, val: doc.embedding },
          metadata: doc.metadata,
        };

        const result = await connection.execute(mergeSQL, bindParams, { autoCommit: true });

        results.push({
          success: true,
          documentId: doc.id,
          rowsAffected: result.rowsAffected,
          operation: 'upsertDocument',
          index: i,
        });
      } catch (error: unknown) {
        results.push({
          success: false,
          error: `Item ${i}: ${error instanceof Error ? error.message : String(error)}`,
          index: i,
        });
      }
    }

    return this.executeFunctions.helpers.returnJsonArray(results);
  }

  // ──────────────────────────────────────────────────────────────────────
  // SIMILARITY SEARCH (com filtro de metadados)
  // Cap. 4 (matemática das distâncias) + Cap. 7 (match_documents com filtro, RPC)
  // ──────────────────────────────────────────────────────────────────────
  async searchSimilarity(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const searchVectorParam = this.executeFunctions.getNodeParameter('searchVector', 0) as string;
    const limit = Math.max(1, Math.min(1000, this.executeFunctions.getNodeParameter('limit', 0) as number));
    const threshold = Math.max(0, Math.min(1, this.executeFunctions.getNodeParameter('threshold', 0) as number));
    const distanceMetric = validateDistanceMetric(
      this.executeFunctions.getNodeParameter('distanceMetric', 0, 'COSINE') as string,
    );
    const filterParam = this.executeFunctions.getNodeParameter('metadataFilter', 0, '{}') as string;

    let searchVector: number[];
    try {
      searchVector = JSON.parse(searchVectorParam);
    } catch {
      throw new Error('Search vector deve ser um JSON array válido');
    }
    if (!Array.isArray(searchVector) || searchVector.length === 0) {
      throw new Error('Search vector deve ser um array de números não vazio');
    }
    if (searchVector.some(val => typeof val !== 'number' || Number.isNaN(val))) {
      throw new Error('Search vector deve conter apenas números válidos');
    }

    let filter: Record<string, unknown>;
    try {
      filter = filterParam ? JSON.parse(filterParam) : {};
    } catch {
      throw new Error('Metadata Filter deve ser um JSON object válido');
    }
    const { clause: filterClause, binds: filterBinds } = buildMetadataFilter(filter);

    try {
      // NOTA (Cap. 4): "similarity" = 1 - distance só é uma medida normalizada (0–1)
      // quando a métrica é COSINE. Para EUCLIDEAN/DOT/MANHATTAN o campo "distance" bruto
      // é o valor confiável; "similarity" é mantido por conveniência/compatibilidade.
      const searchSQL = `
        SELECT
          id,
          content,
          metadata,
          created_at,
          updated_at,
          VECTOR_DISTANCE(embedding, :searchVector, ${distanceMetric}) as distance,
          (1 - VECTOR_DISTANCE(embedding, :searchVector, ${distanceMetric})) as similarity
        FROM ${collectionName}
        WHERE (1 - VECTOR_DISTANCE(embedding, :searchVector, ${distanceMetric})) >= :threshold
        ${filterClause}
        ORDER BY distance ASC
        FETCH FIRST :limit ROWS ONLY
      `;

      const bindParams: BindParameters = {
        searchVector: { type: DB_TYPE_VECTOR, val: searchVector },
        threshold,
        limit,
        ...filterBinds,
      };

      const result = await connection.execute(searchSQL, bindParams, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const documents = ((result.rows as any[]) || []).map(row => ({
        id: row.ID,
        content: row.CONTENT,
        metadata: row.METADATA ? JSON.parse(row.METADATA) : null,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT,
        distance: Number(row.DISTANCE),
        similarity: Number(row.SIMILARITY),
      }));

      return this.executeFunctions.helpers.returnJsonArray(documents);
    } catch (error: unknown) {
      throw new Error(`Erro ao buscar similaridade: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // HYBRID SEARCH (busca vetorial + palavra-chave)
  // Cap. 3 (busca híbrida) — combina similaridade vetorial com correspondência textual
  // ──────────────────────────────────────────────────────────────────────
  async hybridSearch(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const searchVectorParam = this.executeFunctions.getNodeParameter('searchVector', 0) as string;
    const keyword = this.executeFunctions.getNodeParameter('keyword', 0, '') as string;
    const limit = Math.max(1, Math.min(1000, this.executeFunctions.getNodeParameter('limit', 0) as number));
    const distanceMetric = validateDistanceMetric(
      this.executeFunctions.getNodeParameter('distanceMetric', 0, 'COSINE') as string,
    );
    // Peso dado à similaridade vetorial (0 a 1). O restante (1 - alpha) pondera o match textual.
    const alpha = Math.max(0, Math.min(1, this.executeFunctions.getNodeParameter('hybridAlpha', 0, 0.5) as number));

    let searchVector: number[];
    try {
      searchVector = JSON.parse(searchVectorParam);
    } catch {
      throw new Error('Search vector deve ser um JSON array válido');
    }
    if (!Array.isArray(searchVector) || searchVector.length === 0) {
      throw new Error('Search vector deve ser um array de números não vazio');
    }

    try {
      // score textual simples (1 se contém o termo, 0 caso não) combinado com a
      // similaridade vetorial normalizada. Para busca full-text mais robusta, considere
      // criar um índice Oracle Text (CONTEXT) sobre a coluna content e substituir o LIKE
      // por CONTAINS(content, :keyword, 1) > 0 com SCORE(1) no lugar do CASE abaixo.
      const searchSQL = `
        SELECT
          id,
          content,
          metadata,
          created_at,
          updated_at,
          VECTOR_DISTANCE(embedding, :searchVector, ${distanceMetric}) as distance,
          (1 - VECTOR_DISTANCE(embedding, :searchVector, ${distanceMetric})) as vector_similarity,
          CASE WHEN :keyword IS NOT NULL AND LOWER(content) LIKE '%' || LOWER(:keyword) || '%' THEN 1 ELSE 0 END as text_match,
          (:alpha * (1 - VECTOR_DISTANCE(embedding, :searchVector, ${distanceMetric})))
            + ((1 - :alpha) * (CASE WHEN :keyword IS NOT NULL AND LOWER(content) LIKE '%' || LOWER(:keyword) || '%' THEN 1 ELSE 0 END))
            as hybrid_score
        FROM ${collectionName}
        ORDER BY hybrid_score DESC
        FETCH FIRST :limit ROWS ONLY
      `;

      const bindParams: BindParameters = {
        searchVector: { type: DB_TYPE_VECTOR, val: searchVector },
        keyword: keyword || null,
        alpha,
        limit,
      };

      const result = await connection.execute(searchSQL, bindParams, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const documents = ((result.rows as any[]) || []).map(row => ({
        id: row.ID,
        content: row.CONTENT,
        metadata: row.METADATA ? JSON.parse(row.METADATA) : null,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT,
        distance: Number(row.DISTANCE),
        vectorSimilarity: Number(row.VECTOR_SIMILARITY),
        textMatch: Number(row.TEXT_MATCH) === 1,
        hybridScore: Number(row.HYBRID_SCORE),
      }));

      return this.executeFunctions.helpers.returnJsonArray(documents);
    } catch (error: unknown) {
      throw new Error(`Erro na busca híbrida: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // DELETE DOCUMENT (aceita 1 ou vários IDs separados por vírgula)
  // Cap. 15.2 — equivalente ao `delete_documents` (DELETE .../id=in.(...))
  // ──────────────────────────────────────────────────────────────────────
  async deleteDocument(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const rawIds = this.executeFunctions.getNodeParameter('documentId', 0) as string;
    const documentIds = rawIds
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (documentIds.length === 0) {
      throw new Error('Nenhum Document ID fornecido');
    }

    try {
      const placeholders = documentIds.map((_, i) => `:id${i}`).join(', ');
      const bindParams: Record<string, string> = {};
      documentIds.forEach((id, i) => {
        bindParams[`id${i}`] = id;
      });

      const deleteSQL = `DELETE FROM ${collectionName} WHERE id IN (${placeholders})`;
      const result = await connection.execute(deleteSQL, bindParams, { autoCommit: true });

      return this.executeFunctions.helpers.returnJsonArray([
        {
          success: true,
          documentIds,
          rowsAffected: result.rowsAffected,
          operation: 'deleteDocument',
        },
      ]);
    } catch (error: unknown) {
      throw new Error(`Erro ao deletar documento: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateDocument(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const documentId = this.executeFunctions.getNodeParameter('documentId', 0) as string;
    const inputData = this.executeFunctions.getInputData();

    if (!inputData || inputData.length === 0) {
      throw new Error('Nenhum dado de entrada fornecido para atualização');
    }

    const documentData = inputData[0]?.json;
    if (!documentData) {
      throw new Error('Nenhum dado de documento fornecido para atualização');
    }

    try {
      const content = documentData.content != null ? String(documentData.content) : undefined;
      const embedding = (documentData.embedding ?? documentData.vector) as unknown;
      const metadataObj =
        documentData.metadata && typeof documentData.metadata === 'object'
          ? (documentData.metadata as Record<string, unknown>)
          : undefined;

      if (!content && !embedding && !metadataObj) {
        throw new Error('Pelo menos um campo (content, embedding, metadata) deve ser fornecido para atualização');
      }

      const updateFields: string[] = [];
      const bindParams: { [key: string]: any } = { documentId };

      if (content !== undefined) {
        updateFields.push('content = :content');
        bindParams.content = content;
      }
      if (embedding !== undefined) {
        if (!Array.isArray(embedding) || embedding.some(val => typeof val !== 'number' || Number.isNaN(val))) {
          throw new Error('Embedding deve ser um array de números válidos para atualização');
        }
        updateFields.push('embedding = :embedding');
        bindParams.embedding = { type: DB_TYPE_VECTOR, val: embedding };
      }
      if (metadataObj !== undefined) {
        updateFields.push('metadata = :metadata');
        bindParams.metadata = JSON.stringify(metadataObj);
      }
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const updateSQL = `UPDATE ${collectionName} SET ${updateFields.join(', ')} WHERE id = :documentId`;
      const result = await connection.execute(updateSQL, bindParams, { autoCommit: true });

      return this.executeFunctions.helpers.returnJsonArray([
        {
          success: true,
          documentId,
          rowsAffected: result.rowsAffected,
          operation: 'updateDocument',
        },
      ]);
    } catch (error: unknown) {
      throw new Error(`Erro ao atualizar documento: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDocument(connection: Connection): Promise<INodeExecutionData[]> {
    const collectionName = validateIdentifier(
      this.executeFunctions.getNodeParameter('collectionName', 0) as string,
    );
    const documentId = this.executeFunctions.getNodeParameter('documentId', 0) as string;

    try {
      const selectSQL = `
        SELECT id, content, embedding, metadata, created_at, updated_at
        FROM ${collectionName}
        WHERE id = :documentId
      `;

      const result = await connection.execute(
        selectSQL,
        { documentId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const document = result.rows?.[0] as any;

      if (!document) {
        return this.executeFunctions.helpers.returnJsonArray([
          {
            success: false,
            message: `Documento com ID ${documentId} não encontrado`,
            operation: 'getDocument',
          },
        ]);
      }

      return this.executeFunctions.helpers.returnJsonArray([
        {
          id: document.ID,
          content: document.CONTENT,
          embedding: document.EMBEDDING,
          metadata: document.METADATA ? JSON.parse(document.METADATA) : null,
          createdAt: document.CREATED_AT,
          updatedAt: document.UPDATED_AT,
          operation: 'getDocument',
        },
      ]);
    } catch (error: unknown) {
      throw new Error(`Erro ao obter documento: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // LIST COLLECTIONS
  // Antes filtrava por `table_name LIKE 'VECTOR_%'`, o que não reflete nenhuma convenção
  // real deste node (o usuário escolhe o nome livremente no setup). Agora detecta
  // diretamente quais tabelas do schema possuem coluna do tipo VECTOR.
  // ──────────────────────────────────────────────────────────────────────
  async listCollections(connection: Connection): Promise<INodeExecutionData[]> {
    try {
      const selectSQL = `
        SELECT DISTINCT c.table_name, c.column_name, c.data_type
        FROM user_tab_columns c
        WHERE c.data_type = 'VECTOR'
        ORDER BY c.table_name
      `;

      const result = await connection.execute(
        selectSQL,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const collections = ((result.rows as any[]) || []).map(row => ({
        name: row.TABLE_NAME,
        vectorColumn: row.COLUMN_NAME,
      }));

      return this.executeFunctions.helpers.returnJsonArray(collections);
    } catch (error: unknown) {
      throw new Error(`Erro ao listar coleções: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export class OracleVectorStore implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Oracle Vector Store',
    name: 'oracleVectorStore',
    icon: 'file:oracle.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      'Gerenciamento de vector store usando Oracle Database 23ai/26ai, com semântica equivalente ao Supabase Vector (match_documents, filtros, upsert, busca híbrida)',
    defaults: {
      name: 'Oracle Vector Store',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'oracleCredentials',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        default: 'addDocument',
        options: [
          { name: 'Setup Collection', value: 'setup', description: 'Criar tabela e índice vetorial (HNSW/IVF)' },
          { name: 'Add Documents', value: 'addDocument', description: 'Inserir documentos em lote com embedding' },
          { name: 'Upsert Document', value: 'upsertDocument', description: 'Inserir ou atualizar por ID (MERGE)' },
          {
            name: 'Similarity Search',
            value: 'searchSimilarity',
            description: 'Buscar documentos similares, com filtro opcional de metadados',
          },
          {
            name: 'Hybrid Search',
            value: 'hybridSearch',
            description: 'Busca combinando similaridade vetorial e palavra-chave',
          },
          { name: 'Delete Document', value: 'deleteDocument', description: 'Remover documento(s) por ID' },
          { name: 'Update Document', value: 'updateDocument', description: 'Atualizar documento existente' },
          { name: 'Get Document', value: 'getDocument', description: 'Obter documento por ID' },
          { name: 'List Collections', value: 'listCollections', description: 'Listar tabelas com coluna VECTOR' },
        ],
        description: 'Operação a ser executada no vector store',
      },
      {
        displayName: 'Collection Name',
        name: 'collectionName',
        type: 'string',
        default: 'VECTOR_STORE',
        description: 'Nome da coleção (tabela) no banco de dados Oracle',
      },
      {
        displayName: 'Vector Dimension',
        name: 'vectorDimension',
        type: 'number',
        default: 1536,
        description: 'Dimensão do vetor (número de elementos no embedding)',
        displayOptions: { show: { operation: ['setup'] } },
      },
      {
        displayName: 'Index Type',
        name: 'indexType',
        type: 'options',
        default: 'HNSW',
        options: [
          { name: 'HNSW (in-memory, melhor para leitura)', value: 'HNSW' },
          { name: 'IVF (neighbor partitions, melhor p/ datasets grandes)', value: 'IVF' },
        ],
        description: 'Tipo de índice vetorial a ser criado',
        displayOptions: { show: { operation: ['setup'] } },
      },
      {
        displayName: 'Target Accuracy (%)',
        name: 'targetAccuracy',
        type: 'number',
        default: 95,
        description: 'Acurácia alvo do índice aproximado (1-100)',
        displayOptions: { show: { operation: ['setup'] } },
      },
      {
        displayName: 'Document ID(s)',
        name: 'documentId',
        type: 'string',
        default: '',
        description:
          'ID do documento. Em "Delete Document" aceita múltiplos IDs separados por vírgula.',
        displayOptions: { show: { operation: ['deleteDocument', 'updateDocument', 'getDocument'] } },
      },
      {
        displayName: 'Search Vector (JSON Array)',
        name: 'searchVector',
        type: 'string',
        default: '[0.1, 0.2, 0.3]',
        description: 'Vetor de busca no formato JSON array (ex: [0.1, 0.2, 0.3])',
        displayOptions: { show: { operation: ['searchSimilarity', 'hybridSearch'] } },
      },
      {
        displayName: 'Metadata Filter (JSON)',
        name: 'metadataFilter',
        type: 'json',
        default: '{}',
        description:
          'Filtro de igualdade por campos de metadado, ex: { "source": "manual.pdf" } — equivalente ao parâmetro "filter" do match_documents no Supabase',
        displayOptions: { show: { operation: ['searchSimilarity'] } },
      },
      {
        displayName: 'Keyword',
        name: 'keyword',
        type: 'string',
        default: '',
        description: 'Termo textual a ser combinado com a similaridade vetorial',
        displayOptions: { show: { operation: ['hybridSearch'] } },
      },
      {
        displayName: 'Hybrid Alpha (peso do vetor)',
        name: 'hybridAlpha',
        type: 'number',
        default: 0.5,
        description: '0 = só palavra-chave, 1 = só vetor, 0.5 = equilibrado',
        displayOptions: { show: { operation: ['hybridSearch'] } },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 10,
        description: 'Número máximo de resultados a retornar',
        displayOptions: { show: { operation: ['searchSimilarity', 'hybridSearch'] } },
      },
      {
        displayName: 'Threshold',
        name: 'threshold',
        type: 'number',
        default: 0.7,
        description: 'Limiar mínimo de similaridade (0.0 a 1.0)',
        displayOptions: { show: { operation: ['searchSimilarity'] } },
      },
      {
        displayName: 'Distance Metric',
        name: 'distanceMetric',
        type: 'options',
        default: 'COSINE',
        options: [
          { name: 'Cosine', value: 'COSINE' },
          { name: 'Euclidean', value: 'EUCLIDEAN' },
          { name: 'Dot Product', value: 'DOT' },
          { name: 'Manhattan', value: 'MANHATTAN' },
          { name: 'Hamming', value: 'HAMMING' },
        ],
        description: 'Métrica de distância para busca de similaridade',
        displayOptions: { show: { operation: ['setup', 'searchSimilarity', 'hybridSearch'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = await this.getCredentials('oracleCredentials');
    const operation = this.getNodeParameter('operation', 0) as string;

    const oracleCredentials = {
      user: String(credentials.user),
      password: String(credentials.password),
      host: String(credentials.host),
      port: Number(credentials.port),
      serviceName: String(credentials.serviceName),
      connectionString: String(credentials.connectionString),
      thinMode: credentials.thinMode !== false,
      libDir: credentials.libDir ? String(credentials.libDir) : undefined,
      configDir: credentials.configDir ? String(credentials.configDir) : undefined,
      errorUrl: credentials.errorUrl ? String(credentials.errorUrl) : undefined,
    };

    let connection: Connection | undefined;
    let returnData: INodeExecutionData[] = [];
    const vectorStoreOps = new OracleVectorStoreOperations(this);

    try {
      const pool = await OracleConnectionPool.getPool(oracleCredentials);
      connection = await pool.getConnection();

      switch (operation) {
        case 'setup':
          returnData = await vectorStoreOps.setupCollection(connection);
          break;
        case 'addDocument':
          returnData = await vectorStoreOps.addDocument(connection);
          break;
        case 'upsertDocument':
          returnData = await vectorStoreOps.upsertDocument(connection);
          break;
        case 'searchSimilarity':
          returnData = await vectorStoreOps.searchSimilarity(connection);
          break;
        case 'hybridSearch':
          returnData = await vectorStoreOps.hybridSearch(connection);
          break;
        case 'deleteDocument':
          returnData = await vectorStoreOps.deleteDocument(connection);
          break;
        case 'updateDocument':
          returnData = await vectorStoreOps.updateDocument(connection);
          break;
        case 'getDocument':
          returnData = await vectorStoreOps.getDocument(connection);
          break;
        case 'listCollections':
          returnData = await vectorStoreOps.listCollections(connection);
          break;
        default:
          throw new NodeOperationError(this.getNode(), `Operação "${operation}" não suportada`);
      }
    } catch (error) {
      throw new NodeOperationError(this.getNode(), `Oracle Vector Store Error: ${error}`);
    } finally {
      if (connection) {
        await connection.close();
      }
    }

    return [returnData];
  }
}