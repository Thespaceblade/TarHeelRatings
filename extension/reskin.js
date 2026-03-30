/* ── TarHeelRatings – reskin.js ── */
/* Reskins the Shopping Cart content area with a card/list toggle. */

(function () {
    'use strict';

    const VIEW_STORAGE_KEY = 'thrShoppingCartView';
    const FEATURE_TUTORIAL_STORAGE_KEY = 'thr_feature_tutorial_step';
    const CLASS_SEARCH_TUTORIAL_TOGGLE_STEP = 'class_search_tracker_toggle';
    const CLASS_SEARCH_TUTORIAL_ACTION_STEP = 'class_search_requirement_action';
    const CLASS_SEARCH_TUTORIAL_COMPLETE_STEP = 'class_search_tutorial_complete';

    function loadViewPreference() {
        try { return localStorage.getItem(VIEW_STORAGE_KEY) || 'list'; }
        catch (_) { return 'list'; }
    }

    function saveViewPreference(view) {
        try { localStorage.setItem(VIEW_STORAGE_KEY, view); }
        catch (_) { /* storage unavailable */ }
    }

    let currentView = loadViewPreference();
    let featureTutorialStep = '';
    let featureTutorialStepLoaded = false;
    let classSearchTutorialRefreshFrame = 0;
    let classSearchTutorialCompletedAt = 0;
    let classSearchTutorialCompletionTimer = 0;

    /* ── SVG icon strings ── */
    const S = 'stroke-linecap="round" stroke-linejoin="round"';
    const ICON = {
        calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        person: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        warning: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        kebab: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
        chevronDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><polyline points="6 9 12 15 18 9"/></svg>`,
    };

    /* ── Subject-category SVG icons ── */
    const SUBJECT_SVG = {
        code:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
        flask:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M9 3h6"/><path d="M10 3v7L4 18c-.7 1.1.2 3 1.7 3h12.6c1.5 0 2.4-1.9 1.7-3L14 10V3"/></svg>`,
        hash:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
        book:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
        trending:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
        users:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
        globe:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
        music:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
        heart:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
        feather:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>`,
        layers:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
        leaf:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 17 3.5s4.5 2.4 4.5 8.5A7 7 0 0111 20z"/><path d="M2 21c0-3 1.9-5.1 4-6.5"/></svg>`,
        cap:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><line x1="22" y1="10" x2="22" y2="16"/></svg>`,
        file:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${S}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    };

    /* ── Subject → icon category mapping ── */
    const SUBJECT_MAP = {
        COMP: 'code', INLS: 'code',
        MATH: 'hash', STOR: 'hash', STAT: 'hash', MATR: 'hash',
        BIOL: 'flask', BIOS: 'flask', BIOC: 'flask', CHEM: 'flask',
        PHYS: 'flask', ASTR: 'flask', GNET: 'flask', MCRO: 'flask',
        PHCO: 'flask', PHCY: 'flask', PHYA: 'flask', PATH: 'flask',
        ENGL: 'book', CMPL: 'book', CLAS: 'book', RELI: 'book',
        HIST: 'book', PHIL: 'book', FOLK: 'book', AMST: 'book',
        ASIA: 'book', AFRI: 'book', AFAM: 'book',
        ECON: 'trending', BUSI: 'trending', ACCT: 'trending',
        PSYC: 'users', SOCI: 'users', ANTH: 'users', WMST: 'users',
        COMM: 'users', NSCI: 'users', SWRK: 'users',
        POLI: 'layers', PWAD: 'layers', PLCY: 'layers', PLAN: 'layers',
        LAW: 'layers',
        SPAN: 'globe', FREN: 'globe', GERM: 'globe', CHIN: 'globe',
        JAPN: 'globe', ARAB: 'globe', ITAL: 'globe', PORT: 'globe',
        RUSS: 'globe', KREN: 'globe', VIET: 'globe', HEBR: 'globe',
        LATI: 'globe', GREK: 'globe', LING: 'globe', SLAV: 'globe',
        CZCH: 'globe', PLSH: 'globe', ROML: 'globe', DTCH: 'globe',
        MUSC: 'music',
        ART: 'feather', ARTS: 'feather', ARTH: 'feather', DRAM: 'feather',
        MEJO: 'feather',
        NURS: 'heart', SPHG: 'heart', EPID: 'heart', HLTH: 'heart',
        HBEH: 'heart', EXSS: 'heart', PUBH: 'heart', NUTR: 'heart',
        ENVR: 'leaf', ENEC: 'leaf', GEOG: 'leaf', GEOL: 'leaf',
        MASC: 'leaf', ECOL: 'leaf',
        EDUC: 'cap', INTS: 'cap',
        BMME: 'code',
    };

    function getSubjectIcon(classCode) {
        const prefix = (classCode || '').split(/\s/)[0].toUpperCase();
        const cat = SUBJECT_MAP[prefix] || 'file';
        return SUBJECT_SVG[cat];
    }

    /* ── Helpers ── */

    function isShoppingCartPage() {
        return !!(
            document.querySelector('[aria-label="Enrollment_Classes"]') ||
            document.title.includes('Shopping Cart')
        );
    }

    function isDashboardShellFrame() {
        return window === window.top && /H_DASHBOARD\.FieldFormula\.IScript_Main/i.test(location.href);
    }

    function hasClassSearchFormMarkers() {
        const markerCount = [
            findClassSearchFieldInputByToken('TERM'),
            findClassSearchFieldInputByToken('ACAD_CAREER'),
            findClassSearchFieldInputByToken('SUBJECT'),
            findClassSearchFieldInputByToken('CATALOG_NBR'),
            findClassSearchFieldInputByToken('SSR_CLSRCH_WRK_COURSE_ATTR'),
            findClassSearchFieldInputByToken('SSR_CLSRCH_WRK_COURSE_ATTR_VALUE'),
            findClassSearchSearchButton(),
        ].filter(Boolean).length;

        if (markerCount >= 2) return true;

        const labelHits = ['Term', 'Acad Career', 'Subject', 'Catalog Nbr', 'Course Attribute']
            .filter((label) => !!findInputByLabel(label))
            .length;

        return labelHits >= 2;
    }

    function isClassSearchPage() {
        if (hasClassSearchFormMarkers()) return true;
        if (isDashboardShellFrame()) return false;

        if (document.title.includes('Class Search')) return true;
        const heading = document.querySelector('h1, h2, h3, .cx-MuiTypography-h1, .cx-MuiTypography-h2');
        if (heading && (heading.innerText || heading.textContent || '').includes('Class Search')) return true;

        return !!findClassSearchFieldInputByToken('INSTRUCTOR_NAME');
    }

    /**
     * Format days: "MoWeFr" → "MWF", "TuTh" → "TTh", "MoWeFrTuesday Friday" → "MWF"
     * ConnectCarolina uses codes like Mo, Tu, We, Th, Fr (sometimes with full names appended)
     */
    function formatDays(raw) {
        if (!raw) return 'TBA';
        // First strip any full day names that PeopleSoft appends
        let s = raw
            .replace(/Monday/gi, '')
            .replace(/Tuesday/gi, '')
            .replace(/Wednesday/gi, '')
            .replace(/Thursday/gi, '')
            .replace(/Friday/gi, '')
            .replace(/Saturday/gi, '')
            .replace(/Sunday/gi, '')
            .trim();

        if (!s) s = raw.trim();

        // Map two-letter codes to abbreviations
        const map = { Mo: 'M', Tu: 'T', We: 'W', Th: 'Th', Fr: 'F', Sa: 'Sa', Su: 'Su' };
        let result = '';
        let i = 0;
        while (i < s.length) {
            const two = s.substring(i, i + 2);
            if (map[two]) {
                result += map[two];
                i += 2;
            } else {
                i++;
            }
        }

        return result || raw.trim() || 'TBA';
    }

    /**
     * Derive capacity badge info: display text, hover title, and color class.
     * Returns { text, title, capClass }.
     */
    function getCapacityInfo(raw) {
        if (!raw) return { text: '', title: '', capClass: 'thr-cap-open' };
        const isClosed = /closed/i.test(raw);
        const m = raw.match(/(\d+)\s*[\/of]+\s*(\d+)/i);
        if (m) {
            const enrolled = parseInt(m[1]);
            const total = parseInt(m[2]);
            const ratio = enrolled / total;
            let capClass = 'thr-cap-open';
            if (isClosed || ratio >= 0.95) capClass = 'thr-cap-full';
            else if (ratio >= 0.7) capClass = 'thr-cap-filling';
            const word = isClosed ? 'Closed' : 'Open';
            return {
                text: `${word} · ${enrolled}/${total}`,
                title: `${word} — ${enrolled} of ${total} seats filled`,
                capClass,
            };
        }
        if (isClosed)
            return { text: 'Closed', title: 'Class is closed', capClass: 'thr-cap-full' };
        if (/open/i.test(raw))
            return { text: 'Open', title: 'Class is open', capClass: 'thr-cap-open' };
        return { text: raw.substring(0, 12), title: '', capClass: 'thr-cap-open' };
    }

    /**
     * Parse class info text into class code and section.
     * "BIOS 635\n001-LEC (11743)" → { code: "BIOS 635", section: "001-LEC (11743)" }
     * "COMP 211001-LEC (4987)" → { code: "COMP 211", section: "001-LEC (4987)" }
     */
    function parseClassInfo(raw) {
        const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length >= 2) {
            return { code: lines[0], section: lines.slice(1).join(' ') };
        }
        // Single line — try to split at the section number pattern
        const m = raw.match(/^([A-Z]{2,5}\s+\d{3}[A-Z]?)\s*(.*)/);
        if (m) {
            return { code: m[1].trim(), section: m[2].trim() };
        }
        return { code: raw.trim(), section: '' };
    }

    /* ── View Toggle ── */

    function injectToggle() {
        if (document.querySelector('.thr-view-toggle')) return;

        const grid = document.querySelector('[aria-label="Enrollment_Classes"]');
        if (!grid) return;

        const searchInput = document.querySelector('input#search') ||
                            document.querySelector('input[placeholder*="earch"]');
        const toolbar = searchInput
            ? searchInput.closest('[class*="Grid"], [class*="Toolbar"], [class*="toolbar"]')
            : null;

        const container = document.createElement('div');
        container.className = 'thr-view-toggle';
        container.setAttribute('role', 'group');
        container.setAttribute('aria-label', 'View mode');

        const isCard = currentView === 'card';
        container.innerHTML = `
            <button class="thr-toggle-btn${isCard ? ' thr-toggle-active' : ''}"
                    data-view="card" title="Card View" aria-label="Card View"
                    aria-pressed="${isCard}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1.5"/><rect x="9" y="0" width="7" height="7" rx="1.5"/><rect x="0" y="9" width="7" height="7" rx="1.5"/><rect x="9" y="9" width="7" height="7" rx="1.5"/></svg>
            </button>
            <button class="thr-toggle-btn${isCard ? '' : ' thr-toggle-active'}"
                    data-view="list" title="List View" aria-label="List View"
                    aria-pressed="${!isCard}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="16" height="3" rx="1"/><rect x="0" y="6.5" width="16" height="3" rx="1"/><rect x="0" y="12" width="16" height="3" rx="1"/></svg>
            </button>
        `;

        container.querySelectorAll('.thr-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view === currentView) return;
                currentView = view;
                saveViewPreference(view);
                container.querySelectorAll('.thr-toggle-btn').forEach(b => {
                    const active = b.dataset.view === view;
                    b.classList.toggle('thr-toggle-active', active);
                    b.setAttribute('aria-pressed', String(active));
                });
                switchView(view);
            });
        });

        if (toolbar) {
            toolbar.insertBefore(container, toolbar.firstChild);
        } else {
            grid.parentNode.insertBefore(container, grid);
        }
    }

    function switchView(view) {
        const grid = document.querySelector('[aria-label="Enrollment_Classes"]');
        const cardGrid = document.querySelector('.thr-card-grid');

        if (view === 'list') {
            document.querySelectorAll('[data-stolen-id]').forEach(el => {
                const id = el.dataset.stolenId;
                const proxy = document.getElementById(id);
                if (proxy) proxy.removeAttribute('id');
                el.id = id;
            });
            if (grid) {
                grid.style.display = '';
                grid.querySelectorAll('[role="row"]').forEach(r => r.style.display = '');
            }
            if (cardGrid) cardGrid.style.display = 'none';
        } else {
            if (grid) grid.style.display = 'none';
            if (cardGrid) {
                cardGrid.style.display = '';
            } else {
                waitForGridRows(buildCards);
            }
        }
    }

    /* ── Wait for data rows ── */

    function waitForGridRows(callback, maxAttempts) {
        let attempts = 0;
        const max = maxAttempts || 60;

        function check() {
            attempts++;
            const grid = document.querySelector('[aria-label="Enrollment_Classes"]');
            if (!grid) { if (attempts < max) setTimeout(check, 500); return; }

            const rows = grid.querySelectorAll('[role="row"]');
            const dataRows = Array.from(rows).filter((row, i) => {
                if (i === 0) return false;
                return row.querySelectorAll('[role="gridcell"], [role="rowheader"]').length >= 3;
            });

            if (dataRows.length > 0) callback(grid, rows, dataRows);
            else if (attempts < max) setTimeout(check, 500);
        }
        check();
    }

    /* ── Build Cards ── */

    /**
     * Build the instructor row for a card. Handles three cases:
     * 1. content.js already injected .thr-professor → clone it
     * 2. content.js hasn't finished yet → request RMP data ourselves
     * 3. No instructor data → show "Staff"
     */
    function buildInstructorRow(instructorCell) {
        const instrRow = document.createElement('div');
        instrRow.className = 'thr-card-instructor';
        instrRow.innerHTML = `<span class="thr-card-icon">${ICON.person}</span>`;

        if (!instructorCell) {
            instrRow.innerHTML += '<span>Staff</span>';
            return instrRow;
        }

        // Feature 1: The multi-instructor wrapper is present
        const thrMulti = instructorCell.querySelector('.thr-multi-wrapper');
        if (thrMulti) {
            const clone = thrMulti.cloneNode(true);
            instrRow.appendChild(clone);
            clone.querySelectorAll('.thr-professor').forEach(p => {
                p.addEventListener('mouseenter', () => {
                    const tip = p.querySelector('.thr-tooltip');
                    if (!tip) return;
                    const r = p.getBoundingClientRect();
                    tip.style.top = (r.bottom + 6) + 'px';
                    tip.style.left = r.left + 'px';
                    if (r.left + 260 > window.innerWidth)
                        tip.style.left = (window.innerWidth - 270) + 'px';
                    if (r.bottom + 200 > window.innerHeight)
                        tip.style.top = (r.top - 200) + 'px';
                });
            });
            return instrRow;
        }

        // Fallback for single legacy injection (if needed over edge cases)
        const thrProf = instructorCell.querySelector('.thr-professor');
        if (thrProf) {
            const clone = thrProf.cloneNode(true);
            instrRow.appendChild(clone);
            clone.addEventListener('mouseenter', () => {
                const tip = clone.querySelector('.thr-tooltip');
                if (!tip) return;
                const r = clone.getBoundingClientRect();
                tip.style.top = (r.bottom + 6) + 'px';
                tip.style.left = r.left + 'px';
                if (r.left + 260 > window.innerWidth)
                    tip.style.left = (window.innerWidth - 270) + 'px';
                if (r.bottom + 200 > window.innerHeight)
                    tip.style.top = (r.top - 200) + 'px';
            });
            return instrRow;
        }

        const origSpan = instructorCell.querySelector('span[title]')
                      || instructorCell.querySelector('span');
        const rawName = origSpan
            ? (origSpan.getAttribute('title') || origSpan.textContent).trim()
            : '';

        if (!rawName || rawName.toLowerCase() === 'staff' || rawName.toLowerCase() === 'tba') {
            instrRow.innerHTML += `<span>${rawName || 'Staff'}</span>`;
            return instrRow;
        }

        if (typeof parseInstructors === 'function') {
            const parsedList = parseInstructors(rawName);
            if (parsedList && parsedList.length > 0) {
                const multiWrap = document.createElement('div');
                multiWrap.className = 'thr-multi-wrapper';

                parsedList.forEach((parsed, i) => {
                    const wrapper = document.createElement('div');
                    wrapper.textContent = parsed.display;
                    wrapper.style.fontSize = 'inherit';
                    multiWrap.appendChild(wrapper);

                    try {
                        safeRuntimeSendMessage({ professorName: parsed.search }, (resp, error) => {
                            if (error) return;
                            if (resp && resp.success) {
                                injectOverview(wrapper, resp.data, parsed.display);
                            } else {
                                injectNotFound(wrapper, parsed.display);
                            }
                        });
                    } catch (_) { }
                });

                instrRow.appendChild(multiWrap);
                return instrRow;
            }
        }

        instrRow.innerHTML += `<span>${rawName}</span>`;
        return instrRow;
    }

    /**
     * Scan a row for warning/error/info messages beyond the core data cells.
     * Returns an array of { text, level, icon } objects.
     */
    function collectRowMessages(row, cells) {
        const messages = [];
        const seen = new Set();

        function addMsg(text, level) {
            const t = text.trim();
            if (!t || t.length < 3 || seen.has(t)) return;
            seen.add(t);
            messages.push({
                text: t.length > 100 ? t.substring(0, 97) + '…' : t,
                level,
                icon: level === 'error' || level === 'warning' ? ICON.warning : ICON.info,
            });
        }

        for (let i = 8; i < cells.length; i++) {
            const cell = cells[i];
            if (!cell) continue;
            const text = cell.textContent.trim();
            if (!text || cell.querySelector('input[type="checkbox"]')) continue;

            let level = '';
            const html = cell.innerHTML.toLowerCase();
            if (/error|closed|denied|conflict|prerequisite|restriction/i.test(text) ||
                /color\s*:\s*(red|#[ef]00|#dc|#f44)/i.test(html)) {
                level = 'error';
            } else if (/warning|wait\s*list|permission|consent|reserve/i.test(text) ||
                       /color\s*:\s*(orange|#f[a-f]9|#d97|yellow)/i.test(html)) {
                level = 'warning';
            }
            addMsg(text, level);
        }

        row.querySelectorAll('[class*="error"], [class*="warning"], [class*="message"], [class*="alert"], [class*="info-msg"]').forEach(el => {
            const isErr = /error|denied/i.test(el.className) || /error|denied/i.test(el.textContent);
            addMsg(el.textContent, isErr ? 'error' : 'warning');
        });

        return messages;
    }

    /**
     * Scan a row for action links/buttons outside the core data cells (0–7).
     * Returns an array of cloned DOM nodes wired to trigger the original action.
     */
    function collectRowActions(row, cells) {
        const actions = [];
        const handled = new Set();
        const knownCells = new Set();
        for (let i = 0; i <= 7 && i < cells.length; i++) {
            if (cells[i]) knownCells.add(cells[i]);
        }

        function isInKnownCell(el) {
            for (const c of knownCells) { if (c.contains(el)) return true; }
            return false;
        }

        row.querySelectorAll('a[href]').forEach(link => {
            if (link.closest('.thr-professor') || isInKnownCell(link)) return;
            let text = link.textContent.trim();
            if (/^additional actions for/i.test(text)) {
                text = 'Additional Actions';
            }
            if (!text || handled.has(text.toLowerCase())) return;
            const a = document.createElement('a');
            a.textContent = text;
            a.href = link.href;
            a.target = link.target || '_self';
            a.title = link.title || text;
            if (link.id) {
                a.id = link.id;
                link.removeAttribute('id');
                link.dataset.stolenId = a.id;
            }
            handled.add(text.toLowerCase());
            actions.push(a);
        });

        row.querySelectorAll('button').forEach(btn => {
            if (isInKnownCell(btn)) return;
            let text = btn.textContent.trim();
            if (/^additional actions for/i.test(text)) {
                text = 'Additional Actions';
            }
            if (!text || handled.has(text.toLowerCase())) return;
            const b = document.createElement('button');
            b.textContent = text;
            b.title = btn.title || text;
            if (btn.id) {
                b.id = btn.id;
                btn.removeAttribute('id');
                btn.dataset.stolenId = b.id;
            }
            b.addEventListener('click', (e) => { e.stopPropagation(); btn.click(); });
            handled.add(text.toLowerCase());
            actions.push(b);
        });

        // Surface the class detail link from cell 0 if present
        if (cells[0]) {
            const detailLink = cells[0].querySelector('a[href]');
            if (detailLink && !handled.has('details')) {
                const a = document.createElement('a');
                a.textContent = 'Details';
                a.href = detailLink.href;
                a.target = detailLink.target || '_self';
                a.title = 'View class details';
                actions.push(a);
            }
        }

        return actions;
    }

    /**
     * Scrape detail content from the native expanded row.
     * Looks for the two-column INFORMATION / DETAILS layout.
     * Returns { info: [{label, value}], details: [{label, value}] }
     */
    function scrapeDetailContent(row) {
        const result = { info: [], details: [] };
        // The expanded detail sits in a sibling row or a child container
        // Look for grid containers with INFORMATION / DETAILS headers
        const grid = document.querySelector('[aria-label="Enrollment_Classes"]') || 
                     document.querySelector('.cx-MuiTable-root, [role="grid"]');
        // We do not strict return here because detailRow is relative to `row`

        // Find the detail row — it's usually the next sibling row after the data row
        let detailRow = row.nextElementSibling;
        let attempts = 0;
        while (detailRow && attempts < 5) {
            const text = detailRow.textContent || '';
            if (/INFORMATION|DETAILS|Class Number|Career|Session/i.test(text)) break;
            detailRow = detailRow.nextElementSibling;
            attempts++;
        }

        if (!detailRow) return result;

        // Find all label-value pairs. The native layout uses grid items.
        // Labels are typically bold/header text, values follow.
        const allText = detailRow.querySelectorAll('div, span, td, p');
        let currentSection = 'info';
        let i = 0;
        const elements = Array.from(allText);

        // 1. Try native Description List `<dt>` and `<dd>` pairs (Most accurate)
        const dts = detailRow.querySelectorAll('dt');
        if (dts.length > 0) {
            dts.forEach(dt => {
                const dd = dt.nextElementSibling;
                if (dd && dd.tagName.toLowerCase() === 'dd') {
                    const label = dt.textContent.replace(/:$/, '').trim();
                    const value = dd.innerText ? dd.innerText.trim() : dd.textContent.trim();
                    
                    if (label && value) {
                        // Categorize into info (left) or details (right)
                        if (/Instructor|Dates|Meets|Instruction Mode|Room|Campus|Location|Components/i.test(label)) {
                            result.details.push({ label, value });
                        } else {
                            result.info.push({ label, value });
                        }
                    }
                }
            });
        } 
        // 2. Fallback to generic Grid-container divs if dt/dd aren't used
        else {
            const rows = detailRow.querySelectorAll('[class*="MuiGrid-container"], [class*="Grid-container"], tr');
            if (rows.length > 0) {
                rows.forEach(r => {
                    const children = r.querySelectorAll('[class*="MuiGrid-item"], [class*="Grid-item"], td');
                    if (children.length >= 2) {
                        const label = children[0]?.textContent?.replace(/:$/, '').trim();
                        // Use innerText to preserve pre-line newlines from CC
                        const valEl = children[1];
                        const value = (valEl.innerText ? valEl.innerText : valEl.textContent)?.trim();
                        
                        if (label && value && label !== value) {
                            if (/DETAILS/i.test(label)) { currentSection = 'details'; return; }
                            if (/INFORMATION/i.test(label)) { currentSection = 'info'; return; }
                            
                            if (/Instructor|Dates|Meets|Instruction Mode|Room|Campus|Location|Components/i.test(label)) {
                                result.details.push({ label, value });
                            } else {
                                result.info.push({ label, value });
                            }
                        }
                    }
                });
            }
        }

        // Fallback: manual scrape looking for known field labels
        if (result.info.length === 0 && result.details.length === 0) {
            const fullText = detailRow.textContent;
            const knownInfoFields = ['Class Number', 'Career', 'Session', 'Units', 'Grading', 'Description', 'Enrollment Requirements'];
            const knownDetailFields = ['Instructor', 'Dates', 'Meets', 'Instruction Mode', 'Room', 'Campus', 'Location', 'Components'];

            function extractField(text, fieldName) {
                const re = new RegExp(fieldName + '[:\\s]+([^\\n]+)', 'i');
                const m = text.match(re);
                return m ? m[1].trim() : null;
            }

            knownInfoFields.forEach(f => {
                const v = extractField(fullText, f);
                if (v) result.info.push({ label: f, value: v });
            });
            knownDetailFields.forEach(f => {
                const v = extractField(fullText, f);
                if (v) result.details.push({ label: f, value: v });
            });
        }

        return result;
    }

    function buildCards(grid, allRows, dataRows) {
        if (document.querySelector('.thr-card-grid')) return;

        const cardContainer = document.createElement('div');
        cardContainer.className = 'thr-card-grid';
        cardContainer.setAttribute('role', 'listbox');
        cardContainer.setAttribute('aria-label', 'Shopping cart classes');

        dataRows.forEach((row, index) => {
            const rowId = index;
            const cells = row.querySelectorAll('[role="gridcell"], [role="rowheader"]');
            const ct = idx => (cells[idx]?.textContent || '').trim();

            const { code: classCode, section } = parseClassInfo(ct(0));
            const description = ct(1) || 'Untitled Course';
            const daysRaw = ct(2);
            const startTime = ct(3);
            const endTime = ct(4);
            const instructorCell = cells[5] || null;
            const units = (cells[6]?.textContent || '').trim();
            const statusRaw = ct(7);

            const days = formatDays(daysRaw);
            const cap = getCapacityInfo(statusRaw);
            const subjectIcon = getSubjectIcon(classCode);

            const hasTime = startTime && endTime;
            const timeStr = hasTime ? `${startTime} – ${endTime}` : 'Time TBA';
            const scheduleText = days !== 'TBA' || hasTime
                ? `${days} · ${timeStr}`
                : 'Schedule TBA';

            const card = document.createElement('div');
            card.className = 'thr-card';
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'option');
            card.setAttribute('aria-label', `${classCode} ${description}`);

            card.innerHTML = `
                <div class="thr-card-header">
                    <div class="thr-card-code-wrap">
                        <div class="thr-card-code">${classCode}</div>
                        <div class="thr-card-section">${section}</div>
                    </div>
                    <div class="thr-card-header-center">
                        <div class="thr-card-capacity ${cap.capClass}" title="${cap.title}">${cap.text}</div>
                    </div>
                    <div class="thr-card-actions-wrap" id="actions-${rowId}"></div>
                </div>
                <div class="thr-card-body">
                    <div class="thr-card-title-row">
                        <span class="thr-card-subject-icon">${subjectIcon}</span>
                        <div class="thr-card-title">${description}</div>
                    </div>
                    <div class="thr-card-schedule">
                        <span class="thr-card-icon">${ICON.calendar}</span>
                        <span>${scheduleText}</span>
                    </div>
                </div>
            `;

            card.appendChild(buildInstructorRow(instructorCell));

            const messages = collectRowMessages(row, cells);
            if (messages.length) {
                const msgRegion = document.createElement('div');
                msgRegion.className = 'thr-card-messages';
                msgRegion.setAttribute('aria-live', 'polite');
                messages.forEach(msg => {
                    const el = document.createElement('div');
                    el.className = 'thr-card-message' + (msg.level ? ` thr-card-message--${msg.level}` : '');
                    el.innerHTML = `<span class="thr-card-message-icon">${msg.icon}</span><span class="thr-card-message-text">${msg.text}</span>`;
                    msgRegion.appendChild(el);
                });
                card.appendChild(msgRegion);
            }

            const footer = document.createElement('div');
            footer.className = 'thr-card-footer';

            const unitsEl = document.createElement('div');
            unitsEl.className = 'thr-card-units';
            unitsEl.textContent = units ? units + ' units' : '';
            footer.appendChild(unitsEl);

            const actions = collectRowActions(row, cells);
            const actionsWrap = card.querySelector(`#actions-${rowId}`);
            if (actionsWrap && actions.length) {
                if (actions.length === 1) {
                    // Direct Action - no kebab needed
                    const btn = actions[0];
                    btn.classList.add('thr-card-btn-direct');
                    actionsWrap.appendChild(btn);
                } else {
                    // Multiple actions: Primary as button, others in kebab
                    const primary = actions[0];
                    primary.classList.add('thr-card-btn-direct');
                    actionsWrap.appendChild(primary);

                    const kebabWrap = document.createElement('div');
                    kebabWrap.className = 'thr-card-kebab-wrap';
                    const kebabBtn = document.createElement('button');
                    kebabBtn.className = 'thr-card-kebab-btn';
                    kebabBtn.innerHTML = ICON.kebab;
                    
                    const menu = document.createElement('div');
                    menu.className = 'thr-card-kebab-menu';
                    actions.slice(1).forEach(a => {
                        a.setAttribute('role', 'menuitem');
                        menu.appendChild(a);
                    });

                    kebabBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isOpen = menu.classList.toggle('thr-kebab-open');
                        if (isOpen) {
                            const close = (ev) => {
                                if (!kebabWrap.contains(ev.target)) {
                                    menu.classList.remove('thr-kebab-open');
                                    document.removeEventListener('click', close, true);
                                }
                            };
                            setTimeout(() => document.addEventListener('click', close, true), 0);
                        }
                    });
                    kebabWrap.appendChild(kebabBtn);
                    kebabWrap.appendChild(menu);
                    actionsWrap.appendChild(kebabWrap);
                }
            }

            const checkWrap = document.createElement('div');
            checkWrap.className = 'thr-card-check';
            const origCb = row.querySelector('input[type="checkbox"]');
            let cb = null;

            function updateSelection(selected) {
                card.classList.toggle('thr-card-selected', selected);
                card.setAttribute('aria-selected', String(selected));
            }

            if (origCb) {
                const label = document.createElement('label');
                label.className = 'thr-card-select-label';
                cb = origCb.cloneNode(true);
                
                // Force sync initial state from original DOM element
                const isInitiallyChecked = origCb.checked || origCb.hasAttribute('checked');
                cb.checked = isInitiallyChecked;
                
                cb.addEventListener('change', () => {
                    origCb.checked = cb.checked;
                    origCb.dispatchEvent(new Event('change', { bubbles: true }));
                    origCb.click();
                    updateSelection(cb.checked);
                });
                
                updateSelection(isInitiallyChecked);
                label.appendChild(cb);
                label.appendChild(document.createTextNode(' Select'));
                checkWrap.appendChild(label);
            } else {
                card.setAttribute('aria-selected', 'false');
            }

            footer.appendChild(checkWrap);

            card.appendChild(footer);

            card.addEventListener('click', (e) => {
                if (e.target.closest('a, button, input, label, .thr-professor, .thr-tooltip, .thr-card-kebab-wrap')) return;
                // Expansion disabled for now
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    if (e.target.closest('a, button, input, label, .thr-professor, .thr-tooltip, .thr-card-kebab-wrap')) return;
                    // Expansion disabled for now
                }
            });

            cardContainer.appendChild(card);
        });

        grid.parentNode.insertBefore(cardContainer, grid.nextSibling);
        grid.style.display = 'none';
    }

    /* ── List View Column Spacing ── */

    function styleListColumns() {
        const grid = document.querySelector('[aria-label="Enrollment_Classes"]');
        if (!grid) return;

        const rows = grid.querySelectorAll('[role="row"]');
        if (!rows.length) return;

        const headerCells = rows[0].querySelectorAll('[role="columnheader"]');
        let descIdx = -1, instrIdx = -1, unitsIdx = -1;

        headerCells.forEach((h, i) => {
            const t = h.textContent.trim().toUpperCase();
            if (t.includes('DESC')) descIdx = i;
            else if (t.includes('INSTR')) instrIdx = i;
            else if (t.includes('UNIT')) unitsIdx = i;
        });

        if (descIdx >= 0 && headerCells[descIdx]) headerCells[descIdx].classList.add('thr-list-col-desc');
        if (instrIdx >= 0 && headerCells[instrIdx]) headerCells[instrIdx].classList.add('thr-list-col-instr');
        if (unitsIdx >= 0 && headerCells[unitsIdx]) headerCells[unitsIdx].classList.add('thr-list-col-units');

        for (let r = 1; r < rows.length; r++) {
            const cells = rows[r].querySelectorAll('[role="gridcell"], [role="rowheader"]');
            if (descIdx >= 0 && cells[descIdx]) cells[descIdx].classList.add('thr-list-col-desc');
            if (instrIdx >= 0 && cells[instrIdx]) cells[instrIdx].classList.add('thr-list-col-instr');
            if (unitsIdx >= 0 && cells[unitsIdx]) cells[unitsIdx].classList.add('thr-list-col-units');
        }
    }

    /* ── Button Busy Feedback ── */

    function wireBusyButtons() {
        const selectors = [
            'button[class*="MuiButton"]',
            '[class*="cx-MuiButton"]',
        ];
        const actionLabels = /save|validate|enroll|submit|update|drop/i;

        document.querySelectorAll(selectors.join(',')).forEach(btn => {
            if (btn.dataset.thrBusy) return;
            const label = (btn.textContent || '').trim();
            if (!actionLabels.test(label)) return;
            btn.dataset.thrBusy = '1';
            btn.addEventListener('click', () => {
                btn.classList.add('thr-btn-busy');
                setTimeout(() => btn.classList.remove('thr-btn-busy'), 600);
            });
        });
    }

    /* ── Sidebar Icons Fix ── */

    function fixSidebarIcons() {
        // ConnectCarolina's CSP often blocks Google Fonts, leaving raw text instead of actual icons
        // e.g., "shopping_cart", "insert_invitation", etc. We replace them with inline SVGs.
        const SVGS = {
            'shopping_cart': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
            'insert_invitation': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
            'event': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
            'account_circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
            'attach_money': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
            'favorite': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
            'school': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><line x1="22" y1="10" x2="22" y2="16"/></svg>',
            'home': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
        };

        const icons = document.querySelectorAll('.material-icons, .material-icons-outlined, [class*="MuiIcon-root"]');
        icons.forEach(icon => {
            if (icon.dataset.thrFixed) return;
            const text = (icon.textContent || '').trim().toLowerCase();
            if (SVGS[text]) {
                icon.innerHTML = SVGS[text];
                icon.style.fontSize = '0px'; // hide the raw text gracefully just in case
                icon.style.display = 'inline-flex';
                icon.style.alignItems = 'center';
                icon.style.justifyContent = 'center';
                icon.dataset.thrFixed = '1';
                
                // Adjust parent if needed
                const wrapper = icon.parentElement;
                if (wrapper) wrapper.style.overflow = 'visible';
            }
        });
    }

    /* ── Tracker Auto-Search: MUI Autocomplete Interaction ── */

    // Maps tracker requirement titles → ConnectCarolina IDEA dropdown option text
    const GEN_ED_VALUE_MAP = {
        'Aesthetic and Interpretive Analysis': ['Aesthetic & Interpretive Analy', 'Aesthetic and Interpretive Analysis'],
        'Creative Expression, Practice, and Production': ['Creative Expression, Practice', 'Creative Expression, Practice and Production'],
        'Engagement with the Human Past': ['Engagement with the Human Past'],
        'Ethical and Civic Values': ['Ethical and Civic Values'],
        'Global Understanding and Engagement': ['Global Understanding & Engmt', 'Global Understanding and Engagement'],
        'Natural Scientific Investigation': ['Nat Sci Investigation', 'Natural Scientific Investigation'],
        'Power, Difference, and Inequality': ['Power, Difference, Inequality', 'Power, Difference, and Inequality'],
        'Quantitative Reasoning': ['Quantitative Reasoning'],
        'Ways of Knowing': ['Ways of Knowing'],
        'Empirical Investigation Lab': ['Empirical Investigation Lab'],
        'Empirical Investigative Lab': ['Empirical Investigation Lab'],
        'Research and Discovery': ['Research and Discovery'],
        'High Impact Option: Study Abroad': ['High-Impact: Study Abroad'],
        'High Impact Option: Internship': ['High-Impact: Internship'],
        'High Impact Option: Public Service': ['High-Impact: Service Learning'],
        'High Impact Option: Performance Creation or Production': ['High-Impact: Performance'],
        'High Impact Option: Undergraduate Learning Assistant': ['High-Impact: UG Learn Ast'],
        'High Impact Option: High Impact Experience-General': ['High-Impact: General'],
        'High Impact Option: Collaborative Online International Learning': ['High-Impact: COIL'],
        'High Impact Option: Research and Discovery (2nd course)': ['Research and Discovery'],
        'Communication Beyond Carolina': ['Communication Beyond Carolina'],
        'Lifetime Fitness': ['Lifetime Fitness'],
        'Global Language Level 3': ['Global Language', 'Global Language Level 3', 'Global Language through level 3'],
        'Global Language through level 3': ['Global Language', 'Global Language through level 3', 'Global Language Level 3'],
        'Campus Life Experience': ['Campus Life Experience'],
        'Data Literacy': ['Data Literacy'],
        'Interdisciplinary': ['Interdisciplinary'],
        'Writing at the Research University': ['Writing at the Research Univ', 'Writing at the Research University'],
        'Writing at the Research Univ': ['Writing at the Research Univ', 'Writing at the Research University'],
        'Foundations of American Democracy': ['Foundations of Amer. Democracy', 'Foundations of American Democracy'],
        'Foundations of Amer. Democracy': ['Foundations of Amer. Democracy', 'Foundations of American Democracy'],
        'First-Year Seminar': ['First Year Seminar', 'First-Year Seminar'],
        'First Year Seminar': ['First Year Seminar', 'First-Year Seminar'],
        'First-Year Launch': ['First-Year Launch - Section', 'First-Year Launch'],
        'First-Year Launch - Section': ['First-Year Launch - Section', 'First-Year Launch'],
        'First Year Thriving': ['First Year Thriving', 'College Thriving'],
        'College Thriving': ['First Year Thriving', 'College Thriving'],
        'Ideas, Information, and Inquiry': ['Ideas, Information and Inquiry', 'Ideas, Information, and Inquiry'],
        'Ideas, Information and Inquiry': ['Ideas, Information and Inquiry', 'Ideas, Information, and Inquiry'],
        'Triple-I': ['Ideas, Information and Inquiry', 'Ideas, Information, and Inquiry']
    };

    const SPECIFIC_COURSES_MAP = {
        'Optimization': ['MATH 522', 'MATH 524', 'MATH 560', 'STOR 415', 'STOR 612'],
        'Machine Learning and AI': ['COMP 422', 'COMP 562', 'STOR 531', 'STOR 565']
    };

    const REQUIREMENT_OPTION_MAP = {
        'High Impact Experience': {
            label: 'Choose a High-Impact Path',
            sourceNote: 'UNC lists Study Abroad, Internship, Public Service, Performance, Undergraduate Learning Assistant, General, COIL, or a second Research and Discovery course.',
            options: [
                { label: 'Study Abroad', searchTitle: 'High Impact Option: Study Abroad' },
                { label: 'Internship', searchTitle: 'High Impact Option: Internship' },
                { label: 'Public Service', searchTitle: 'High Impact Option: Public Service' },
                { label: 'Performance / Production', searchTitle: 'High Impact Option: Performance Creation or Production' },
                { label: 'UG Learning Assistant', searchTitle: 'High Impact Option: Undergraduate Learning Assistant' },
                { label: 'General', searchTitle: 'High Impact Option: High Impact Experience-General' },
                { label: 'COIL', searchTitle: 'High Impact Option: Collaborative Online International Learning' },
                { label: '2nd Research and Discovery', searchTitle: 'High Impact Option: Research and Discovery (2nd course)' },
            ],
        },
    };

    const REQUIREMENT_LOOKUP_DATA_URL = chrome?.runtime?.getURL
        ? chrome.runtime.getURL('extension/data/unc-requirement-lookup.json')
        : '';
    const PROGRAM_INDEX_DATA_URL = chrome?.runtime?.getURL
        ? chrome.runtime.getURL('extension/data/unc-program-index.json')
        : '';
    const TRACKER_GENERAL_SECTION_KEY = '__thr_general_requirements__';

    const CLASS_SEARCH_PREF_KEYS = {
        term: 'thr_last_class_search_term',
        acadCareer: 'thr_last_class_search_acad_career',
    };

    const AUTOCOMPLETE_RETRY_CONFIG = {
        attempts: 3,
        betweenAttemptsMs: 300,
        confirmTimeoutMs: 1800,
        inputTimeoutMs: 7000,
        interactiveTimeoutMs: 3000,
        optionTimeoutMs: 3000,
        settleMs: 250,
    };

    const REQUIREMENT_LOOKUP_STOP_WORDS = new Set([
        'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
        'course', 'courses', 'requirement', 'requirements', 'major', 'minor', 'check'
    ]);

    let requirementLookupPromise = null;
    let requirementLookupEntries = null;
    let programIndexPromise = null;
    let programIndexData = null;

    function safeLocalStorageGet(keys, callback) {
        if (!chrome?.storage?.local) {
            callback?.({});
            return;
        }

        try {
            chrome.storage.local.get(keys, (result) => {
                callback?.(result || {});
            });
        } catch (_) {
            callback?.({});
        }
    }

    function safeLocalStorageSet(values) {
        if (!chrome?.storage?.local) return false;

        try {
            chrome.storage.local.set(values);
            return true;
        } catch (_) {
            return false;
        }
    }

    function safeLocalStorageRemove(keys) {
        if (!chrome?.storage?.local) return false;

        try {
            chrome.storage.local.remove(keys);
            return true;
        } catch (_) {
            return false;
        }
    }

    function addSafeStorageChangeListener(listener) {
        if (!chrome?.storage?.onChanged?.addListener) return false;

        try {
            chrome.storage.onChanged.addListener(listener);
            return true;
        } catch (_) {
            return false;
        }
    }

    function safeRuntimeSendMessage(message, callback) {
        if (!chrome?.runtime?.sendMessage) {
            callback?.(undefined, new Error('Chrome runtime unavailable.'));
            return false;
        }

        try {
            chrome.runtime.sendMessage(message, (response) => {
                callback?.(response, chrome.runtime.lastError || null);
            });
            return true;
        } catch (error) {
            callback?.(undefined, error);
            return false;
        }
    }

    function getStaticSubCourses(title) {
        for (const [key, courses] of Object.entries(SPECIFIC_COURSES_MAP)) {
            if (title.includes(key) || key.includes(title)) return courses;
        }
        return null;
    }

    function getRequirementChoiceConfig(title) {
        const normalizedTitle = normalizeSearchText(title);
        for (const [key, config] of Object.entries(REQUIREMENT_OPTION_MAP)) {
            const normalizedKey = normalizeSearchText(key);
            if (normalizedTitle.includes(normalizedKey) || normalizedKey.includes(normalizedTitle)) {
                return config;
            }
        }
        return null;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── MUI Autocomplete Helpers ──

    let trackerSearchFeedbackTimer = 0;

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function normalizeSearchText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeFieldLabelText(text) {
        return normalizeSearchText(
            String(text || '')
                .replace(/\*/g, '')
                .replace(/\s*:\s*$/g, '')
        );
    }

    function tokenizeFieldLabelText(text) {
        return normalizeFieldLabelText(text)
            .replace(/[^\w\s]/g, ' ')
            .split(' ')
            .map((token) => token.trim())
            .filter(Boolean);
    }

    function isFieldLabelMatch(actualText, desiredText) {
        const actual = normalizeFieldLabelText(actualText);
        const desired = normalizeFieldLabelText(desiredText);
        if (!actual || !desired) return false;
        if (actual === desired) return true;

        const actualTokens = tokenizeFieldLabelText(actual);
        const desiredTokens = tokenizeFieldLabelText(desired);
        if (!actualTokens.length || !desiredTokens.length) return false;

        if (actualTokens.length === desiredTokens.length) {
            return actualTokens.every((token, index) => token === desiredTokens[index]);
        }

        // Allow longer rendered labels that fully contain the desired label,
        // but do not let a shorter label like "Course Attribute" match
        // "Course Attribute Value".
        if (actualTokens.length > desiredTokens.length) {
            return desiredTokens.every((token) => actualTokens.includes(token));
        }

        return false;
    }

    function escapeSelectorId(value) {
        const raw = String(value || '');
        if (window.CSS?.escape) return window.CSS.escape(raw);
        return raw.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    }

    function escapeSelectorAttrValue(value) {
        return String(value || '')
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"');
    }

    function findInputWithinElement(element) {
        if (!element) return null;
        if (element.matches?.('input:not([type="hidden"])')) return element;
        return element.querySelector?.('input:not([type="hidden"])') || null;
    }

    function expandFieldSelector(selector) {
        const trimmed = String(selector || '').trim();
        if (!trimmed) return [];

        const expanded = [trimmed];
        const inputIdMatch = trimmed.match(/^input#([A-Za-z0-9_:$.-]+)$/);
        if (!inputIdMatch) return expanded;

        const token = inputIdMatch[1];
        const escapedId = escapeSelectorId(token);
        const escapedAttr = escapeSelectorAttrValue(token);

        expanded.push(
            `#${escapedId}`,
            `[id="${escapedAttr}"]`,
            `[id^="${escapedAttr}"]`,
            `[id*="${escapedAttr}"]`,
            `[name="${escapedAttr}"]`,
            `[name^="${escapedAttr}"]`,
            `[name*="${escapedAttr}"]`
        );

        return Array.from(new Set(expanded));
    }

    function findInputBySelectors(selectors) {
        for (const selector of selectors || []) {
            for (const candidate of expandFieldSelector(selector)) {
                let elements = [];
                try {
                    elements = Array.from(document.querySelectorAll(candidate));
                } catch (_) {
                    continue;
                }

                for (const element of elements) {
                    if (!element) continue;

                    if (element.matches?.('label[for]')) {
                        const linkedInput = document.getElementById(element.getAttribute('for'));
                        if (linkedInput && linkedInput.matches?.('input:not([type="hidden"])')) {
                            return linkedInput;
                        }
                    }

                    const input = findInputWithinElement(element);
                    if (input) return input;
                }
            }
        }

        return null;
    }

    function findClassSearchFieldInputByToken(token) {
        return findInputBySelectors(token ? [`input#${token}`] : []);
    }

    function findClassSearchSearchButton() {
        const selectors = [
            'a[id*="CLASS_SRCH"][id*="PB_CLASS_SRCH"]',
            'button[id*="CLASS_SRCH"][id*="PB_CLASS_SRCH"]',
            'input[id*="CLASS_SRCH"][id*="PB_CLASS_SRCH"]',
            'a[id^="CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH"]',
            'button[type="submit"]',
            'button[aria-label="Search"]'
        ];

        for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button) return button;
        }

        return null;
    }

    function findClassSearchResetButton() {
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
        return buttons.find((button) => {
            const text = normalizeSearchText(
                button.innerText ||
                button.textContent ||
                button.getAttribute?.('aria-label') ||
                button.getAttribute?.('value') ||
                ''
            );
            return text === 'reset filters';
        }) || null;
    }

    function isButtonUsable(button) {
        if (!button) return false;
        if ('disabled' in button && button.disabled) return false;
        return normalizeSearchText(button.getAttribute?.('aria-disabled')) !== 'true';
    }

    async function waitForFieldInput(labelText, extraSelectors, timeoutMs) {
        const deadline = Date.now() + (timeoutMs || 4000);

        while (Date.now() < deadline) {
            const input = findFieldInput(labelText, extraSelectors);
            if (input) return input;
            await delay(100);
        }

        return findFieldInput(labelText, extraSelectors);
    }

    async function waitForClassSearchFormReady(timeoutMs) {
        const deadline = Date.now() + (timeoutMs || 4000);
        const sentinels = [
            { label: 'Term', selectors: ['input#TERM'] },
            { label: 'Acad Career', selectors: ['input#ACAD_CAREER'] },
            { label: 'Subject', selectors: ['input#SUBJECT'] },
            { label: 'Catalog Nbr', selectors: ['input#CATALOG_NBR'] },
        ];

        while (Date.now() < deadline) {
            const readyFieldCount = sentinels.filter(({ label, selectors }) => findFieldInput(label, selectors)).length;
            const hasSearchButton = isButtonUsable(findClassSearchSearchButton());

            if (hasSearchButton && readyFieldCount >= 2) return true;

            await delay(100);
        }

        const readyFieldCount = sentinels.filter(({ label, selectors }) => findFieldInput(label, selectors)).length;
        const hasSearchButton = isButtonUsable(findClassSearchSearchButton());
        return hasSearchButton && readyFieldCount >= 2;
    }

    async function waitForSearchButtonReady(timeoutMs) {
        const deadline = Date.now() + (timeoutMs || 2500);

        while (Date.now() < deadline) {
            const button = findClassSearchSearchButton();
            if (isButtonUsable(button)) return button;
            await delay(100);
        }

        const button = findClassSearchSearchButton();
        return isButtonUsable(button) ? button : null;
    }

    function normalizeLookupTitle(text) {
        return normalizeSearchText(stripRequirementPrefix(text))
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function tokenizeLookupTitle(text) {
        return normalizeLookupTitle(text)
            .split(' ')
            .map((token) => token.trim())
            .filter((token) => token && token.length > 1 && !REQUIREMENT_LOOKUP_STOP_WORDS.has(token));
    }

    function dedupeStrings(values) {
        return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
    }

    function normalizeProgramMatchText(text) {
        return normalizeSearchText(String(text || ''))
            .replace(/[–—-]/g, ' ')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function tokenizeProgramMatchText(text) {
        return normalizeProgramMatchText(text)
            .split(' ')
            .map((token) => token.trim())
            .filter((token) => token && token.length > 1 && !REQUIREMENT_LOOKUP_STOP_WORDS.has(token));
    }

    async function loadProgramIndexData() {
        if (programIndexData) return programIndexData;
        if (!PROGRAM_INDEX_DATA_URL) return { programs: {}, catalogYear: '' };
        if (!programIndexPromise) {
            programIndexPromise = fetch(PROGRAM_INDEX_DATA_URL)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Program index request failed with ${response.status}`);
                    }
                    return response.json();
                })
                .then((payload) => {
                    programIndexData = payload || { programs: {}, catalogYear: '' };
                    return programIndexData;
                })
                .catch((error) => {
                    console.warn('[TarHeelRatings] Failed to load program index data:', error);
                    programIndexData = { programs: {}, catalogYear: '' };
                    return programIndexData;
                });
        }

        return programIndexPromise;
    }

    async function loadRequirementLookupEntries() {
        if (Array.isArray(requirementLookupEntries)) return requirementLookupEntries;
        if (!REQUIREMENT_LOOKUP_DATA_URL) return [];
        if (!requirementLookupPromise) {
            requirementLookupPromise = fetch(REQUIREMENT_LOOKUP_DATA_URL)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Lookup data request failed with ${response.status}`);
                    }
                    return response.json();
                })
                .then((payload) => {
                    requirementLookupEntries = Array.isArray(payload?.entries) ? payload.entries : [];
                    return requirementLookupEntries;
                })
                .catch((error) => {
                    console.warn('[TarHeelRatings] Failed to load requirement lookup data:', error);
                    requirementLookupEntries = [];
                    return requirementLookupEntries;
                });
        }

        return requirementLookupPromise;
    }

    function buildRequirementSearchVariants(requirement) {
        const title = String(requirement?.title || '');
        const strippedTitle = stripRequirementPrefix(title) || title;
        const sectionLabel = String(requirement?.sectionLabel || '');
        return dedupeStrings([
            title,
            strippedTitle,
            sectionLabel,
            sectionLabel && strippedTitle ? `${sectionLabel}: ${strippedTitle}` : '',
        ]).filter((value) => !/^(Major Rules|Minor Courses|Minor Rules|Core Courses|Electives):?$/i.test(value));
    }

    function scoreTextVariants(searchVariants, targetVariants) {
        let bestScore = 0;

        searchVariants.forEach((searchVariant) => {
            const normalizedSearch = normalizeProgramMatchText(searchVariant);
            if (!normalizedSearch) return;

            targetVariants.forEach((targetVariant) => {
                const normalizedTarget = normalizeProgramMatchText(targetVariant);
                if (!normalizedTarget) return;

                if (normalizedSearch === normalizedTarget) {
                    bestScore = Math.max(bestScore, 100);
                    return;
                }

                if (normalizedSearch.includes(normalizedTarget) || normalizedTarget.includes(normalizedSearch)) {
                    bestScore = Math.max(bestScore, 86);
                    return;
                }

                const searchTokens = tokenizeProgramMatchText(normalizedSearch);
                const targetTokens = tokenizeProgramMatchText(normalizedTarget);
                if (!searchTokens.length || !targetTokens.length) return;

                const overlapCount = searchTokens.filter((token) => targetTokens.includes(token)).length;
                if (overlapCount === 0) return;
                if (overlapCount === 1 && Math.min(searchTokens.length, targetTokens.length) > 1) return;

                const tokenScore = Math.round((overlapCount / Math.max(searchTokens.length, targetTokens.length)) * 78);
                bestScore = Math.max(bestScore, tokenScore);
            });
        });

        return bestScore;
    }

    function getRequirementProgramContext(requirement, trackerContext) {
        const activePrograms = Array.isArray(trackerContext?.activePrograms) ? trackerContext.activePrograms : [];
        return activePrograms.find((program) =>
            program.label === requirement?.programLabel &&
            program.kind === requirement?.programKind
        ) || null;
    }

    function findProgramGroupMatches(program, requirement) {
        const groups = Array.isArray(program?.groups) ? program.groups : [];
        const searchVariants = buildRequirementSearchVariants(requirement);
        if (!groups.length || !searchVariants.length) return [];

        const scoredGroups = groups
            .map((group) => {
                const groupVariants = dedupeStrings([
                    group.title,
                    group.header,
                    group.header && group.title ? `${group.header}: ${group.title}` : '',
                ]);
                const score = scoreTextVariants(searchVariants, groupVariants);
                return { group, score };
            })
            .filter(({ group, score }) => score >= 55 && Array.isArray(group?.courses) && group.courses.length > 0)
            .sort((a, b) => b.score - a.score);

        if (!scoredGroups.length) return [];
        const bestScore = scoredGroups[0].score;
        return scoredGroups.filter(({ score }) => score >= Math.max(55, bestScore - 6));
    }

    async function resolveProgramScopedCandidateCourses(requirement, trackerContext) {
        const programMatch = getRequirementProgramContext(requirement, trackerContext);
        if (!programMatch?.matched || !programMatch.programSlug) return null;

        const programIndex = await loadProgramIndexData();
        const program = programIndex?.programs?.[programMatch.programSlug];
        if (!program) return null;

        const matches = findProgramGroupMatches(program, requirement);
        if (!matches.length) return null;

        const courses = dedupeStrings(matches.flatMap(({ group }) => group.courses)).slice(0, 24);
        if (!courses.length) return null;

        const sharedPrograms = [];
        const activePrograms = Array.isArray(trackerContext?.activePrograms) ? trackerContext.activePrograms : [];
        activePrograms.forEach((otherProgramMatch) => {
            if (!otherProgramMatch?.matched || otherProgramMatch.programSlug === programMatch.programSlug) return;
            const otherProgram = programIndex?.programs?.[otherProgramMatch.programSlug];
            if (!otherProgram) return;

            const otherMatches = findProgramGroupMatches(otherProgram, requirement);
            if (!otherMatches.length) return;

            const otherCourses = dedupeStrings(otherMatches.flatMap(({ group }) => group.courses));
            const overlap = courses.filter((course) => otherCourses.includes(course));
            if (!overlap.length) return;

            sharedPrograms.push({
                title: otherProgramMatch.programTitle || otherProgram.title || otherProgramMatch.label,
                overlapCount: overlap.length,
            });
        });

        return {
            courses,
            source: 'program_catalog',
            label: 'Possible Courses',
            matchTitle: matches[0].group.title,
            matchTitles: dedupeStrings(matches.map(({ group }) => group.title)),
            programs: [{
                slug: program.slug,
                title: programMatch.programTitle || program.title,
                kind: program.kind,
            }],
            sharedPrograms,
        };
    }

    function scoreLookupEntry(title, entry) {
        const normalizedTitle = normalizeLookupTitle(title);
        const normalizedEntryTitle = normalizeLookupTitle(entry?.normalizedTitle || entry?.title || '');

        if (!normalizedTitle || !normalizedEntryTitle) return 0;
        if (normalizedTitle === normalizedEntryTitle) return 100;
        if (normalizedTitle.includes(normalizedEntryTitle) || normalizedEntryTitle.includes(normalizedTitle)) return 82;

        const titleTokens = tokenizeLookupTitle(normalizedTitle);
        const entryTokens = Array.isArray(entry?.tokens) && entry.tokens.length
            ? entry.tokens.map((token) => normalizeLookupTitle(token)).filter(Boolean)
            : tokenizeLookupTitle(normalizedEntryTitle);

        if (!titleTokens.length || !entryTokens.length) return 0;

        const overlapCount = titleTokens.filter((token) => entryTokens.includes(token)).length;
        if (overlapCount === 0) return 0;
        if (overlapCount === 1 && Math.min(titleTokens.length, entryTokens.length) > 1) return 0;

        return Math.round((overlapCount / Math.max(titleTokens.length, entryTokens.length)) * 70);
    }

    async function findRequirementLookupMatch(title) {
        const entries = await loadRequirementLookupEntries();
        if (!entries.length) return null;

        let bestMatch = null;
        let bestScore = 0;

        entries.forEach((entry) => {
            const score = scoreLookupEntry(title, entry);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        });

        if (!bestMatch || bestScore < 55) return null;
        return { entry: bestMatch, score: bestScore };
    }

    async function resolveRequirementCandidateCourses(requirement, trackerContext) {
        const title = String(requirement?.title || requirement || '');
        const staticCourses = getStaticSubCourses(title);
        if (staticCourses?.length) {
            return {
                courses: staticCourses,
                source: 'static',
                label: 'Fulfilling Courses',
            };
        }

        if (requirement?.programSlug) {
            const programScoped = await resolveProgramScopedCandidateCourses(requirement, trackerContext);
            if (programScoped?.courses?.length) {
                return programScoped;
            }
            return null;
        }

        if (requirement?.programLabel && !requirement?.programSlug) {
            return null;
        }

        const lookupMatch = await findRequirementLookupMatch(title);
        const courses = lookupMatch?.entry?.courses || [];
        if (!courses.length) return null;

        return {
            courses: courses.slice(0, 18),
            source: 'catalog',
            label: 'Possible Courses',
            matchTitle: lookupMatch.entry.title,
            programs: Array.isArray(lookupMatch.entry.programs) ? lookupMatch.entry.programs : [],
            score: lookupMatch.score,
        };
    }

    function buildSubcourseSectionHtml(courses, metadata = {}) {
        if (!Array.isArray(courses) || !courses.length) return '';

        let metaHtml = '';
        if ((metadata?.source === 'catalog' || metadata?.source === 'program_catalog') && metadata.matchTitle) {
            const programTitle = metadata.programs?.[0]?.title || '';
            const sourcePrefix = metadata.source === 'program_catalog' ? 'Program match' : 'Catalog match';
            const sourceText = programTitle
                ? `${sourcePrefix}: ${metadata.matchTitle} (${programTitle})`
                : `${sourcePrefix}: ${metadata.matchTitle}`;
            metaHtml += '<div class="thr-subcourses-meta">' + escapeHtml(sourceText) + '</div>';
        }
        if (metadata?.sharedPrograms?.length) {
            const sharedText = metadata.sharedPrograms
                .map((program) => program.title)
                .filter(Boolean)
                .join(', ');
            if (sharedText) {
                metaHtml += '<div class="thr-subcourses-meta">Also matches: ' + escapeHtml(sharedText) + '</div>';
            }
        }

        let html = '<div class="thr-tracker-card-actions thr-subcourses">' +
            '<div class="thr-tracker-card-actions-label">' + escapeHtml(metadata?.label || 'Possible Courses') + ':</div>' +
            metaHtml +
            '<div class="thr-tracker-card-actions-grid">';

        courses.forEach((course) => {
            html += '<button class="thr-subcourse-btn" data-thr-action-control="1" data-course="' + escapeHtml(course) + '">' + escapeHtml(course) + '</button>';
        });

        html += '</div></div>';
        return html;
    }

    function buildRequirementChoiceSectionHtml(config) {
        if (!config?.options?.length) return '';

        let metaHtml = '';
        if (config.sourceNote) {
            metaHtml = '<div class="thr-subcourses-meta">' + escapeHtml(config.sourceNote) + '</div>';
        }

        let html = '<div class="thr-tracker-card-actions thr-subcourses">' +
            '<div class="thr-tracker-card-actions-label">' + escapeHtml(config.label || 'Choose an Option') + ':</div>' +
            metaHtml +
            '<div class="thr-tracker-card-actions-grid">';

        config.options.forEach((option) => {
            html += '<button class="thr-requirement-option-btn" data-thr-action-control="1" data-search-title="' + escapeHtml(option.searchTitle) + '">' + escapeHtml(option.label) + '</button>';
        });

        html += '</div></div>';
        return html;
    }

    function appendSubcourseSection(card, courses, metadata) {
        if (!card || !Array.isArray(courses) || !courses.length) return null;
        const existing = card.querySelector('.thr-subcourses');
        if (existing) return existing;

        card.insertAdjacentHTML('beforeend', buildSubcourseSectionHtml(courses, metadata));
        return card.querySelector('.thr-subcourses');
    }

    function loadClassSearchPreferences() {
        return new Promise((resolve) => {
            if (!chrome?.storage?.local) {
                resolve({ term: '', acadCareer: '' });
                return;
            }

            safeLocalStorageGet(
                [CLASS_SEARCH_PREF_KEYS.term, CLASS_SEARCH_PREF_KEYS.acadCareer],
                (result) => {
                    resolve({
                        term: result[CLASS_SEARCH_PREF_KEYS.term] || '',
                        acadCareer: result[CLASS_SEARCH_PREF_KEYS.acadCareer] || '',
                    });
                }
            );
        });
    }

    function saveClassSearchPreference(key, value) {
        const cleanValue = String(value || '').trim();
        if (!cleanValue || !chrome?.storage?.local) return;
        safeLocalStorageSet({ [key]: cleanValue });
    }

    function setNativeInputValue(input, text) {
        if (!input) return false;
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(input, text);
        else input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    function triggerElementClick(el) {
        if (!el) return;
        ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    }

    function pressKey(input, key) {
        if (!input) return;
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    }

    function getTrackerSearchStatusEl() {
        return document.getElementById('thr-tracker-search-status');
    }

    function setTrackerToggleBusyState(isBusy) {
        const toggle = document.querySelector('.thr-tracker-toggle');
        if (!toggle) return;
        toggle.dataset.busy = isBusy ? 'true' : 'false';
        toggle.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }

    function setTrackerSearchStatus(message, tone, sticky) {
        const statusEl = getTrackerSearchStatusEl();
        if (!statusEl) return;
        const isBusy = !!message && tone === 'info' && !!sticky;

        clearTimeout(trackerSearchFeedbackTimer);
        statusEl.textContent = message || '';
        statusEl.dataset.tone = tone || 'info';
        statusEl.dataset.busy = isBusy ? 'true' : 'false';
        statusEl.setAttribute('aria-busy', isBusy ? 'true' : 'false');
        statusEl.classList.toggle('thr-tracker-search-status--visible', !!message);
        setTrackerToggleBusyState(isBusy);

        if (message && !sticky) {
            trackerSearchFeedbackTimer = window.setTimeout(() => {
                statusEl.textContent = '';
                statusEl.classList.remove('thr-tracker-search-status--visible');
                statusEl.dataset.tone = 'info';
                statusEl.dataset.busy = 'false';
                statusEl.setAttribute('aria-busy', 'false');
                setTrackerToggleBusyState(false);
            }, 4500);
        }
    }

    function clearTrackerSearchStatus() {
        setTrackerSearchStatus('', 'info', false);
    }

    function setTrackerCardSearching(cardKey, fallbackTitle) {
        document.querySelectorAll('.thr-tracker-card--searching').forEach(card => {
            card.classList.remove('thr-tracker-card--searching');
        });

        const card = cardKey
            ? document.querySelector(`.thr-tracker-card[data-req-key="${escapeSelectorAttrValue(cardKey)}"]`)
            : Array.from(document.querySelectorAll('.thr-tracker-card[data-req-title]'))
                .find((el) => el.getAttribute('data-req-title') === fallbackTitle);
        if (card) {
            card.classList.add('thr-tracker-card--searching');
        }
    }

    function clearTrackerCardSearching() {
        document.querySelectorAll('.thr-tracker-card--searching').forEach(card => {
            card.classList.remove('thr-tracker-card--searching');
        });
    }

    /** Find an <input> by the text of its associated <label> */
    function findInputByLabel(labelText) {
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
            if (isFieldLabelMatch(label.textContent || '', labelText)) {
                // Method 1: label[for] → input[id]
                const forId = label.getAttribute('for');
                if (forId) {
                    const input = document.getElementById(forId);
                    if (input) return input;
                }
                // Method 2: input inside the same parent combobox container
                const parent = label.closest('[role="combobox"]') || label.parentElement;
                if (parent) {
                    const input = parent.querySelector('input');
                    if (input) return input;
                }

                const container = label.closest('[class*="MuiFormControl"], [class*="FormControl"], [role="presentation"], div');
                if (container) {
                    const input = container.querySelector('input');
                    if (input) return input;
                }
            }
        }

        const ariaMatch = Array.from(document.querySelectorAll('input[aria-label], input[placeholder]')).find((input) => {
            const ariaLabel = input.getAttribute('aria-label') || '';
            const placeholder = input.getAttribute('placeholder') || '';
            return (
                isFieldLabelMatch(ariaLabel, labelText) ||
                isFieldLabelMatch(placeholder, labelText)
            );
        });
        if (ariaMatch) return ariaMatch;

        return null;
    }

    function findFieldContainer(labelText, extraSelectors) {
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
            if (!isFieldLabelMatch(label.textContent || '', labelText)) continue;
            const container = label.closest('[class*="MuiFormControl"], [class*="FormControl"], [role="presentation"], [role="combobox"], div');
            if (container) return container;
        }

        const input = findInputBySelectors(extraSelectors);
        if (!input) return null;
        return input.closest('[class*="MuiFormControl"], [class*="FormControl"], [role="presentation"], [role="combobox"], div') || input.parentElement || null;
    }

    /** Type into an MUI Autocomplete input using React's native value setter */
    function typeIntoMUI(input, text) {
        if (!input) return false;
        triggerElementClick(input);
        input.focus();
        return setNativeInputValue(input, text);
    }

    /** Wait for role="option" elements to appear, then find one matching `text` */
    async function waitAndClickOption(matchText, timeoutMs, suppressWarning) {
        const deadline = Date.now() + (timeoutMs || 3000);
        const normalMatch = normalizeSearchText(matchText);

        while (Date.now() < deadline) {
            const options = document.querySelectorAll('[role="option"]');
            let partialMatch = null;

            for (const opt of options) {
                const optText = normalizeSearchText(opt.textContent);
                if (optText === normalMatch) {
                    opt.scrollIntoView?.({ block: 'nearest' });
                    triggerElementClick(opt);
                    return true;
                }

                // Allow a longer desired label to match a shorter rendered option,
                // but do not let a short fallback like "research" match
                // "High-Impact: Research".
                if (!partialMatch && normalMatch.includes(optText)) {
                    partialMatch = opt;
                }
            }

            if (partialMatch) {
                partialMatch.scrollIntoView?.({ block: 'nearest' });
                triggerElementClick(partialMatch);
                return true;
            }
            await delay(100);
        }
        if (!suppressWarning) {
            console.warn('[TarHeelRatings] Option not found:', matchText);
        }
        return false;
    }

    function findFieldInput(labelText, extraSelectors) {
        const fromLabel = findInputByLabel(labelText);
        if (fromLabel) return fromLabel;

        return findInputBySelectors(extraSelectors);
    }

    function getFieldCurrentValue(labelText, extraSelectors) {
        const input = findFieldInput(labelText, extraSelectors);
        return String(input?.value || '').trim();
    }

    function getFieldVisibleText(labelText, extraSelectors) {
        const container = findFieldContainer(labelText, extraSelectors);
        if (!container) return '';
        return normalizeSearchText(container.textContent || '');
    }

    function fieldContainsValue(labelText, extraSelectors, candidate) {
        const normalizedCandidate = normalizeSearchText(candidate);
        if (!normalizedCandidate) return false;

        const inputValue = normalizeSearchText(getFieldCurrentValue(labelText, extraSelectors));
        if (inputValue === normalizedCandidate || inputValue.includes(normalizedCandidate)) {
            return true;
        }

        const visibleText = getFieldVisibleText(labelText, extraSelectors);
        if (!visibleText) return false;

        return visibleText.includes(normalizedCandidate);
    }

    function fieldMatchesAnyValue(labelText, extraSelectors, candidates) {
        return (Array.isArray(candidates) ? candidates : [candidates])
            .filter(Boolean)
            .some((candidate) => fieldContainsValue(labelText, extraSelectors, candidate));
    }

    function getAutocompleteRetryConfig(overrides) {
        return {
            ...AUTOCOMPLETE_RETRY_CONFIG,
            ...(overrides || {}),
        };
    }

    function isFieldInteractive(labelText, extraSelectors) {
        const input = findFieldInput(labelText, extraSelectors);
        if (!input) return false;
        if (input.disabled) return false;
        const ariaDisabled = normalizeSearchText(input.getAttribute('aria-disabled'));
        return ariaDisabled !== 'true';
    }

    async function waitForFieldInteractive(labelText, extraSelectors, timeoutMs) {
        const deadline = Date.now() + (timeoutMs || 2500);
        while (Date.now() < deadline) {
            if (isFieldInteractive(labelText, extraSelectors)) return true;
            await delay(75);
        }
        return isFieldInteractive(labelText, extraSelectors);
    }

    async function waitForFieldValue(labelText, extraSelectors, candidates, timeoutMs) {
        const values = (Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean);
        const deadline = Date.now() + (timeoutMs || 2500);

        while (Date.now() < deadline) {
            if (values.some((candidate) => fieldContainsValue(labelText, extraSelectors, candidate))) {
                return true;
            }
            await delay(75);
        }

        return values.some((candidate) => fieldContainsValue(labelText, extraSelectors, candidate));
    }

    /** Select a value in an MUI Autocomplete by label + option text */
    async function selectMUIAutocomplete(labelText, optionText, extraSelectors, config) {
        const effectiveConfig = getAutocompleteRetryConfig(config);
        const input = await waitForFieldInput(labelText, extraSelectors, effectiveConfig.inputTimeoutMs);
        if (!input) {
            console.warn('[TarHeelRatings] Input not found for label:', labelText, extraSelectors || []);
            return false;
        }
        const interactive = await waitForFieldInteractive(labelText, extraSelectors, effectiveConfig.interactiveTimeoutMs);
        if (!interactive) {
            console.warn('[TarHeelRatings] Field not interactive for label:', labelText, extraSelectors || []);
            return false;
        }

        typeIntoMUI(input, '');
        await delay(75);
        typeIntoMUI(input, optionText);
        await delay(200);

        const clicked = await waitAndClickOption(optionText, effectiveConfig.optionTimeoutMs, true);
        if (clicked) {
            await delay(effectiveConfig.settleMs);
            return waitForFieldValue(labelText, extraSelectors, [optionText], effectiveConfig.confirmTimeoutMs);
        }

        pressKey(input, 'ArrowDown');
        await delay(125);
        pressKey(input, 'Enter');
        await delay(effectiveConfig.settleMs);

        return waitForFieldValue(labelText, extraSelectors, [optionText], effectiveConfig.confirmTimeoutMs);
    }

    async function selectAnyAutocompleteOption(labelText, optionTexts, extraSelectors, config) {
        const effectiveConfig = getAutocompleteRetryConfig(config);
        const candidates = (Array.isArray(optionTexts) ? optionTexts : [optionTexts]).filter(Boolean);
        const currentValue = normalizeSearchText(getFieldCurrentValue(labelText, extraSelectors));
        if (candidates.some((candidate) => currentValue === normalizeSearchText(candidate))) {
            return true;
        }

        for (let attempt = 0; attempt < effectiveConfig.attempts; attempt++) {
            if (fieldMatchesAnyValue(labelText, extraSelectors, candidates)) {
                return true;
            }

            for (const candidate of candidates) {
                const selected = await selectMUIAutocomplete(labelText, candidate, extraSelectors, effectiveConfig);
                if (selected) {
                    return true;
                }
            }

            if (attempt < effectiveConfig.attempts - 1) {
                await delay(effectiveConfig.betweenAttemptsMs);
            }
        }

        console.warn('[TarHeelRatings] Could not select any option for field:', labelText, candidates);
        return false;
    }

    /** Find and click the Search button */
    async function clickSearchButton() {
        const btn = await waitForSearchButtonReady(3000);
        if (btn) {
            console.log('[TarHeelRatings] Clicking Search button');
            btn.focus?.();
            if (typeof btn.click === 'function') {
                btn.click();
            } else {
                triggerElementClick(btn);
            }
            return true;
        }
        console.warn('[TarHeelRatings] Search button not found');
        return false;
    }

    async function resetClassSearchFilters() {
        const button = findClassSearchResetButton();
        if (!button || !isButtonUsable(button)) {
            return false;
        }

        console.log('[TarHeelRatings] Resetting Class Search filters');
        button.focus?.();
        if (typeof button.click === 'function') {
            button.click();
        } else {
            triggerElementClick(button);
        }

        await delay(500);
        return true;
    }

    function stripRequirementPrefix(title) {
        return String(title || '')
            .replace(/^(Course Check:|Subfield Check:)\s*/i, '')
            .trim();
    }

    function findGenEdValue(title) {
        const normalizedTitle = normalizeSearchText(title);
        const match = Object.entries(GEN_ED_VALUE_MAP).find(([key]) => {
            const normalizedKey = normalizeSearchText(key);
            return normalizedTitle.includes(normalizedKey) || normalizedKey.includes(normalizedTitle);
        })?.[1];

        if (!match) return [];
        return Array.isArray(match) ? match : [match];
    }

    async function ensureClassSearchDefaults() {
        const prefs = await loadClassSearchPreferences();
        const desiredAcadCareer = prefs.acadCareer || 'Undergraduate';
        const desiredTerm = prefs.term || '';

        if (desiredTerm) {
            const termSet = await selectAnyAutocompleteOption('Term', [desiredTerm], ['input#TERM']);
            if (termSet) {
                saveClassSearchPreference(CLASS_SEARCH_PREF_KEYS.term, desiredTerm);
            }
        }

        const acadSet = await selectAnyAutocompleteOption('Acad Career', [desiredAcadCareer, 'Undergraduate'], ['input#ACAD_CAREER']);
        if (acadSet) {
            const currentAcadCareer = getFieldCurrentValue('Acad Career', ['input#ACAD_CAREER']) || desiredAcadCareer;
            saveClassSearchPreference(CLASS_SEARCH_PREF_KEYS.acadCareer, currentAcadCareer);
        }
    }

    function wireClassSearchPreferencePersistence() {
        const fields = [
            { label: 'Term', selectors: ['input#TERM'], key: CLASS_SEARCH_PREF_KEYS.term },
            { label: 'Acad Career', selectors: ['input#ACAD_CAREER'], key: CLASS_SEARCH_PREF_KEYS.acadCareer },
        ];

        fields.forEach(({ label, selectors, key }) => {
            const input = findFieldInput(label, selectors);
            if (!input || input.dataset.thrPrefBound === '1') return;

            input.dataset.thrPrefBound = '1';
            let saveTimer = 0;
            const persist = () => {
                window.clearTimeout(saveTimer);
                saveTimer = window.setTimeout(() => {
                    saveClassSearchPreference(key, input.value);
                }, 250);
            };

            input.addEventListener('input', persist);
            input.addEventListener('change', persist);
            input.addEventListener('blur', persist);
        });
    }

    function openCatalogSearch(title, message) {
        const query = stripRequirementPrefix(title) || String(title || '').trim();
        const searchUrl = 'https://catalog.unc.edu/search/?search=' + encodeURIComponent(query);
        setTrackerSearchStatus(message || `Opening the UNC catalog for ${query}.`, 'success', false);
        window.open(searchUrl, '_blank');
    }

    function reportClassSearchFailure(searchTitle, message) {
        const errorMessage = message || `Couldn't stabilize Class Search filters for ${searchTitle}. Please retry.`;
        console.warn('[TarHeelRatings]', errorMessage);
        setTrackerSearchStatus(errorMessage, 'error', true);
    }

    function formatProgramKindLabel(kind) {
        const normalized = normalizeSearchText(kind);
        if (normalized === 'major') return 'Major';
        if (normalized === 'minor') return 'Minor';
        if (normalized === 'track') return 'Track';
        if (normalized === 'concentration') return 'Concentration';
        if (normalized === 'certificate') return 'Certificate';
        if (normalized === 'additional') return 'Additional';
        return 'Program';
    }

    function getRequirementSectionDescriptor(requirement, trackerContext) {
        const programMatch = getRequirementProgramContext(requirement, trackerContext);
        if (programMatch) {
            const key = programMatch.programSlug
                ? `program:${programMatch.programSlug}`
                : `program:${programMatch.kind}:${programMatch.label}`;
            return {
                key,
                title: programMatch.programTitle || programMatch.label,
                eyebrow: formatProgramKindLabel(programMatch.kind),
                matched: !!programMatch.matched,
                note: programMatch.matched ? '' : 'Catalog match unavailable for this program yet.',
                sortOrder: programMatch.order ?? 0,
            };
        }

        if (requirement?.programLabel) {
            return {
                key: `program:${requirement.programKind || 'program'}:${requirement.programLabel}`,
                title: requirement.programLabel,
                eyebrow: formatProgramKindLabel(requirement.programKind),
                matched: false,
                note: 'Catalog match unavailable for this program yet.',
                sortOrder: 999,
            };
        }

        return {
            key: TRACKER_GENERAL_SECTION_KEY,
            title: 'General / University Requirements',
            eyebrow: 'General',
            matched: true,
            note: '',
            sortOrder: 10000,
        };
    }

    function buildTrackerRequirementSections(requirements, trackerContext) {
        const sections = [];
        const byKey = new Map();

        (Array.isArray(requirements) ? requirements : []).forEach((requirement) => {
            const descriptor = getRequirementSectionDescriptor(requirement, trackerContext);
            let section = byKey.get(descriptor.key);
            if (!section) {
                section = {
                    ...descriptor,
                    requirements: [],
                };
                byKey.set(descriptor.key, section);
                sections.push(section);
            }

            section.requirements.push(requirement);
        });

        return sections.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.title.localeCompare(b.title);
        });
    }

    function buildTrackerContextNoticeHtml(trackerContext) {
        if (!trackerContext?.usesApproximateCatalogYear) return '';

        const trackerYear = escapeHtml(trackerContext.catalogYear || 'your tracker');
        const sourceYear = escapeHtml(trackerContext.catalogSourceYear || 'the current UNC catalog');
        return '<div class="thr-tracker-note">Program suggestions use the ' + sourceYear + ' catalog. Your tracker is on ' + trackerYear + ', so program-specific matches are approximate.</div>';
    }

    async function resolveRequirementActionDescriptor(requirement, trackerContext) {
        const rawTitle = String(requirement?.title || '').trim();
        const searchTitle = stripRequirementPrefix(rawTitle) || rawTitle;
        const genEdValues = findGenEdValue(rawTitle).length ? findGenEdValue(rawTitle) : findGenEdValue(searchTitle);
        if (genEdValues.length) {
            return {
                mode: 'direct-search',
                note: `Runs a direct Class Search for ${genEdValues[0]}.`,
            };
        }

        const courseMatch = searchTitle.match(/\b([A-Z]{2,5})\s+(\d{1,4}[A-Z]?)\b/i);
        if (courseMatch) {
            const subject = courseMatch[1].toUpperCase();
            const catalog = courseMatch[2].toUpperCase();
            return {
                mode: 'direct-search',
                note: `Runs a direct Class Search for ${subject} ${catalog}.`,
            };
        }

        const choiceConfig = getRequirementChoiceConfig(rawTitle);
        if (choiceConfig?.options?.length) {
            return {
                mode: 'button-actions',
                note: 'Use one of the search actions below.',
                choiceConfig,
            };
        }

        const staticCourses = getStaticSubCourses(rawTitle);
        if (staticCourses?.length) {
            return {
                mode: 'button-actions',
                note: 'Use one of the search actions below.',
                courses: staticCourses,
                metadata: {
                    label: 'Fulfilling Courses',
                    source: 'static',
                },
            };
        }

        const resolved = await resolveRequirementCandidateCourses(requirement, trackerContext);
        if (resolved?.courses?.length) {
            return {
                mode: 'button-actions',
                note: 'Use one of the search actions below.',
                courses: resolved.courses,
                metadata: resolved,
            };
        }

        return {
            mode: 'disabled',
            note: 'Direct Class Search is not available for this requirement yet.',
        };
    }

    function buildTrackerRequirementCardHtml(requirement, reqKey, actionDescriptor = {}) {
        const actionMode = actionDescriptor.mode || 'disabled';
        const sectionMeta = requirement.sectionLabel &&
            normalizeProgramMatchText(requirement.sectionLabel) !== normalizeProgramMatchText(requirement.title)
            ? '<div class="thr-tracker-card-meta">' + escapeHtml(requirement.sectionLabel) + '</div>'
            : '';
        const subHtml = actionDescriptor.choiceConfig
            ? buildRequirementChoiceSectionHtml(actionDescriptor.choiceConfig)
            : (actionDescriptor.courses?.length ? buildSubcourseSectionHtml(actionDescriptor.courses, actionDescriptor.metadata) : '');
        const actionNote = actionDescriptor.note
            ? '<div class="thr-tracker-card-action-note">' + escapeHtml(actionDescriptor.note) + '</div>'
            : '';
        const titleText = actionMode === 'direct-search'
            ? 'Click to run Class Search for this requirement'
            : (actionMode === 'button-actions'
                ? 'Use one of the search actions below'
                : 'Direct Class Search is not available for this requirement');

        return '<div class="thr-tracker-card" data-req-key="' + escapeHtml(reqKey) + '" data-req-title="' + escapeHtml(requirement.title) + '" data-thr-action-mode="' + escapeHtml(actionMode) + '" title="' + escapeHtml(titleText) + '">' +
            '<div class="thr-tracker-card-top">' +
            '<span class="thr-tracker-card-title">' + escapeHtml(requirement.title) + '</span>' +
            '<span class="thr-tracker-card-status">' + ICON.warning + '</span>' +
            '</div>' +
            sectionMeta +
            '<div class="thr-tracker-card-details">' + escapeHtml(requirement.details || '') + '</div>' +
            actionNote +
            subHtml +
            '</div>';
    }

    async function runGenEdSearchAttempt(searchTitle, matchedValues) {
        setTrackerSearchStatus('Setting Course Attribute to IDEA…', 'info', true);
        const attributeSet = await selectAnyAutocompleteOption(
            'Course Attribute',
            ['IDEA'],
            ['input#SSR_CLSRCH_WRK_COURSE_ATTR']
        );
        if (!attributeSet) {
            return {
                ok: false,
                failureMessage: `Couldn't set Course Attribute to IDEA for ${searchTitle}. Please retry.`,
            };
        }

        const attributeConfirmed = await waitForFieldValue(
            'Course Attribute',
            ['input#SSR_CLSRCH_WRK_COURSE_ATTR'],
            ['IDEA'],
            2200
        );
        if (!attributeConfirmed) {
            return {
                ok: false,
                failureMessage: `Course Attribute would not stay on IDEA for ${searchTitle}. Please retry.`,
            };
        }

        const valueInteractive = await waitForFieldInteractive(
            'Course Attribute Value',
            ['input#SSR_CLSRCH_WRK_COURSE_ATTR_VALUE'],
            3500
        );
        if (!valueInteractive) {
            return {
                ok: false,
                failureMessage: `Course Attribute Value is still loading for ${searchTitle}. Please retry.`,
            };
        }

        setTrackerSearchStatus(`Setting Course Attribute Value to ${matchedValues[0]}…`, 'info', true);
        const valueSet = await selectAnyAutocompleteOption(
            'Course Attribute Value',
            matchedValues,
            ['input#SSR_CLSRCH_WRK_COURSE_ATTR_VALUE']
        );
        if (!valueSet) {
            return {
                ok: false,
                failureMessage: `Couldn't set Course Attribute Value for ${searchTitle}. Please retry.`,
            };
        }

        const attributeStillSet = await waitForFieldValue(
            'Course Attribute',
            ['input#SSR_CLSRCH_WRK_COURSE_ATTR'],
            ['IDEA'],
            1800
        );
        const valueStillSet = await waitForFieldValue(
            'Course Attribute Value',
            ['input#SSR_CLSRCH_WRK_COURSE_ATTR_VALUE'],
            matchedValues,
            1800
        );
        if (!attributeStillSet || !valueStillSet) {
            return {
                ok: false,
                failureMessage: `The Class Search filters did not stay filled in for ${searchTitle}. Please retry.`,
            };
        }

        setTrackerSearchStatus('Running Class Search…', 'info', true);
        const searched = await clickSearchButton();
        if (!searched) {
            return {
                ok: false,
                failureMessage: `Couldn't trigger Class Search for ${searchTitle}. Please retry.`,
            };
        }

        return { ok: true };
    }

    async function runCourseSearchAttempt(searchTitle, subject, catalog) {
        setTrackerSearchStatus('Resetting existing filters for a direct course search…', 'info', true);
        const reset = await resetClassSearchFilters();
        if (reset) {
            await ensureClassSearchDefaults();
        }

        setTrackerSearchStatus(`Setting Subject to ${subject}…`, 'info', true);
        const subjectSet = await selectAnyAutocompleteOption('Subject', [subject], ['input#SUBJECT']);
        if (!subjectSet) {
            return {
                ok: false,
                failureMessage: `Couldn't set Subject to ${subject} for ${searchTitle}. Please retry.`,
            };
        }

        const subjectConfirmed = await waitForFieldValue('Subject', ['input#SUBJECT'], [subject], 1800);
        if (!subjectConfirmed) {
            return {
                ok: false,
                failureMessage: `Subject would not stay on ${subject} for ${searchTitle}. Please retry.`,
            };
        }

        const catInput = await waitForFieldInput('Catalog Nbr', ['input#CATALOG_NBR'], 4000);
        if (!catInput) {
            return {
                ok: false,
                failureMessage: `Couldn't find Catalog Number for ${searchTitle}. Please retry.`,
            };
        }

        setTrackerSearchStatus(`Setting Catalog Number to ${catalog}…`, 'info', true);
        typeIntoMUI(catInput, '');
        await delay(75);
        typeIntoMUI(catInput, catalog);
        const catalogConfirmed = await waitForFieldValue('Catalog Nbr', ['input#CATALOG_NBR'], [catalog], 1500);
        if (!catalogConfirmed) {
            return {
                ok: false,
                failureMessage: `Catalog Number would not stay on ${catalog} for ${searchTitle}. Please retry.`,
            };
        }

        setTrackerSearchStatus('Running Class Search…', 'info', true);
        const searched = await clickSearchButton();
        if (!searched) {
            return {
                ok: false,
                failureMessage: `Couldn't trigger Class Search for ${searchTitle}. Please retry.`,
            };
        }

        return { ok: true };
    }

    // ── Search Execution ──

    async function handleRequirementClick(title, options = {}) {
        if (!isClassSearchPage()) return;
        const rawTitle = String(title || '').trim();
        if (!rawTitle) return;
        const cardKey = String(options?.cardKey || '').trim();
        if (featureTutorialStep === CLASS_SEARCH_TUTORIAL_ACTION_STEP) {
            completeClassSearchTutorial();
        }

        const searchTitle = stripRequirementPrefix(rawTitle) || rawTitle;
        console.log('[TarHeelRatings] Auto-searching for:', searchTitle);
        setTrackerCardSearching(cardKey, rawTitle);
        setTrackerSearchStatus(`Working on ${searchTitle}…`, 'info', true);

        try {
            const formReady = await waitForClassSearchFormReady(8000);
            if (!formReady) {
                reportClassSearchFailure(searchTitle, 'Class Search is still loading. Please wait a moment and retry.');
                return;
            }

            await ensureClassSearchDefaults();
            const matchedValues = findGenEdValue(rawTitle).length ? findGenEdValue(rawTitle) : findGenEdValue(searchTitle);

            if (matchedValues.length > 0) {
                console.log('[TarHeelRatings] Gen Ed search: IDEA →', matchedValues[0]);
                setTrackerSearchStatus(`Searching Class Search for IDEA: ${matchedValues[0]}.`, 'info', true);
                let attemptResult = null;
                for (let attempt = 0; attempt < 2; attempt++) {
                    if (attempt > 0) {
                        setTrackerSearchStatus(`Retrying Class Search for IDEA: ${matchedValues[0]}…`, 'info', true);
                    }
                    attemptResult = await runGenEdSearchAttempt(searchTitle, matchedValues);
                    if (attemptResult?.ok) break;
                    await delay(250);
                }
                if (!attemptResult?.ok) {
                    reportClassSearchFailure(searchTitle, attemptResult?.failureMessage);
                    return;
                }

                setTrackerSearchStatus(`Class Search updated for IDEA: ${matchedValues[0]}.`, 'success', false);
                return;
            }

            const courseMatch = searchTitle.match(/\b([A-Z]{2,5})\s+(\d{1,4}[A-Z]?)\b/i);
            if (courseMatch) {
                const subject = courseMatch[1].toUpperCase();
                const catalog = courseMatch[2].toUpperCase();
                console.log('[TarHeelRatings] Course search:', subject, catalog);
                setTrackerSearchStatus(`Searching Class Search for ${subject} ${catalog}.`, 'info', true);
                let attemptResult = null;
                for (let attempt = 0; attempt < 2; attempt++) {
                    if (attempt > 0) {
                        setTrackerSearchStatus(`Retrying Class Search for ${subject} ${catalog}…`, 'info', true);
                    }
                    attemptResult = await runCourseSearchAttempt(searchTitle, subject, catalog);
                    if (attemptResult?.ok) break;
                    await delay(250);
                }
                if (!attemptResult?.ok) {
                    reportClassSearchFailure(searchTitle, attemptResult?.failureMessage);
                    return;
                }

                setTrackerSearchStatus(`Class Search updated for ${subject} ${catalog}.`, 'success', false);
                return;
            }

            reportClassSearchFailure(searchTitle, 'Direct Class Search is not available for this requirement yet.');
        } catch (err) {
            console.error('[TarHeelRatings] Auto-search error:', err);
            setTrackerSearchStatus(err?.message || 'That search did not complete cleanly.', 'error', true);
        } finally {
            window.setTimeout(() => {
                clearTrackerCardSearching();
            }, 1200);
        }
    }



    /* ── Tracker Sidebar Injection ── */
    function injectTrackerSidebar() {
        if (!isClassSearchPage()) return;
        
        // Prevent double injection in nested/hidden iframes
        if (window !== window.top && window.name !== 'TargetContent' && document.body.clientWidth < 500) return;

        if (document.getElementById('thr-tracker-container')) return;
        // Clean up legacy sidebar if it exists
        const legacy = document.getElementById('thr-tracker-sidebar');
        if (legacy && !legacy.closest('#thr-tracker-container')) legacy.remove();

        safeLocalStorageGet(['thr_missing_requirements', 'thr_tracker_context', 'thr_tracker_status', 'thr_tracker_error'], async (result) => {
            const reqs = Array.isArray(result.thr_missing_requirements) ? result.thr_missing_requirements : [];
            const trackerContext = result.thr_tracker_context || {};
            const status = result.thr_tracker_status || '';
            const error = result.thr_tracker_error || '';
            const requirementRecordsByKey = new Map();
            const requirementActionByRequirement = new WeakMap();
            
            // Double check inside the async callback to avoid race conditions
            if (document.getElementById('thr-tracker-container')) return;

            if (status && !['parsing', 'error', 'all_satisfied'].includes(status) && reqs.length) {
                const actionRecords = await Promise.all(
                    reqs.map(async (requirement) => ({
                        requirement,
                        actionDescriptor: await resolveRequirementActionDescriptor(requirement, trackerContext),
                    }))
                );
                actionRecords.forEach(({ requirement, actionDescriptor }) => {
                    requirementActionByRequirement.set(requirement, actionDescriptor);
                });

                if (document.getElementById('thr-tracker-container')) return;
            }

            const container = document.createElement('div');
            container.id = 'thr-tracker-container';
            container.className = 'thr-tracker-container';

            const toggle = document.createElement('button');
            toggle.className = 'thr-tracker-toggle';
            let badgeText = '0';
            let badgeStyle = 'background:#64748b;';
            if (status === 'parsing') {
                badgeText = '...';
                badgeStyle = 'background:#2563eb;';
            } else if (status === 'error') {
                badgeText = '!';
                badgeStyle = 'background:#b91c1c;';
            } else if (status === 'parsed') {
                badgeText = String(reqs.length);
                badgeStyle = 'background:#e11d48;';
            } else if (status === 'all_satisfied') {
                badgeText = '0';
                badgeStyle = 'background:#15803d;';
            } else {
                badgeText = '—';
            }
            toggle.innerHTML = '<span class="thr-tracker-toggle-icon">' + ICON.warning + '</span><span style="margin-left:6px;">Tracker</span> <span class="thr-tracker-badge" style="margin-left:8px;' + badgeStyle + '">' + badgeText + '</span>';

            const sidebar = document.createElement('aside');
            sidebar.id = 'thr-tracker-sidebar';
            sidebar.className = 'thr-tracker-sidebar';

            let html = '<div class="thr-tracker-header">' +
                '<h3>TarHeel Tracker</h3>' +
                '<button class="thr-tracker-close" style="background:none;border:none;color:white;cursor:pointer;font-size:24px;line-height:1;margin-top:-4px;" title="Close">&times;</button>' +
                '</div>' +
                '<div id="thr-tracker-search-status" class="thr-tracker-search-status" aria-live="polite"></div>' +
                '<div class="thr-tracker-content">';

            if (status === 'parsing') {
                html += '<div class="thr-tracker-card" style="text-align:center;padding:24px 16px;">' +
                    '<div style="font-size:24px;margin-bottom:8px;">⏳</div>' +
                    '<div style="color:#2563eb;font-weight:700;font-size:14px;">Syncing your Tar Heel Tracker...</div>' +
                    '<div style="color:var(--thr-text-secondary);font-size:12px;margin-top:6px;">Keep the tracker page open until syncing finishes.</div>' +
                    '</div>';
            } else if (status === 'error') {
                html += '<div class="thr-tracker-card" style="text-align:center;padding:24px 16px;">' +
                    '<div style="font-size:24px;margin-bottom:8px;">⚠️</div>' +
                    '<div style="color:#b91c1c;font-weight:700;font-size:14px;">Tracker sync failed</div>' +
                    '<div style="color:var(--thr-text-secondary);font-size:12px;margin-top:6px;">' + escapeHtml(error || 'Open the tracker page again and click Sync Requirements.') + '</div>' +
                    '</div>';
            } else if (!status) {
                html += '<div class="thr-tracker-card" style="text-align:center;padding:24px 16px;">' +
                    '<div style="font-size:24px;margin-bottom:8px;">📄</div>' +
                    '<div style="color:var(--thr-carolina-blue-dark);font-weight:700;font-size:14px;">No Tracker data synced yet</div>' +
                    '<div style="color:var(--thr-text-secondary);font-size:12px;margin-top:6px;">Open the Tar Heel Tracker page and click Sync Requirements.</div>' +
                    '</div>';
            } else if (status === 'all_satisfied') {
                html += '<div class="thr-tracker-card" style="text-align:center;padding:24px 16px;">' +
                    '<div style="font-size:24px;margin-bottom:8px;">🎉</div>' +
                    '<div style="color:#15803d;font-weight:700;font-size:14px;">All Tracked Requirements Satisfied!</div>' +
                    '<div style="color:var(--thr-text-secondary);font-size:12px;margin-top:6px;">Visit the Tar Heel Tracker page to sync your data.</div>' +
                    '</div>';
            } else {
                html += buildTrackerContextNoticeHtml(trackerContext);

                const sections = buildTrackerRequirementSections(reqs, trackerContext);
                let requirementIndex = 0;

                sections.forEach((section) => {
                    html += '<section class="thr-tracker-section">' +
                        '<div class="thr-tracker-section-header">' +
                        '<div class="thr-tracker-section-eyebrow">' + escapeHtml(section.eyebrow) + '</div>' +
                        '<div class="thr-tracker-section-title">' + escapeHtml(section.title) + '</div>' +
                        (section.note ? '<div class="thr-tracker-section-note">' + escapeHtml(section.note) + '</div>' : '') +
                        '</div>';

                    section.requirements.forEach((requirement) => {
                        const reqKey = `req-${requirementIndex++}`;
                        const actionDescriptor = requirementActionByRequirement.get(requirement) || { mode: 'disabled', note: 'Direct Class Search is not available for this requirement yet.' };
                        requirementRecordsByKey.set(reqKey, { requirement, actionDescriptor });
                        html += buildTrackerRequirementCardHtml(requirement, reqKey, actionDescriptor);
                    });

                    html += '</section>';
                });
            }

            html += '</div>';
            sidebar.innerHTML = html;

            container.appendChild(toggle);
            container.appendChild(sidebar);
            document.body.appendChild(container);

            // Pop-out logic
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                container.classList.toggle('thr-open');
                if (container.classList.contains('thr-open')) {
                    toggle.style.opacity = '0';
                    toggle.style.pointerEvents = 'none';
                }
            });

            container.querySelector('.thr-tracker-close').addEventListener('click', (e) => {
                e.stopPropagation();
                container.classList.remove('thr-open');
                toggle.style.opacity = '1';
                toggle.style.pointerEvents = 'auto';
            });

            // Click outside to close
            document.addEventListener('click', (e) => {
                if (container.classList.contains('thr-open') && !container.contains(e.target)) {
                    container.classList.remove('thr-open');
                    toggle.style.opacity = '1';
                    toggle.style.pointerEvents = 'auto';
                }
            });

            // Handle Card Clicks for Auto-Search
            sidebar.addEventListener('click', async (e) => {
                // Check if they clicked a sub-course button
                const subBtn = e.target.closest('.thr-subcourse-btn');
                if (subBtn) {
                    e.stopPropagation();
                    const c = subBtn.getAttribute('data-course');
                    const cardKey = subBtn.closest('.thr-tracker-card')?.getAttribute('data-req-key') || '';
                    if (c) handleRequirementClick(c, { cardKey });
                    return;
                }

                const optionBtn = e.target.closest('.thr-requirement-option-btn');
                if (optionBtn) {
                    e.stopPropagation();
                    const optionTitle = optionBtn.getAttribute('data-search-title');
                    const cardKey = optionBtn.closest('.thr-tracker-card')?.getAttribute('data-req-key') || '';
                    if (optionTitle) handleRequirementClick(optionTitle, { cardKey });
                    return;
                }

                const card = e.target.closest('.thr-tracker-card');
                if (card) {
                    const actionMode = card.getAttribute('data-thr-action-mode') || '';
                    if (actionMode !== 'direct-search') return;

                    const reqKey = card.getAttribute('data-req-key') || '';
                    const requirement = requirementRecordsByKey.get(reqKey)?.requirement;
                    const title = requirement?.title || card.getAttribute('data-req-title');
                    if (!title) return;
                    handleRequirementClick(title, { cardKey: reqKey });
                }
            });

            queueClassSearchTutorialRefresh();
        });
    }

    function loadFeatureTutorialStep(callback) {
        safeLocalStorageGet([FEATURE_TUTORIAL_STORAGE_KEY], (result) => {
            featureTutorialStep = result[FEATURE_TUTORIAL_STORAGE_KEY] || '';
            featureTutorialStepLoaded = true;
            if (callback) callback(featureTutorialStep);
        });
    }

    function ensureFeatureTutorialStepLoaded(callback) {
        if (featureTutorialStepLoaded) {
            if (callback) callback(featureTutorialStep);
            return;
        }

        loadFeatureTutorialStep(callback);
    }

    function setFeatureTutorialStep(step) {
        featureTutorialStep = String(step || '').trim();
        if (featureTutorialStep) {
            safeLocalStorageSet({ [FEATURE_TUTORIAL_STORAGE_KEY]: featureTutorialStep });
        } else {
            safeLocalStorageRemove([FEATURE_TUTORIAL_STORAGE_KEY]);
        }
    }

    function clearFeatureTutorialStep() {
        setFeatureTutorialStep('');
    }

    function clearClassSearchTutorialCompletion() {
        classSearchTutorialCompletedAt = 0;
        if (classSearchTutorialCompletionTimer) {
            window.clearTimeout(classSearchTutorialCompletionTimer);
            classSearchTutorialCompletionTimer = 0;
        }
    }

    function markClassSearchTutorialCompleted() {
        clearClassSearchTutorialCompletion();
        classSearchTutorialCompletedAt = Date.now();
        classSearchTutorialCompletionTimer = window.setTimeout(() => {
            classSearchTutorialCompletionTimer = 0;
            classSearchTutorialCompletedAt = 0;
            if (featureTutorialStep === CLASS_SEARCH_TUTORIAL_COMPLETE_STEP) {
                clearFeatureTutorialStep();
            }
            queueClassSearchTutorialRefresh();
        }, 6000);
    }

    function shouldShowClassSearchTutorialCompletion() {
        return classSearchTutorialCompletedAt > 0 && (Date.now() - classSearchTutorialCompletedAt) < 6000;
    }

    function completeClassSearchTutorial() {
        setFeatureTutorialStep(CLASS_SEARCH_TUTORIAL_COMPLETE_STEP);
        markClassSearchTutorialCompleted();
        queueClassSearchTutorialRefresh();
    }

    function hasVisibleBox(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = el.getBoundingClientRect();
        return rect.width >= 2 && rect.height >= 2;
    }

    function getClassSearchTutorialGuide() {
        return document.getElementById('thr-class-search-tour-guide');
    }

    function ensureClassSearchTutorialGuide() {
        let guide = getClassSearchTutorialGuide();
        if (guide) return guide;

        guide = document.createElement('div');
        guide.id = 'thr-class-search-tour-guide';
        guide.innerHTML = `
            <div class="thr-tracker-guide__spotlight"></div>
            <div class="thr-tracker-guide__pulse"></div>
            <div class="thr-tracker-guide__arrow"></div>
        `;
        document.body.appendChild(guide);
        return guide;
    }

    function getClassSearchTutorialPanel() {
        return document.getElementById('thr-class-search-tour-panel');
    }

    function ensureClassSearchTutorialPanel() {
        let panel = getClassSearchTutorialPanel();
        if (panel) return panel;

        panel = document.createElement('div');
        panel.id = 'thr-class-search-tour-panel';
        panel.innerHTML = `
            <div id="thr-class-search-tour-eyebrow" class="thr-tracker-sync-panel__eyebrow">Tutorial</div>
            <div id="thr-class-search-tour-title" class="thr-tracker-sync-panel__title">Follow the next step</div>
            <div id="thr-class-search-tour-detail" class="thr-tracker-sync-panel__detail"></div>
        `;
        document.body.appendChild(panel);
        return panel;
    }

    function removeClassSearchTutorial() {
        getClassSearchTutorialGuide()?.remove();
        getClassSearchTutorialPanel()?.remove();
    }

    function hideClassSearchTutorialTarget() {
        const guide = getClassSearchTutorialGuide();
        if (!guide) return;
        guide.querySelectorAll('.thr-tracker-guide__spotlight, .thr-tracker-guide__pulse, .thr-tracker-guide__arrow')
            .forEach((el) => {
                el.style.display = 'none';
            });
    }

    function setClassSearchTutorialPanelState({ eyebrow, title, detail = '' }) {
        const panel = ensureClassSearchTutorialPanel();
        const eyebrowEl = panel.querySelector('#thr-class-search-tour-eyebrow');
        const titleEl = panel.querySelector('#thr-class-search-tour-title');
        const detailEl = panel.querySelector('#thr-class-search-tour-detail');
        if (eyebrowEl) eyebrowEl.textContent = eyebrow || '';
        if (titleEl) titleEl.textContent = title || '';
        if (detailEl) {
            detailEl.textContent = detail;
            detailEl.style.display = detail ? '' : 'none';
        }
    }

    function positionClassSearchTutorialPanel(target, options = {}) {
        const panel = ensureClassSearchTutorialPanel();
        if (!panel) return;

        const preferredMode = typeof options.preferredMode === 'string' ? options.preferredMode : '';
        const margin = 24;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelWidth = Math.min(380, Math.max(260, panel.offsetWidth || 380));
        const panelHeight = Math.max(140, panel.offsetHeight || 190);
        const targetRect = target?.getBoundingClientRect?.() || null;

        const expandedTarget = targetRect
            ? {
                left: Math.max(0, targetRect.left - 20),
                top: Math.max(0, targetRect.top - 20),
                right: Math.min(viewportWidth, targetRect.right + 20),
                bottom: Math.min(viewportHeight, targetRect.bottom + 20),
            }
            : null;

        const candidateByMode = {
            'top-right': {
                top: margin,
                left: Math.max(margin, viewportWidth - panelWidth - margin),
                mode: 'top-right',
            },
            'bottom-right': {
                top: Math.max(margin, viewportHeight - panelHeight - margin),
                left: Math.max(margin, viewportWidth - panelWidth - margin),
                mode: 'bottom-right',
            },
            'top-left': {
                top: margin,
                left: margin,
                mode: 'top-left',
            },
            'bottom-left': {
                top: Math.max(margin, viewportHeight - panelHeight - margin),
                left: margin,
                mode: 'bottom-left',
            },
        };
        const candidateOrder = preferredMode
            ? [preferredMode, 'top-left', 'top-right', 'bottom-left', 'bottom-right']
            : ['top-right', 'bottom-right', 'top-left', 'bottom-left'];
        const candidates = candidateOrder
            .map((mode) => candidateByMode[mode])
            .filter((candidate, index, list) => candidate && list.findIndex((entry) => entry.mode === candidate.mode) === index);

        const overlapsTarget = (candidate) => {
            if (!expandedTarget) return false;
            const candidateRight = candidate.left + panelWidth;
            const candidateBottom = candidate.top + panelHeight;
            return !(
                candidateRight < expandedTarget.left ||
                candidate.left > expandedTarget.right ||
                candidateBottom < expandedTarget.top ||
                candidate.top > expandedTarget.bottom
            );
        };

        let chosen = candidates.find((candidate) => !overlapsTarget(candidate)) || candidates[0];

        if (expandedTarget) {
            chosen = candidates
                .map((candidate) => {
                    const centerX = candidate.left + (panelWidth / 2);
                    const centerY = candidate.top + (panelHeight / 2);
                    const targetCenterX = (expandedTarget.left + expandedTarget.right) / 2;
                    const targetCenterY = (expandedTarget.top + expandedTarget.bottom) / 2;
                    const distance = Math.hypot(centerX - targetCenterX, centerY - targetCenterY);
                    return {
                        ...candidate,
                        overlaps: overlapsTarget(candidate),
                        distance,
                    };
                })
                .sort((a, b) => {
                    if (a.overlaps !== b.overlaps) return a.overlaps ? 1 : -1;
                    return b.distance - a.distance;
                })[0] || chosen;
        }

        panel.dataset.thrPanelMode = chosen.mode;
        panel.style.top = `${chosen.top}px`;
        panel.style.left = `${chosen.left}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    function positionClassSearchTutorialTarget(target) {
        const guide = ensureClassSearchTutorialGuide();
        if (!guide || !hasVisibleBox(target)) {
            hideClassSearchTutorialTarget();
            return;
        }

        const rect = target.getBoundingClientRect();
        const spotlight = guide.querySelector('.thr-tracker-guide__spotlight');
        const pulse = guide.querySelector('.thr-tracker-guide__pulse');
        const arrow = guide.querySelector('.thr-tracker-guide__arrow');
        const pad = 10;
        const top = Math.max(8, rect.top - pad);
        const left = Math.max(8, rect.left - pad);
        const width = Math.min(window.innerWidth - left - 8, rect.width + (pad * 2));
        const height = Math.min(window.innerHeight - top - 8, rect.height + (pad * 2));
        const arrowAbove = rect.top > 150;
        const arrowLeft = Math.max(10, Math.min(window.innerWidth - 48, rect.left + (rect.width / 2) - 14));

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
        arrow.style.left = `${arrowLeft}px`;
        arrow.style.top = arrowAbove ? `${Math.max(10, rect.top - 54)}px` : `${Math.min(window.innerHeight - 54, rect.bottom + 10)}px`;
    }

    function bindClassSearchTutorialTarget(target, step, nextStep) {
        if (!target || !step) return;
        const boundKey = `${step}->${nextStep || 'done'}`;
        if (target.dataset.thrClassSearchTutorialBound === boundKey) return;

        target.dataset.thrClassSearchTutorialBound = boundKey;
        const advance = () => {
            if (featureTutorialStep !== step) return;
            if (nextStep) setFeatureTutorialStep(nextStep);
            else {
                completeClassSearchTutorial();
            }
            queueClassSearchTutorialRefresh();
        };

        target.addEventListener('click', advance);
        target.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                advance();
            }
        });
    }

    function getTrackerSidebarToggleTarget() {
        const toggle = document.querySelector('#thr-tracker-container .thr-tracker-toggle');
        return hasVisibleBox(toggle) ? toggle : null;
    }

    function getActionableTrackerTargets() {
        const sidebar = document.getElementById('thr-tracker-sidebar');
        if (!sidebar) return [];

        const directCards = [...sidebar.querySelectorAll('.thr-tracker-card[data-thr-action-mode="direct-search"]')]
            .filter((el) => hasVisibleBox(el));
        if (directCards.length) return directCards;

        return [...sidebar.querySelectorAll('.thr-subcourse-btn[data-thr-action-control="1"], .thr-requirement-option-btn[data-thr-action-control="1"]')]
            .filter((el) => hasVisibleBox(el));
    }

    function getFirstActionableTrackerTarget() {
        return getActionableTrackerTargets()[0] || null;
    }

    function getActionableTargetLabel(target) {
        if (!target) return 'a synced search action';
        if (target.matches('.thr-tracker-card')) {
            return target.querySelector('.thr-tracker-card-title')?.textContent?.trim() || 'a synced requirement';
        }

        return target.textContent?.trim()
            || target.getAttribute('data-course')
            || target.getAttribute('data-search-title')
            || 'a synced search action';
    }

    function refreshClassSearchTutorial() {
        if (!isClassSearchPage()) {
            clearClassSearchTutorialCompletion();
            removeClassSearchTutorial();
            return;
        }

        if (featureTutorialStep === CLASS_SEARCH_TUTORIAL_COMPLETE_STEP || shouldShowClassSearchTutorialCompletion()) {
                const sidebar = document.getElementById('thr-tracker-sidebar');
                setClassSearchTutorialPanelState({
                    eyebrow: 'Tutorial Complete',
                    title: "That's it!",
                    detail: 'Your Tar Heel Tracker requirements are ready. Any active item in this sidebar can kick off another Class Search.',
                });
                positionClassSearchTutorialPanel(sidebar, { preferredMode: 'top-left' });
                hideClassSearchTutorialTarget();
                return;
        }

        if (!featureTutorialStep || ![CLASS_SEARCH_TUTORIAL_TOGGLE_STEP, CLASS_SEARCH_TUTORIAL_ACTION_STEP].includes(featureTutorialStep)) {
            removeClassSearchTutorial();
            return;
        }

        const container = document.getElementById('thr-tracker-container');
        if (featureTutorialStep === CLASS_SEARCH_TUTORIAL_TOGGLE_STEP) {
            const toggle = getTrackerSidebarToggleTarget();
            if (container?.classList.contains('thr-open')) {
                setFeatureTutorialStep(CLASS_SEARCH_TUTORIAL_ACTION_STEP);
                queueClassSearchTutorialRefresh();
                return;
            }

            setClassSearchTutorialPanelState({
                eyebrow: 'Tutorial • Step 8 of 9',
                title: toggle ? 'Click Tracker icon' : 'Wait for Tracker',
                detail: 'Open the Tar Heel Tracker drawer from Class Search.',
            });
            positionClassSearchTutorialPanel(toggle, { preferredMode: 'top-left' });
            bindClassSearchTutorialTarget(toggle, CLASS_SEARCH_TUTORIAL_TOGGLE_STEP, CLASS_SEARCH_TUTORIAL_ACTION_STEP);
            if (toggle) positionClassSearchTutorialTarget(toggle);
            else hideClassSearchTutorialTarget();
            return;
        }

        if (featureTutorialStep === CLASS_SEARCH_TUTORIAL_ACTION_STEP) {
            if (container && !container.classList.contains('thr-open')) {
                setFeatureTutorialStep(CLASS_SEARCH_TUTORIAL_TOGGLE_STEP);
                queueClassSearchTutorialRefresh();
                return;
            }

            const targets = getActionableTrackerTargets();
            const target = targets[0] || null;
            const sidebar = document.getElementById('thr-tracker-sidebar');
            setClassSearchTutorialPanelState({
                eyebrow: 'Tutorial • Step 9 of 9',
                title: target ? 'Choose any active tracker requirement' : 'Wait for a searchable requirement',
                detail: target
                    ? 'The whole Tar Heel Tracker sidebar is highlighted because any non-grey item here can run a real Class Search action right away.'
                    : 'Only requirements with a real Class Search action stay active.',
            });
            positionClassSearchTutorialPanel(sidebar || target, { preferredMode: 'top-left' });
            targets.forEach((actionTarget) => {
                bindClassSearchTutorialTarget(actionTarget, CLASS_SEARCH_TUTORIAL_ACTION_STEP, '');
            });
            if (sidebar) positionClassSearchTutorialTarget(sidebar);
            else if (target) positionClassSearchTutorialTarget(target);
            else hideClassSearchTutorialTarget();
            return;
        }
    }

    function queueClassSearchTutorialRefresh() {
        if (classSearchTutorialRefreshFrame) return;
        classSearchTutorialRefreshFrame = window.requestAnimationFrame(() => {
            classSearchTutorialRefreshFrame = 0;
            refreshClassSearchTutorial();
        });
    }

    addSafeStorageChangeListener((changes, namespace) => {
        if (namespace !== 'local') return;
        if (changes[FEATURE_TUTORIAL_STORAGE_KEY]) {
            featureTutorialStep = changes[FEATURE_TUTORIAL_STORAGE_KEY].newValue || '';
            queueClassSearchTutorialRefresh();
        }

        if (!changes.thr_missing_requirements && !changes.thr_tracker_context && !changes.thr_tracker_status && !changes.thr_tracker_error) return;
        if (!isClassSearchPage()) return;

        const existing = document.getElementById('thr-tracker-container');
        if (existing) {
            existing.remove();
        }
        injectTrackerSidebar();
    });

    /* ── Bootstrap ── */

    function init() {
        const isCart = isShoppingCartPage();
        const isSearch = isClassSearchPage();
        if (!isCart && !isSearch) return;

        document.body.classList.add('thr-reskin');
        fixSidebarIcons();
        wireBusyButtons();
        
        if (isSearch) {
            wireClassSearchPreferencePersistence();
            ensureFeatureTutorialStepLoaded(() => {
                queueClassSearchTutorialRefresh();
            });
            injectTrackerSidebar();
        }

        if (isCart) {
            injectToggle();
            styleListColumns();
            if (currentView === 'card') waitForGridRows(buildCards);
        }
    }

    setTimeout(init, 300);

    const observer = new MutationObserver(() => {
        const isCart = isShoppingCartPage();
        const isSearch = isClassSearchPage();
        if (!isCart && !isSearch) return;

        if (!document.body.classList.contains('thr-reskin'))
            document.body.classList.add('thr-reskin');

        fixSidebarIcons();
        wireBusyButtons();
        
        if (isSearch) {
            wireClassSearchPreferencePersistence();
            ensureFeatureTutorialStepLoaded(() => {
                queueClassSearchTutorialRefresh();
            });
            injectTrackerSidebar();
        }

        if (isCart) {
            injectToggle();
            styleListColumns();
            if (currentView === 'card' && !document.querySelector('.thr-card-grid')) {
                waitForGridRows(buildCards, 20);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
