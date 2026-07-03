const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(projectRoot, "release");
const archiveDir = path.join(releaseDir, "OLD");
const { version } = require(path.join(projectRoot, "package.json"));

const requestedTargets = new Set(process.argv.slice(2));
const supportedTargets = new Map([
  ["deb", ".deb"],
  ["appimage", ".AppImage"],
]);

if (
  requestedTargets.size === 0 ||
  [...requestedTargets].some((target) => !supportedTargets.has(target))
) {
  console.error("Usage: node scripts/archive-release.cjs deb|appimage [deb|appimage]");
  process.exit(1);
}

fs.mkdirSync(archiveDir, { recursive: true });

const extensions = new Set(
  [...requestedTargets].map((target) => supportedTargets.get(target)),
);
const artifacts = fs
  .readdirSync(releaseDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && [...extensions].some((extension) => entry.name.endsWith(extension)))
  .map((entry) => entry.name);

const currentVersionArtifacts = artifacts.filter(
  (fileName) => fileName.includes(`-${version}-`) || fileName.includes(`-${version}.`),
);
if (currentVersionArtifacts.length > 0) {
  console.error(
    `Build ${version} refusé : un artefact de cette version existe déjà dans release/ (${currentVersionArtifacts.join(", ")}). Incrémentez d’abord la version.`,
  );
  process.exit(1);
}

for (const fileName of artifacts) {
  const source = path.join(releaseDir, fileName);
  const destination = path.join(archiveDir, fileName);
  if (fs.existsSync(destination)) {
    console.error(`Archivage refusé : ${destination} existe déjà.`);
    process.exit(1);
  }
  fs.renameSync(source, destination);
  console.log(`Ancien artefact archivé : release/OLD/${fileName}`);
}
