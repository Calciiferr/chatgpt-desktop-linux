// Electron entry point for folder creation: a "Nouveau dossier" item inside ChatGPT's own
// project "…" menu. Replaces the floating "+" overlay.
//
// No polling and no scroll/pointermove listeners. When the user activates a project's
// menu trigger, we wait a few frames for the menu that trigger controls (linked by
// aria-labelledby, which works for both native popovers and Radix portals), then add
// one item to it. If ChatGPT changes this markup, the item simply does not appear.
(function () {
    const ns = window.GlynGPT || {};
    const site = ns.site;
    if (!site || !site.supportsProjectFolders()) return;
    if (document.documentElement.hasAttribute("data-cdl-no-nestfolders")) return;

    const LOG = "[NestFolders]";
    const ITEM_ATTR = "data-glyn-new-folder-item";
    const PROJECT_ROW = "[data-app-action-sidebar-project-id]";
    const idPattern = /^g-p-[a-z0-9]+$/i;
    const french = (document.documentElement.lang || navigator.language || "fr")
        .toLowerCase().startsWith("fr");
    const LABEL = french ? "Nouveau dossier" : "New folder";

    function projectIdForRow(row) {
        const raw = row && row.getAttribute("data-app-action-sidebar-project-id");
        if (!raw) return null;
        const id = site.projectIdFromHref(`/g/${raw.startsWith("g-p-") ? raw : `g-p-${raw}`}/project`);
        return id && idPattern.test(id) ? id : null;
    }

    function triggerFromEvent(event) {
        const target = event.target instanceof Element ? event.target : null;
        const trigger = target && target.closest('button[aria-haspopup="menu"]');
        if (!trigger || !trigger.id) return null;
        const row = trigger.closest(PROJECT_ROW);
        const projectId = projectIdForRow(row);
        return projectId ? { trigger, row, projectId } : null;
    }

    function findMenu(triggerId) {
        const menus = document.querySelectorAll('[role="menu"][aria-labelledby]');
        for (const menu of menus) {
            if (menu.getAttribute("aria-labelledby") === triggerId &&
                menu.querySelector('[role="menuitem"]')) {
                return menu;
            }
        }
        return null;
    }

    function closeMenu(menu, trigger) {
        const popover = menu.closest("[popover]");
        if (popover && typeof popover.hidePopover === "function") {
            try { popover.hidePopover(); return; } catch (_err) { /* not open */ }
        }
        // Radix-style menus close on Escape.
        menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        if (trigger) trigger.focus();
    }

    function buildItem(template) {
        const item = template.cloneNode(true);
        item.removeAttribute("id");
        item.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        item.setAttribute(ITEM_ATTR, "true");
        item.classList.add("glyn-native-menu-item");
        item.removeAttribute("data-highlighted");
        item.removeAttribute("aria-disabled");
        // Text: the deepest element that carries the original label.
        const label = Array.from(item.querySelectorAll("span, div"))
            .reverse()
            .find((el) => !el.children.length && el.textContent.trim());
        if (label) label.textContent = LABEL;
        else item.textContent = LABEL;
        const iconSlot = item.querySelector('[data-leading-icon-slot]') || item.querySelector("svg");
        const Icons = ns.Icons || {};
        if (iconSlot && Icons.folderNew) {
            if (iconSlot.tagName.toLowerCase() === "svg") {
                iconSlot.outerHTML = Icons.folderNew;
            } else {
                iconSlot.innerHTML = Icons.folderNew;
            }
        }
        return item;
    }

    function inject(context) {
        const menu = findMenu(context.trigger.id);
        if (!menu) return false;
        if (menu.querySelector(`[${ITEM_ATTR}]`)) return true;
        const template = menu.querySelector('[role="menuitem"]');
        if (!template) return false;
        const item = buildItem(template);
        const stop = (event) => { event.stopPropagation(); };
        item.addEventListener("pointerdown", stop);
        item.addEventListener("pointerup", stop);
        item.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
            }
            event.stopPropagation();
        });
        item.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            activate();
        });
        function activate() {
            closeMenu(menu, context.trigger);
            void createFolder(context);
        }
        template.parentNode.insertBefore(item, template);
        return true;
    }

    function scheduleInject(context) {
        let frames = 0;
        const attempt = () => {
            if (inject(context) || ++frames > 20) return;
            requestAnimationFrame(attempt);
        };
        requestAnimationFrame(attempt);
    }

    function expandProject(row) {
        if (!row || !row.isConnected) return;
        if (row.getAttribute("aria-expanded") === "false") {
            row.click();
            return;
        }
        const toggler = Array.from(row.querySelectorAll('[aria-expanded="false"]'))
            .find((el) => el.getAttribute("aria-haspopup") !== "menu");
        if (toggler instanceof HTMLElement) toggler.click();
    }

    let busy = false;
    async function createFolder({ row, projectId }) {
        if (busy || typeof ns.createRootFolderForProject !== "function") return;
        busy = true;
        try {
            let result = await ns.createRootFolderForProject(projectId);
            if (result && result.error === "project-not-expanded") {
                expandProject(row);
                for (let attempt = 0; attempt < 25 && !(result && result.ok); attempt += 1) {
                    await new Promise((resolve) => setTimeout(resolve, 120));
                    result = await ns.createRootFolderForProject(projectId);
                    if (result && result.error && result.error !== "project-not-expanded") break;
                }
            }
            if (!result || !result.ok) {
                console.warn(LOG, "folder not created:", result && result.error);
                announce(row, french
                    ? "Impossible de créer le dossier : déplie le projet et réessaie."
                    : "Could not create the folder: expand the project and try again.");
            }
        } catch (err) {
            console.warn(LOG, "folder creation failed", err);
        } finally {
            busy = false;
        }
    }

    let feedback = null;
    let feedbackTimer = null;
    function announce(row, message) {
        if (!feedback) {
            feedback = document.createElement("div");
            feedback.className = "glyn-project-folder-feedback";
            feedback.setAttribute("role", "status");
            feedback.setAttribute("aria-live", "polite");
        }
        // Inside the sidebar, so it stays visible above ChatGPT's modal overlay.
        const host = (row && row.closest("nav")) || document.body;
        if (feedback.parentNode !== host) host.appendChild(feedback);
        feedback.textContent = message;
        const rect = row ? row.getBoundingClientRect() : { left: 8, bottom: 40 };
        feedback.style.left = `${Math.round(Math.max(8, rect.left))}px`;
        feedback.style.top = `${Math.round(Math.min(innerHeight - 60, rect.bottom + 6))}px`;
        feedback.hidden = false;
        clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => { feedback.hidden = true; }, 4000);
    }

    const onActivate = (event) => {
        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " " &&
            event.key !== "ArrowDown") {
            return;
        }
        const context = triggerFromEvent(event);
        if (context) scheduleInject(context);
    };
    document.addEventListener("pointerdown", onActivate, true);
    document.addEventListener("click", onActivate, true);
    document.addEventListener("keydown", onActivate, true);
})();
