/* ── TarHeelRatings – content.js ── */

function getExtensionStorageArea() {
    return globalThis.chrome?.storage?.local || null;
}

function getExtensionStorageEvents() {
    return globalThis.chrome?.storage?.onChanged || null;
}

function getExtensionRuntime() {
    return globalThis.chrome?.runtime || null;
}

function safeStorageGet(keys, callback) {
    const storage = getExtensionStorageArea();
    if (!storage?.get) {
        callback?.({});
        return;
    }

    try {
        storage.get(keys, (result) => {
            callback?.(result || {});
        });
    } catch (_) {
        callback?.({});
    }
}

function safeStorageSet(values) {
    const storage = getExtensionStorageArea();
    if (!storage?.set) return false;

    try {
        storage.set(values);
        return true;
    } catch (_) {
        return false;
    }
}

function safeStorageRemove(keys) {
    const storage = getExtensionStorageArea();
    if (!storage?.remove) return false;

    try {
        storage.remove(keys);
        return true;
    } catch (_) {
        return false;
    }
}

function addSafeStorageChangeListener(listener) {
    const storageEvents = getExtensionStorageEvents();
    if (!storageEvents?.addListener) return false;

    try {
        storageEvents.addListener(listener);
        return true;
    } catch (_) {
        return false;
    }
}

function safeRuntimeGetUrl(path) {
    const runtime = getExtensionRuntime();
    if (!runtime?.getURL) return path;

    try {
        return runtime.getURL(path);
    } catch (_) {
        return path;
    }
}

function safeRuntimeSendMessage(message, callback) {
    const runtime = getExtensionRuntime();
    if (!runtime?.sendMessage) {
        callback?.(undefined, new Error('Chrome runtime unavailable.'));
        return false;
    }

    try {
        runtime.sendMessage(message, (response) => {
            callback?.(response, runtime.lastError || null);
        });
        return true;
    } catch (error) {
        callback?.(undefined, error);
        return false;
    }
}

function getRatingColor(rating) {
    if (rating >= 4.0) return '#2ca25f';
    if (rating >= 3.0) return '#e9a400';
    return '#de2d26';
}

/**
 * Inject a professor rating badge + hover tooltip into the given wrapper element.
 */
function injectOverview(wrapper, data, originalName) {
    const noRatings = data.numRatings === 0;
    const color = noRatings ? '#6c757d' : getRatingColor(data.avgRating);
    const badgeText = noRatings ? 'N/A' : data.avgRating;
    const wouldTakeAgain = data.wouldTakeAgainPercent === -1
        ? 'N/A'
        : `${Math.round(data.wouldTakeAgainPercent)}%`;
    const lowRatings = !noRatings && data.numRatings < 10;
    const lastReview = data.lastRating
        ? new Date(data.lastRating.replace(' +0000 UTC', 'Z').replace(' ', 'T'))
            .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : null;

    const iconSvg = noRatings
        ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="10"/></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="${color}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

    const el = document.createElement('span');
    el.className = 'thr-professor';
    el.innerHTML = `
        <span class="thr-rating-icon">
            ${iconSvg}
        </span>
        <a class="thr-link" href="https://www.ratemyprofessors.com/professor/${data.legacyId}" target="_blank">${originalName}</a>
        <div class="thr-tooltip">
            <div class="thr-tooltip-header">${data.firstName} ${data.lastName}</div>
            ${noRatings ? `
                <div class="thr-tooltip-na">No ratings yet — be the first to review!</div>
            ` : `
                <div class="thr-tooltip-row">
                    <div class="thr-rating-box" style="background:${color}">
                        <span class="thr-rating-num">${data.avgRating}</span>
                        <span class="thr-rating-denom">/ 5</span>
                    </div>
                    <div class="thr-details">
                        <span>Difficulty: <strong>${data.avgDifficulty}</strong></span>
                        <span><strong>${wouldTakeAgain}</strong> would take again</span>
                        <span><strong>${data.numRatings}</strong> ratings</span>
                    </div>
                </div>
                ${lowRatings ? '<div class="thr-warning">⚠️ Low rating count</div>' : ''}
                ${lastReview ? `<div class="thr-meta">Last reviewed: ${lastReview}</div>` : ''}
            `}
        </div>
    `;

    wrapper.innerHTML = '';
    wrapper.appendChild(el);

    // Position the tooltip on hover so it doesn't get clipped
    el.addEventListener('mouseenter', () => {
        const tooltip = el.querySelector('.thr-tooltip');
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.bottom + 6) + 'px';
        tooltip.style.left = rect.left + 'px';

        // If it would go off-screen right, nudge left
        if (rect.left + 260 > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - 270) + 'px';
        }
        // If it would go off-screen bottom, show above
        if (rect.bottom + 200 > window.innerHeight) {
            tooltip.style.top = (rect.top - 200) + 'px';
        }
    });
}

/**
 * Inject a "not found" placeholder for professors without RMP data.
 */
function injectNotFound(wrapper, name) {
    const el = document.createElement('span');
    el.className = 'thr-professor';
    el.innerHTML = `
        <span class="thr-rating-icon">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#888"><circle cx="12" cy="12" r="10"/></svg>
        </span>
        <span class="thr-name-plain">${name}</span>
        <div class="thr-tooltip">
            <div class="thr-tooltip-na">No RateMyProfessors data found.</div>
        </div>
    `;
    wrapper.innerHTML = '';
    wrapper.appendChild(el);

    el.addEventListener('mouseenter', () => {
        const tooltip = el.querySelector('.thr-tooltip');
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.bottom + 6) + 'px';
        tooltip.style.left = rect.left + 'px';
    });
}

/* ── Name normalization helpers ── */

const SUFFIXES = /\b(jr\.?|sr\.?|ii|iii|iv|phd|ph\.d\.?|md|m\.d\.?|dr\.?)\s*$/i;

/**
 * Strip diacritics / accents:  "José García" → "Jose Garcia"
 */
function stripAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convert to Title Case: "KATHRYN WYMER" → "Kathryn Wymer"
 */
function toTitleCase(str) {
    return str.replace(/\S+/g, w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
}

/**
 * Parse a raw instructor string from ConnectCarolina into an array of names.
 * Returns an array of { display, search } objects.
 */
function parseInstructors(raw) {
    if (!raw) return [];
    let nameStr = raw.trim();
    if (!nameStr || nameStr.toLowerCase() === 'staff' || nameStr.toLowerCase() === 'tba') return [];

    let rawNames = [];

    // 1. Split by newlines and " / "
    const parts = nameStr.split(/\s*\/\s*|\n/);

    for (const part of parts) {
        let p = part.trim();
        if (!p) continue;

        // 2. Check for comma delimiters
        const commaIdx = p.indexOf(',');
        if (commaIdx !== -1) {
            const before = p.substring(0, commaIdx).trim();
            const after = p.substring(commaIdx + 1).trim();

            // If before has no space AND no space immediately after comma -> "Last,First" (one person)
            if (!before.includes(' ') && p.charAt(commaIdx + 1) !== ' ') {
                rawNames.push(`${after} ${before}`);
            } else {
                // Treat as list: "First Last, First Last" or "DAVID PIER,Rebekah Barber"
                p.split(/,\s*/).forEach(n => {
                    if (n.trim()) rawNames.push(n.trim());
                });
            }
        } else {
            rawNames.push(p);
        }
    }

    // 3. Normalize each name
    const results = [];
    for (const name of rawNames) {
        const isAllCaps = name === name.toUpperCase() && name !== name.toLowerCase();
        const display = isAllCaps ? toTitleCase(name) : name;

        let search = display.replace(SUFFIXES, '').trim();
        search = stripAccents(search);

        if (search) {
            results.push({ display, search });
        }
    }

    return results;
}

/**
 * Scan the page for instructor name elements and inject ratings.
 */
function processProfessors() {
    // 1. Class Search page (table-based)
    const classSearchCells = document.querySelectorAll('td[id$="_INSTRUCTOR"] span[title]');

    // 2. Shopping Cart / Schedule page (grid-based)
    const shoppingCartCells = document.querySelectorAll(
        'div[aria-label="Enrollment_Classes"] div[role="row"] div[role="gridcell"]:nth-child(6) span'
    );

    const allCells = [...classSearchCells, ...shoppingCartCells];

    allCells.forEach(spanElement => {
        const container = spanElement.closest('[role="gridcell"]') || spanElement.parentElement;
        if (!container || container.dataset.tarheelProcessed) return;

        // Get the name from title attr or text content
        const rawName = (spanElement.getAttribute('title') || spanElement.textContent).trim();
        const parsedList = parseInstructors(rawName);
        if (!parsedList || parsedList.length === 0) return;

        container.dataset.tarheelProcessed = 'true';

        // Hide the original content and add our wrapper
        spanElement.style.display = 'none';
        // Also hide any sr-only duplicates and aria-hidden divs
        const siblings = container.querySelectorAll('.sr-only, [aria-hidden="true"]');
        siblings.forEach(s => s.style.display = 'none');

        const multiWrapper = document.createElement('div');
        multiWrapper.className = 'thr-multi-wrapper';

        parsedList.forEach((parsed, index) => {
            const profWrapper = document.createElement('div');
            profWrapper.textContent = parsed.display;
            profWrapper.style.fontSize = 'inherit';
            multiWrapper.appendChild(profWrapper);

            try {
                safeRuntimeSendMessage({ professorName: parsed.search }, (response, error) => {
                    if (error) {
                        profWrapper.textContent = parsed.display;
                        return;
                    }
                    if (response && response.success) {
                        injectOverview(profWrapper, response.data, parsed.display);
                    } else {
                        injectNotFound(profWrapper, parsed.display);
                    }
                });
            } catch (e) {
                profWrapper.textContent = parsed.display;
            }
        });

        container.appendChild(multiWrapper);
    });
}

/* ── Dashboard Welcome ── */
// Keep this release note payload current for every user-facing update.
const ENABLE_DASHBOARD_WELCOME = true;
const DASHBOARD_WELCOME_STORAGE_KEY = 'thr_dashboard_release_seen';
const FEATURE_TUTORIAL_STORAGE_KEY = 'thr_feature_tutorial_step';

const DASHBOARD_RELEASE = {
    version: '2.0',
    title: 'New Update!',
    intro: 'Tar Heel Tracker can now make it much easier to search for the requirements you still need.',
    features: [
        'Pull your unmet Tar Heel Tracker requirements into Class Search automatically.',
        'Click a remaining requirement and jump straight into the most relevant search flow.',
        'See likely courses for major and minor requirements instead of guessing where to start.',
    ],
    fixes: [
        'Requirement parsing is stricter, so GPA rows and extra audit text get ignored.',
        'Class Search autofill is more stable and shows clearer progress while fields are being set.',
        'Tracker suggestions are now grouped by your active programs instead of one merged list.',
    ],
};

let dashboardWelcomeState = {
    loaded: false,
    loading: false,
    seenVersion: '',
    waiters: [],
};
let dashboardWelcomeForceOpen = false;
let dashboardConfettiLauncher = null;
let featureTutorialState = {
    loaded: false,
    loading: false,
    step: '',
    waiters: [],
};
let dashboardGuideProgress = {
    action: '',
    startedAt: 0,
};

const DASHBOARD_GUIDE_PENDING_MS = 4000;

function isTopFrameWindow() {
    try {
        return window === window.top;
    } catch (error) {
        return true;
    }
}

function isLikelyDashboardContentFrame() {
    return !!findDashboardHeading();
}

function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
}

