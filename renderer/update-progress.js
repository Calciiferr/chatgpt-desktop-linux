const strings = {
  en: { heading: "ChatGPT update", preparing: "Preparing…", progress: "Update progress", details: "Technical details", cancel: "Cancel download", close: "Close", restart: "Restart ChatGPT" },
  fr: { heading: "Mise à jour de ChatGPT", preparing: "Préparation…", progress: "Progression de la mise à jour", details: "Détails techniques", cancel: "Annuler le téléchargement", close: "Fermer", restart: "Redémarrer ChatGPT" },
  es: { heading: "Actualización de ChatGPT", preparing: "Preparando…", progress: "Progreso de la actualización", details: "Detalles técnicos", cancel: "Cancelar la descarga", close: "Cerrar", restart: "Reiniciar ChatGPT" },
};
const uiLanguage = strings[new URLSearchParams(window.location.search).get('lang')] ? new URLSearchParams(window.location.search).get('lang') : 'en';
document.documentElement.lang = uiLanguage;
document.title = `${{ en: 'Update', fr: 'Mise à jour', es: 'Actualización' }[uiLanguage]} — ${new URLSearchParams(window.location.search).get('name') || 'ChatGPT'}`;
document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = strings[uiLanguage][element.dataset.i18n]; });
document.querySelectorAll('[data-i18n-aria]').forEach((element) => { element.setAttribute('aria-label', strings[uiLanguage][element.dataset.i18nAria]); });
const phase = document.querySelector('#phase');
const progress = document.querySelector('#progress');
const detail = document.querySelector('#detail');
const logs = document.querySelector('#logs');
window.updateProgress.onState(state => {
  document.body.dataset.state = state.phase;
  phase.textContent = state.title;
  detail.textContent = state.detail;
  logs.textContent = state.logs || '';
  if (typeof state.percent === 'number') { progress.max = 100; progress.value = state.percent; }
  else progress.removeAttribute('value');
  document.querySelector('#cancel').hidden = !['download', 'verify'].includes(state.phase);
  document.querySelector('#close').hidden = !['success', 'error', 'cancelled'].includes(state.phase);
  document.querySelector('#restart').hidden = state.phase !== 'success';
});
for (const action of ['cancel', 'close', 'restart']) document.querySelector('#' + action).addEventListener('click', () => window.updateProgress.action(action));
window.updateProgress.ready();
