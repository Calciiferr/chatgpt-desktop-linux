const assert = require('node:assert/strict');
const { validateDebianMetadata, installDebianPackage } = require('../dist/debian-update.js');
const metadata = 'Package: chatgpt-desktop-linux\nVersion: 0.7.0~beta.32\nArchitecture: amd64\n';
validateDebianMetadata(metadata, '0.7.0-beta.32');
assert.throws(() => validateDebianMetadata(metadata.replace('amd64', 'arm64'), '0.7.0-beta.32'));
assert.throws(() => validateDebianMetadata(metadata.replace('chatgpt-desktop-linux', 'other-package'), '0.7.0-beta.32'));
assert.throws(() => validateDebianMetadata(metadata, '0.7.0-beta.31'));
(async () => {
  const calls = [];
  const run = async (command, args) => {
    calls.push({ command, args });
    return { code: 0, output: command.endsWith('dpkg-deb') ? metadata : command.endsWith('dpkg-query') ? 'install ok installed\n0.7.0~beta.32' : '' };
  };
  await installDebianPackage('/tmp/test package.deb', '0.7.0-beta.32', () => {}, run);
  assert.deepEqual(calls.map(c => c.command), ['/usr/bin/dpkg-deb', '/usr/bin/pkexec', '/usr/bin/dpkg-query']);
  assert.ok(calls[1].args.includes('--no-remove'));
  assert.equal(calls[1].args.at(-1), '/tmp/test package.deb', 'package path is one argument, no shell interpolation');
  await assert.rejects(() => installDebianPackage('/tmp/test.deb', '0.7.0-beta.32', () => {}, async command => command.endsWith('pkexec') ? { code: 126, output: '' } : { code: 0, output: metadata }), /cancelled or denied/);
  await assert.rejects(() => installDebianPackage('/tmp/test.deb', '0.7.0-beta.32', () => {}, async command => command.endsWith('dpkg-query') ? { code: 0, output: 'install ok installed\n0.7.0~beta.31' } : { code: 0, output: command.endsWith('dpkg-deb') ? metadata : '' }), /could not be confirmed/);
  console.log('Debian update command and result verification tests passed. No installation executed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