function findDashboardHeading() {
    return [...document.querySelectorAll('h1, h2, h3, [role="heading"]')]
        .find((el) => isElementVisible(el) && /^Dashboard$/i.test((el.innerText || el.textContent || '').trim()));
}

function getElementClassName(el) {
    if (!el) return '';
    return typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
}

function isDashboardHeaderCandidate(node, headingRect) {
    if (!(node instanceof HTMLElement)) return false;
    if (!isElementVisible(node)) return false;

    const rect = node.getBoundingClientRect();
    const widthEnough = rect.width >= Math.max(320, headingRect.width + 140);
    const heightOk = rect.height >= 48 && rect.height <= 160;
    const containsHeading = rect.top <= headingRect.top + 6 && rect.bottom >= headingRect.bottom - 6;
    const nearTop = rect.top >= -4 && rect.top <= 220;
    const className = getElementClassName(node);
    const looksHeaderLike =
        node.tagName === 'HEADER' ||
        node.getAttribute('role') === 'banner' ||
        /MuiAppBar-root|MuiToolbar-root|MuiPaper-root|appbar|toolbar|header/i.test(className);

    return widthEnough && heightOk && containsHeading && nearTop && looksHeaderLike;
}

function isDashboardHeaderFallbackCandidate(node, headingRect) {
    if (!(node instanceof HTMLElement)) return false;
    if (!isElementVisible(node)) return false;

    const rect = node.getBoundingClientRect();
    const widthEnough = rect.width >= Math.max(320, headingRect.width + 120);
    const heightOk = rect.height >= 44 && rect.height <= 160;
    const containsHeading = rect.top <= headingRect.top + 10 && rect.bottom >= headingRect.bottom - 6;
    const nearTop = rect.top >= -4 && rect.top <= 220;

    return widthEnough && heightOk && containsHeading && nearTop;
}

function findDashboardHeaderMount() {
    const heading = findDashboardHeading();
    if (!heading) return null;

    const headingRect = heading.getBoundingClientRect();
    const matches = [];
    const fallbackMatches = [];
    let node = heading.parentElement;

    while (node && node !== document.body && node !== document.documentElement) {
        if (isDashboardHeaderCandidate(node, headingRect)) {
            matches.push(node);
        } else if (isDashboardHeaderFallbackCandidate(node, headingRect)) {
            fallbackMatches.push(node);
        }
        node = node.parentElement;
    }

    if (matches.length) {
        return matches.find((candidate) => /MuiAppBar-root|MuiToolbar-root|MuiPaper-root/i.test(getElementClassName(candidate))) || matches[0];
    }

    return fallbackMatches[0] || null;
}

function findPreferencesMenuButton() {
    return [...document.querySelectorAll('button, [role="button"]')].find((el) => {
        if (!isElementVisible(el)) return false;
        const label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.textContent || '').trim();
        return /^Preferences Menu$/i.test(label);
    }) || null;
}

function findDashboardLauncherMount() {
    const preferencesButton = findPreferencesMenuButton();
    const preferencesActions = preferencesButton?.parentElement || null;
    if (preferencesButton && preferencesActions) {
        return {
            container: preferencesActions,
            beforeNode: preferencesButton,
            mode: 'inline',
        };
    }

    const headerMount = findDashboardHeaderMount();
    if (headerMount) {
        return {
            container: headerMount,
            beforeNode: null,
            mode: 'floating',
        };
    }

    return null;
}

function isDashboardPage() {
    if (!ENABLE_DASHBOARD_WELCOME) return false;
    const heading = findDashboardHeading();
    if (!heading) return false;
    if (!isLikelyDashboardContentFrame()) return false;

    const text = (document.body?.innerText || '').replace(/\u00a0/g, ' ');
    return /Dashboard/i.test(text) && /(?:Shopping Cart|Class Search|Tar Heel Tracker|Academics)/i.test(text);
}

function getDashboardWelcomeModal() {
    return document.getElementById('thr-dashboard-welcome');
}

function getDashboardLauncher() {
    return document.getElementById('thr-dashboard-launcher');
}

function flushDashboardWelcomeWaiters() {
    const waiters = dashboardWelcomeState.waiters.splice(0);
    waiters.forEach((fn) => {
        try {
            fn();
        } catch (_) { /* noop */ }
    });
}

function loadDashboardWelcomeState(callback) {
    if (callback) {
        dashboardWelcomeState.waiters.push(callback);
    }

    if (dashboardWelcomeState.loaded) {
        flushDashboardWelcomeWaiters();
        return;
    }
    if (dashboardWelcomeState.loading) return;

    dashboardWelcomeState.loading = true;
    safeStorageGet([DASHBOARD_WELCOME_STORAGE_KEY], (data) => {
        dashboardWelcomeState.loaded = true;
        dashboardWelcomeState.loading = false;
        dashboardWelcomeState.seenVersion = data?.[DASHBOARD_WELCOME_STORAGE_KEY] || '';
        flushDashboardWelcomeWaiters();
    });
}

function markDashboardWelcomeSeen() {
    dashboardWelcomeState.loaded = true;
    dashboardWelcomeState.seenVersion = DASHBOARD_RELEASE.version;
    safeStorageSet({
        [DASHBOARD_WELCOME_STORAGE_KEY]: DASHBOARD_RELEASE.version,
    });
}

function flushFeatureTutorialWaiters() {
    const waiters = featureTutorialState.waiters.splice(0);
    waiters.forEach((fn) => {
        try {
            fn();
        } catch (_) { /* noop */ }
    });
}

function loadFeatureTutorialState(callback) {
    if (callback) {
        featureTutorialState.waiters.push(callback);
    }

    if (featureTutorialState.loaded) {
        flushFeatureTutorialWaiters();
        return;
    }
    if (featureTutorialState.loading) return;

    featureTutorialState.loading = true;
    safeStorageGet([FEATURE_TUTORIAL_STORAGE_KEY], (data) => {
        featureTutorialState.loaded = true;
        featureTutorialState.loading = false;
        featureTutorialState.step = data?.[FEATURE_TUTORIAL_STORAGE_KEY] || '';
        flushFeatureTutorialWaiters();
    });
}

function setFeatureTutorialStep(step) {
    featureTutorialState.loaded = true;
    featureTutorialState.step = step || '';
    if (step) {
        safeStorageSet({ [FEATURE_TUTORIAL_STORAGE_KEY]: step });
    } else {
        safeStorageRemove(FEATURE_TUTORIAL_STORAGE_KEY);
    }
}

function clearFeatureTutorialStep() {
    setFeatureTutorialStep('');
}

function syncFeatureTutorialStepFromStorage(callback) {
    safeStorageGet([FEATURE_TUTORIAL_STORAGE_KEY], (data) => {
        featureTutorialState.loaded = true;
        featureTutorialState.step = data?.[FEATURE_TUTORIAL_STORAGE_KEY] || '';
        if (callback) callback();
    });
}

function markDashboardGuideProgress(action) {
    dashboardGuideProgress = {
        action,
        startedAt: Date.now(),
    };
}

function clearDashboardGuideProgress() {
    dashboardGuideProgress = {
        action: '',
        startedAt: 0,
    };
}

function startFeatureTutorial() {
    dashboardWelcomeForceOpen = false;
    markDashboardWelcomeSeen();
    removeDashboardWelcomeModal();
    setFeatureTutorialStep('dashboard_academics');
    window.setTimeout(() => {
        processDashboardTutorial();
    }, 120);
}

function removeDashboardWelcomeModal() {
    const modals = document.querySelectorAll('#thr-dashboard-welcome');
    if (!modals.length) return;
    modals.forEach((modal) => modal.remove());
    document.documentElement.classList.remove('thr-dashboard-welcome-open');
    document.body.classList.remove('thr-dashboard-welcome-open');
}

function dismissDashboardWelcomeModal() {
    dashboardWelcomeForceOpen = false;
    markDashboardWelcomeSeen();
    removeDashboardWelcomeModal();
}

function shouldShowDashboardWelcome() {
    return isDashboardPage()
        && (dashboardWelcomeForceOpen || dashboardWelcomeState.seenVersion !== DASHBOARD_RELEASE.version);
}

function openDashboardWelcomeModal() {
    if (!isDashboardPage()) return;
    dashboardWelcomeForceOpen = true;
    clearFeatureTutorialStep();
    removeDashboardTutorial();
    ensureDashboardWelcomeModal();
}

function launchDashboardWelcomeConfetti(modal) {
    if (!modal || modal.dataset.thrConfettiFired === '1') return;
    modal.dataset.thrConfettiFired = '1';

    const confettiGlobal = globalThis.confetti;
    if (typeof confettiGlobal !== 'function' || typeof confettiGlobal.create !== 'function') return;

    if (!dashboardConfettiLauncher) {
        dashboardConfettiLauncher = confettiGlobal.create(null, {
            resize: true,
            useWorker: false,
        });
    }

    const title = modal.querySelector('#thr-dashboard-welcome-title');
    const anchor = title || modal.querySelector('.thr-dashboard-welcome__dialog');
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const originY = clamp((rect.top + 28) / window.innerHeight, 0.08, 0.34);
    const leftX = clamp((rect.left + rect.width * 0.16) / window.innerWidth, 0.12, 0.42);
    const rightX = clamp((rect.right - rect.width * 0.16) / window.innerWidth, 0.58, 0.88);
    const colors = ['#4B9CD3', '#13294B', '#E9B949', '#ffffff'];
    const base = {
        colors,
        disableForReducedMotion: true,
        gravity: 1.08,
        scalar: 1.06,
        startVelocity: 46,
        ticks: 240,
        zIndex: 2147483645,
    };

    const burst = (originX, angle, spread, particleCount, drift) => {
        dashboardConfettiLauncher({
            ...base,
            angle,
            spread,
            particleCount,
            drift,
            origin: { x: originX, y: originY },
        });
    };

    window.requestAnimationFrame(() => {
        burst(leftX, 118, 74, 62, -0.16);
        burst(rightX, 62, 74, 62, 0.16);
        window.setTimeout(() => {
            burst(leftX, 102, 92, 32, -0.1);
            burst(rightX, 78, 92, 32, 0.1);
        }, 180);
    });
}

