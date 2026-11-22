const previewImage = document.querySelector("#preview-image");
const previewName = document.querySelector("#preview-name");
const closeButton = document.querySelector("#preview-close");

function applyPreviewData(data) {
  if (!data || typeof data !== "object") return;
  const name = typeof data.name === "string" ? data.name : "";
  const language = typeof data.language === "string" ? data.language : "en";
  const dataUrl = typeof data.dataUrl === "string" && data.dataUrl.startsWith("data:image/")
    ? data.dataUrl
    : "";

  document.documentElement.lang = language;
  document.documentElement.classList.toggle("light", data.darkMode === false);
  previewName.textContent = name;
  previewName.title = name;
  previewImage.alt = name;
  previewImage.src = dataUrl;
  previewImage.hidden = !dataUrl;
  closeButton.setAttribute("aria-label", language === "fr" ? "Fermer" : language === "es" ? "Cerrar" : "Close");
}

closeButton.addEventListener("click", () => window.companionApi.closePreview());
window.companionApi.onPreviewData(applyPreviewData);
