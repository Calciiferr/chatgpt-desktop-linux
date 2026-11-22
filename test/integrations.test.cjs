const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  syncMagicBarIntegrations, dolphinServiceMenuPath, kateToolPath, dolphinServiceMenuContent,
} = require('../dist/text-integrations.js');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cgdl-integrations-'));
const exe = '/opt/ChatGPT Desktop Linux/chatgpt-desktop-linux';

syncMagicBarIntegrations(exe, true, 'en', home);
const menu = dolphinServiceMenuPath(home);
assert.ok(fs.existsSync(menu), 'Dolphin entry installed while the Magic Bar is enabled');
assert.equal(fs.statSync(menu).mode & 0o111, 0o111, 'KDE requires user service menus to be executable');
assert.match(fs.readFileSync(menu, 'utf8'), /^Exec="\/opt\/ChatGPT Desktop Linux\/chatgpt-desktop-linux" --source Dolphin --attach %F$/m);
assert.match(dolphinServiceMenuContent('/usr/bin/chatgpt-desktop-linux'), /^Exec=\/usr\/bin\/chatgpt-desktop-linux --source/m);

syncMagicBarIntegrations(exe, false, 'en', home);
assert.equal(fs.existsSync(menu), false, 'Dolphin entry removed when the Magic Bar is disabled');
assert.equal(fs.existsSync(kateToolPath(home)), false, 'Kate tool removed when the Magic Bar is disabled');

fs.writeFileSync(menu, 'installed app');
syncMagicBarIntegrations(null, false, 'en', home);
assert.equal(fs.readFileSync(menu, 'utf8'), 'installed app', 'development builds leave the installed integrations alone');
console.log('Magic Bar desktop integrations passed.');
