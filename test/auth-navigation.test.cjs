const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { installAuthNavigation, isAuthenticationUrl } = require('../dist/auth-navigation.js');
class Contents extends EventEmitter {
  constructor(url, session = {}) { super(); this.url = url; this.session = session; }
  getURL() { return this.url; }
  setWindowOpenHandler(handler) { this.open = handler; }
}
const external = [], chats = [];
const contents = new Contents('https://chatgpt.com/');
installAuthNavigation(contents, url => chats.push(url), url => external.push(url));
for (const name of ['will-navigate', 'will-redirect']) {
  for (const url of ['https://auth.openai.com/log-in', 'https://accounts.google.com/signin', 'https://chatgpt.com/api/auth/callback']) {
    let blocked = false;
    contents.emit(name, { preventDefault() { blocked = true; } }, url);
    assert.equal(blocked, false, `${name} must preserve ${url}`);
  }
}
const popup = contents.open({ url: 'https://auth.openai.com/log-in', postBody: { data: [] } });
assert.equal(popup.action, 'allow', 'Electron must handle the original popup request, including POST and opener');
assert.equal(popup.overrideBrowserWindowOptions.webPreferences.session, contents.session);
assert.equal(popup.overrideBrowserWindowOptions.webPreferences.nodeIntegration, false);
const child = new Contents('https://auth.openai.com/log-in', contents.session);
contents.emit('did-create-window', { webContents: child });
assert.equal(child.open({ url: 'https://chatgpt.com/api/auth/callback' }).action, 'allow');
assert.equal(child.open({ url: 'about:blank' }).action, 'allow');
for (const url of ['https://auth.openai.com.evil.example/', 'https://auth.openai.com@evil.example/', 'http://auth.openai.com/', 'https://auth.openai.com:444/', 'javascript:alert(1)']) {
  assert.equal(isAuthenticationUrl(url), false);
  let blocked = false;
  child.emit('will-redirect', { preventDefault() { blocked = true; } }, url);
  assert.equal(blocked, true);
  assert.equal(child.open({ url }).action, 'deny');
}
assert.equal(external.length, 0, 'authentication must never escape to an external browser');
contents.open({ url: 'https://example.org/' });
assert.deepEqual(external, ['https://example.org/']);
contents.open({ url: 'https://chatgpt.com/c/example' });
assert.deepEqual(chats, ['https://chatgpt.com/c/example']);
contents.url = 'https://auth.openai.com/mfa';
contents.emit('will-navigate', { preventDefault() {} }, 'https://unknown-login.example/');
assert.equal(external.length, 1, 'same-tab authentication must also stay internal');
console.log('Authentication navigation tests: OK');
