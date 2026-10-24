const bar = document.querySelector("#tab-bar");
const tabs = document.querySelector("#tabs");
const add = document.querySelector("#new-tab");

function render(state) {
  document.querySelector("#update-test-banner").hidden = !state.updateTest;
  document.documentElement.classList.toggle("light", !state.darkMode);
  bar.hidden = !state.barVisible;
  tabs.replaceChildren();
  for (const item of state.tabs) {
    const tab = document.createElement("div");
    tab.setAttribute("role", "tab");
    tab.tabIndex = 0;
    tab.className = `tab${item.active ? " active" : ""}`;
    tab.title = item.title;
    if (item.loading) {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      tab.append(spinner);
    }
    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = item.title;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.textContent = "×";
    close.title = "Fermer";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      window.browserShellApi.close(item.id);
    });
    tab.append(title, close);
    tab.addEventListener("click", () => window.browserShellApi.activate(item.id));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") window.browserShellApi.activate(item.id);
    });
    tabs.append(tab);
  }
  add.disabled = !state.canCreate;
}

add.addEventListener("click", () => window.browserShellApi.create());
window.browserShellApi.onState(render);
