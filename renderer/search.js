const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const matches = document.querySelector("#matches");
const language = new URLSearchParams(window.location.search).get("lang") || "en";
const translations = {
  fr: { placeholder: "Rechercher…", label: "Rechercher dans la conversation", previous: "Résultat précédent", next: "Résultat suivant", close: "Fermer" },
  en: { placeholder: "Find…", label: "Find in conversation", previous: "Previous result", next: "Next result", close: "Close" },
  es: { placeholder: "Buscar…", label: "Buscar en la conversación", previous: "Resultado anterior", next: "Resultado siguiente", close: "Cerrar" },
};
const text = translations[language] || translations.en;
let shortcuts = { open: "Ctrl+F", next: "Enter", previous: "Shift+Enter" };

document.documentElement.lang = translations[language] ? language : "en";
queryInput.placeholder = text.placeholder;
queryInput.setAttribute("aria-label", text.label);
document.querySelector("#previous").setAttribute("aria-label", text.previous);
document.querySelector("#next").setAttribute("aria-label", text.next);
document.querySelector("#close").setAttribute("aria-label", text.close);

function find(forward, findNext) {
  const query = queryInput.value.trim();
  if (!query) {
    matches.textContent = "0/0";
  }
  void window.searchApi.find(query, forward, findNext);
}

function closeSearch() {
  window.searchApi.close();
}

function eventMatchesAccelerator(event, accelerator) {
  const parts = accelerator.split("+").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const key = parts.pop();
  if (!key) return false;
  const eventKey = event.key === " " ? "space" : event.key.toLowerCase() === "return" ? "enter" : event.key.toLowerCase();
  return eventKey === key &&
    event.ctrlKey === (parts.includes("ctrl") || parts.includes("control")) &&
    event.altKey === parts.includes("alt") &&
    event.shiftKey === parts.includes("shift") &&
    event.metaKey === (parts.includes("super") || parts.includes("meta"));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  find(true, true);
});

queryInput.addEventListener("input", () => find(true, false));
queryInput.addEventListener("keydown", (event) => {
  if (eventMatchesAccelerator(event, shortcuts.previous)) {
    event.preventDefault();
    find(false, true);
  } else if (eventMatchesAccelerator(event, shortcuts.next)) {
    event.preventDefault();
    find(true, true);
  } else if (event.key === "Escape") {
    event.preventDefault();
    closeSearch();
  }
});

document.querySelector("#previous").addEventListener("click", () => find(false, true));
document.querySelector("#next").addEventListener("click", () => find(true, true));
document.querySelector("#close").addEventListener("click", closeSearch);

window.searchApi.onResult((result) => {
  if (!result || typeof result !== "object") return;
  const active = Number(result.activeMatchOrdinal) || 0;
  const total = Number(result.matches) || 0;
  matches.textContent = `${active}/${total}`;
});

window.searchApi.onOpen(() => {
  queryInput.focus();
  queryInput.select();
});

window.searchApi.onShortcuts((value) => {
  if (!value || typeof value !== "object") return;
  shortcuts = {
    open: typeof value.open === "string" ? value.open : shortcuts.open,
    next: typeof value.next === "string" ? value.next : shortcuts.next,
    previous: typeof value.previous === "string" ? value.previous : shortcuts.previous,
  };
});

requestAnimationFrame(() => queryInput.focus());
