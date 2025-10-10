# n8n-nodes-oracle-database

![LOGOTIPO](image/README/oracle-n8n.png)

[![npm version](https://img.shields.io/npm/v/@jonales/n8n-nodes-oracle-database.svg)](https://www.npmjs.com/package/@jonales/n8n-nodes-oracle-database)
[![npm downloads](https://img.shields.io/npm/dt/@jonales/n8n-nodes-oracle-database.svg)](https://www.npmjs.com/package/@jonales/n8n-nodes-oracle-database)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![Oracle](https://img.shields.io/badge/Oracle-12.1%2B-red.svg)](https://docs.oracle.com/en/database/)

<details>
<summary>🇺🇸 English</summary>

---

# 📖 Documentation in English

Advanced **Oracle Database** node for [n8n](https://n8n.io/) with **enterprise features for heavy workloads** and complete support for **Oracle 19c+**.

> **🚀 Version 1.0.2 - Clean Architecture**
>
> - **Thin Mode** (default) - Zero configuration, works in any environment
> - **Thick Mode** - Maximum performance with Oracle Client for critical loads
> - **Automatic detection** of ideal mode based on environment
> - **Simplified installation** without complex scripts

---

## 📋 About This Project

Complete enterprise solution for **Oracle Database** in the **n8n** ecosystem, developed with modern architecture and support for both connection modes (thin/thick) of `node-oracledb 6.x`.

**Developed by:** [Jônatas Meireles Sousa Vieira](https://github.com/jonales)  
**Based on:** [n8n-nodes-oracle-database](https://github.com/matheuspeluchi/n8n-nodes-oracle-database) [by Matheus Peluchi]

---

## 📁 Project Structure

```
n8n-nodes-oracle-database/
│
├── 📂 credentials/
│   └── Oracle.credentials.ts           # Oracle credentials (thin/thick)
│
├── 📂 nodes/
│   └── 📂 Oracle/
│       ├── OracleDatabase.node.ts          # Basic node with parameterization
│       ├── OracleDatabaseAdvanced.node.ts  # Advanced enterprise node
│       ├── OracleVectorStore.node.ts       # Node for vector store creation
│       ├── ChatMemory.node.ts              # Node for chat history storage
│       ├── oracle.svg                      # Oracle symbol for nodes
│       │
│       └── 📂 core/
│            ├── aqOperations.ts         # Oracle Advanced Queuing
│            ├── bulkOperations.ts       # Bulk operations
│            ├── connectionPool.ts       # Connection pooling
│            ├── connection.ts           # Connection manager (thin/thick)
│            ├── plsqlExecutor.ts        # PL/SQL executor
│            ├── transactionManager.ts   # Transaction manager
│            │
│            ├── 📂 interfaces/
│            │   └── database.interface.ts   # Interfaces for connections
│            │
│            ├── 📂 types/
│            │   └── oracle.credentials.type.ts # Types for credentials
│            │
│            └── 📂 utils/
│                └── error-handler.ts # Error handling utilities
│            
├── 📂 dist/                            # Compiled build (auto-generated)
├── 📂 image/README/                    # README images
├── 📂 node_modules/                    # Dependencies (auto-generated)
│
├── 📄 package.json                     # Project configuration
├── 📄 tsconfig.json                    # TypeScript configuration
├── 📄 eslint.config.js                 # ESLint configuration
├── 📄 gulpfile.js                      # Build tasks
├── 📄 LICENSE.md                       # MIT License
├── 📄 README.md                        # This documentation
├── 📄 prettier.config.cjs              # Prettier configuration  
└── 📄 index.js                         # Entry point
```

---

## ⭐ Revolutionary Features

### 🔧 **Clean Installation Architecture**

- ✅ **Thin Mode** (default) - Zero configuration, pure JavaScript client
- ✅ **Thick Mode** - Maximum performance with Oracle Client libraries
- ✅ **No installation scripts** - Compliant with n8n community standards
- ✅ **Flexible configuration** - Complete control over connection mode

### 🏗️ **Enterprise Operations**

- ✅ **Intelligent Connection Pooling** (Standard, High Volume, OLTP, Analytics)
- ✅ **Bulk Operations** - Optimized mass Insert/Update/Delete/Upsert
- ✅ **PL/SQL Executor** - Anonymous blocks, procedures, functions with metadata
- ✅ **Transaction Manager** - Complex transactions with savepoints and retry
- ✅ **Oracle Advanced Queuing** - Enterprise messaging system
- ✅ **Health Checks** - Advanced monitoring and diagnostics

### 📊 **Operation Types**

1. **SQL Query** - Queries with bind variables and SQL injection protection
2. **PL/SQL Block** - Execution with automatic OUT parameter detection
3. **Stored Procedure** - Calls with automatic metadata
4. **Function** - Execution with configurable return types
5. **Bulk Operations** - Mass processing with error control
6. **Transaction Block** - Distributed transactions with savepoints
7. **Oracle AQ** - Advanced messaging with queues and topics

---

## 🚀 Installation

### Basic Installation (Thin Mode)

```bash
npm install @jonales/n8n-nodes-oracle-database
```

> 💡 **No additional configuration required.** Works immediately in any environment.

### Advanced Installation (Thick Mode)

For **maximum performance** [in critical loads, install the Oracle Client manually:

#### **Linux/macOS:**

```bash
# 1. Download Oracle Instant Client
wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip

# 2. Extract and configure
unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
export LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4:$LD_LIBRARY_PATH

# 3. Install n8n package
npm install @jonales/n8n-nodes-oracle-database
```

#### **Windows:**

```bash
# 1. Download and extract Oracle Instant Client to C:\oracle\instantclient_23_4

# 2. Add to system PATH
$env:PATH += ";C:\oracle\instantclient_23_4"

# 3. Install package
npm install @jonales/n8n-nodes-oracle-database
```

#### **Docker:**

```dockerfile
FROM n8nio/n8n:latest

# Install Oracle Instant Client
RUN apt-get update && apt-get install -y wget unzip libaio1
RUN wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip
RUN unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4

# Install Oracle node
RUN npm install @jonales/n8n-nodes-oracle-database
```

---

## ⚙️ n8n Configuration

### 1. **Oracle Credentials**

|  Field                 |  Description              |  Example                         |
| ---------------------- | ------------------------- | -------------------------------- |
| **User**               | Oracle user               | `hr` or `system`                 |
| **Password**           | User password             | `your_secure_password`           |
| **Connection String**  | Connection string         | `localhost:1521/XEPDB1`          |
| **Use Thin Mode**      | Connection mode           | `true` (default) or `false`      |
| **Oracle Client Path** | Client path (thick mode)  | `/opt/oracle/instantclient_23_4` |

#### **Connection String Examples:**

```bash
# Local Oracle XE
localhost:1521/XEPDB1

# Oracle Enterprise
oracle-server.company.com:1521/PROD

# Oracle Cloud Autonomous
adb.region.oraclecloud.com:1522/service_high.adb.oraclecloud.com

# Oracle RDS (AWS)
oracle-rds.cluster-xyz.region.rds.amazonaws.com:1521/ORCL
```

### 2. **Automatic vs Manual Configuration**

#### **Automatic Mode (Recommended):**

- Leave **"Use Thin Mode"** as `true`
- System automatically detects if Oracle Client is available
- Uses thick mode if detected, otherwise uses thin mode

#### **Manual Mode:**

- **Thin Mode:** `Use Thin Mode = true` - Zero configuration
- **Thick Mode:** `Use Thin Mode = false` + configure Oracle Client path

---

## 🔧 Key Changes in Version 1.0.2

### ✅ **What Was Removed:**
- Automatic Oracle Client installation scripts
- `postinstall` hook that executed setup scripts
- Script folder and installation files
- Dependencies on system-level modifications

### ✅ **What Remains:**
- **All Oracle nodes** (OracleDatabase, OracleDatabaseAdvanced, OracleVectorStore, ChatMemory)
- **THIN Mode** (recommended) - works without Oracle Client
- **THICK Mode** - works if Oracle Client is manually installed
- **Smart auto-detection** in TypeScript code
- **Connection pooling** and advanced features
- **Bulk operations** and PL/SQL executor
- **Vector Store** for Oracle 23ai
- **Transaction management**

---

## 🎯 Usage in Nodes

### Credentials Configuration
- **Connection Mode:** Thin Mode (default) or Thick Mode
- **Connection String:** `hostname:port/service_name` or TNS
- **User/Password:** Database credentials

### Available Nodes
1. **Oracle Database** - Basic SQL operations
2. **Oracle Database Advanced** - PL/SQL, bulk ops, transactions
3. **Oracle Vector Store** - Vector search with Oracle 23ai
4. **Chat Memory** - Memory management for chatbots

## 🔧 Troubleshooting

### Thin mode doesn't connect
- Check connection string: `hostname:1521/XEPDB1`
- Check firewall/network
- Test connectivity: `telnet hostname 1521`

### Thick mode doesn't work
- Check if Oracle Client is installed
- Configure environment variables (LD_LIBRARY_PATH/PATH)
- The node will try fallback to THIN automatically

---

## 🏗️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development with watch
npm run dev

# Lint
npm run lint

# Complete validation
npm run validate
```

---

## 🤝 Contributing

1. Fork the repository
2. Create branch for feature
3. Implement changes
4. Execute `npm run validate`
5. Create Pull Request

---

### **Support the Project:**

<div align="center">

### PIX:

<img src="image/README/qrcode-pix-jonatas.mei@outlook.com.png" alt="QR Code PIX" width="150" />

**PIX Key:** jonatas.mei@outlook.com

### Cryptocurrency Donation

<table style="width:100%; border:none;">
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Bitcoin (BTC)</h4>
      <img src="image/README/btc.jpeg" alt="QR Code BTC" width="150" />
      <br>
      <code>bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll</code>
      <br>
      <a href="https://link.trustwallet.com/send?asset=c0&address=bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll">Pay with Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Ethereum (ETH)</h4>
      <img src="image/README/eth.jpeg" alt="QR Code ETH" width="150" />
      <br>
      <code>0xA35A984401Ae9c81ca2d742977E603421df45419</code>
      <br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c60">Pay with Trust Wallet</a>
    </td>
  </tr>
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Binance (BNB)</h4>
      <img src="image/README/bnb.jpeg" alt="QR Code BNB" width="150" />
      <br>
      <code>0xA35A984401Ae9c81ca2d742977E603421df45419</code>
      <br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c20000714">Pay with Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Polygon (POL)</h4>
      <img src="image/README/pol.jpeg" alt="QR Code POL" width="150" />
      <br>
      <code>0xA35A984401Ae9c81ca2d742977E603421df45419</code>
      <br>
      <a href="https://link.trustwallet.com/send?asset=c966&address=0xA35A984401Ae9c81ca2d742977E603421df45419">Pay with Trust Wallet</a>
    </td>
  </tr>
</table>

</div>

---

## 📄 License

This project is under **MIT License** - see [LICENSE.md](LICENSE.md) for details.

---

## 👨‍💻 Author

**Jônatas Meireles Sousa Vieira**  
📧 [jonatas.mei@outlook.com](mailto:jonatas.mei@outlook.com)  
🔗 [GitHub @jonales](https://github.com/jonales)  
💼 [LinkedIn](https://www.linkedin.com/in/jonatasmeireles/)

---

<div align="center">

**⭐ If this project was useful, consider giving it a star! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/jonales/n8n-nodes-oracle-database.svg?style=social&label=Star)](https://github.com/jonales/n8n-nodes-oracle-database)
[![GitHub forks](https://img.shields.io/github/forks/jonales/n8n-nodes-oracle-database.svg?style=social&label=Fork)](https://github.com/jonales/n8n-nodes-oracle-database/fork)

**Made with ❤️ for Oracle & n8n communities**

</div>

</details>

<details close>
<summary>🇧🇷 Português</summary>

---

# 📖 Documentação em Português

Node avançado **Oracle Database** para [n8n](https://n8n.io/) com **recursos empresariais para cargas pesadas** e suporte completo ao **Oracle 19c+**.

> **🚀 Versão 1.0.2 - Arquitetura Limpa**
>
> - **Thin Mode** (padrão) - Zero configuração, funciona em qualquer ambiente
> - **Thick Mode** - Performance máxima com Oracle Client para cargas críticas
> - **Detecção automática** do modo ideal baseado no ambiente
> - **Instalação simplificada** sem scripts complexos

---

## 📋 Sobre Este Projeto

Solução empresarial completa para **Oracle Database** no ecossistema **n8n**, desenvolvida com arquitetura moderna e suporte a ambos os modos de conexão (thin/thick) do `node-oracledb 6.x`.

**Desenvolvido por:** [Jônatas Meireles Sousa Vieira](https://github.com/jonales)  
**Baseado em:** [n8n-nodes-oracle-database](https://github.com/matheuspeluchi/n8n-nodes-oracle-database) por Matheus Peluchi

---

## 📁 Estrutura do Projeto

```
n8n-nodes-oracle-database/
│
├── 📂 credentials/
│   └── Oracle.credentials.ts           # Credenciais Oracle (thin/thick)
│
├── 📂 nodes/
│   └── 📂 Oracle/
│       ├── OracleDatabase.node.ts          # Node básico com parametrização
│       ├── OracleDatabaseAdvanced.node.ts  # Node avançado empresarial
│       ├── OracleVectorStore.node.ts       # Node para criação de vector store
│       ├── ChatMemory.node.ts              # Node para armazenamento de histórico de chat
│       ├── oracle.svg                      # Símbolo da Oracle para os nodes
│       │
│       └── 📂 core/
│            ├── aqOperations.ts         # Oracle Advanced Queuing
│            ├── bulkOperations.ts       # Operações em massa
│            ├── connectionPool.ts       # Pool de conexões
│            ├── connection.ts           # Gerenciador de conexão (thin/thick)
│            ├── plsqlExecutor.ts        # Executor PL/SQL
│            ├── transactionManager.ts   # Gerenciador transações
│            │
│            ├── 📂 interfaces/
│            │   └── database.interface.ts   # Interfaces para conexões
│            │
│            ├── 📂 types/
│            │   └── oracle.credentials.type.ts # Tipos para credenciais
│            │
│            └── 📂 utils/
│                └── error-handler.ts # Utilitários para tratamento de erros
│            
├── 📂 dist/                            # Build compilado (auto-gerado)
├── 📂 image/README/                    # Imagens do README
├── 📂 node_modules/                    # Dependências (auto-gerado)
│
├── 📄 package.json                     # Configuração do projeto
├── 📄 tsconfig.json                    # Configuração TypeScript
├── 📄 eslint.config.js                 # Configuração ESLint
├── 📄 gulpfile.js                      # Tasks de build
├── 📄 LICENSE.md                       # Licença MIT
├── 📄 README.md                        # Esta documentação
├── 📄 prettier.config.cjs              # Configuração Prettier  
└── 📄 index.js                         # Ponto de entrada
```

---

## ⭐ Recursos Revolucionários

### 🔧 **Arquitetura de Instalação Limpa**

- ✅ **Thin Mode** (padrão) - Zero configuração, cliente JavaScript puro
- ✅ **Thick Mode** - Performance máxima com Oracle Client libraries
- ✅ **Sem scripts de instalação** - Compatível com padrões da comunidade n8n
- ✅ **Configuração flexível** - Controle total sobre o modo de conexão

### 🏗️ **Operações Empresariais**

- ✅ **Connection Pooling** inteligente (Standard, High Volume, OLTP, Analytics)
- ✅ **Bulk Operations** - Insert/Update/Delete/Upsert em massa otimizadas
- ✅ **PL/SQL Executor** - Blocos anônimos, procedures, functions com metadados
- ✅ **Transaction Manager** - Transações complexas com savepoints e retry
- ✅ **Oracle Advanced Queuing** - Sistema de mensageria empresarial
- ✅ **Health Checks** - Monitoramento e diagnóstico avançado

### 📊 **Tipos de Operação**

1. **SQL Query** - Consultas com bind variables e proteção SQL injection
2. **PL/SQL Block** - Execução com detecção automática de parâmetros OUT
3. **Stored Procedure** - Chamadas com metadados automáticos
4. **Function** - Execução com tipos de retorno configuráveis
5. **Bulk Operations** - Processamento em massa com controle de erro
6. **Transaction Block** - Transações distribuídas com savepoints
7. **Oracle AQ** - Mensageria avançada com filas e tópicos

---

## 🚀 Instalação

### Instalação Básica (Thin Mode)

```bash
npm install @jonales/n8n-nodes-oracle-database
```

> 💡 **Não requer configuração adicional.** Funciona imediatamente em qualquer ambiente.

### Instalação Avançada (Thick Mode)

Para **performance máxima** em cargas críticas, instale o Oracle Client manualmente:

#### **Linux/macOS:**

```bash
# 1. Download Oracle Instant Client
wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip

# 2. Extrair e configurar
unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
export LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4:$LD_LIBRARY_PATH

# 3. Instalar o pacote n8n
npm install @jonales/n8n-nodes-oracle-database
```

#### **Windows:**

```bash
# 1. Download e extrair Oracle Instant Client para C:\oracle\instantclient_23_4

# 2. Adicionar ao PATH do sistema
$env:PATH += ";C:\oracle\instantclient_23_4"

# 3. Instalar o pacote
npm install @jonales/n8n-nodes-oracle-database
```

#### **Docker:**

```dockerfile
FROM n8nio/n8n:latest

# Instalar Oracle Instant Client
RUN apt-get update && apt-get install -y wget unzip libaio1
RUN wget https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip
RUN unzip instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle/
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4

# Instalar node Oracle
RUN npm install @jonales/n8n-nodes-oracle-database
```

---

## ⚙️ Configuração no n8n

### 1. **Credenciais Oracle**

| Campo                  | Descrição                 | Exemplo                          |
| ---------------------- | ------------------------- | -------------------------------- |
| **User**               | Usuário Oracle            | `hr` ou `system`                 |
| **Password**           | Senha do usuário          | `sua_senha_segura`               |
| **Connection String**  | String de conexão         | `localhost:1521/XEPDB1`          |
| **Use Thin Mode**      | Modo de conexão           | `true` (padrão) ou `false`       |
| **Oracle Client Path** | Caminho do client (thick) | `/opt/oracle/instantclient_23_4` |

#### **Exemplos de Connection String:**

```bash
# Oracle XE local
localhost:1521/XEPDB1

# Oracle Enterprise
oracle-server.empresa.com:1521/PROD

# Oracle Cloud Autonomous
adb.region.oraclecloud.com:1522/service_high.adb.oraclecloud.com

# Oracle RDS (AWS)
oracle-rds.cluster-xyz.region.rds.amazonaws.com:1521/ORCL
```

### 2. **Configuração Automática vs Manual**

#### **Modo Automático (Recomendado):**

- Deixe **"Use Thin Mode"** como `true`
- O sistema detecta automaticamente se Oracle Client está disponível
- Usa thick mode se detectado, senão usa thin mode

#### **Modo Manual:**

- **Thin Mode:** `Use Thin Mode = true` - Zero configuração
- **Thick Mode:** `Use Thin Mode = false` + configurar caminho do Oracle Client

---

## 🔧 Principais Mudanças na Versão 1.0.2

### ✅ **O que foi Removido:**
- Scripts de instalação automática do Oracle Client
- Hook `postinstall` que executava scripts de setup
- Pasta script e arquivos de instalação
- Dependências de modificações no sistema operacional

### ✅ **O que Permanece:**
- **Todos os nodes Oracle** (OracleDatabase, OracleDatabaseAdvanced, OracleVectorStore, ChatMemory)
- **Modo THIN** (recomendado) - funciona sem Oracle Client
- **Modo THICK** - funciona se Oracle Client estiver instalado manualmente
- **Auto-detecção inteligente** no código TypeScript
- **Connection pooling** e funcionalidades avançadas
- **Bulk operations** e PL/SQL executor
- **Vector Store** para Oracle 23ai
- **Transaction management**

---

## 🎯 Uso nos Nodes

### Configuração de Credenciais
- **Connection Mode:** Thin Mode (padrão) ou Thick Mode
- **Connection String:** `hostname:port/service_name` ou TNS
- **User/Password:** Credenciais do banco

### Nodes Disponíveis
1. **Oracle Database** - Operações SQL básicas
2. **Oracle Database Advanced** - PL/SQL, bulk ops, transações
3. **Oracle Vector Store** - Vector search com Oracle 23ai
4. **Chat Memory** - Gerenciamento de memória para chatbots

## 🔧 Troubleshooting

### Modo THIN não conecta
- Verificar string de conexão: `hostname:1521/XEPDB1`
- Verificar firewall/rede
- Testar conectividade: `telnet hostname 1521`

### Modo THICK não funciona
- Verificar se Oracle Client está instalado
- Configurar variáveis de ambiente (LD_LIBRARY_PATH/PATH)
- O node tentará fallback para THIN automaticamente

---

## 🏗️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Build
npm run build

# Desenvolvimento com watch
npm run dev

# Lint
npm run lint

# Validação completa
npm run validate
```

---

## 🤝 Contribuição

1. Fork o repositório
2. Criar branch para feature
3. Implementar mudanças
4. Executar `npm run validate`
5. Criar Pull Request

---

### **Apoie o Projeto:**

<div align="center">

### PIX:

<img src="image/README/qrcode-pix-jonatas.mei@outlook.com.png" alt="QR Code PIX" width="150" />

**Chave PIX:** jonatas.mei@outlook.com

### Doação em Criptomoeda

<table style="width:100%; border:none;">
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Bitcoin (BTC)</h4>
      <img src="image/README/btc.jpeg" alt="QR Code BTC" width="150" />
      <br>
      <code>bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll</code>
      <br>
      <a href="https://link.trustwallet.com/send?asset=c0&address=bc1qdq9rj7565c4fvr7t3xut6z0tjd65p4mudrc0ll">Pagar com Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Ethereum (ETH)</h4>
      <img src="image/README/eth.jpeg" alt="QR Code ETH" width="150" />
      <br>
      <code>0xA35A984401Ae9c81ca2d742977E603421df45419</code>
      <br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c60">Pagar com Trust Wallet</a>
    </td>
  </tr>
  <tr style="border:none;">
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Binance (BNB)</h4>
      <img src="image/README/bnb.jpeg" alt="QR Code BNB" width="150" />
      <br>
      <code>0xA35A984401Ae9c81ca2d742977E603421df45419</code>
      <br>
      <a href="https://link.trustwallet.com/send?address=0xA35A984401Ae9c81ca2d742977E603421df45419&asset=c20000714">Pagar com Trust Wallet</a>
    </td>
    <td style="text-align:center; padding:10px; border:none;">
      <h4>Polygon (POL)</h4>
      <img src="image/README/pol.jpeg" alt="QR Code POL" width="150" />
      <br>
      <code>0xA35A984401Ae9c81ca2d742977E603421df45419</code>
      <br>
      <a href="https://link.trustwallet.com/send?asset=c966&address=0xA35A984401Ae9c81ca2d742977E603421df45419">Pagar com Trust Wallet</a>
    </td>
  </tr>
</table>

</div>

---

## 📋 Arquivos Principais

```
src/
├── nodes/Oracle/           # Nodes n8n
│   ├── OracleDatabase.node.ts
│   ├── OracleDatabaseAdvanced.node.ts
│   ├── OracleVectorStore.node.ts
│   └── ChatMemory.node.ts
├── credentials/            # Credenciais
│   └── Oracle.credentials.ts
└── core/                  # Funcionalidades centrais
    ├── connection.ts      # Gerenciamento de conexão
    ├── connectionPool.ts  # Pool de conexões
    ├── bulkOperations.ts  # Operações em massa
    ├── plsqlExecutor.ts   # Executor PL/SQL
    └── transactionManager.ts
```

---

## 📝 Changelog

### v1.0.2
- ✅ Removido scripts de instalação Oracle Client
- ✅ Simplificada arquitetura de instalação
- ✅ Melhor compatibilidade com n8n community nodes
- ✅ Modo THIN como padrão
- ✅ Auto-detecção mantida no código TypeScript

### v1.0.1-rc.14
- ✅ Scripts de instalação automática (removidos em 1.0.2)
- ✅ Funcionalidades completas Oracle

---

## 📄 Licença

MIT License - veja LICENSE.md

---

## 👨‍💻 Mantenedor

**Jônatas Meireles Sousa Vieira**  
**Email:** jonatas.mei@outlook.com  
**GitHub:** https://github.com/jonales/n8n-nodes-oracle-database

---

<div align="center">

**⭐ Se este projeto foi útil, considere dar uma estrela! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/jonales/n8n-nodes-oracle-database.svg?style=social&label=Star)](https://github.com/jonales/n8n-nodes-oracle-database)
[![GitHub forks](https://img.shields.io/github/forks/jonales/n8n-nodes-oracle-database.svg?style=social&label=Fork)](https://github.com/jonales/n8n-nodes-oracle-database/fork)

**Made with ❤️ for Oracle & n8n communities**

</div>

</details>
