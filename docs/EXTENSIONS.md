# Creating extensions

Custom extensions add features to the ChatGPT page inside ChatGPT Desktop Linux. They are web extensions in the Chrome **Manifest V3** format, limited to the ChatGPT page: they can read and change it, but never access your files, run programs or change the application itself.

Don't write code? Use **Settings → Extensions → Create with ChatGPT**, or **Copy the AI prompt** to use it with another assistant. The prompt contains the same rules as this guide: [extension-prompt.md](extension-prompt.md).

## Quick start

1. Create a folder with two files:

   `manifest.json`

   ```json
   {
     "manifest_version": 3,
     "name": "Hello",
     "version": "1.0.0",
     "description": "Adds a greeting above the message box.",
     "author": "Your name",
     "content_scripts": [
       { "matches": ["https://chatgpt.com/*"], "js": ["content.js"], "run_at": "document_idle" }
     ]
   }
   ```

   `content.js`

   ```js
   const observer = new MutationObserver(() => {
     const form = document.querySelector("form");
     if (!form || document.getElementById("hello-extension")) return;
     const note = document.createElement("div");
     note.id = "hello-extension";
     note.textContent = "Hello from my extension!";
     form.before(note);
   });
   observer.observe(document.body, { childList: true, subtree: true });
   ```

2. Zip the files, with `manifest.json` at the root of the archive:

   ```bash
   zip -r hello.zip manifest.json content.js
   ```

3. In the application, open **Settings → Extensions → Add an extension…** and choose `hello.zip`.

## Rules

The application checks every extension when it is installed and when it starts. An extension that breaks a rule is not loaded, and Settings shows why.

| | |
| --- | --- |
| Format | `manifest_version` 3, a `name` (60 characters at most) and a `version` such as `1.0.0` |
| Where it runs | `content_scripts` only, with `matches` patterns starting with `https://chatgpt.com/` |
| Permissions | `storage` only; `host_permissions` limited to `https://chatgpt.com/` |
| Not allowed | `background`, `action` and popups, options pages, `chrome_url_overrides`, `devtools_page`, `externally_connectable` |
| Storage | `chrome.storage.local` (`chrome.storage.sync` is not available) |
| Files | every file listed in the manifest must be in the archive; the .zip is limited to 20 MB |

Most other `chrome.*` APIs are not available in the application. Keep to the page's DOM and `chrome.storage.local`.

## Developing

Installed extensions live in `~/.config/chatgpt-desktop-linux/extensions/`, one folder per extension. You can edit them in place:

1. Install your extension once from a .zip.
2. In **Settings → Extensions**, click **Open the extensions folder** and edit the files of your extension.
3. Click **Reload extensions**: ChatGPT reloads with your changes.

To debug, quit the application and start it with a debugging port:

```bash
chatgpt-desktop-linux --remote-debugging-port=9222
```

Then open `chrome://inspect` in Chrome or Chromium, add `localhost:9222` under **Configure…**, and inspect the ChatGPT page: you get the console, the elements and your extension's scripts.

## Writing extensions that last

ChatGPT's page is not a public API and changes regularly.

- Prefer stable hooks: `data-testid` attributes, ARIA roles and labels, rather than generated class names.
- Wait for elements with a `MutationObserver` instead of fixed delays.
- Fail quietly when an element is missing, so the page keeps working.
- Don't assume a language: ChatGPT may be displayed in English, French, Spanish or another language.

## Privacy and trust

An extension can read everything shown on ChatGPT, including your conversations. Never send that content anywhere, never load remote code, and only install extensions from people you trust.
