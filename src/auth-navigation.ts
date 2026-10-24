import type { WebContents } from "electron";

const AUTH_ORIGINS = new Set([
  "https://auth.openai.com",
  "https://auth0.openai.com",
  "https://auth.chatgpt.com",
  "https://accounts.google.com",
  "https://appleid.apple.com",
  "https://account.apple.com",
  "https://login.microsoftonline.com",
  "https://login.live.com",
]);

export function isAuthenticationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return !url.username && !url.password && AUTH_ORIGINS.has(url.origin);
  } catch {
    return false;
  }
}

function isChatUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return !url.username && !url.password && url.origin === "https://chatgpt.com";
  } catch {
    return false;
  }
}

/** Keep authentication windows on the opener's session, including POSTs and window.opener. */
export function installAuthNavigation(
  contents: WebContents,
  openChat: (url: string) => void,
  openExternal: (url: string) => void,
  authenticationWindow = false,
): void {
  const inAuthentication = (): boolean => authenticationWindow || isAuthenticationUrl(contents.getURL());
  contents.setWindowOpenHandler(({ url }) => {
    if (isAuthenticationUrl(url) || (inAuthentication() && (isChatUrl(url) || url === "about:blank"))) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 520,
          height: 760,
          autoHideMenuBar: true,
          webPreferences: {
            session: contents.session,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
          },
        },
      };
    }
    if (isChatUrl(url)) openChat(url);
    else if (!inAuthentication() && /^https?:\/\//.test(url)) openExternal(url);
    return { action: "deny" };
  });
  contents.on("did-create-window", (window) => {
    installAuthNavigation(window.webContents, openChat, openExternal, true);
  });
  const navigate = (event: { preventDefault(): void }, url: string): void => {
    if (isChatUrl(url) || isAuthenticationUrl(url)) return;
    event.preventDefault();
    // An unrecognized login destination must not split authentication into another browser.
    if (!inAuthentication() && /^https?:\/\//.test(url)) openExternal(url);
  };
  contents.on("will-navigate", navigate);
  contents.on("will-redirect", navigate);
}
