#!/usr/bin/env node

/**
 * Script de sincronização de versão
 * Atualiza o README.md com a versão atual do package.json
 * 
 * Uso: npm run sync-version
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const readmePath = path.join(__dirname, '..', 'README.md');

try {
  // Ler versão do package.json
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const version = packageJson.version;

  // Ler README
  let readme = fs.readFileSync(readmePath, 'utf8');

  // Atualizar versão em inglês
  readme = readme.replace(
    /> \*\*Version [\d.]+\*\* — Official n8n build system/,
    `> **Version ${version}** — Official n8n build system`
  );

  // Atualizar versão em português
  readme = readme.replace(
    /> \*\*Versão [\d.]+\*\* — Build oficial n8n/,
    `> **Versão ${version}** — Build oficial n8n`
  );

  // Salvar README atualizado
  fs.writeFileSync(readmePath, readme, 'utf8');

  console.log(`✓ Versão sincronizada com sucesso: ${version}`);
  console.log(`✓ Arquivo atualizado: README.md`);
} catch (error) {
  console.error('✗ Erro ao sincronizar versão:', error.message);
  process.exit(1);
}
