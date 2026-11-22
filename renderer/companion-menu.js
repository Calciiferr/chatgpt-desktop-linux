const translations = {
  fr: {
    files: "Ajouter des fichiers",
    region: "Capturer une zone",
    window: "Capturer une fenêtre",
    screen: "Capturer l’écran",
    clipboardImport: "Ajouter depuis le presse-papiers",
  },
  en: {
    files: "Add files",
    region: "Capture region",
    window: "Capture window",
    screen: "Capture screen",
    clipboardImport: "Add from clipboard",
  },
  es: {
    files: "Añadir archivos",
    region: "Capturar una zona",
    window: "Capturar una ventana",
    screen: "Capturar la pantalla",
    clipboardImport: "Añadir desde el portapapeles",
  },
};

let language = "en";

function tr(key) {
  return translations[language]?.[key] || translations.en[key] || key;
}

function applyTranslations() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = tr(element.dataset.i18n);
  });
}

function closeMenu() {
  window.companionApi.setExpanded(false);
}

function applyState(state) {
  if (state && typeof state === "object") {
    language = translations[state.language] ? state.language : "en";
    document.documentElement.classList.toggle("light", state.darkMode === false);
  }
  applyTranslations();
}

window.companionApi.onState(applyState);
window.companionApi.getState().then(applyState);

document.querySelector("#add-files").addEventListener("click", async () => {
  closeMenu();
  await window.companionApi.chooseFiles();
});

for (const [selector, mode] of [["#capture-region", "region"], ["#capture-window", "window"], ["#capture-screen", "screen"]]) {
  document.querySelector(selector).addEventListener("click", async () => {
    closeMenu();
    await window.companionApi.capture(mode);
  });
}

document.querySelector("#clipboard-import").addEventListener("click", async () => {
  closeMenu();
  await window.companionApi.addClipboard();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});
