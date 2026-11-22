const icon = document.querySelector("#icon");
const label = document.querySelector("#label");
const lang = new URLSearchParams(window.location.search).get("lang");
const text = {
  en: { pull: "Pull to refresh", release: "Release to refresh" },
  fr: { pull: "Tirer pour actualiser", release: "Relâchez pour actualiser" },
  es: { pull: "Tira para actualizar", release: "Suelta para actualizar" },
}[lang] || { pull: "Pull to refresh", release: "Release to refresh" };
window.refreshApi.onProgress((state) => {
  const progress = Math.max(0, Math.min(1, Number(state.progress) || 0));
  icon.style.setProperty("--rotation", `${Math.round(progress * 270)}deg`);
  label.textContent = progress >= 1 ? text.release : text.pull;
});
