const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { readZip, extensionFiles, validateManifest, extensionIdFromName, UserExtensions } = require('../dist/user-extensions.js');

// Minimal zip writer for the tests (deflate or stored).
function makeZip(files, { deflate = true } = {}) {
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const body = deflate ? zlib.deflateRawSync(data) : data;
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(body.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, body); centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const manifest = { manifest_version: 3, name: 'Hello World', version: '1.0.0', description: 'Says hello', author: 'Dev',
  permissions: ['storage'], content_scripts: [{ matches: ['https://chatgpt.com/*'], js: ['content.js'] }] };
const files = { 'manifest.json': JSON.stringify(manifest), 'content.js': 'console.log(1)' };

// Reading archives
const entries = readZip(makeZip(files));
assert.equal(entries.find((e) => e.name === 'content.js').data.toString(), 'console.log(1)');
assert.equal(readZip(makeZip(files, { deflate: false })).length, 2);
assert.throws(() => readZip(Buffer.from('not a zip at all, definitely not')), /not a valid .zip/);

// Files: root or single top-level folder; unsafe paths refused
assert.ok(extensionFiles(readZip(makeZip({ 'hello/manifest.json': '{}', 'hello/content.js': '' }))).has('manifest.json'));
assert.throws(() => extensionFiles(readZip(makeZip({ '../evil.js': 'x', 'manifest.json': '{}' }))), /unsafe/);
assert.throws(() => extensionFiles(readZip(makeZip({ 'content.js': '' }))), /no manifest.json/);

// Manifest rules
const has = () => true;
assert.equal(validateManifest(manifest, has).name, 'Hello World');
assert.throws(() => validateManifest({ ...manifest, manifest_version: 2 }, has), /manifest_version must be 3/);
assert.throws(() => validateManifest({ ...manifest, background: { service_worker: 'bg.js' } }, has), /not allowed/);
assert.throws(() => validateManifest({ ...manifest, permissions: ['tabs'] }, has), /Only the "storage" permission/);
assert.throws(() => validateManifest({ ...manifest, host_permissions: ['https://example.com/*'] }, has), /only run on https:\/\/chatgpt.com/);
assert.throws(() => validateManifest({ ...manifest, content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'] }] }, has), /only run on/);
assert.throws(() => validateManifest(manifest, () => false), /is missing/);
assert.equal(extensionIdFromName('Héllo World!'), 'hello-world');

// Install, list, disable, replace, remove
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgdl-ext-'));
const zipPath = path.join(dir, 'hello.zip');
fs.writeFileSync(zipPath, makeZip(files));
const store = new UserExtensions(path.join(dir, 'extensions'));
const inspected = store.inspect(zipPath);
assert.equal(inspected.id, 'hello-world');
assert.equal(inspected.exists, false);
store.install(inspected);
assert.deepEqual(store.list([]).map((e) => [e.id, e.enabled]), [['hello-world', true]]);
assert.equal(store.list(['hello-world'])[0].enabled, false);
assert.equal(store.inspect(zipPath).exists, true, 'reinstalling is detected as a replacement');
fs.mkdirSync(path.join(dir, 'extensions', 'broken'));
assert.match(store.list([]).find((e) => e.id === 'broken').error, /manifest.json/);
store.remove('hello-world');
assert.equal(store.list([]).some((e) => e.id === 'hello-world'), false);
assert.throws(() => store.folder('../etc'), /Invalid extension/);
console.log('Custom extension install and rules passed.');
