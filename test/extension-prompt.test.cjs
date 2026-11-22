const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const packageJson = require('../package.json');

// The prompt exists in each interface language and keeps every rule the app enforces.
for (const file of ['extension-prompt.md', 'extension-prompt.fr.md', 'extension-prompt.es.md']) {
  const text = fs.readFileSync(path.join(__dirname, '..', 'docs', file), 'utf8');
  for (const rule of ['"manifest_version": 3', 'content_scripts', 'https://chatgpt.com/', '"storage"', 'background', 'chrome.storage.local', '.zip', 'manifest.json']) {
    assert.ok(text.includes(rule), `${file} mentions ${rule}`);
  }
}
assert.ok(packageJson.build.files.includes('docs/extension-prompt*.md'), 'the prompts are packaged');
console.log('Extension prompts passed.');
