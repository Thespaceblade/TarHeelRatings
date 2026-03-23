/* ── TarHeelRatings – reskin.js ── */
/* Reskins the Shopping Cart content area with a card/list toggle. */

(function () {
    'use strict';

    const VIEW_STORAGE_KEY = 'thrShoppingCartView';

    function loadViewPreference() {
        try { return localStorage.getItem(VIEW_STORAGE_KEY) || 'list'; }
        catch (_) { return 'list'; }
    }

    function saveViewPreference(view) {
        try { localStorage.setItem(VIEW_STORAGE_KEY, view); }
        catch (_) { /* storage unavailable */ }
    }

    let currentView = loadViewPreference();

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

    function isClassSearchPage() {
        return !!(
            document.title.includes('Class Search') || 
            document.querySelector('input#CATALOG_NBR') || 
            document.querySelector('input#INSTRUCTOR_NAME') ||
            document.querySelector('[aria-label="Class Search"]')
        );
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
                        chrome.runtime.sendMessage({ professorName: parsed.search }, (resp) => {
                            if (chrome.runtime.lastError) return;
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

    /* ── Bootstrap ── */

    function init() {
        const isCart = isShoppingCartPage();
        const isSearch = isClassSearchPage();
        if (!isCart && !isSearch) return;

        document.body.classList.add('thr-reskin');
        fixSidebarIcons();
        wireBusyButtons();
        
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
