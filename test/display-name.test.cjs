const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanDisplayName, renamedLauncherContent, syncLauncherName, launcherOverridePath } = require('../dist/display-name.js');

assert.equal(cleanDisplayName('  My   Assistant '), 'My Assistant');
assert.equal(cleanDisplayName(''), null);
assert.equal(cleanDisplayName('x'.repeat(41)), null);
assert.equal(cleanDisplayName('Bad[name]'), null);
assert.equal(cleanDisplayName('Line\nbreak'), 'Line break', 'whitespace is collapsed');
assert.equal(cleanDisplayName('a=b'), null);

const system = [
  '[Desktop Entry]', 'Name=ChatGPT', 'Name[fr]=ChatGPT', 'Exec=chatgpt-desktop-linux --toggle %U',
  'Keywords=ChatGPT;OpenAI;AI;Assistant;', 'Actions=Toggle;', '',
  '[Desktop Action Toggle]', 'Name=Show or hide ChatGPT', 'Exec=chatgpt-desktop-linux --toggle', '',
].join('\n');
const renamed = renamedLauncherContent(system, 'Assistant');
assert.match(renamed, /^\[Desktop Entry\]\nName=Assistant\n/);
assert.doesNotMatch(renamed, /Name\[fr\]=ChatGPT/, 'translated names would override the chosen one');
assert.match(renamed, /^Keywords=AI;Assistant;$/m, 'brand keywords are removed so searching "ChatGPT" does not list it');
assert.match(renamed, /^Name=Show or hide ChatGPT$/m, 'actions keep their names');
assert.match(renamed, /^Exec=chatgpt-desktop-linux --toggle %U$/m);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgdl-launcher-'));
const systemLauncher = path.join(dir, 'system.desktop');
const overridePath = path.join(dir, 'applications', 'chatgpt-desktop-linux.desktop');
fs.writeFileSync(systemLauncher, system);
assert.equal(syncLauncherName('Assistant', { systemLauncher, overridePath }), true);
assert.match(fs.readFileSync(overridePath, 'utf8'), /Name=Assistant/);
assert.equal(syncLauncherName('Assistant', { systemLauncher, overridePath }), false, 'unchanged name rewrites nothing');
assert.equal(syncLauncherName('ChatGPT', { systemLauncher, overridePath }), true);
assert.equal(fs.existsSync(overridePath), false, 'default name removes the renamed launcher');

fs.mkdirSync(path.dirname(overridePath), { recursive: true });
fs.writeFileSync(overridePath, '[Desktop Entry]\nName=Hand made\n');
assert.equal(syncLauncherName('Assistant', { systemLauncher, overridePath }), false);
assert.equal(syncLauncherName('ChatGPT', { systemLauncher, overridePath }), false);
assert.equal(fs.readFileSync(overridePath, 'utf8'), '[Desktop Entry]\nName=Hand made\n', 'a launcher written by hand is never touched');

assert.equal(launcherOverridePath('/home/u', '/data'), '/data/applications/chatgpt-desktop-linux.desktop');
assert.equal(launcherOverridePath('/home/u', ''), '/home/u/.local/share/applications/chatgpt-desktop-linux.desktop');
console.log('Display name and launcher renaming passed.');
