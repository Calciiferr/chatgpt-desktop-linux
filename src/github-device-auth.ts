export const GITHUB_CLIENT_ID = "Iv23lig9BQ3yGk6wVceN";
export interface GitHubSession { accessToken: string; refreshToken: string; expiresAt: number; refreshExpiresAt: number }
interface DeviceSession { deviceCode: string; expiresAt: number; interval: number; controller: AbortController; polling: boolean }
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new Error("Connexion annulée.")); return; }
  const abort = () => { clearTimeout(timer); reject(new Error("Connexion annulée.")); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
  signal.addEventListener("abort", abort, { once: true });
});
export class GitHubLoginExpiredError extends Error {}
export class GitHubDeviceAuth {
  private device: DeviceSession | null = null;
  private refresh: Promise<string> | null = null;
  constructor(private load: () => GitHubSession | null, private save: (session: GitHubSession | null) => void, private pause = sleep) {}
  cancel(): void { this.device?.controller.abort(); this.device = null; }
  disconnect(): void { this.cancel(); this.save(null); }
  private async post(endpoint: "device/code" | "oauth/access_token", fields: Record<string, string>, signal?: AbortSignal): Promise<any> {
    const response = await fetch(`https://github.com/login/${endpoint}`, {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: GITHUB_CLIENT_ID, ...fields }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Connexion GitHub indisponible (HTTP ${response.status}). Réessayez.`);
    return response.json();
  }
  async start(): Promise<{ code: string; url: string; expiresAt: number }> {
    this.cancel();
    const controller = new AbortController();
    const device: DeviceSession = { deviceCode: "", expiresAt: 0, interval: 5, controller, polling: false };
    this.device = device;
    try {
      const data = await this.post("device/code", {}, controller.signal);
      if (controller.signal.aborted) throw new Error("Connexion annulée.");
      if (!data.device_code || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(data.user_code || "") ||
        data.verification_uri !== "https://github.com/login/device" || !Number.isFinite(data.expires_in) || data.expires_in <= 0) {
        throw new Error("Impossible de démarrer la connexion GitHub. Réessayez.");
      }
      device.deviceCode = data.device_code;
      device.expiresAt = Date.now() + Math.min(data.expires_in, 1800) * 1000;
      device.interval = Number.isFinite(data.interval) ? Math.max(5, Math.min(data.interval, 60)) : 5;
      return { code: data.user_code, url: data.verification_uri, expiresAt: device.expiresAt };
    } catch (error) { if (this.device === device) this.device = null; throw error; }
  }
  private session(data: any): GitHubSession {
    if (typeof data.access_token !== "string" || !data.access_token || !data.refresh_token ||
      !Number.isFinite(data.expires_in) || data.expires_in <= 0 ||
      !Number.isFinite(data.refresh_token_expires_in) || data.refresh_token_expires_in <= 0) {
      throw new Error("Connexion GitHub expirée ou refusée. Reconnectez-vous.");
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000, refreshExpiresAt: Date.now() + data.refresh_token_expires_in * 1000 };
  }
  async complete(): Promise<void> {
    const device = this.device;
    if (!device?.deviceCode || device.polling) throw new Error("Démarrez une nouvelle connexion GitHub.");
    device.polling = true;
    try {
      while (Date.now() < device.expiresAt) {
        await this.pause(device.interval * 1000, device.controller.signal);
        if (Date.now() >= device.expiresAt) throw new Error("Le code GitHub a expiré. Recommencez la connexion.");
        const data = await this.post("oauth/access_token", { device_code: device.deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }, device.controller.signal);
        if (device.controller.signal.aborted) throw new Error("Connexion annulée.");
        if (data.error === "authorization_pending") continue;
        if (data.error === "slow_down") { device.interval = Math.max(device.interval + 5, Number(data.interval) || 0); continue; }
        if (data.error === "access_denied") throw new Error("Autorisation refusée sur GitHub.");
        if (data.error) throw new Error("Code GitHub expiré ou invalide. Recommencez la connexion.");
        this.save(this.session(data));
        return;
      }
      throw new Error("Le code GitHub a expiré. Recommencez la connexion.");
    } finally { if (this.device === device) this.device = null; }
  }
  async verify(): Promise<string> {
    const token = await this.token();
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 401) throw new GitHubLoginExpiredError("Connexion GitHub révoquée ou expirée. Reconnectez-vous.");
    if (!response.ok) throw new Error("Impossible de vérifier la connexion GitHub pour le moment. Réessayez.");
    const user = await response.json() as { login?: string };
    if (typeof user.login !== "string" || !user.login) throw new Error("Réponse GitHub invalide.");
    return user.login;
  }
  async token(): Promise<string> {
    const session = this.load();
    if (!session) throw new Error("Cliquez sur Se connecter à GitHub dans les paramètres.");
    if (session.expiresAt > Date.now() + 60_000) return session.accessToken;
    if (session.refreshExpiresAt <= Date.now()) throw new GitHubLoginExpiredError("Votre connexion GitHub a expiré. Reconnectez-vous dans les paramètres.");
    if (!this.refresh) this.refresh = (async () => {
      const data = await this.post("oauth/access_token", { refresh_token: session.refreshToken, grant_type: "refresh_token" });
      // A disconnect during renewal must not restore the session.
      if (this.load()?.refreshToken !== session.refreshToken) throw new Error("Connexion GitHub annulée.");
      if (data.error) throw new GitHubLoginExpiredError("Connexion GitHub expirée ou révoquée. Reconnectez-vous.");
      const next = this.session(data);
      this.save(next);
      return next.accessToken;
    })().finally(() => { this.refresh = null; });
    return this.refresh;
  }
}
