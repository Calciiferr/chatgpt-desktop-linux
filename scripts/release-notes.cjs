'use strict';
const fs = require('node:fs');
const path = require('node:path');
const repository = 'https://github.com/Calciiferr/chatgpt-desktop-linux';
function releaseNotes(markdown, version) {
  if (!/^\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?$/.test(version)) throw new Error('Version de release invalide.');
  const headings = [...markdown.matchAll(/^## (\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?)(.*)$/gm)];
  const index = headings.findIndex(match => match[1] === version);
  if (index < 0) throw new Error(`CHANGELOG.md ne contient pas la version ${version}.`);
  const heading = headings[index];
  if (heading[2].trim()) throw new Error('La version doit être marquée comme publiée dans CHANGELOG.md.');
  const body = markdown.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? markdown.length).trim();
  if (!body || !/^[-*] /m.test(body)) throw new Error('Notes de version absentes ou sans changements détaillés.');
  const previous = headings[index + 1]?.[1];
  return body + (previous ? `\n\n**Différences du code :** [v${previous} → v${version}](${repository}/compare/v${previous}...v${version})` : '') + '\n';
}
if (require.main === module) {
  try { process.stdout.write(releaseNotes(fs.readFileSync(path.join(__dirname, '../CHANGELOG.md'), 'utf8'), process.argv[2] || require('../package.json').version)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { releaseNotes };
