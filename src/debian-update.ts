import { spawn } from "node:child_process";
import path from "node:path";
export interface CommandResult { code: number; output: string }
export function runUpdateCommand(command: string, args: string[], output: (text: string) => void = () => {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, env: { ...process.env, LC_ALL: "C" }, stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    const receive = (chunk: Buffer) => { const part = chunk.toString(); text = (text + part).slice(-24_000); output(part); };
    child.stdout.on("data", receive); child.stderr.on("data", receive);
    child.once("error", () => reject(new Error(`Impossible de lancer ${path.basename(command)}. Vérifiez sa présence sur cet ordinateur.`)));
    child.once("close", code => resolve({ code: code ?? -1, output: text }));
  });
}
export function debianVersion(version: string): string { return version.replace("-", "~"); }
export function validateDebianMetadata(text: string, expected: string): void {
  const fields = Object.fromEntries(text.trim().split("\n").map(line => {
    const colon = line.indexOf(":"); return [line.slice(0, colon), line.slice(colon + 1).trim()];
  }));
  if (fields.Package !== "chatgpt-desktop-linux" || fields.Version !== debianVersion(expected) || fields.Architecture !== "amd64") {
    throw new Error("Le paquet ne correspond pas à l’application, à la version attendue ou à l’architecture. Installation annulée.");
  }
}
export async function installDebianPackage(file: string, expected: string, output: (text: string) => void, run = runUpdateCommand): Promise<void> {
  if (!path.isAbsolute(file) || !file.endsWith(".deb")) throw new Error("Chemin du paquet invalide.");
  const metadata = await run("/usr/bin/dpkg-deb", ["-f", file, "Package", "Version", "Architecture"]);
  if (metadata.code !== 0) throw new Error("Impossible de lire le paquet Debian téléchargé.");
  validateDebianMetadata(metadata.output, expected);
  const installed = await run("/usr/bin/pkexec", ["--disable-internal-agent", "/usr/bin/apt-get", "-y", "--no-remove", "-o", "DPkg::Lock::Timeout=60", "-o", "Dpkg::Options::=--force-confdef", "-o", "Dpkg::Options::=--force-confold", "install", file], output);
  if (installed.code !== 0) {
    if ([126, 127].includes(installed.code)) throw new Error("Autorisation système annulée ou refusée. Aucun succès d’installation confirmé. Vous pouvez réessayer.");
    throw new Error(`L’installation Debian a échoué (code ${installed.code}). Consultez les détails ci-dessous.`);
  }
  const result = await run("/usr/bin/dpkg-query", ["-W", "-f=${Status}\\n${Version}", "chatgpt-desktop-linux"]);
  if (result.code !== 0 || result.output.trim() !== `install ok installed\n${debianVersion(expected)}`) throw new Error("L’installateur s’est terminé, mais la nouvelle version n’a pas pu être confirmée.");
}
