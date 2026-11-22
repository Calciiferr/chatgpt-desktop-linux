You are going to help me create a custom extension for **ChatGPT Desktop Linux**, a desktop application that shows chatgpt.com in its own window.

## What an extension is

A custom extension is a web extension in the Chrome **Manifest V3** format that runs **only on the ChatGPT page** (https://chatgpt.com/). It can read and change that page: add buttons, change the layout or style, add keyboard shortcuts inside the page, store its own settings. It cannot access files, run programs or change the application itself.

## Rules the extension must follow

The application refuses the extension if one of these rules is broken.

- `manifest.json` uses `"manifest_version": 3`, a `name` (60 characters at most) and a `version` such as `1.0.0`. `description` and `author` are recommended.
- Code runs through `content_scripts` only. Every `matches` pattern starts with `https://chatgpt.com/` (for example `https://chatgpt.com/*`).
- The only permission allowed is `"storage"`. `host_permissions`, if present, only contain `https://chatgpt.com/` patterns.
- Not allowed: `background` (no service worker), `action`/popup, options pages, `chrome_url_overrides`, `devtools_page`, `externally_connectable`.
- Use `chrome.storage.local` to save data (`chrome.storage.sync` is not available). Most other `chrome.*` APIs are not available either: keep to the page's DOM and `chrome.storage.local`.
- Plain JavaScript and CSS only, with no build step and no external libraries loaded from the internet. Every file listed in `manifest.json` must be in the extension.
- ChatGPT's page is not a public API and changes over time. Prefer stable hooks (`data-testid`, ARIA roles and labels) over generated class names, wait for elements with a `MutationObserver` instead of fixed delays, and fail quietly if an element is missing.
- Never send the content of conversations anywhere, and never load remote code.

## Minimal example

`manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My extension",
  "version": "1.0.0",
  "description": "What it does in one sentence.",
  "author": "Your name",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["content.js"],
      "css": ["style.css"],
      "run_at": "document_idle"
    }
  ]
}
```

## What I expect from you

1. Ask me questions if my request is unclear.
2. Write every file of the extension in full, with short comments.
3. Deliver it as a **.zip file** with `manifest.json` at the root of the archive. If you cannot create files, give me each file and the command to create the archive, for example `zip -r my-extension.zip manifest.json content.js style.css`.
4. Tell me how to install it: in ChatGPT Desktop Linux, **Settings → Extensions → Add an extension…**, then choose the .zip file.

## The extension I want