function cleanupDashboardHeaderMounts(activeMount) {
    document.querySelectorAll('.thr-dashboard-header-bar').forEach((el) => {
        if (el !== activeMount) {
            el.classList.remove('thr-dashboard-header-bar');
        }
    });
    document.querySelectorAll('.thr-dashboard-header-actions').forEach((el) => {
        if (el !== activeMount) {
            el.classList.remove('thr-dashboard-header-actions');
        }
    });
}

function removeDashboardLauncher() {
    const launcher = getDashboardLauncher();
    if (launcher) launcher.remove();
    cleanupDashboardHeaderMounts(null);
}

function ensureDashboardLauncher() {
    if (!isDashboardPage()) {
        removeDashboardLauncher();
        return null;
    }

    const mount = findDashboardLauncherMount();
    if (!mount) {
        removeDashboardLauncher();
        return null;
    }

    let launcher = getDashboardLauncher();
    if (!launcher) {
        launcher = document.createElement('button');
        launcher.id = 'thr-dashboard-launcher';
        launcher.className = 'thr-dashboard-launcher';
        launcher.type = 'button';
        launcher.setAttribute('aria-label', 'Open TarHeelRatings update and tutorial');
        launcher.title = 'Open TarHeelRatings update and tutorial';
        launcher.innerHTML = `
            <img class="thr-dashboard-launcher__icon" src="${safeRuntimeGetUrl('icons/logo128px.png')}" alt="">
        `;
        launcher.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openDashboardWelcomeModal();
        });
    }

    launcher.classList.toggle('thr-dashboard-launcher--inline', mount.mode === 'inline');
    launcher.classList.toggle('thr-dashboard-launcher--floating', mount.mode !== 'inline');

    cleanupDashboardHeaderMounts(mount.container);
    mount.container.classList.add(mount.mode === 'inline' ? 'thr-dashboard-header-actions' : 'thr-dashboard-header-bar');
    if (mount.mode === 'inline') {
        if (launcher.parentElement !== mount.container || launcher.nextElementSibling !== mount.beforeNode) {
            mount.container.insertBefore(launcher, mount.beforeNode);
        }
    } else if (launcher.parentElement !== mount.container) {
        mount.container.appendChild(launcher);
    }
    return launcher;
}

function syncDashboardWelcomeModalState(modal) {
    if (!modal) return;
    const tutorialBtn = modal.querySelector('[data-thr-tutorial="1"]');
    const closeBtn = modal.querySelector('.thr-dashboard-welcome__button--secondary');

    if (tutorialBtn) {
        tutorialBtn.style.display = '';
    }

    if (closeBtn) {
        closeBtn.textContent = 'Continue to Dashboard';
    }
}

function ensureDashboardWelcomeModal() {
    if (!isDashboardPage()) {
        removeDashboardWelcomeModal();
        return null;
    }
    if (!shouldShowDashboardWelcome()) {
        removeDashboardWelcomeModal();
        return null;
    }

    let modal = getDashboardWelcomeModal();
    if (modal) {
        syncDashboardWelcomeModalState(modal);
        return modal;
    }

    modal = document.createElement('div');
    modal.id = 'thr-dashboard-welcome';
    modal.className = 'thr-dashboard-welcome';
    modal.innerHTML = `
        <div class="thr-dashboard-welcome__backdrop" data-thr-close="1"></div>
        <div class="thr-dashboard-welcome__dialog" role="dialog" aria-modal="true" aria-labelledby="thr-dashboard-welcome-title">
            <button class="thr-dashboard-welcome__close" type="button" aria-label="Close update" data-thr-close="1">×</button>
            <div class="thr-dashboard-welcome__hero">
                <div class="thr-dashboard-welcome__brand">
                    <img class="thr-dashboard-welcome__logo" src="${safeRuntimeGetUrl('icons/logo128px.png')}" alt="TarHeelRatings logo">
                    <div class="thr-dashboard-welcome__copy">
                        <div class="thr-dashboard-welcome__title-row">
                            <h2 id="thr-dashboard-welcome-title" class="thr-dashboard-welcome__title">${DASHBOARD_RELEASE.title}</h2>
                        </div>
                        <p class="thr-dashboard-welcome__intro">${DASHBOARD_RELEASE.intro}</p>
                    </div>
                </div>
                <div class="thr-dashboard-welcome__version">Version ${DASHBOARD_RELEASE.version}</div>
            </div>
            <div class="thr-dashboard-welcome__body">
                <article class="thr-dashboard-welcome__panel">
                    <div class="thr-dashboard-welcome__panel-title">What You Can Do Now</div>
                    <ul class="thr-dashboard-welcome__list">
                        ${DASHBOARD_RELEASE.features.map((item) => `<li>${item}</li>`).join('')}
                    </ul>
                </article>
                <article class="thr-dashboard-welcome__panel">
                    <div class="thr-dashboard-welcome__panel-title">What Feels Better</div>
                    <ul class="thr-dashboard-welcome__list">
                        ${DASHBOARD_RELEASE.fixes.map((item) => `<li>${item}</li>`).join('')}
                    </ul>
                </article>
            </div>
            <div class="thr-dashboard-welcome__footer">
                <div class="thr-dashboard-welcome__actions">
                    <button class="thr-dashboard-welcome__button thr-dashboard-welcome__button--tutorial" type="button" data-thr-tutorial="1">Give me a tutorial!</button>
                    <button class="thr-dashboard-welcome__button thr-dashboard-welcome__button--secondary" type="button" data-thr-close="1">Continue to Dashboard</button>
                </div>
            </div>
        </div>
    `;

    const tutorialBtn = modal.querySelector('[data-thr-tutorial="1"]');
    const closeTargets = modal.querySelectorAll('[data-thr-close="1"]');

    if (tutorialBtn) {
        const handleTutorialStart = (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            startFeatureTutorial();
        };
        tutorialBtn.addEventListener('pointerdown', handleTutorialStart, true);
        tutorialBtn.addEventListener('click', handleTutorialStart, true);
    }

    closeTargets.forEach((el) => {
        const handleClose = (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            dismissDashboardWelcomeModal();
        };
        el.addEventListener('pointerdown', handleClose, true);
        el.addEventListener('click', handleClose, true);
    });

    modal.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('[data-thr-tutorial="1"]')) return;
        if (target.closest('[data-thr-close="1"]')) return;
    });

    document.body.appendChild(modal);
    document.documentElement.classList.add('thr-dashboard-welcome-open');
    document.body.classList.add('thr-dashboard-welcome-open');
    syncDashboardWelcomeModalState(modal);
    launchDashboardWelcomeConfetti(modal);

    return modal;
}

function processDashboardWelcome() {
    if (!ENABLE_DASHBOARD_WELCOME) {
        removeDashboardWelcomeModal();
        removeDashboardLauncher();
        return;
    }
    loadDashboardWelcomeState(() => {
        ensureDashboardLauncher();
        ensureDashboardWelcomeModal();
    });
}

function isFeatureTutorialActive() {
    return !!featureTutorialState.step;
}

function getDashboardTourGuide() {
    return document.getElementById('thr-dashboard-tour-guide');
}

function getDashboardTourPanel() {
    return document.getElementById('thr-dashboard-tour-panel');
}

function removeDashboardTutorial() {
    const guide = getDashboardTourGuide();
    if (guide) guide.remove();
    const panel = getDashboardTourPanel();
    if (panel) panel.remove();
}

function ensureDashboardTourGuide() {
    const tutorialStep = featureTutorialState.step || '';
    const isDashboardStep = /^dashboard_/.test(tutorialStep);
    const isTrackerNavStep = /^tracker_class_/.test(tutorialStep);
    const supportsGuide = isDashboardStep || isTrackerNavStep;
    const canRenderHere = !!getDashboardSidebarRoot();

    if (!supportsGuide || !canRenderHere) {
        removeDashboardTutorial();
        return null;
    }

    let guide = getDashboardTourGuide();
    if (guide) return guide;

    guide = document.createElement('div');
    guide.id = 'thr-dashboard-tour-guide';
    guide.innerHTML = `
        <div class="thr-tracker-guide__spotlight"></div>
        <div class="thr-tracker-guide__pulse"></div>
        <div class="thr-tracker-guide__arrow"></div>
    `;
    document.body.appendChild(guide);
    return guide;
}

function hideDashboardTourTarget() {
    const guide = getDashboardTourGuide();
    if (!guide) return;

    guide.querySelectorAll('.thr-tracker-guide__spotlight, .thr-tracker-guide__pulse, .thr-tracker-guide__arrow').forEach((el) => {
        el.style.display = 'none';
    });
}

function hasLayoutBox(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
    }

    const rect = el.getBoundingClientRect();
    return rect.width >= 2 && rect.height >= 2;
}

function ensureTutorialTargetInView(target, options) {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const inset = 24;
    if (rect.top >= inset && rect.bottom <= (window.innerHeight - inset)) return;
    const behavior = options?.behavior || 'smooth';

    try {
        target.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
            behavior,
        });
    } catch (_) {
        target.scrollIntoView();
    }
}

function positionDashboardTourTarget(target) {
    const guide = ensureDashboardTourGuide();
    if (!guide || !target || !isVisible(target)) {
        hideDashboardTourTarget();
        return;
    }

    ensureTutorialTargetInView(target);
    const rect = target.getBoundingClientRect();
    const spotlight = guide.querySelector('.thr-tracker-guide__spotlight');
    const pulse = guide.querySelector('.thr-tracker-guide__pulse');
    const arrow = guide.querySelector('.thr-tracker-guide__arrow');
    const pad = 10;
    const top = Math.max(8, rect.top - pad);
    const left = Math.max(8, rect.left - pad);
    const width = Math.min(window.innerWidth - left - 8, rect.width + pad * 2);
    const height = Math.min(window.innerHeight - top - 8, rect.height + pad * 2);
    const arrowAbove = rect.top > 150;

    spotlight.style.display = 'block';
    spotlight.style.top = `${top}px`;
    spotlight.style.left = `${left}px`;
    spotlight.style.width = `${width}px`;
    spotlight.style.height = `${height}px`;

    pulse.style.display = 'block';
    pulse.style.top = `${Math.max(4, top - 6)}px`;
    pulse.style.left = `${Math.max(4, left - 6)}px`;
    pulse.style.width = `${Math.min(window.innerWidth - left, width + 12)}px`;
    pulse.style.height = `${Math.min(window.innerHeight - top, height + 12)}px`;

    arrow.style.display = 'block';
    arrow.textContent = arrowAbove ? '↓' : '↑';
    arrow.style.left = `${clamp(rect.left + (rect.width / 2) - 14, 10, window.innerWidth - 48)}px`;
    arrow.style.top = arrowAbove ? `${Math.max(10, rect.top - 54)}px` : `${Math.min(window.innerHeight - 54, rect.bottom + 10)}px`;
}

