# Oracle Client Installer

This script automates the download and extraction of the Oracle Instant Client for use with the 'Thick' connection mode in the n8n-nodes-oracle-database.

## Usage

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the installer:**
    ```bash
    npm run install:oracle-client
    ```

The script will:
- Detect your operating system (Windows, Linux, or macOS).
- Download the appropriate Oracle Instant Client version.
- Extract it to the `.oracledb` directory in the project root.
- Clean up the downloaded zip file.

After running the script, the path to the extracted client will be printed. Use this path in the 'Oracle Client Directory' field in your n8n credentials.
