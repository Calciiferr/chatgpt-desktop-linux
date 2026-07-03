const icon = document.querySelector("#icon");
const label = document.querySelector("#label");
window.refreshApi.onProgress((state) => {
  const progress = Math.max(0, Math.min(1, Number(state.progress) || 0));
  icon.style.setProperty("--rotation", `${Math.round(progress * 270)}deg`);
  label.textContent = progress >= 1 ? "Relâchez pour actualiser" : "Tirer pour actualiser";
});