function ensureDashboardTourPanel() {
    if (!/^(dashboard_|tracker_class_)/.test(featureTutorialState.step || '') || !getDashboardSidebarRoot()) {
        const existing = getDashboardTourPanel();
        if (existing) existing.remove();
        return null;
    }

    let panel = getDashboardTourPanel();
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'thr-dashboard-tour-panel';
    panel.className = 'thr-tracker-sync-panel thr-dashboard-tour-panel';
    panel.innerHTML = `
        <div id="thr-dashboard-tour-eyebrow" class="thr-tracker-sync-panel__eyebrow">Tutorial</div>
        <div id="thr-dashboard-tour-title" class="thr-tracker-sync-panel__title">Let’s learn the new Tracker Sync</div>
        <div id="thr-dashboard-tour-detail" class="thr-tracker-sync-panel__detail"></div>
        <div id="thr-dashboard-tour-hint" class="thr-tracker-sync-panel__hint"></div>
        <div class="thr-dashboard-tour-panel__actions">
            <button id="thr-dashboard-tour-skip" class="thr-dashboard-tour-panel__ghost" type="button">Skip Tutorial</button>
        </div>
    `;

    panel.querySelector('#thr-dashboard-tour-skip').addEventListener('click', () => {
        clearFeatureTutorialStep();
        removeDashboardTutorial();
    });

    document.body.appendChild(panel);
    return panel;
}

function normalizeUiText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

function collectActionTexts(el) {
    const texts = new Set();
    const push = (value) => {
        const normalized = normalizeUiText(value);
        if (normalized) texts.add(normalized);
    };

    push(el.innerText || el.textContent || '');
    push(el.getAttribute?.('aria-label'));
    push(el.getAttribute?.('title'));

    el.querySelectorAll?.('span, div').forEach((child) => {
        const text = normalizeUiText(child.innerText || child.textContent || '');
        if (text && text.length <= 120) {
            texts.add(text);
        }
    });

    return [...texts];
}

function findDashboardActionInRoot(root, regex, options) {
    if (!root) return null;

    const allowOffscreen = !!options?.allowOffscreen;
    const sidebarOnly = !!options?.sidebarOnly;
    const visibilityCheck = allowOffscreen ? hasLayoutBox : isVisible;
    const matches = [];
    const seen = new Set();

    [...root.querySelectorAll('a, button, [role="button"], span, div')].forEach((el) => {
        if (!visibilityCheck(el)) return;
        if (el.closest('#thr-dashboard-welcome, #thr-dashboard-tour-panel')) return;

        const texts = collectActionTexts(el);
        if (!texts.some((text) => regex.test(text))) return;

        const clickable = el.closest('a, button, [role="button"]') || (el.matches('a, button, [role="button"]') ? el : null);
        if (!clickable || !visibilityCheck(clickable)) return;
        if (clickable.closest('#thr-dashboard-welcome, #thr-dashboard-tour-panel')) return;
        if (seen.has(clickable)) return;

        seen.add(clickable);
        const rect = clickable.getBoundingClientRect();
        if (sidebarOnly && rect.left > Math.min(window.innerWidth * 0.35, 360)) return;
        const navBias = rect.left <= Math.min(window.innerWidth * 0.35, 380) ? 0 : 1;
        matches.push({ clickable, rect, navBias });
    });

    matches.sort((a, b) => {
        if (a.navBias !== b.navBias) return a.navBias - b.navBias;
        if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
        if (a.rect.top !== b.rect.top) return a.rect.top - b.rect.top;
        return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
    });

    return matches[0]?.clickable || null;
}

function getDashboardSidebarRoot() {
    return document.querySelector('#nav')
        || document.querySelector('nav')
        || document.querySelector('[role="navigation"]')
        || null;
}

function getSidebarRailLimit() {
    return Math.min(window.innerWidth * 0.35, 380);
}

function getTopLevelSidebarControl(item) {
    if (!item) return null;
    const directChildren = [...item.children].filter((child) => child instanceof HTMLElement);

    for (const child of directChildren) {
        if (child.matches('button, a, [role="button"]')) {
            return child;
        }

        const nested = [...child.children].find((grandchild) =>
            grandchild instanceof HTMLElement && grandchild.matches('button, a, [role="button"]')
        );
        if (nested) {
            return nested;
        }
    }

    return null;
}

function getTopLevelSidebarItems() {
    const sidebarRoot = getDashboardSidebarRoot();
    if (!sidebarRoot) return [];

    const railLimit = getSidebarRailLimit();
    return [...sidebarRoot.querySelectorAll('li')]
        .map((item) => {
            const control = getTopLevelSidebarControl(item);
            if (!control || !hasLayoutBox(control)) return null;

            const rect = control.getBoundingClientRect();
            if (rect.left > railLimit) return null;

            return {
                item,
                control,
                rect,
                texts: collectActionTexts(control),
                title: normalizeUiText(control.getAttribute('title') || ''),
                itemText: normalizeUiText(item.textContent || ''),
            };
        })
        .filter(Boolean);
}

function findSidebarSectionButton(labelRegex, controlsId) {
    const sidebarRoot = getDashboardSidebarRoot();
    if (!sidebarRoot) return null;

    if (controlsId) {
        const controlsRoot = sidebarRoot.querySelector(`#${controlsId}`) || document.getElementById(controlsId);
        const ownerItem = controlsRoot?.closest('li');
        const ownerControl = getTopLevelSidebarControl(ownerItem);
        if (ownerControl && hasLayoutBox(ownerControl)) {
            return ownerControl;
        }
    }

    const labeledDescendant = [...sidebarRoot.querySelectorAll('span, div, a, button, [role="button"]')].find((el) => {
        if (!(el instanceof HTMLElement) || !hasLayoutBox(el)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.left > getSidebarRailLimit()) return false;
        const text = normalizeUiText(el.innerText || el.textContent || '');
        return !!text && labelRegex.test(text);
    });
    if (labeledDescendant) {
        const ownerItem = labeledDescendant.closest('li');
        const ownerControl = getTopLevelSidebarControl(ownerItem);
        if (ownerControl && hasLayoutBox(ownerControl)) {
            return ownerControl;
        }

        const clickable = labeledDescendant.closest('button, a, [role="button"]');
        if (clickable && hasLayoutBox(clickable)) {
            return clickable;
        }
    }

    const labeledItem = [...sidebarRoot.querySelectorAll('li')].find((item) => {
        const itemText = normalizeUiText(item.textContent || '');
        if (!itemText || !labelRegex.test(itemText)) {
            return false;
        }

        const control = getTopLevelSidebarControl(item);
        return !!(control && hasLayoutBox(control));
    });
    if (labeledItem) {
        const control = getTopLevelSidebarControl(labeledItem);
        if (control) {
            return control;
        }
    }

    const candidates = getTopLevelSidebarItems().filter(({ control, texts, title, itemText }) => {
        if (control.closest('#thr-dashboard-welcome, #thr-dashboard-tour-panel, #thr-tracker-sync-panel')) {
            return false;
        }

        const matchesControl = texts.some((text) => labelRegex.test(text));
        const matchesTitle = !!title && labelRegex.test(title);
        const matchesItem = !!itemText && labelRegex.test(itemText);
        return matchesControl || matchesTitle || matchesItem;
    });

    candidates.sort((a, b) => {
        if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
        if (a.rect.top !== b.rect.top) return a.rect.top - b.rect.top;
        return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
    });

    return candidates[0]?.control || null;
}

function findSidebarOwnerControl(controlsId) {
    const sidebarRoot = getDashboardSidebarRoot();
    if (!sidebarRoot || !controlsId) return null;

    const controlsRoot = sidebarRoot.querySelector(`#${controlsId}`) || document.getElementById(controlsId);
    const ownerItem = controlsRoot?.closest('li');
    const ownerControl = getTopLevelSidebarControl(ownerItem);
    return ownerControl && hasLayoutBox(ownerControl) ? ownerControl : null;
}

function findSidebarChildLink(controlsId, labelRegex, hrefNeedle) {
    const controlsRoot = controlsId ? document.getElementById(controlsId) : null;
    if (!controlsRoot || !isVisible(controlsRoot)) return null;

    const candidates = [...controlsRoot.querySelectorAll('a, button, [role="button"]')].filter((el) => {
        if (!isVisible(el)) return false;
        if (hrefNeedle && el.tagName === 'A' && !String(el.getAttribute('href') || '').includes(hrefNeedle)) {
            return false;
        }
        return collectActionTexts(el).some((text) => labelRegex.test(text))
            || labelRegex.test(normalizeUiText(el.closest('li')?.textContent || ''));
    });

    candidates.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        if (aRect.left !== bRect.left) return aRect.left - bRect.left;
        if (aRect.top !== bRect.top) return aRect.top - bRect.top;
        return (bRect.width * bRect.height) - (aRect.width * aRect.height);
    });

    return candidates[0] || null;
}

function findDashboardNavAction(regex) {
    return findSidebarSectionButton(regex);
}

function findAcademicsButton() {
    const sidebarRoot = getDashboardSidebarRoot();
    if (!sidebarRoot) return null;

    return findSidebarOwnerControl('HPT_CX_RECORDS_CHILDREN')
        || sidebarRoot.querySelector('button[title="Academics"], a[title="Academics"], [role="button"][title="Academics"]')
        || findSidebarSectionButton(/^Academics$/i, 'HPT_CX_RECORDS_CHILDREN');
}

function findClassInformationButton() {
    const sidebarRoot = getDashboardSidebarRoot();
    if (!sidebarRoot) return null;

    return findSidebarOwnerControl('HPT_CX_CLASS_INFORMATION_CHILDREN')
        || sidebarRoot.querySelector('button[title="Class Information"], a[title="Class Information"], [role="button"][title="Class Information"]')
        || findSidebarSectionButton(/^Class Information$/i, 'HPT_CX_CLASS_INFORMATION_CHILDREN');
}

