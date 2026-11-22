const strings = {
  en: {
    title: "Welcome", heading: "Welcome", languageLabel: "Language", restartNote: "The application will restart once to apply the language.", label: "Application name",
    hint: "This is the name shown in your applications menu, search and taskbar, and in the application's windows. The terminal command stays chatgpt-desktop-linux.",
    later: "You can change it at any time in Settings → General.", continue: "Continue",
  },
  fr: {
    title: "Bienvenue", heading: "Bienvenue", languageLabel: "Langue", restartNote: "L’application va redémarrer une fois pour appliquer la langue.", label: "Nom de l’application",
    hint: "C’est le nom affiché dans le menu des applications, la recherche, la barre des tâches et les fenêtres de l’application. La commande du terminal reste chatgpt-desktop-linux.",
    later: "Vous pourrez le changer à tout moment dans Paramètres → Général.", continue: "Continuer",
  },
  es: {
    title: "Bienvenida", heading: "Bienvenida", languageLabel: "Idioma", restartNote: "La aplicación se reiniciará una vez para aplicar el idioma.", label: "Nombre de la aplicación",
    hint: "Es el nombre que aparece en el menú de aplicaciones, la búsqueda, la barra de tareas y las ventanas de la aplicación. El comando de terminal sigue siendo chatgpt-desktop-linux.",
    later: "Puedes cambiarlo en cualquier momento en Ajustes → General.", continue: "Continuar",
  },
};

const form = document.querySelector("#welcome-form");
const input = document.querySelector("#display-name");
const languageInput = document.querySelector("#language");
const restartNote = document.querySelector("#restart-note");
const error = document.querySelector("#error");
const button = document.querySelector("#continue");
let activeLanguage = "en";

function applyLanguage(language) {
  const text = strings[language] || strings.en;
  document.documentElement.lang = strings[language] ? language : "en";
  document.title = text.title;
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = text[element.dataset.i18n]; });
  restartNote.hidden = language === activeLanguage;
}

window.welcome.state().then((state) => {
  activeLanguage = strings[state.language] ? state.language : "en";
  languageInput.value = activeLanguage;
  applyLanguage(activeLanguage);
  input.value = state.name;
  input.focus();
  input.select();
});

languageInput.addEventListener("change", () => applyLanguage(languageInput.value));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  const result = await window.welcome.submit({ name: input.value, language: languageInput.value });
  button.disabled = false;
  if (!result?.ok) {
    error.textContent = result?.error || "";
    error.hidden = false;
    input.focus();
  }
});
