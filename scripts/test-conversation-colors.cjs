const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ConversationColorStore } = require('../dist/conversation-colors.js');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'conversation-colors-'));
try {
  const file = path.join(directory, 'colors.json');
  const store = new ConversationColorStore(file);
  assert.deepEqual(store.load(), {});
  store.set('6ada5bfc-cea4-83ed-8e6e-e4a918b32a70', '#Aa22Bb');
  assert.deepEqual(new ConversationColorStore(file).load(), { '6ada5bfc-cea4-83ed-8e6e-e4a918b32a70': '#aa22bb' });
  store.set('6ad5b8c0-a9d0-83ed-8ca1-b648891a9125', '#123456');
  assert.equal(Object.keys(store.load()).length, 2, 'same names cannot merge distinct conversation ids');
  const before = fs.readFileSync(file, 'utf8');
  for (const color of ['red', 'url(https://example.com)', '#123', '#123456;display:none', 12]) assert.throws(() => store.set('conversation-123', color));
  for (const id of ['../../bad', '__proto__', '', null]) assert.throws(() => store.set(id, '#123456'));
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'invalid writes preserve saved choices');
  store.set('6ada5bfc-cea4-83ed-8e6e-e4a918b32a70', null);
  assert.equal(Object.keys(store.load()).length, 1, 'reset affects only the chosen conversation');
  fs.writeFileSync(file, JSON.stringify({ 'safe-id-123': '#123456', '../bad': '#ffffff', 'safe-id-456': 'red' }));
  assert.deepEqual(store.load(), { 'safe-id-123': '#123456' });
  console.log('Conversation color persistence and validation tests passed.');
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