function findSidebarMenuToggle() {
    const matches = [];

    [...document.querySelectorAll('button, [role="button"], a')].forEach((el) => {
        if (!isVisible(el)) return;
        if (el.closest('#thr-dashboard-welcome, #thr-dashboard-tour-panel, #thr-tracker-sync-panel')) return;

        const rect = el.getBoundingClientRect();
        if (rect.left > 120 || rect.top > 120 || rect.width < 24 || rect.height < 24) return;

        const texts = collectActionTexts(el).join(' ');
        const html = (el.innerHTML || '').toLowerCase();
        let score = 0;

        if (/menu|navigation|drawer|sidebar/i.test(texts)) score += 10;
        if (/menu|nav|drawer/i.test(html)) score += 4;
        if (rect.width <= 72 && rect.height <= 72) score += 2;
        score += Math.max(0, 120 - rect.left) / 20;
        score += Math.max(0, 120 - rect.top) / 20;

        matches.push({ el, score });
    });

    matches.sort((a, b) => b.score - a.score);
    return matches[0]?.el || null;
}

function isSidebarSectionExpanded(sectionButton, childRegex) {
    if (!sectionButton) return false;

    const ariaExpanded = sectionButton.getAttribute('aria-expanded');
    if (ariaExpanded === 'true') return true;

    const item = sectionButton.closest('li');
    if (!item) return false;

    return [...item.querySelectorAll('.cx-MuiCollapse-root, .cx-MuiCollapse-wrapper, .cx-MuiCollapse-wrapperInner, ul[id*="CHILDREN"]')]
        .some((el) => isVisible(el) && childRegex.test((el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()));
}

function findSidebarChildAction(sectionButton, childRegex) {
    const item = sectionButton?.closest('li');
    if (item) {
        const scoped = findDashboardActionInRoot(item, childRegex);
        if (scoped) return scoped;
    }

    const sidebarRoot = getDashboardSidebarRoot();
    if (sidebarRoot) {
        return findDashboardActionInRoot(sidebarRoot, childRegex, {
            sidebarOnly: true,
        });
    }

    return findDashboardNavAction(childRegex);
}

function findSidebarSectionAction(sectionRegex, childRegex) {
    const matches = [];
    const seen = new Set();
    const sidebarLimit = Math.min(window.innerWidth * 0.35, 360);

    [...document.querySelectorAll('a, button, [role="button"], span, div')].forEach((el) => {
        if (!hasLayoutBox(el)) return;
        if (el.closest('#thr-dashboard-welcome, #thr-dashboard-tour-panel, #thr-tracker-sync-panel')) return;

        const clickable = el.closest('a, button, [role="button"]') || (el.matches('a, button, [role="button"]') ? el : null);
        if (!clickable || !hasLayoutBox(clickable)) return;
        if (clickable.closest('#thr-dashboard-welcome, #thr-dashboard-tour-panel, #thr-tracker-sync-panel')) return;
        if (seen.has(clickable)) return;

        const rect = clickable.getBoundingClientRect();
        if (rect.left > sidebarLimit) return;

        const selfTexts = collectActionTexts(clickable);
        const item = clickable.closest('li');
        const itemText = normalizeUiText(item?.textContent || '');
        const selfMatch = sectionRegex ? selfTexts.some((text) => sectionRegex.test(text)) : false;
        const itemSectionMatch = sectionRegex ? sectionRegex.test(itemText) : false;
        const childMatch = childRegex ? childRegex.test(itemText) : false;

        if (!selfMatch && !itemSectionMatch && !childMatch) return;

        seen.add(clickable);
        matches.push({
            clickable,
            rect,
            score: (selfMatch ? 100 : 0) + (itemSectionMatch ? 70 : 0) + (childMatch ? 40 : 0),
        });
    });

    matches.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
        if (a.rect.top !== b.rect.top) return a.rect.top - b.rect.top;
        return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
    });

    return matches[0]?.clickable || null;
}

function findVisibleSidebarAction(selector, matcher) {
    const sidebarLimit = Math.min(window.innerWidth * 0.35, 360);
    const matches = [...document.querySelectorAll(selector)].filter((el) => {
        if (!isVisible(el)) return false;
        if (el.closest('#thr-dashboard-welcome, #thr-dashboard-tour-panel, #thr-tracker-sync-panel')) return false;

        const rect = el.getBoundingClientRect();
        if (rect.left > sidebarLimit) return false;
        if (typeof matcher === 'function' && !matcher(el)) return false;
        return true;
    });

    matches.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        if (aRect.left !== bRect.left) return aRect.left - bRect.left;
        if (aRect.top !== bRect.top) return aRect.top - bRect.top;
        return (bRect.width * bRect.height) - (aRect.width * aRect.height);
    });

    return matches[0] || null;
}

function isDashboardAcademicsExpanded(academicsButton) {
    return isSidebarSectionExpanded(academicsButton, /Tar Heel Tracker/i);
}

function findDashboardTrackerAction(academicsButton) {
    const byExactSection = findSidebarChildLink('HPT_CX_RECORDS_CHILDREN', /^Tar Heel Tracker$/i);
    if (byExactSection) return byExactSection;
    return findSidebarChildAction(academicsButton, /^Tar Heel Tracker$/i);
}

function bindDashboardTutorialTarget(target, currentStep, nextStep, delayMs) {
    if (!target) return;
    const boundKey = `${currentStep}->${nextStep}`;
    if (target.dataset.thrDashboardTutorialBound === boundKey) return;
    target.dataset.thrDashboardTutorialBound = boundKey;

    const advanceDelay = typeof delayMs === 'number' ? delayMs : 0;
    const advance = () => {
        if (featureTutorialState.step === currentStep) {
            const runAdvance = () => {
                if (featureTutorialState.step !== currentStep) return;
                setFeatureTutorialStep(nextStep);
                processDashboardTutorial();
            };

            if (advanceDelay > 0) {
                window.setTimeout(runAdvance, advanceDelay);
            } else {
                runAdvance();
            }
        }
    };

    target.addEventListener('click', advance);
    target.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            advance();
        }
    });
}

function bindDashboardTutorialProgressTarget(target, action) {
    if (!target || !action) return;
    if (target.dataset.thrDashboardGuideProgress === action) return;
    target.dataset.thrDashboardGuideProgress = action;

    const mark = () => {
        markDashboardGuideProgress(action);
        window.setTimeout(() => {
            processDashboardTutorial();
        }, 180);
    };

    target.addEventListener('click', mark);
    target.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            mark();
        }
    });
}

function setDashboardTourPanelState(options) {
    const panel = ensureDashboardTourPanel();
    if (!panel) return;

    const eyebrowEl = panel.querySelector('#thr-dashboard-tour-eyebrow');
    const titleEl = panel.querySelector('#thr-dashboard-tour-title');
    const detailEl = panel.querySelector('#thr-dashboard-tour-detail');
    const hintEl = panel.querySelector('#thr-dashboard-tour-hint');

    const detail = options.detail || '';
    const hint = options.hint || '';

    if (eyebrowEl) eyebrowEl.textContent = options.eyebrow || 'Tutorial';
    if (titleEl) titleEl.textContent = options.title || '';
    if (detailEl) {
        detailEl.textContent = detail;
        detailEl.style.display = detail ? '' : 'none';
    }
    if (hintEl) {
        hintEl.textContent = hint;
        hintEl.style.display = hint ? '' : 'none';
    }
}

function processDashboardTutorial() {
    loadFeatureTutorialState(() => {
        const tutorialStep = featureTutorialState.step || '';
        const isDashboardStep = /^dashboard_/.test(tutorialStep);
        const isTrackerNavStep = /^tracker_class_/.test(tutorialStep);
        const sidebarRoot = getDashboardSidebarRoot();

        if (isTrackerNavStep) {
            getTrackerPanel()?.remove();
            getTrackerGuide()?.remove();
        }

        if (!isDashboardStep && !isTrackerNavStep) {
            clearDashboardGuideProgress();
            removeDashboardTutorial();
            return;
        }

        if (!sidebarRoot) {
            clearDashboardGuideProgress();
            removeDashboardTutorial();
            return;
        }

        const guide = ensureDashboardTourGuide();
        if (!guide) return;

        let panel = null;
        if (isDashboardStep || isTrackerNavStep) {
            panel = ensureDashboardTourPanel();
            if (!panel) return;
        }

        const academics = findAcademicsButton();
        const academicsExpanded = isDashboardAcademicsExpanded(academics);
        const tracker = academicsExpanded ? findDashboardTrackerAction(academics) : null;
        const trackerNavTargets = getTrackerNavigationTargets();
        const dashboardGuideExpired = dashboardGuideProgress.startedAt > 0
            && (Date.now() - dashboardGuideProgress.startedAt) > DASHBOARD_GUIDE_PENDING_MS;
        if (dashboardGuideExpired) {
            clearDashboardGuideProgress();
        }

        if (featureTutorialState.step === 'dashboard_academics') {
            bindDashboardTutorialProgressTarget(academics, 'academics_clicked');

            // Only advance after the user actually clicks Academics during the tutorial.
            if (dashboardGuideProgress.action === 'academics_clicked' && academicsExpanded && tracker) {
                clearDashboardGuideProgress();
                setFeatureTutorialStep('dashboard_tracker');
                processDashboardTutorial();
                return;
            }

            setDashboardTourPanelState({
                eyebrow: 'Tutorial • Step 1 of 9',
                title: academics ? 'Click Academics' : 'Find Academics',
                detail: academics
                    ? 'Open the Academics section in the left sidebar.'
                    : 'Wait for the Academics section to appear in the left sidebar.',
            });
            if (academics) positionDashboardTourTarget(academics);
            else hideDashboardTourTarget();
            return;
        }

        if (featureTutorialState.step === 'dashboard_tracker') {
            clearDashboardGuideProgress();
            bindDashboardTutorialTarget(tracker, 'dashboard_tracker', 'tracker_walkthrough', 0);
            setDashboardTourPanelState({
                eyebrow: 'Tutorial • Step 2 of 9',
                title: tracker ? 'Click Tar Heel Tracker' : 'Wait for Tar Heel Tracker',
                detail: tracker
                    ? 'Select Tar Heel Tracker from the expanded Academics menu.'
                    : 'Wait for Tar Heel Tracker to appear under Academics.',
            });
            if (tracker) positionDashboardTourTarget(tracker);
            else if (academics) positionDashboardTourTarget(academics);
            else hideDashboardTourTarget();
            return;
        }

        if (tutorialStep === 'tracker_class_information') {
            bindFeatureTutorialNavigationTarget(
                trackerNavTargets.classInformation,
                'tracker_class_information',
                'tracker_class_search'
            );
            setDashboardTourPanelState({
                eyebrow: 'Tutorial • Step 6 of 9',
                title: 'Click Class Information',
                detail: 'Use the left tracker navigation to expand Class Information. That reveals Class Search underneath it.',
            });
            if (trackerNavTargets.classInformation) {
                positionDashboardTourTarget(trackerNavTargets.classInformation);
            } else {
                hideDashboardTourTarget();
            }
            return;
        }

        if (tutorialStep === 'tracker_class_search') {
            bindFeatureTutorialNavigationTarget(
                trackerNavTargets.classSearch,
                'tracker_class_search',
                'class_search_tracker_toggle'
            );
            setDashboardTourPanelState({
                eyebrow: 'Tutorial • Step 7 of 9',
                title: 'Click Class Search',
                detail: 'Now click the Class Search link that appears underneath Class Information.',
            });
            if (trackerNavTargets.classSearch) {
                positionDashboardTourTarget(trackerNavTargets.classSearch);
            } else {
                hideDashboardTourTarget();
            }
            return;
        }

        removeDashboardTutorial();
    });
}

