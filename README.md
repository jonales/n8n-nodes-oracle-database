# n8n-nodes-oracle-database

![LOGOTIPO](image/README/oracle-n8n.png)

[![npm version](https://img.shields.io/npm/v/@jonales/n8n-nodes-oracle-database.svg)](https://www.npmjs.com/package/@jonales/n8n-nodes-oracle-database)
[![npm downloads](https://img.shields.io/npm/dt/@jonales/n8n-nodes-oracle-database.svg)](https://www.npmjs.com/package/@jonales/n8n-nodes-oracle-database)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Oracle](https://img.shields.io/badge/Oracle-19c%2B-red.svg)](https://docs.oracle.com/en/database/)
[![n8n](https://img.shields.io/badge/n8n-community--node-orange.svg)](https://docs.n8n.io/integrations/community-nodes/)

<details>
<summary>🇺🇸 English</summary>

---

# Oracle Database Node for n8n

Advanced **Oracle Database** node for [n8n](https://n8n.io/) with enterprise features for heavy workloads and complete support for **Oracle 19c+** and **Oracle 23ai**.

> **Version 1.1.0** — Official n8n build system (`@n8n/node-cli`), full thin/thick mode support per credential.

---

## About

A complete enterprise solution for **Oracle Database** in the **n8n** ecosystem, built with `node-oracledb 6.x` and supporting both connection modes — **Thin** (pure JS, zero Oracle Client required) and **Thick** (Oracle Client libraries, full feature set).

**Developed by:** [Jônatas Meireles Sousa Vieira](https://github.com/jonales)  
**Based on:** [n8n-nodes-oracle-database](https://github.com/matheuspeluchi/n8n-nodes-oracle-database) by Matheus Peluchi

---

## Project Structure

```
n8n-nodes-oracle-database/
├── credentials/
│   └── Oracle.credentials.ts           # Oracle credentials (thin/thick)
├── nodes/
│   └── Oracle/
│       ├── OracleDatabase.node.ts          # Basic node — SQL with bind variables
│       ├── OracleDatabaseAdvanced.node.ts  # Advanced node — PL/SQL, bulk, AQ
│       ├── OracleVectorStore.node.ts       # Vector store — Oracle 23ai
│       ├── ChatMemory.node.ts              # Chat history — session management
│       ├── oracle.svg
│       └── core/
│           ├── connection.ts           # Connection manager (thin/thick)
│           ├── connectionPool.ts       # Connection pooling
│           ├── bulkOperations.ts       # Bulk Insert/Update/Delete/Upsert
│           ├── plsqlExecutor.ts        # PL/SQL anonymous blocks, procedures, functions
│           ├── transactionManager.ts   # Transactions with savepoints
│           ├── aqOperations.ts         # Oracle Advanced Queuing
│           ├── interfaces/
│           │   └── database.interface.ts
│           ├── types/
│           │   └── oracle.credentials.type.ts
│           └── utils/
│               └── error-handler.ts
└── dist/                               # Compiled build (auto-generated)
```

---

## Features

### Connection Modes

| Mode | Oracle Client | Best for |
|------|---------------|---------|
| **Thin** (default) | Not required — pure JavaScript driver | Containers, cloud, quick setup |
| **Thick** | Required — Oracle Instant Client | Wallets, Kerberos, LDAP, maximum performance |

> The mode is set **per credential** — each credential can use a different mode independently.

### Available Nodes

#### Oracle Database (Basic)
Simple SQL execution with parameterized queries and IN-list parsing.

- SQL queries with named bind variables (`:param`)
- Support for String, Number data types
- Parse values for `IN` statements (comma-separated → individual binds)

#### Oracle Database Advanced
Enterprise operations with connection pool selection.

| Operation | Description |
|-----------|-------------|
| **SQL Query** | Parameterized queries with String, Number, Date, CLOB, OUT types |
| **PL/SQL Block** | Anonymous blocks with automatic OUT parameter detection |
| **Stored Procedure** | `BEGIN proc(:p1, :p2); END;` via PL/SQL executor |
| **Function** | `BEGIN :result := func(:p1); END;` via PL/SQL executor |
| **Bulk Operations** | Mass Insert with configurable batch size and error control |
| **Transaction Block** | Multi-statement transactions with per-operation savepoints |
| **Oracle AQ** | Advanced Queuing — queue info and monitoring |

Connection pool presets: **Standard**, **High Volume**, **OLTP**, **Analytics**, or **Single Connection**.

#### Oracle Vector Store
Vector store management for **Oracle 23ai** with native VECTOR type support.

| Operation | Description |
|-----------|-------------|
| Setup Collection | Create table + HNSW vector index with configurable dimension |
| Add Document | Insert document with embedding (float32 array) |
| Search Similarity | Nearest-neighbor search (Cosine, Euclidean, Dot Product) |
| Get / Update / Delete Document | Document CRUD by ID |
| List Collections | List vector store tables |

#### Oracle Chat Memory
Session-based chat history stored in Oracle.

| Operation | Description |
|-----------|-------------|
| Setup Table | Create session table + session index |
| Add Message | Store user / assistant / system message |
| Get Messages | Retrieve full session history ordered by timestamp |
| Clear Memory | Delete all messages for a session |
| Get Summary | Message count by type, first/last timestamps |

---

## Installation

### Thin Mode (no Oracle Client)

```bash
npm install @jonales/n8n-nodes-oracle-database
```

Works immediately in any Node.js environment — containers, cloud, local.

### Thick Mode (Oracle Instant Client required)

Install Oracle Instant Client first, then install the package.

**Linux / macOS:**

```bash
# Download and extract Oracle Instant Client
wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip
unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
export LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4:$LD_LIBRARY_PATH

npm install @jonales/n8n-nodes-oracle-database
```

**Windows:**

```powershell
# Extract Oracle Instant Client to C:\oracle\instantclient_23_4
# Add to system PATH:
$env:PATH += ";C:\oracle\instantclient_23_4"

npm install @jonales/n8n-nodes-oracle-database
```

**Docker (thick mode):**

```dockerfile
FROM n8nio/n8n:latest

RUN apt-get update && apt-get install -y wget unzip libaio1
RUN wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip
RUN unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4

RUN npm install @jonales/n8n-nodes-oracle-database
```

---

## Credentials Configuration

| Field | Description | Example |
|-------|-------------|---------|
| **User** | Oracle database user | `hr` or `system` |
| **Password** | User password | `your_password` |
| **Connection String** | Host:port/service or TNS alias | `localhost:1521/XEPDB1` |
| **Connection Mode** | Thin (default) or Thick | `Thin Mode` |
| **Oracle Client Directory** | Thick mode only — path to Instant Client | `/opt/oracle/instantclient_23_4` |
| **Oracle Config Directory** | Thick mode only — tnsnames.ora location | `/opt/oracle/network/admin` |

**Connection string examples:**

```
# Oracle XE (local)
localhost:1521/XEPDB1

# Oracle Enterprise
oracle-server.company.com:1521/PROD

# Oracle Autonomous (OCI)
adb.us-ashburn-1.oraclecloud.com:1522/service_high.adb.oraclecloud.com

# Oracle RDS (AWS)
mydb.cluster-xyz.us-east-1.rds.amazonaws.com:1521/ORCL

# TNS alias (thick mode with tnsnames.ora)
MY_TNS_ALIAS
```

---

## Thin vs Thick Mode — When to Use Each

### Thin Mode

- No installation required
- Works in Docker, Kubernetes, cloud functions
- Supports most Oracle features (SQL, PL/SQL, bind variables, LOBs)
- Default for all four nodes

### Thick Mode

Use Thick when you need:
- Oracle Wallets (mTLS / Autonomous Database without connection string)
- Kerberos or LDAP authentication
- Oracle Net Services (advanced network config)
- Some older Oracle-specific features (pre-12c compatibility)

> **Important:** Oracle initializes the driver mode **once per process**. If the first connection in the n8n process is Thin, all subsequent connections in that process will also be Thin. To guarantee Thick mode, set all credentials to Thick Mode, or restart n8n after changing the mode.

---

## Troubleshooting

### Thin mode — connection refused
- Check connection string format: `host:1521/service_name`
- Verify firewall is not blocking port 1521 (or your Oracle port)
- Test network: `telnet hostname 1521`

### Thick mode — DPI-1047 (Oracle Client not found)
- Verify Oracle Instant Client is installed
- Set `LD_LIBRARY_PATH` (Linux/macOS) or add to `PATH` (Windows) pointing to the client directory
- Or set the **Oracle Client Directory** field in credentials
- Oracle Client version must be compatible with your database version

### Thick mode — DPI-1072 (already initialized)
- This is informational — the driver was already initialized in a previous call. No action needed.

---

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes and run `npm run build`
4. Open a Pull Request

---

### Support the Project

<div align="center">

### PIX

<img src="image/README/qrcode-pix-jonatas.mei@outlook.com.png" alt="QR Code PIX" width="150" />

**PIX Key:** jonatas.mei@outlook.com

### Cryptocurrency

<table style="width:100%; border:none;">
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Bitcoin (BTC)</h4>
      <img src="image/README/btc.jpeg" alt="QR Code BTC" width="150" />
      <br><code>bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll</code><br>
      <a href="https://link.trustwallet.com/send?asset=c0&address=bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll">Pay with Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Ethereum (ETH)</h4>
      <img src="image/README/eth.jpeg" alt="QR Code ETH" width="150" />
      <br><code>0xA35A984401Ae9c81ca2d742977E603421df45419</code><br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c60">Pay with Trust Wallet</a>
    </td>
  </tr>
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Binance (BNB)</h4>
      <img src="image/README/bnb.jpeg" alt="QR Code BNB" width="150" />
      <br><code>0xA35A984401Ae9c81ca2d742977E603421df45419</code><br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c20000714">Pay with Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Polygon (POL)</h4>
      <img src="image/README/pol.jpeg" alt="QR Code POL" width="150" />
      <br><code>0xA35A984401Ae9c81ca2d742977E603421df45419</code><br>
      <a href="https://link.trustwallet.com/send?asset=c966&address=0xA35A984401Ae9c81ca2d742977E603421df45419">Pay with Trust Wallet</a>
    </td>
  </tr>
</table>

</div>

---

## License

MIT — see [LICENSE.md](LICENSE.md)

---

## Author

**Jônatas Meireles Sousa Vieira**  
Email: [jonatas.mei@outlook.com](mailto:jonatas.mei@outlook.com)  
GitHub: [@jonales](https://github.com/jonales)  
LinkedIn: [jonatasmeireles](https://www.linkedin.com/in/jonatasmeireles/)

---

<div align="center">

**If this project was useful, consider giving it a star!**

[![GitHub stars](https://img.shields.io/github/stars/jonales/n8n-nodes-oracle-database.svg?style=social&label=Star)](https://github.com/jonales/n8n-nodes-oracle-database)
[![GitHub forks](https://img.shields.io/github/forks/jonales/n8n-nodes-oracle-database.svg?style=social&label=Fork)](https://github.com/jonales/n8n-nodes-oracle-database/fork)

**Made with ❤️ for Oracle & n8n communities**

</div>

</details>

<details open>
<summary>🇧🇷 Português</summary>

---

# Node Oracle Database para n8n

Node avançado **Oracle Database** para [n8n](https://n8n.io/) com recursos empresariais para cargas pesadas e suporte completo ao **Oracle 19c+** e **Oracle 23ai**.

> **Versão 1.1.0** — Build oficial n8n (`@n8n/node-cli`), suporte completo thin/thick mode por credencial.

---

## Sobre

Solução empresarial completa para **Oracle Database** no ecossistema **n8n**, construída com `node-oracledb 6.x` e com suporte a ambos os modos de conexão — **Thin** (JavaScript puro, sem Oracle Client) e **Thick** (Oracle Client libraries, conjunto completo de funcionalidades).

**Desenvolvido por:** [Jônatas Meireles Sousa Vieira](https://github.com/jonales)  
**Baseado em:** [n8n-nodes-oracle-database](https://github.com/matheuspeluchi/n8n-nodes-oracle-database) por Matheus Peluchi

---

## Estrutura do Projeto

```
n8n-nodes-oracle-database/
├── credentials/
│   └── Oracle.credentials.ts           # Credenciais Oracle (thin/thick)
├── nodes/
│   └── Oracle/
│       ├── OracleDatabase.node.ts          # Node básico — SQL com bind variables
│       ├── OracleDatabaseAdvanced.node.ts  # Node avançado — PL/SQL, bulk, AQ
│       ├── OracleVectorStore.node.ts       # Vector store — Oracle 23ai
│       ├── ChatMemory.node.ts              # Histórico de chat — sessões
│       ├── oracle.svg
│       └── core/
│           ├── connection.ts           # Gerenciador de conexão (thin/thick)
│           ├── connectionPool.ts       # Pool de conexões
│           ├── bulkOperations.ts       # Bulk Insert/Update/Delete/Upsert
│           ├── plsqlExecutor.ts        # PL/SQL: blocos, procedures, functions
│           ├── transactionManager.ts   # Transações com savepoints
│           ├── aqOperations.ts         # Oracle Advanced Queuing
│           ├── interfaces/
│           │   └── database.interface.ts
│           ├── types/
│           │   └── oracle.credentials.type.ts
│           └── utils/
│               └── error-handler.ts
└── dist/                               # Build compilado (auto-gerado)
```

---

## Funcionalidades

### Modos de Conexão

| Modo | Oracle Client | Indicado para |
|------|---------------|---------------|
| **Thin** (padrão) | Não necessário — driver JavaScript puro | Containers, cloud, setup rápido |
| **Thick** | Necessário — Oracle Instant Client | Wallets, Kerberos, LDAP, máxima performance |

> O modo é configurado **por credencial** — cada credencial pode usar um modo diferente de forma independente.

### Nodes Disponíveis

#### Oracle Database (Básico)
Execução SQL com queries parametrizadas e suporte a listas IN.

- Queries com bind variables nomeadas (`:param`)
- Tipos: String e Number
- Parse de valores para `IN` (lista separada por vírgula → binds individuais)

#### Oracle Database Advanced
Operações empresariais com seleção de pool de conexão.

| Operação | Descrição |
|----------|-----------|
| **SQL Query** | Queries parametrizadas com tipos String, Number, Date, CLOB, OUT |
| **PL/SQL Block** | Blocos anônimos com detecção automática de parâmetros OUT |
| **Stored Procedure** | `BEGIN proc(:p1, :p2); END;` via executor PL/SQL |
| **Function** | `BEGIN :result := func(:p1); END;` via executor PL/SQL |
| **Bulk Operations** | Insert em massa com batch size configurável e controle de erros |
| **Transaction Block** | Transações multi-statement com savepoint por operação |
| **Oracle AQ** | Advanced Queuing — informações de fila e monitoramento |

Pools disponíveis: **Standard**, **High Volume**, **OLTP**, **Analytics** ou **Single Connection**.

#### Oracle Vector Store
Gerenciamento de vector store para **Oracle 23ai** com suporte nativo ao tipo VECTOR.

| Operação | Descrição |
|----------|-----------|
| Setup Collection | Cria tabela + índice vetorial HNSW com dimensão configurável |
| Add Document | Insere documento com embedding (array float32) |
| Search Similarity | Busca por vizinhança (Cosine, Euclidean, Dot Product) |
| Get / Update / Delete Document | CRUD de documento por ID |
| List Collections | Lista tabelas de vector store |

#### Oracle Chat Memory
Histórico de chat por sessão armazenado no Oracle.

| Operação | Descrição |
|----------|-----------|
| Setup Table | Cria tabela de sessão + índice |
| Add Message | Salva mensagem user / assistant / system |
| Get Messages | Recupera histórico completo ordenado por timestamp |
| Clear Memory | Remove todas as mensagens de uma sessão |
| Get Summary | Contagem por tipo, primeiro e último timestamp |

---

## Instalação

### Thin Mode (sem Oracle Client)

```bash
npm install @jonales/n8n-nodes-oracle-database
```

Funciona imediatamente em qualquer ambiente Node.js — containers, cloud, local.

### Thick Mode (Oracle Instant Client obrigatório)

Instale o Oracle Instant Client primeiro, depois o pacote.

**Linux / macOS:**

```bash
wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip
unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
export LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4:$LD_LIBRARY_PATH

npm install @jonales/n8n-nodes-oracle-database
```

**Windows:**

```powershell
# Extraia o Oracle Instant Client em C:\oracle\instantclient_23_4
# Adicione ao PATH do sistema:
$env:PATH += ";C:\oracle\instantclient_23_4"

npm install @jonales/n8n-nodes-oracle-database
```

**Docker (thick mode):**

```dockerfile
FROM n8nio/n8n:latest

RUN apt-get update && apt-get install -y wget unzip libaio1
RUN wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip
RUN unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4

RUN npm install @jonales/n8n-nodes-oracle-database
```

---

## Configuração de Credenciais

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **User** | Usuário Oracle | `hr` ou `system` |
| **Password** | Senha do usuário | `sua_senha` |
| **Connection String** | Host:porta/serviço ou TNS alias | `localhost:1521/XEPDB1` |
| **Connection Mode** | Thin (padrão) ou Thick | `Thin Mode` |
| **Oracle Client Directory** | Apenas thick — caminho do Instant Client | `/opt/oracle/instantclient_23_4` |
| **Oracle Config Directory** | Apenas thick — local do tnsnames.ora | `/opt/oracle/network/admin` |

**Exemplos de Connection String:**

```
# Oracle XE (local)
localhost:1521/XEPDB1

# Oracle Enterprise
oracle-server.empresa.com:1521/PROD

# Oracle Autonomous (OCI)
adb.us-ashburn-1.oraclecloud.com:1522/service_high.adb.oraclecloud.com

# Oracle RDS (AWS)
mydb.cluster-xyz.us-east-1.rds.amazonaws.com:1521/ORCL

# TNS alias (thick mode com tnsnames.ora)
MEU_TNS_ALIAS
```

---

## Thin vs Thick Mode — Quando Usar Cada Um

### Thin Mode

- Nenhuma instalação adicional
- Funciona em Docker, Kubernetes, funções cloud
- Suporta a maioria dos recursos Oracle (SQL, PL/SQL, bind variables, LOBs)
- Padrão em todos os quatro nodes

### Thick Mode

Use Thick quando precisar de:
- Oracle Wallets (mTLS / Autonomous Database sem connection string completa)
- Autenticação Kerberos ou LDAP
- Oracle Net Services (configuração avançada de rede)
- Compatibilidade com recursos legados Oracle (pré-12c)

> **Importante:** O oracledb inicializa o modo do driver **uma vez por processo**. Se a primeira conexão no processo do n8n for Thin, todas as conexões subsequentes naquele processo também serão Thin. Para garantir o Thick mode, configure todas as credenciais como Thick Mode — ou reinicie o n8n após alterar o modo.

---

## Troubleshooting

### Thin mode — conexão recusada
- Verifique o formato da connection string: `host:1521/service_name`
- Verifique se o firewall não está bloqueando a porta 1521 (ou a porta do seu Oracle)
- Teste a rede: `telnet hostname 1521`

### Thick mode — DPI-1047 (Oracle Client não encontrado)
- Verifique se o Oracle Instant Client está instalado
- Configure `LD_LIBRARY_PATH` (Linux/macOS) ou adicione ao `PATH` (Windows) apontando para o diretório do client
- Ou preencha o campo **Oracle Client Directory** nas credenciais
- A versão do Oracle Client deve ser compatível com a versão do seu banco

### Thick mode — DPI-1072 (já inicializado)
- Informativo — o driver já foi inicializado em uma chamada anterior. Nenhuma ação necessária.

---

## Desenvolvimento

```bash
npm install          # Instalar dependências
npm run build        # Compilar TypeScript
npm run dev          # Modo watch
npm run lint         # Verificar ESLint
npm run lint:fix     # Corrigir ESLint automaticamente
```

---

## Contribuição

1. Fork o repositório
2. Crie uma branch para a feature
3. Implemente as mudanças e rode `npm run build`
4. Abra um Pull Request

---

### Apoie o Projeto

<div align="center">

### PIX

<img src="image/README/qrcode-pix-jonatas.mei@outlook.com.png" alt="QR Code PIX" width="150" />

**Chave PIX:** jonatas.mei@outlook.com

### Doação em Criptomoeda

<table style="width:100%; border:none;">
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Bitcoin (BTC)</h4>
      <img src="image/README/btc.jpeg" alt="QR Code BTC" width="150" />
      <br><code>bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll</code><br>
      <a href="https://link.trustwallet.com/send?asset=c0&address=bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll">Pagar com Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Ethereum (ETH)</h4>
      <img src="image/README/eth.jpeg" alt="QR Code ETH" width="150" />
      <br><code>0xA35A984401Ae9c81ca2d742977E603421df45419</code><br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c60">Pagar com Trust Wallet</a>
    </td>
  </tr>
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Binance (BNB)</h4>
      <img src="image/README/bnb.jpeg" alt="QR Code BNB" width="150" />
      <br><code>0xA35A984401Ae9c81ca2d742977E603421df45419</code><br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c20000714">Pagar com Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Polygon (POL)</h4>
      <img src="image/README/pol.jpeg" alt="QR Code POL" width="150" />
      <br><code>0xA35A984401Ae9c81ca2d742977E603421df45419</code><br>
      <a href="https://link.trustwallet.com/send?asset=c966&address=0xA35A984401Ae9c81ca2d742977E603421df45419">Pagar com Trust Wallet</a>
    </td>
  </tr>
</table>

</div>

---

## Licença

MIT — veja [LICENSE.md](LICENSE.md)

---

## Autor

**Jônatas Meireles Sousa Vieira**  
Email: [jonatas.mei@outlook.com](mailto:jonatas.mei@outlook.com)  
GitHub: [@jonales](https://github.com/jonales)  
LinkedIn: [jonatasmeireles](https://www.linkedin.com/in/jonatasmeireles/)

---

<div align="center">

**Se este projeto foi útil, considere dar uma estrela!**

[![GitHub stars](https://img.shields.io/github/stars/jonales/n8n-nodes-oracle-database.svg?style=social&label=Star)](https://github.com/jonales/n8n-nodes-oracle-database)
[![GitHub forks](https://img.shields.io/github/forks/jonales/n8n-nodes-oracle-database.svg?style=social&label=Fork)](https://github.com/jonales/n8n-nodes-oracle-database/fork)

**Made with ❤️ for Oracle & n8n communities**

</div>

</details>
