// Local Electron UI: unobtrusive + action beside each native ChatGPT project row.
// The button is a fixed-position overlay. It is deliberately NOT inserted inside
// ChatGPT's own link/button; nested interactive controls break native navigation.
(function () {
    const ns = window.GlynGPT || {};
    const site = ns.site;
    if (!site || !site.supportsProjectFolders()) return;

    const ACTION_CLASS = "glyn-project-add-folder";
    const feedbackClass = "glyn-project-folder-feedback";
    const projectRowSelector = [
        "[data-app-action-sidebar-project-row][data-app-action-sidebar-project-id]",
        '[class*="project-unfurl-row"]',
        'a[href*="/g/g-p-"][href*="/project"]'
    ].join(", ");
    const idPattern = /^g-p-[a-z0-9]+$/i;
    let hovered = null;
    let shown = null;
    let busy = false;
    let feedbackTimer = null;

    const action = document.createElement("button");
    action.type = "button";
    action.className = ACTION_CLASS;
    action.textContent = "+";
    action.setAttribute("aria-label", "Créer un dossier dans ce projet");
    action.title = "Nouveau dossier";
    action.hidden = true;
    document.body.appendChild(action);

    const feedback = document.createElement("div");
    feedback.className = feedbackClass;
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    feedback.hidden = true;
    document.body.appendChild(feedback);

    // The project actions must not depend on a global #history list; it no
    // longer exists on some ChatGPT layouts. Scope by native row + geometry.
    function isSidebarProjectRow(row) {
        if (!row) return false;
        const rect = row.getBoundingClientRect();
        if (rect.left >= innerWidth * 0.46 || rect.right >= innerWidth * 0.62) return false;
        if (row.matches("[data-app-action-sidebar-project-row]")) return true;
        return !!row.closest('nav, aside, [data-testid="left-sidebar"], [data-testid="left-panel"]');
    }

    function idForRow(row) {
        const rawId = row.getAttribute("data-app-action-sidebar-project-id");
        if (rawId) {
            const id = rawId.startsWith("g-p-")
                ? site.projectIdFromHref("/g/" + rawId + "/project")
                : null;
            if (id && idPattern.test(id)) return id;
        }
        const link = row.matches('a[href]') ? row :
            row.querySelector('a[href*="/g/g-p-"]');
        const href = link && link.getAttribute("href");
        const id = href ? site.projectIdFromHref(href) : null;
        return id && idPattern.test(id) ? id : null;
    }

    function isVisible(row) {
        if (!row || !row.isConnected || row.closest('[aria-hidden="true"], [inert]')) return false;
        const rect = row.getBoundingClientRect();
        if (rect.width < 70 || rect.height < 12 || rect.bottom <= 0 ||
                rect.top >= innerHeight || rect.left >= innerWidth) return false;
        const style = getComputedStyle(row);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function entryFor(row) {
        if (!row || !isVisible(row) || !isSidebarProjectRow(row)) return null;
        const id = idForRow(row);
        return id ? { id, row } : null;
    }

    function rowForTarget(target) {
        if (!(target instanceof Element) || action.contains(target)) return null;
        // Prefer the native per-project row. Never match generic chat links.
        const row = target.closest(projectRowSelector);
        return entryFor(row);
    }

    function currentProjectEntry() {
        const id = site.currentProjectId();
        if (!id) return null;
        for (const row of document.querySelectorAll(projectRowSelector)) {
            const entry = entryFor(row);
            if (entry && entry.id === id) return entry;
        }
        return null;
    }

    function place(entry) {
        if (!entry || !isVisible(entry.row)) {
            action.hidden = true;
            shown = null;
            return;
        }
        const rect = entry.row.getBoundingClientRect();
        const trailing = [...entry.row.querySelectorAll('button[aria-haspopup="menu"],button[aria-label*="options" i],button[aria-label*="options du projet" i]')]
            .find((button) => {
                const r = button.getBoundingClientRect();
                return r.width > 8 && r.height > 8;
            });
        const trailingRect = trailing ? trailing.getBoundingClientRect() : null;
        // Left of the host's native ⋯ menu, or near the right edge if it is hidden.
        const x = trailingRect
            ? Math.max(rect.left + 32, trailingRect.left - 29)
            : rect.right - 57;
        action.style.left = Math.round(Math.min(rect.right - 25, x)) + "px";
        action.style.top = Math.round(rect.top + (rect.height - 25) / 2) + "px";
        action.title = "Nouveau dossier";
        action.setAttribute("aria-label", "Créer un dossier dans ce projet");
        action.hidden = false;
        shown = entry;
    }

    function refresh() {
        if (busy) return;
        if (hovered && !entryFor(hovered.row)) hovered = null;
        place(hovered || currentProjectEntry());
    }

    function announce(message) {
        feedback.textContent = message;
        const rect = action.getBoundingClientRect();
        feedback.style.left = Math.round(Math.max(8, Math.min(innerWidth - 300, rect.left - 200))) + "px";
        feedback.style.top = Math.round(Math.min(innerHeight - 60, rect.bottom + 8)) + "px";
        feedback.hidden = false;
        if (feedbackTimer) clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => { feedback.hidden = true; }, 4000);
    }

    function expandNativeRow(row) {
        if (!row || !row.isConnected) return;
        const toggler = [...row.querySelectorAll('[aria-expanded="false"]')].find(
            (element) => element instanceof HTMLElement &&
                element.getAttribute("aria-haspopup") !== "menu"
        );
        // Do not click ChatGPT's own options menu instead of expanding the project.
        if (toggler instanceof HTMLElement) {
            toggler.click();
            return;
        }
        // For old ChatGPT markup the row click opens/expands its project.
        if (row instanceof HTMLElement && row.getAttribute("aria-expanded") === "false") {
            row.click();
        }
    }

    async function createInProject() {
        if (busy || !shown || !ns.createRootFolderForProject) return;
        const { id, row } = shown;
        busy = true;
        action.disabled = true;
        try {
            let result = await ns.createRootFolderForProject(id);
            if (result && result.error === "project-not-expanded") {
                expandNativeRow(row);
                for (let attempt = 0; attempt < 25; attempt += 1) {
                    await new Promise((resolve) => setTimeout(resolve, 120));
                    result = await ns.createRootFolderForProject(id);
                    if (result && result.ok) break;
                    if (result && result.error !== "project-not-expanded") break;
                }
            }
            if (result && result.ok) {
                hovered = null;
            } else {
                announce("Déplie le projet et affiche ses conversations avant de créer un dossier.");
            }
        } catch (error) {
            console.warn("[NestFolders] Could not create project folder:", error);
            announce("Impossible de créer le dossier dans ce projet.");
        } finally {
            busy = false;
            action.disabled = false;
            refresh();
        }
    }

    action.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    action.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void createInProject();
    });

    document.addEventListener("pointermove", (event) => {
        if (action.contains(event.target)) return;
        const next = rowForTarget(event.target);
        if ((next && !hovered) || (!next && hovered) ||
                (next && hovered && next.row !== hovered.row)) {
            hovered = next;
            refresh();
        }
    }, { passive: true, capture: true });

    document.addEventListener("focusin", (event) => {
        if (event.target === action) return;
        hovered = rowForTarget(event.target);
        refresh();
    }, true);
    document.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);

    // Project rows are recreated during React navigation and sidebar expansion.
    // A single shared button avoids repeated DOM mutations of native project rows.
    setInterval(refresh, 850);
    refresh();
})();