/* ── TarHeel Tracker ── */
// Tracker requirements sync directly from the tracker page DOM.

let trackerSyncTimer = null;
let trackerSyncInFlight = false;
let lastTrackerSyncSignature = '';
let trackerUiRefreshFrame = 0;
let trackerUiStateLoaded = false;
let trackerUiState = {
    reqs: [],
    status: '',
    error: '',
};
let trackerGuideProgress = {
    action: '',
    startedAt: 0,
};
let trackerTutorialCompletionAt = 0;

const TRACKER_GUIDE_PENDING_MS = 5000;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getMutationElement(node) {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) return node;
    return node.parentElement || null;
}

function isExtensionOwnedNode(node) {
    const el = getMutationElement(node);
    if (!el) return false;
    return !!el.closest('#thr-dashboard-welcome, #thr-dashboard-tour-guide, #thr-dashboard-tour-panel, #thr-tracker-guide, #thr-tracker-sync-panel, #thr-toast-global, .thr-multi-wrapper, .thr-professor');
}

function isExtensionMutationTarget(node) {
    const el = getMutationElement(node);
    if (!el) return false;
    if (isExtensionOwnedNode(el)) return true;
    return el === document.body || el === document.documentElement;
}

function isIgnorableExtensionMutationNode(node) {
    if (!node) return true;
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    return isExtensionOwnedNode(node);
}

async function waitForTrackerPageSettle(ms) {
    await delay(ms);
}

function getTrackerPageText() {
    return (document.body?.innerText || '').replace(/\u00a0/g, ' ').trim();
}

function isLikelyTrackerContentFrame() {
    let isTopFrame = false;
    try {
        isTopFrame = (window === window.top);
    } catch (e) {
        isTopFrame = true;
    }

    if (isTopFrame || window.name === 'TargetContent') {
        return true;
    }

    const width = Math.max(
        document.documentElement?.clientWidth || 0,
        document.body?.clientWidth || 0
    );
    return width >= 500;
}

function isTrackerPage() {
    if (!isLikelyTrackerContentFrame()) return false;
    if (/H_DASHBOARD\.FieldFormula\.IScript_Main/i.test(location.href)) return false;
    const text = getTrackerPageText();
    return /Tar Heel Tracker/i.test(text) && /(View PDF|Requirement Group|Hide Satisfied Requirements)/i.test(text);
}

function matchesVisibilityProbe(el, x, y) {
    const hit = document.elementFromPoint(x, y);
    if (!hit) return false;
    return el === hit || el.contains(hit) || hit.contains(el);
}

function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) {
        return false;
    }

    const points = [
        [clamp(rect.left + (rect.width / 2), 1, window.innerWidth - 1), clamp(rect.top + (rect.height / 2), 1, window.innerHeight - 1)],
        [clamp(rect.left + 8, 1, window.innerWidth - 1), clamp(rect.top + 8, 1, window.innerHeight - 1)],
        [clamp(rect.right - 8, 1, window.innerWidth - 1), clamp(rect.bottom - 8, 1, window.innerHeight - 1)],
    ];

    return points.some(([x, y]) => matchesVisibilityProbe(el, x, y));
}

function findTrackerAction(regex) {
    return [...document.querySelectorAll('button, a, [role="button"]')]
        .find((el) => isVisible(el) && regex.test((el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()));
}

function getTrackerGuideSignals() {
    const text = getTrackerPageText();
    const viewAllButton = findTrackerAction(/^View All$/i);
    const expandButton = findTrackerAction(/^(Expand All|Expand Lines)$/i);
    const collapseButton = findTrackerAction(/^(Collapse All|Collapse Lines)$/i);
    const hasStatuses = /\b(?:NOT SATISFIED|SATISFIED(?: - IP)?)\b/.test(text);
    const reportLooksLoaded = hasStatuses && (
        /Navigated to the View All Page/i.test(text) ||
        /Requirement Term:/i.test(text) ||
        /View Courses/i.test(text) ||
        /No Courses/i.test(text) ||
        /Expand [^\n]+ details/i.test(text) ||
        !!expandButton ||
        !!collapseButton
    );

    return {
        text,
        viewAllButton,
        expandButton,
        collapseButton,
        hasStatuses,
        reportLooksLoaded,
    };
}

function markTrackerGuideProgress(action) {
    trackerGuideProgress = {
        action,
        startedAt: Date.now(),
    };
}

function clearTrackerGuideProgress() {
    trackerGuideProgress = {
        action: '',
        startedAt: 0,
    };
}

function markTrackerTutorialCompleted() {
    trackerTutorialCompletionAt = Date.now();
}

function shouldShowTrackerTutorialCompletion() {
    return trackerTutorialCompletionAt > 0 && (Date.now() - trackerTutorialCompletionAt) < 12000;
}

function bindTrackerGuideActionTarget(target, action) {
    if (!target || !action) return;
    if (target.dataset.thrGuideBound === action) return;

    target.dataset.thrGuideBound = action;
    target.addEventListener('click', () => {
        markTrackerGuideProgress(action);
        queueTrackerSyncPanelRefresh(false);
        scheduleTrackerSync(150);
        window.setTimeout(() => queueTrackerSyncPanelRefresh(false), 500);
    });
}

function bindFeatureTutorialNavigationTarget(target, step, nextStep) {
    if (!target || !step) return;
    const boundKey = `${step}->${nextStep || 'done'}`;
    if (target.dataset.thrFeatureTutorialBound === boundKey) return;

    target.dataset.thrFeatureTutorialBound = boundKey;
    const advance = () => {
        if (featureTutorialState.step !== step) return;
        if (nextStep) {
            setFeatureTutorialStep(nextStep);
        } else {
            markTrackerTutorialCompleted();
            clearFeatureTutorialStep();
        }
        queueTrackerSyncPanelRefresh(false);
    };

    target.addEventListener('click', advance);
    target.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            advance();
        }
    });
}

function syncTrackerGuideProgress(signals) {
    if (!trackerGuideProgress.action) return;

    const expired = (Date.now() - trackerGuideProgress.startedAt) > TRACKER_GUIDE_PENDING_MS;
    if (expired) {
        clearTrackerGuideProgress();
        return;
    }

    if (trackerGuideProgress.action === 'view_all' && (
        signals.expandButton ||
        signals.collapseButton ||
        (!signals.viewAllButton && signals.reportLooksLoaded)
    )) {
        clearTrackerGuideProgress();
        return;
    }

    if (trackerGuideProgress.action === 'expand_all' && (
        signals.collapseButton ||
        (!signals.expandButton && signals.reportLooksLoaded)
    )) {
        clearTrackerGuideProgress();
    }
}

function getTrackerPanel() {
    return document.getElementById('thr-tracker-sync-panel');
}

function getTrackerGuide() {
    return document.getElementById('thr-tracker-guide');
}

function ensureTrackerGuide() {
    if (!isTrackerPage()) {
        const existing = getTrackerGuide();
        if (existing) existing.remove();
        return null;
    }

    let guide = getTrackerGuide();
    if (guide) return guide;

    guide = document.createElement('div');
    guide.id = 'thr-tracker-guide';
    guide.innerHTML = `
        <div class="thr-tracker-guide__spotlight"></div>
        <div class="thr-tracker-guide__pulse"></div>
        <div class="thr-tracker-guide__arrow"></div>
    `;
    document.body.appendChild(guide);
    return guide;
}

function hideTrackerGuideTarget() {
    const guide = getTrackerGuide();
    if (!guide) return;

    guide.querySelectorAll('.thr-tracker-guide__spotlight, .thr-tracker-guide__pulse, .thr-tracker-guide__arrow').forEach((el) => {
        el.style.display = 'none';
    });
}

function positionTrackerGuideTarget(target) {
    const guide = ensureTrackerGuide();
    if (!guide || !target || !hasLayoutBox(target)) {
        hideTrackerGuideTarget();
        return;
    }

    ensureTutorialTargetInView(target, { behavior: 'auto' });
    if (!isVisible(target)) {
        window.requestAnimationFrame(() => queueTrackerSyncPanelRefresh(false));
        return;
    }

    const rect = target.getBoundingClientRect();
    const spotlight = guide.querySelector('.thr-tracker-guide__spotlight');
    const pulse = guide.querySelector('.thr-tracker-guide__pulse');
    const arrow = guide.querySelector('.thr-tracker-guide__arrow');
    const pad = 10;
    const top = Math.max(8, rect.top - pad);
    const left = Math.max(8, rect.left - pad);
    const width = Math.min(window.innerWidth - left - 8, rect.width + pad * 2);
    const height = Math.min(window.innerHeight - top - 8, rect.height + pad * 2);
    const arrowAbove = rect.top > 150;

    spotlight.style.display = 'block';
    spotlight.style.top = `${top}px`;
    spotlight.style.left = `${left}px`;
    spotlight.style.width = `${width}px`;
    spotlight.style.height = `${height}px`;

    pulse.style.display = 'block';
    pulse.style.top = `${Math.max(4, top - 6)}px`;
    pulse.style.left = `${Math.max(4, left - 6)}px`;
    pulse.style.width = `${Math.min(window.innerWidth - left, width + 12)}px`;
    pulse.style.height = `${Math.min(window.innerHeight - top, height + 12)}px`;

    arrow.style.display = 'block';
    arrow.textContent = arrowAbove ? '↓' : '↑';
    arrow.style.left = `${clamp(rect.left + (rect.width / 2) - 14, 10, window.innerWidth - 48)}px`;
    arrow.style.top = arrowAbove ? `${Math.max(10, rect.top - 54)}px` : `${Math.min(window.innerHeight - 54, rect.bottom + 10)}px`;
}

