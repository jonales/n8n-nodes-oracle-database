# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adota [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.9] - 2025-11-27

### 🔥 Major - BREAKING FIX

**Erro de Instalação Resolvido:** "Error loading package... could not be loaded"

Toda a estrutura de build foi migrada para seguir o padrão oficial n8n-starter, resolvendo completamente o erro que impedia a instalação do pacote no n8n.

### ✨ Changed

- **Build System:** Migrar de `tsc` + `gulp` para `@n8n/node-cli` (padrão oficial do n8n)
- **Scripts:** Atualizar todos os scripts de build, lint e dev conforme n8n-starter
  - `npm run dev` → Agora usa `n8n-node dev` (inicia n8n com hot reload)
  - `npm run build` → Agora usa `n8n-node build` (otimizado para n8n)
  - `npm run lint` → Agora usa `n8n-node lint` (linting oficial)
  - `npm run release` → Novo script para gerenciar releases

- **package.json:**
  - Simplificar `files` array: `["dist"]` (antes: múltiplas linhas específicas)
  - Adicionar `strict: false` em `n8n` configuration
  - Adicionar `peerDependencies` para `n8n-workflow: *`
  - Remover dependências manuais: `gulp`, `rimraf` (agora gerenciadas por @n8n/node-cli)
  - Remover dependências desnecessárias: `n8n-core` (não mais necessário)

- **Dependencies:**
  - Remover: `gulp` (v5.0.1)
  - Remover: `rimraf` (v6.0.1)
  - Remover: `n8n-core` (v1.0.0)
  - Remover: `n8n-workflow` de devDependencies (agora em peerDependencies)
  - Adicionar: `@n8n/node-cli` (v0.17.0) - OBRIGATÓRIO
  - Adicionar: `release-it` (v19.0.4) - Para gerenciar releases
  - Atualizar: `typescript` (5.2.0 → 5.9.2) - Versão padrão n8n
  - Atualizar: `eslint` (instalado → 9.32.0)
  - Atualizar: `prettier` (instalado → 3.6.2)

- **TypeScript Configuration:**
  - Ativar `strict: true` em `tsconfig.json` (antes: false)
  - Melhor detecção de tipos e segurança de código

- **ESLint Configuration:**
  - Criar novo arquivo `eslint.config.mjs` (padrão ESM do n8n)
  - Usar configuração oficial do @n8n/node-cli
  - Remover arquivo obsoleto `eslint.config.js`

### 🐛 Fixed

- ✅ **Error loading package** - Erro crítico de instalação no n8n
- ✅ **Empacotamento incorreto** - Arquivo dist não era gerado corretamente
- ✅ **Incompatibilidade com n8n** - Estrutura não seguia padrão oficial
- ✅ **Build inconsistente** - Processo manual era propenso a erros
- ✅ **Validação de nodes** - Agora validados pelo CLI oficial do n8n

### 📦 Impact

**Compatibilidade:** Totalmente retrocompatível  
**Breaking Changes:** Nenhum (apenas correções internas)  
**Migração:** Automática - Não requer ação do usuário

### 🧪 Testing

- ✅ Build executado com sucesso: `✓ Build successful`
- ✅ ESLint validado: 0 erros, warnings apenas (toleráveis)
- ✅ npm pack validado: 41 arquivos incluídos
- ✅ Tamanho final: 3.4 MB comprimido / 3.6 MB descomprimido
- ✅ Publicado no npm: https://www.npmjs.com/package/@jonales/n8n-nodes-oracle-database

### 📝 Commits

```
1a45d69 - fix: ajustar prepublishOnly para npm run build
66356d5 - chore(release): v1.0.9 - Atualizar para n8n/node-cli e padrão oficial n8n-starter
b15f627 - docs: adicionar documento de validação e correções realizadas
d39e906 - chore: atualizar para usar @n8n/node-cli conforme padrão oficial do n8n
```

### 🔗 References

- Padrão seguido: [n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter)
- Documentação n8n: [Creating Nodes](https://docs.n8n.io/integrations/creating-nodes/)
- Community Nodes: [Submit for Verification](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/)

---

## [1.0.8] - 2025-10-30

### ✨ Added

- Análise completa do projeto vs padrão n8n-starter
- Documento VALIDACAO_E_CORRECOES.md com todas as mudanças necessárias

### 🐛 Fixed

- Identificação de erro de instalação no n8n
- Validação de estrutura conforme padrão oficial

---

## [1.0.5] - 2025-08-15

### ✨ Added

- Suporte inicial para Oracle Vector Store (Oracle 23ai)
- Chat Memory node para histórico de conversas
- Advanced operations com transactions e AQ

### 🔧 Changed

- Melhorias no connection pooling
- Otimizações de bulk operations

---

## [1.0.2] - 2025-06-20

### ✨ Added

- Suporte oficial para thin/thick mode
- Connection pooling automático
- Bulk operations para massa de dados

### 🐛 Fixed

- Compatibilidade com Oracle 19c+
- Auto-detecção de modo de conexão

---

## [1.0.1] - Releases Anteriores

Versões iniciais com funcionalidades básicas de Oracle Database.

---

## Guia de Versionamento

Este projeto segue [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Mudanças incompatíveis, breaking changes
- **MINOR** (0.X.0): Novas funcionalidades, retrocompatível
- **PATCH** (0.0.X): Correções de bugs, retrocompatível

---

## Como Atualizar

```bash
# Verificar versão instalada
npm list @jonales/n8n-nodes-oracle-database

# Atualizar para a versão mais recente
npm install @jonales/n8n-nodes-oracle-database@latest

# Ou versão específica
npm install @jonales/n8n-nodes-oracle-database@1.0.9
```

---

## Links Úteis

- 📦 [npm Package](https://www.npmjs.com/package/@jonales/n8n-nodes-oracle-database)
- 🐙 [GitHub Repository](https://github.com/jonales/n8n-nodes-oracle-database)
- 📖 [n8n Documentation](https://docs.n8n.io/)
- 🎯 [Community Nodes](https://www.npmjs.com/search?q=keywords:n8n-community-node-package)

---

**Última atualização:** 27 de Novembro de 2025  
**Mantenedor:** [@jonales](https://github.com/jonales)
