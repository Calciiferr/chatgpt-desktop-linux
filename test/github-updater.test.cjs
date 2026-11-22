const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { compareVersions, selectUpdate, latestCompatibleRelease, releaseComparison, verifyDownload, GitHubUpdater } = require('../dist/github-updater.js');
const body = Buffer.from('test package');
const digest = 'sha256:' + createHash('sha256').update(body).digest('hex');
const release = { tag_name: 'v0.7.0-beta.27', prerelease: true, html_url: 'https://github.com/Calciiferr/chatgpt-desktop-linux/releases/tag/v0.7.0-beta.27', assets: [{ id: 123, name: 'ChatGPT-Desktop-Linux-0.7.0-beta.27-amd64.deb', size: body.length, digest }] };
assert.ok(compareVersions('0.7.0-beta.27', '0.7.0-beta.9') > 0);
assert.ok(compareVersions('0.7.0', '0.7.0-beta.99') > 0);
assert.equal(compareVersions('v0.7.0-beta.27', '0.7.0-beta.27'), 0);
assert.equal(selectUpdate([release], '0.7.0'), null, 'stable installations skip prereleases');
assert.equal(selectUpdate([release], '0.7.0-beta.27'), null, 'no reinstall of current release');
assert.equal(selectUpdate([{ ...release, draft: true }], '0.7.0-beta.26'), null);
const selected = selectUpdate([release], '0.7.0-beta.26');
assert.equal(selected.version, '0.7.0-beta.27');
assert.equal(releaseComparison(latestCompatibleRelease([release], '0.7.0-beta.29'), '0.7.0-beta.29').state, 'ahead');
assert.equal(releaseComparison(selected, '0.7.0-beta.27').state, 'current');
assert.equal(releaseComparison(selected, '0.7.0-beta.26').state, 'available');
assert.equal(releaseComparison(null, '0.7.0-beta.29').state, 'unavailable');
assert.equal(releaseComparison(selected, '0.7.0-beta.29').latest, '0.7.0-beta.27');
assert.equal(releaseComparison(selected, '0.7.0-beta.26').pageUrl, release.html_url, 'non-deb installs open the release page');
assert.match(releaseComparison(null, '0.7.0').pageUrl, /\/releases\/latest$/);

assert.throws(() => verifyDownload(body.length, 'sha256:wrong', selected), /SHA-256/);
assert.throws(() => verifyDownload(1, digest, selected), /size/);
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-updater-test-'));
  const original = global.fetch;
  try {
    const updater = new GitHubUpdater(dir);
    await assert.rejects(() => updater.download(), /Check for an available update first/);
    global.fetch = async (url, options) => {
      assert.ok(url.startsWith('https://api.github.com/repos/Calciiferr/chatgpt-desktop-linux/'));
      assert.equal(options.headers.Authorization, undefined, 'the public repository needs no account');
      return new Response(url.includes('/assets/') ? body : JSON.stringify([release]), { status: 200 });
    };
    await updater.check('0.7.0-beta.26');
    const target = await updater.download();
    assert.deepEqual(fs.readFileSync(target), body);
    fs.unlinkSync(target);
    global.fetch = async () => new Response(Buffer.from('bad'), { status: 200 });
    await assert.rejects(() => updater.download(), /SHA-256/);
    assert.deepEqual(fs.readdirSync(dir), [], 'failed downloads leave no installable or partial file');
    global.fetch = async () => new Response('', { status: 403 });
    await assert.rejects(() => updater.check('0.7.0-beta.26'), /limiting requests/);
    await assert.rejects(() => updater.download(), /Check for an available update first/, 'failed check clears stale update');
    global.fetch = async () => new Response(JSON.stringify([release]));
    await updater.check('0.7.0-beta.26');
    global.fetch = async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true });
    });
    const downloading = updater.download();
    await assert.rejects(() => updater.check('0.7.0-beta.26'), /already in progress/);
    updater.cancel();
    await assert.rejects(() => downloading, /Cancelled/);
    assert.deepEqual(fs.readdirSync(dir), []);
    console.log('GitHub updater tests passed.');
  } finally { global.fetch = original; fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