function updateTrackerUiState(data) {
    trackerUiState = {
        reqs: Array.isArray(data?.thr_missing_requirements) ? data.thr_missing_requirements : [],
        status: data?.thr_tracker_status || '',
        error: data?.thr_tracker_error || '',
    };
    trackerUiStateLoaded = true;
}

function loadTrackerUiState(callback) {
    safeStorageGet(['thr_missing_requirements', 'thr_tracker_status', 'thr_tracker_error'], (data) => {
        updateTrackerUiState(data);
        if (callback) callback();
    });
}

function setTrackerPanelState(options) {
    const panel = getTrackerPanel();
    if (!panel) return null;

    const {
        eyebrow = 'Tracker Sync',
        title = 'Ready to Sync',
        detail = '',
        hint = '',
        busy = false,
        showButton = false,
        buttonLabel = 'Sync Requirements',
        tone = '',
    } = options || {};

    const eyebrowEl = panel.querySelector('#thr-tracker-sync-eyebrow');
    const titleEl = panel.querySelector('#thr-tracker-sync-title');
    const detailEl = panel.querySelector('#thr-tracker-sync-detail');
    const hintEl = panel.querySelector('#thr-tracker-sync-hint');
    const buttonEl = panel.querySelector('#thr-tracker-sync-btn');

    panel.classList.remove('thr-tracker-sync-panel--success', 'thr-tracker-sync-panel--error');
    if (tone === 'success') panel.classList.add('thr-tracker-sync-panel--success');
    if (tone === 'error') panel.classList.add('thr-tracker-sync-panel--error');

    if (eyebrowEl) eyebrowEl.textContent = eyebrow;
    if (titleEl) titleEl.textContent = title;
    if (detailEl) {
        detailEl.textContent = detail;
        detailEl.style.display = detail ? '' : 'none';
    }
    if (hintEl) {
        hintEl.textContent = hint;
        hintEl.style.display = hint ? '' : 'none';
    }

    if (buttonEl) {
        buttonEl.textContent = buttonLabel;
        buttonEl.disabled = !!busy;
        buttonEl.classList.toggle('thr-tracker-sync-panel__button--hidden', !showButton);
    }

    return buttonEl || null;
}

function ensureTrackerSyncPanel() {
    if (!isTrackerPage()) {
        const existing = getTrackerPanel();
        if (existing) existing.remove();
        return null;
    }

    let panel = getTrackerPanel();
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'thr-tracker-sync-panel';
    panel.className = 'thr-tracker-sync-panel';
    panel.innerHTML = `
        <div id="thr-tracker-sync-eyebrow" class="thr-tracker-sync-panel__eyebrow">New Feature</div>
        <div id="thr-tracker-sync-title" class="thr-tracker-sync-panel__title">Sync missing requirements</div>
        <div id="thr-tracker-sync-detail" class="thr-tracker-sync-panel__detail">View All, Expand, then Sync.</div>
        <div id="thr-tracker-sync-hint" class="thr-tracker-sync-panel__hint"></div>
        <button id="thr-tracker-sync-btn" class="thr-tracker-sync-panel__button thr-tracker-sync-panel__button--hidden" type="button">
            Sync Requirements
        </button>
    `;

    panel.querySelector('#thr-tracker-sync-btn').addEventListener('click', () => {
        runTrackerSyncSequence().catch((error) => {
            setTrackerPanelState({
                eyebrow: 'Needs Attention',
                title: 'That sync took a wrong turn',
                detail: error?.message || String(error),
                hint: 'If the page is still loading, give it a beat and try again.',
                showButton: true,
                buttonLabel: 'Try Again',
                tone: 'error',
            });
        });
    });

    document.body.appendChild(panel);
    return panel;
}

function getTrackerNavigationTargets() {
    const classInformation = findClassInformationButton();
    const controlsId = classInformation?.getAttribute('aria-controls') || 'HPT_CX_CLASS_INFORMATION_CHILDREN';
    const classSearch = findSidebarChildLink(controlsId, /^Class Search$/i, 'H_CLASS_SEARCH');
    const classInformationExpanded = !!classSearch;

    return {
        classInformation: classInformation && isVisible(classInformation) ? classInformation : null,
        classInformationExpanded,
        classSearch: classSearch || null,
    };
}

function getTrackerGuideState(signals, status, reqs, error) {
    const tutorialStep = featureTutorialState.step || '';
    const tutorialActive = /^tracker_/.test(tutorialStep);
    const tutorialRecentlyCompleted = shouldShowTrackerTutorialCompletion();
    const navTargets = getTrackerNavigationTargets();

    if (tutorialStep === 'tracker_class_information') {
        return {
            target: navTargets.classInformation,
            highlightTarget: true,
            eyebrow: 'Tutorial • Step 6 of 9',
            title: 'Click Class Information',
            detail: 'Use the left tracker navigation to expand Class Information. That reveals Class Search underneath it.',
            showButton: false,
        };
    }

    if (tutorialStep === 'tracker_class_search') {
        return {
            target: navTargets.classSearch,
            highlightTarget: !!navTargets.classSearch,
            eyebrow: 'Tutorial • Step 7 of 9',
            title: 'Click Class Search',
            detail: 'Now click the Class Search link that appears underneath Class Information.',
            showButton: false,
        };
    }

    if (trackerSyncInFlight) {
        const button = getTrackerPanel()?.querySelector('#thr-tracker-sync-btn') || null;
        return {
            target: button,
            highlightTarget: true,
            eyebrow: tutorialActive ? 'Tutorial • Step 5 of 9' : 'Syncing',
            title: tutorialActive ? 'Syncing requirements' : 'Reading the tracker page',
            detail: tutorialActive
                ? 'Reading the tracker page and saving your missing requirements now.'
                : 'Pulling your missing requirements straight from the opened tracker page.',
            hint: '',
            busy: true,
            showButton: true,
            buttonLabel: 'Syncing…',
        };
    }

    if (tutorialRecentlyCompleted && status === 'parsed') {
        return {
            target: null,
            highlightTarget: false,
            eyebrow: 'Tutorial Complete',
            title: 'Tar Heel Tracker is now synced',
            detail: `${reqs.length} missing requirement${reqs.length === 1 ? '' : 's'} just got saved from this page.`,
            hint: 'Open Class Search whenever you want to use the synced list.',
            showButton: true,
            buttonLabel: 'Sync Again',
            tone: 'success',
        };
    }

    if (tutorialRecentlyCompleted && status === 'all_satisfied') {
        return {
            target: null,
            highlightTarget: false,
            eyebrow: 'Tutorial Complete',
            title: 'Tar Heel Tracker is now synced',
            detail: 'This tracker page did not show any missing requirements.',
            hint: 'If that changes later, you can run this sync again from here.',
            showButton: true,
            buttonLabel: 'Sync Again',
            tone: 'success',
        };
    }

    if (trackerGuideProgress.action === 'view_all') {
        return {
            target: null,
            highlightTarget: false,
            eyebrow: tutorialActive ? 'Tutorial • Step 3 of 9' : 'Step 1 of 3',
            title: tutorialActive ? 'Opening Tracker' : 'Opening the full tracker',
            detail: tutorialActive
                ? 'Tar Heel Tracker is opening the full report now.'
                : 'ConnectCarolina is switching into the full tracker view now.',
            hint: '',
            showButton: false,
        };
    }

    if (trackerGuideProgress.action === 'expand_all') {
        return {
            target: null,
            highlightTarget: false,
            eyebrow: tutorialActive ? 'Tutorial • Step 4 of 9' : 'Step 2 of 3',
            title: tutorialActive ? 'Opening Requirements' : 'Opening every requirement line',
            detail: tutorialActive
                ? 'Tar Heel Tracker is expanding every requirement line now.'
                : 'Waiting for the tracker to finish cracking open the requirement lines.',
            hint: '',
            showButton: false,
        };
    }

    if (signals.expandButton) {
        return {
            target: signals.expandButton,
            highlightTarget: true,
            eyebrow: tutorialActive ? 'Tutorial • Step 4 of 9' : 'Step 2 of 3',
            title: tutorialActive ? 'Click Expand' : 'Now crack open the details',
            detail: tutorialActive
                ? 'Click the highlighted Expand control so every requirement line opens.'
                : 'Click the highlighted expand control so the unmet lines are actually visible.',
            hint: '',
            showButton: false,
        };
    }

    if (signals.viewAllButton && !signals.reportLooksLoaded) {
        return {
            target: signals.viewAllButton,
            highlightTarget: true,
            eyebrow: tutorialActive ? 'Tutorial • Step 3 of 9' : 'Step 1 of 3',
            title: tutorialActive ? 'Click View All' : 'First stop: View All',
            detail: tutorialActive
                ? 'Click the highlighted View All button to open the full tracker report.'
                : 'Click the highlighted View All button so the full tracker report opens up.',
            hint: '',
            showButton: false,
        };
    }

    if (status === 'parsed') {
        return {
            target: null,
            highlightTarget: false,
            eyebrow: 'Synced',
            title: 'Tracker captured',
            detail: `${reqs.length} missing requirement${reqs.length === 1 ? '' : 's'} loaded from this page.`,
            hint: 'Hop over to Class Search and the fresh list should be waiting there.',
            showButton: true,
            buttonLabel: 'Sync Again',
            tone: 'success',
        };
    }

    if (status === 'all_satisfied') {
        return {
            target: null,
            highlightTarget: false,
            eyebrow: 'Synced',
            title: 'Everything looks satisfied',
            detail: 'No missing requirements were found in the tracker page you opened.',
            hint: 'If something changes later, you can run this sync again from here.',
            showButton: true,
            buttonLabel: 'Sync Again',
            tone: 'success',
        };
    }

    if (status === 'error') {
        const button = getTrackerPanel()?.querySelector('#thr-tracker-sync-btn') || null;
        return {
            target: button,
            highlightTarget: false,
            eyebrow: 'Needs Attention',
            title: 'That sync took a wrong turn',
            detail: error || 'Open the tracker page again and try syncing once everything is visible.',
            hint: 'No PDF detour here. This only reads what is visible on the tracker page.',
            showButton: true,
            buttonLabel: 'Try Again',
            tone: 'error',
        };
    }

    const button = getTrackerPanel()?.querySelector('#thr-tracker-sync-btn') || null;
    return {
        target: button,
        highlightTarget: true,
        eyebrow: tutorialActive ? 'Tutorial • Step 5 of 9' : 'Step 3 of 3',
        title: tutorialActive ? 'Click Sync Requirements' : 'Final click: sync it',
        detail: tutorialActive
            ? 'Everything is open. Click Sync Requirements to save the missing requirements from this page.'
            : 'Everything looks open. Click Sync Requirements and I’ll pull the missing requirements from this page.',
        hint: tutorialActive ? '' : 'This reads the tracker page itself.',
        showButton: true,
        buttonLabel: 'Sync Requirements',
    };
}

