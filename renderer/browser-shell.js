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
    tab.dataset.id = item.id;
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

// Drag-and-drop reordering (pointer events: the tab bar is its own small view, so the
// tab follows the cursor and the main process is told the final index on release).
let drag = null;
const DRAG_THRESHOLD = 5;

tabs.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest(".close")) return;
  const tab = event.target.closest(".tab");
  if (!tab) return;
  drag = { tab, id: tab.dataset.id, startX: event.clientX, active: false, pointerId: event.pointerId };
});

tabs.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.startX;
  if (!drag.active) {
    if (Math.abs(dx) < DRAG_THRESHOLD) return;
    drag.active = true;
    drag.tab.setPointerCapture(drag.pointerId);
    drag.tab.classList.add("dragging");
    tabs.classList.add("reordering");
  }
  const children = [...tabs.children];
  const rect = drag.tab.getBoundingClientRect();
  drag.tab.style.transform = `translateX(${dx}px)`;
  const center = rect.left + rect.width / 2;
  // Insertion index = number of other tabs whose centre is left of the dragged tab's centre.
  drag.index = children.filter((el) => {
    if (el === drag.tab) return false;
    const r = el.getBoundingClientRect();
    return r.left + r.width / 2 < center;
  }).length;
  const from = children.indexOf(drag.tab);
  children.forEach((el, i) => {
    if (el === drag.tab) return;
    let shift = 0;
    if (from < drag.index && i > from && i <= drag.index) shift = -1;
    if (from > drag.index && i >= drag.index && i < from) shift = 1;
    el.style.transform = shift ? `translateX(${shift * (rect.width + 3)}px)` : "";
  });
});

function endDrag(event) {
  if (!drag) return;
  const finished = drag;
  drag = null;
  if (!finished.active) return;
  finished.tab.classList.remove("dragging");
  tabs.classList.remove("reordering");
  for (const el of tabs.children) el.style.transform = "";
  // A drag must not also count as a click that activates the tab.
  const swallow = (e) => { e.stopPropagation(); };
  finished.tab.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => finished.tab.removeEventListener("click", swallow, true), 0);
  if (event.type === "pointercancel" || finished.index === undefined) return;
  const from = [...tabs.children].indexOf(finished.tab);
  if (finished.index !== from) window.browserShellApi.reorder(finished.id, finished.index);
}
tabs.addEventListener("pointerup", endDrag);
tabs.addEventListener("pointercancel", endDrag);
