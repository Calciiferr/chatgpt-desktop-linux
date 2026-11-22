const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveUserDataDirectory } = require('../dist/data-migration.js');

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cgdl-migration-'));
}
function writeLegacy(root, settings = { globalShortcut: 'Ctrl+Alt+G', tabBarMode: 'auto' }) {
  const legacy = path.join(root, 'ChatGPT');
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, 'settings.json'), JSON.stringify(settings));
  fs.writeFileSync(path.join(legacy, 'Cookies'), 'session');
  return legacy;
}

{
  const root = fixture();
  assert.equal(resolveUserDataDirectory(root), path.join(root, 'chatgpt-desktop-linux'));
  assert.equal(fs.existsSync(path.join(root, 'chatgpt-desktop-linux')), false, 'fresh install creates nothing itself');
}
{
  const root = fixture();
  writeLegacy(root);
  const result = resolveUserDataDirectory(root, 'host');
  assert.equal(result, path.join(root, 'chatgpt-desktop-linux'));
  assert.equal(fs.readFileSync(path.join(result, 'Cookies'), 'utf8'), 'session', 'session moved');
  assert.equal(fs.existsSync(path.join(root, 'ChatGPT')), false);
}
{
  const root = fixture();
  writeLegacy(root, { theme: 'dark' });
  assert.equal(resolveUserDataDirectory(root, 'host'), path.join(root, 'chatgpt-desktop-linux'));
  assert.ok(fs.existsSync(path.join(root, 'ChatGPT')), 'foreign ChatGPT folder is left alone');
}
{
  const root = fixture();
  const legacy = writeLegacy(root);
  fs.symlinkSync(`host-${process.pid}`, path.join(legacy, 'SingletonLock'));
  assert.equal(resolveUserDataDirectory(root, 'host'), legacy, 'running old instance keeps its folder');
}
{
  const root = fixture();
  const legacy = writeLegacy(root);
  fs.symlinkSync('host-999999999', path.join(legacy, 'SingletonLock'));
  assert.equal(resolveUserDataDirectory(root, 'host'), path.join(root, 'chatgpt-desktop-linux'), 'stale lock is ignored');
}
{
  const root = fixture();
  writeLegacy(root);
  fs.mkdirSync(path.join(root, 'chatgpt-desktop-linux'));
  assert.equal(resolveUserDataDirectory(root, 'host'), path.join(root, 'chatgpt-desktop-linux'));
  assert.ok(fs.existsSync(path.join(root, 'ChatGPT')), 'never overwrites an existing new folder');
}
console.log('User data migration passed.');