function refreshTrackerSyncPanel() {
    if (/^(dashboard_|tracker_class_)/.test(featureTutorialState.step || '')) {
        getTrackerPanel()?.remove();
        getTrackerGuide()?.remove();
        return;
    }

    const panel = ensureTrackerSyncPanel();
    const guide = ensureTrackerGuide();
    if (!panel || !guide) return;

    const signals = getTrackerGuideSignals();
    const navTargets = getTrackerNavigationTargets();
    bindTrackerGuideActionTarget(signals.viewAllButton, 'view_all');
    bindTrackerGuideActionTarget(signals.expandButton, 'expand_all');
    bindFeatureTutorialNavigationTarget(
        navTargets.classInformation,
        'tracker_class_information',
        'tracker_class_search'
    );
    bindFeatureTutorialNavigationTarget(
        navTargets.classSearch,
        'tracker_class_search',
        'class_search_tracker_toggle'
    );
    syncTrackerGuideProgress(signals);

    const guideState = getTrackerGuideState(signals, trackerUiState.status, trackerUiState.reqs, trackerUiState.error);
    const button = setTrackerPanelState(guideState);
    const target = guideState.target || (guideState.showButton ? button : null);

    if (guideState.highlightTarget && target) {
        positionTrackerGuideTarget(target);
    } else {
        hideTrackerGuideTarget();
    }
}

function queueTrackerSyncPanelRefresh(forceRead) {
    const refresh = () => {
        if (forceRead || !trackerUiStateLoaded) {
            loadTrackerUiState(() => {
                refreshTrackerSyncPanel();
            });
            return;
        }

        if (trackerUiRefreshFrame) return;
        trackerUiRefreshFrame = window.requestAnimationFrame(() => {
            trackerUiRefreshFrame = 0;
            refreshTrackerSyncPanel();
        });
    };

    syncFeatureTutorialStepFromStorage(refresh);
}

function sendTrackerTextForParse(text, force) {
    const signature = `${location.href}|${text.length}|${text.slice(0, 2000)}`;
    if (!force && signature === lastTrackerSyncSignature) {
        return Promise.resolve({ success: true, skipped: true });
    }
    if (trackerSyncInFlight) {
        return Promise.resolve({ success: false, skipped: true });
    }

    trackerSyncInFlight = true;
    queueTrackerSyncPanelRefresh(false);

    return new Promise((resolve, reject) => {
        const sent = safeRuntimeSendMessage({ type: 'PARSE_TRACKER_TEXT', text, url: location.href }, (response, error) => {
            trackerSyncInFlight = false;
            queueTrackerSyncPanelRefresh(false);

            if (error) {
                reject(new Error(error.message || 'Tracker sync unavailable.'));
                return;
            }

            if (response && response.success) {
                if (featureTutorialState.step === 'tracker_walkthrough') {
                    setFeatureTutorialStep('tracker_class_information');
                }
                lastTrackerSyncSignature = signature;
                queueTrackerSyncPanelRefresh(false);
                resolve(response);
                return;
            }

            queueTrackerSyncPanelRefresh(false);
            reject(new Error(response?.error || 'Tracker sync failed.'));
        });

        if (!sent) {
            trackerSyncInFlight = false;
            queueTrackerSyncPanelRefresh(false);
            reject(new Error('Tracker sync unavailable.'));
        }
    });
}

async function runTrackerSyncSequence() {
    if (!isTrackerPage()) return;

    ensureTrackerSyncPanel();
    ensureTrackerGuide();

    const signals = getTrackerGuideSignals();
    if (signals.expandButton || (signals.viewAllButton && !signals.reportLooksLoaded && !signals.collapseButton)) {
        refreshTrackerSyncPanel();
        return;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        const text = getTrackerPageText();
        const hasStatuses = /\b(?:NOT SATISFIED|SATISFIED(?: - IP)?)\b/.test(text);
        if (!hasStatuses) {
            await waitForTrackerPageSettle(900);
            continue;
        }

        try {
            await sendTrackerTextForParse(text, true);
            refreshTrackerSyncPanel();
            return;
        } catch (error) {
            if (/still loading|not expanded enough/i.test(error?.message || '') && attempt < 2) {
                await waitForTrackerPageSettle(1200);
                continue;
            }
            setTrackerPanelState({
                eyebrow: 'Needs Attention',
                title: 'That sync took a wrong turn',
                detail: error?.message || String(error),
                hint: 'Make sure the tracker is fully open, then give the button another shot.',
                showButton: true,
                buttonLabel: 'Try Again',
                tone: 'error',
            });
            return;
        }
    }

    setTrackerPanelState({
        eyebrow: 'Needs Attention',
        title: 'The tracker is still waking up',
        detail: 'The page did not finish loading visible status lines yet.',
        hint: 'If ConnectCarolina is still refreshing, wait a second and try again.',
        showButton: true,
        buttonLabel: 'Try Again',
        tone: 'error',
    });
}

function processTrackerPage() {
    if (!isTrackerPage()) {
        trackerTutorialCompletionAt = 0;
        const panel = getTrackerPanel();
        if (panel) panel.remove();
        const guide = getTrackerGuide();
        if (guide) guide.remove();
        return;
    }

    if (/^dashboard_/.test(featureTutorialState.step || '')) {
        setFeatureTutorialStep('tracker_walkthrough');
    }

    queueTrackerSyncPanelRefresh(false);
}

function scheduleTrackerSync(delayMs) {
    clearTimeout(trackerSyncTimer);
    trackerSyncTimer = setTimeout(processTrackerPage, delayMs || 300);
}

// Run immediately
if (!isTrackerPage()) processProfessors();
processDashboardWelcome();
processDashboardTutorial();
loadFeatureTutorialState(() => {
    if (isTrackerPage() && /^dashboard_/.test(featureTutorialState.step || '')) {
        setFeatureTutorialStep('tracker_walkthrough');
    }
    processDashboardTutorial();
    queueTrackerSyncPanelRefresh(false);
});
scheduleTrackerSync(600);
queueTrackerSyncPanelRefresh(true);

// Watch for dynamic changes (pagination, navigation, SPA transitions)
const observer = new MutationObserver((mutations) => {
    if (mutations.length > 0 && mutations.every((mutation) => {
        if (!isExtensionMutationTarget(mutation.target)) return false;
        return [...mutation.addedNodes, ...mutation.removedNodes].every(isIgnorableExtensionMutationNode);
    })) {
        return;
    }

    if (!isTrackerPage()) {
        processProfessors();
    }
    processDashboardWelcome();
    processDashboardTutorial();
    scheduleTrackerSync(600);
    queueTrackerSyncPanelRefresh(false);
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

window.addEventListener('resize', () => {
    processDashboardTutorial();
    queueTrackerSyncPanelRefresh(false);
});

window.addEventListener('scroll', () => {
    processDashboardTutorial();
    queueTrackerSyncPanelRefresh(false);
}, true);

/* ── Global UI Feedback: Toast Notification ── */
addSafeStorageChangeListener((changes, namespace) => {
    if (namespace !== 'local') return;
    if (changes[FEATURE_TUTORIAL_STORAGE_KEY]) {
        featureTutorialState.loaded = true;
        featureTutorialState.step = changes[FEATURE_TUTORIAL_STORAGE_KEY].newValue || '';
        processDashboardTutorial();
        queueTrackerSyncPanelRefresh(false);
    }

    if (!changes.thr_missing_requirements && !changes.thr_tracker_status && !changes.thr_tracker_error) return;

    updateTrackerUiState({
        thr_missing_requirements: changes.thr_missing_requirements?.newValue ?? trackerUiState.reqs,
        thr_tracker_status: changes.thr_tracker_status?.newValue ?? trackerUiState.status,
        thr_tracker_error: changes.thr_tracker_error?.newValue ?? trackerUiState.error,
    });
    queueTrackerSyncPanelRefresh(false);

    let isTopFrame = false;
    try {
        isTopFrame = (window === window.top);
    } catch (e) {
        isTopFrame = true;
    }
    if (!isTopFrame) return;

    safeStorageGet(['thr_missing_requirements', 'thr_tracker_status', 'thr_tracker_error'], (data) => {
        const reqs = Array.isArray(data.thr_missing_requirements) ? data.thr_missing_requirements : [];
        const status = data.thr_tracker_status || '';
        const error = data.thr_tracker_error || '';

        let toast = document.getElementById('thr-toast-global');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'thr-toast-global';
            toast.style.cssText = [
                'position:fixed', 'top:80px', 'right:40px',
                'padding:16px 24px', 'border-radius:14px',
                'z-index:2147483647', 'font-family:system-ui,sans-serif',
                'font-weight:700', 'font-size:15px',
                'box-shadow:0 12px 30px rgba(0,0,0,0.25)',
                'color:white', 'pointer-events:none',
                'opacity:0', 'transform:translateY(-20px)',
                'transition:all 0.4s cubic-bezier(0.2,0.8,0.2,1)'
            ].join(';');
            document.body.appendChild(toast);
        }

        if (status === 'parsing') {
            toast.style.background = '#1d4ed8';
            toast.textContent = 'TarHeel Tracker: Syncing...';
        } else if (reqs.length > 0) {
            toast.style.background = '#15803d';
            toast.textContent = '\u2713 TarHeel Tracker: ' + reqs.length + ' Missing Requirement' + (reqs.length === 1 ? '' : 's');
        } else if (status === 'all_satisfied') {
            toast.style.background = '#f59e0b';
            toast.textContent = 'TarHeel Tracker: All Requirements Satisfied!';
        } else if (status === 'error') {
            toast.style.background = '#b91c1c';
            toast.textContent = 'TarHeel Tracker: Sync failed' + (error ? ' - ' + error : '');
        } else {
            return; // Don't show toast for unknown states
        }

        void toast.offsetWidth;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
        }, 6000);
    });
});
