# Guia de Configuração do Ambiente para o n8n-nodes-oracle-database

Para utilizar os nós Oracle no n8n, é necessário ter o **Oracle Instant Client** instalado e configurado corretamente no ambiente onde o n8n está sendo executado. Este guia fornece as instruções para preparar seu ambiente.

## Passo 1: Baixar o Oracle Instant Client

O `oracledb`, driver Node.js para o Oracle, requer as bibliotecas do Oracle Instant Client para se comunicar com o banco de dados. Este é um pré-requisito obrigatório.

Faça o download do pacote **"Basic"** ou **"Basic Light"** compatível com a arquitetura do seu sistema operacional na página oficial da Oracle:

- **[Oracle Instant Client Downloads](https://www.oracle.com/database/technologies/instant-client/downloads.html)**

Selecione a versão correta para o seu sistema (Linux x64, Windows x64, macOS, etc.).

## Passo 2: Instalar o Oracle Instant Client

O processo de instalação consiste em descompactar o arquivo baixado em um diretório permanente e configurar as variáveis de ambiente para que o n8n possa encontrar as bibliotecas.

### Linux

1.  **Descompacte o arquivo:**
    Crie um diretório e descompacte o arquivo ZIP nele.

    ```bash
    mkdir -p /opt/oracle
    unzip instantclient-basic-linux.x64-*.zip -d /opt/oracle/
    ```

2.  **Configure a variável de ambiente `LD_LIBRARY_PATH`:**
    Adicione o caminho do Instant Client à variável `LD_LIBRARY_PATH`. É recomendável adicionar esta linha ao seu perfil de shell (ex: `~/.bashrc`, `~/.zshrc`) para que a configuração seja permanente.

    ```bash
    export LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4:$LD_LIBRARY_PATH
    ```

    *Observação: Substitua `instantclient_23_4` pelo nome exato do diretório que foi criado ao descompactar o arquivo.*

3.  **Recarregue o perfil ou reinicie o terminal:**
    ```bash
    source ~/.bashrc
    ```

### Windows

1.  **Descompacte o arquivo:**
    Crie um diretório e descompacte o arquivo ZIP nele (ex: `C:\oracle\instantclient_21_12`).

2.  **Adicione o diretório ao PATH do sistema:**
    - Pesquise por "Editar as variáveis de ambiente do sistema" no menu Iniciar.
    - Clique em "Variáveis de Ambiente...".
    - Na seção "Variáveis do sistema", selecione a variável `Path` e clique em "Editar".
    - Clique em "Novo" e adicione o caminho para o diretório do Instant Client (ex: `C:\oracle\instantclient_21_12`).
    - Clique em "OK" em todas as janelas.

3.  **Reinicie o n8n (e talvez o sistema):**
    Pode ser necessário reiniciar o processo do n8n ou até mesmo o computador para que a nova variável de ambiente seja reconhecida.

### macOS

1.  **Descompacte o arquivo:**
    O processo é similar ao do Linux. Descompacte o arquivo em um local apropriado.

    ```bash
    mkdir -p /opt/oracle
    unzip instantclient-basic-macos.*.zip -d /opt/oracle/
    ```

2.  **Configure a variável de ambiente `DYLD_LIBRARY_PATH`:**
    Adicione o caminho ao seu `~/.zshrc` ou `~/.bash_profile`.

    ```bash
    export DYLD_LIBRARY_PATH=/opt/oracle/instantclient_19_8:$DYLD_LIBRARY_PATH
    ```
    *Observação: Substitua o nome do diretório pela versão correta.*

## Passo 3: Configuração de TNS (Opcional)

Se você utiliza `tnsnames.ora` para gerenciar as conexões, você pode configurar a variável de ambiente `TNS_ADMIN` para apontar para o diretório que contém seus arquivos de configuração (`tnsnames.ora`, `sqlnet.ora`).

- **Linux/macOS:** `export TNS_ADMIN=/path/to/your/config/files`
- **Windows:** Adicione `TNS_ADMIN` como uma variável de ambiente do sistema.

## Passo 4: Reinicie o n8n

Após a instalação e configuração, reinicie sua instância do n8n para garantir que as novas variáveis de ambiente sejam carregadas.

Com o ambiente preparado, você pode agora configurar suas credenciais Oracle no n8n e começar a usar os nós.
