/* ── TarHeelRatings – content.js ── */

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

/* ── DOM text helpers ── */

/**
 * Read the visible text of an element, stripping screen-reader-only and
 * aria-hidden duplicates that ConnectCarolina renders alongside the visible
 * value (these are what caused the doubled "Name Name" in earlier probes).
 */
function visibleTextOf(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.sr-only, [aria-hidden="true"]').forEach(x => x.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * ConnectCarolina renders a visible value plus a screen-reader duplicate, so a
 * raw scrape can yield "Kevin Irakoze Kevin Irakoze". If the token list is an
 * exact two-half repetition, collapse it back to a single copy.
 */
function dedupeName(str) {
    const s = (str || '').replace(/\s+/g, ' ').trim();
    if (!s) return s;
    const parts = s.split(' ');
    if (parts.length >= 2 && parts.length % 2 === 0) {
        const half = parts.length / 2;
        if (parts.slice(0, half).join(' ') === parts.slice(half).join(' ')) {
            return parts.slice(0, half).join(' ');
        }
    }
    return s;
}

// Other CX field labels that must NOT be swallowed into the instructor value.
const CX_OTHER_FIELD_LABELS = /\b(Section|Session|Units?|Status|Campus|Instruction\s+Mode|Days?|Room|Start|End|Dates?|Wait\s*list|Seats?|Component|Career|Number|Attribute|Enrollment)\b\s*:/i;

/**
 * Map the ConnectCarolina "Enrollment_Classes" CX grid columns to cell indexes
 * by reading the header row labels, falling back to the known CX order when a
 * header can't be matched. Shared with reskin.js (same content-script scope).
 * Returns { code, description, days, start, end, instructor, units, status }.
 */
function thrGetEnrollmentColumns(grid) {
    const fallback = {
        code: 0, description: 1, days: 2, start: 3,
        end: 4, instructor: 5, units: 6, status: 7,
    };
    const map = Object.assign({}, fallback);
    if (!grid) return map;

    const rows = grid.querySelectorAll('[role="row"]');
    if (!rows.length) return map;

    const headers = rows[0].querySelectorAll('[role="columnheader"]');
    if (!headers.length) return map;

    headers.forEach((h, i) => {
        const t = (h.textContent || '').trim().toUpperCase();
        if (!t) return;
        if (t.includes('INSTRUCTOR')) map.instructor = i;
        else if (t.includes('UNIT')) map.units = i;
        else if (t.includes('DESC')) map.description = i;
        else if (t.includes('CLASS')) map.code = i;
        else if (t.includes('DAY')) map.days = i;
        else if (t.includes('START')) map.start = i;
        else if (t.includes('END')) map.end = i;
        else if (t.includes('STATUS')) map.status = i;
    });

    return map;
}

/* ── Instructor target collectors ── */

/**
 * A "target" describes one instructor cell/value to inject into:
 *   { host, rawName, mode, hideEls?, appendTo?, labelText?, markEmpty? }
 * - mode 'replace'         : hide hideEls, append badge wrapper to appendTo (classic + cart)
 * - mode 'replace-content' : clear host, keep optional labelText, render badges (CX cards)
 */

// 1. Classic PeopleSoft table (kept as a harmless fallback for legacy pages).
function collectClassicTargets() {
    const targets = [];
    document.querySelectorAll('td[id$="_INSTRUCTOR"] span[title]').forEach(span => {
        const container = span.closest('[role="gridcell"]') || span.parentElement;
        if (!container) return;
        const hideEls = [span, ...container.querySelectorAll('.sr-only, [aria-hidden="true"]')];
        targets.push({
            host: container,
            appendTo: container,
            hideEls,
            mode: 'replace',
            rawName: (span.getAttribute('title') || span.textContent || '').trim(),
        });
    });
    return targets;
}

// 2. Shopping Cart CX grid — resolve the instructor column by header label.
function collectCartTargets() {
    const targets = [];
    const cartGrid = document.querySelector('[aria-label="Enrollment_Classes"]');
    if (!cartGrid) return targets;

    const instrIdx = thrGetEnrollmentColumns(cartGrid).instructor;
    const rows = cartGrid.querySelectorAll('[role="row"]');
    rows.forEach((row, i) => {
        if (i === 0) return; // header row
        const cells = row.querySelectorAll('[role="gridcell"], [role="rowheader"]');
        const cell = cells[instrIdx];
        if (!cell) return;
        const span = cell.querySelector('span[title]') || cell.querySelector('span');
        if (!span) return;
        const container = span.closest('[role="gridcell"]') || cell;
        const hideEls = [span, ...container.querySelectorAll('.sr-only, [aria-hidden="true"]')];
        targets.push({
            host: container,
            appendTo: container,
            hideEls,
            mode: 'replace',
            rawName: (span.getAttribute('title') || span.textContent || '').trim(),
        });
    });
    return targets;
}

/**
 * Locate the tight "Instructor" field element inside one CX result card.
 * Works regardless of exact markup (inline "Instructor: Name", sr-only label +
 * bare text-node name, or label + sibling value) by:
 *   1. matching elements whose full text (sr-only included) contains an
 *      Instructor label followed by a name,
 *   2. rejecting elements that also contain other CX field labels (so we don't
 *      grab a whole meeting block),
 *   3. choosing the smallest such element (fewest descendants).
 * Returns { el, name, hasVisibleLabel, labelText } or null if not yet rendered.
 */
function findInstructorField(card) {
    let best = null;
    let bestDescendants = Infinity;

    const candidates = card.querySelectorAll('span, p, div, dt, dd, li, small, strong');
    for (const el of candidates) {
        // Never inject into a screen-reader-only / hidden node (it would be
        // invisible). Forcing selection up to a visible ancestor row is what we
        // want; that ancestor still carries the "Instructor" label in its text.
        if (el.classList.contains('sr-only') || el.closest('.sr-only, [aria-hidden="true"]')) continue;

        const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!raw || raw.length > 200) continue;
        if (!/instructors?\b/i.test(raw)) continue;

        // Must have a name after the Instructor label.
        const m = raw.match(/instructors?\s*:?\s*(.+)$/i);
        if (!m) continue;
        const afterLabel = m[1].trim();
        if (!/[A-Za-z]/.test(afterLabel)) continue;      // label only, name not rendered yet

        // Reject blocks that fold in other fields (Days/Room/Section/etc.).
        if (CX_OTHER_FIELD_LABELS.test(afterLabel)) continue;

        const descendants = el.getElementsByTagName('*').length;
        if (descendants < bestDescendants) {
            bestDescendants = descendants;
            best = el;
        }
    }

    if (!best) return null;

    const rawFull = (best.textContent || '').replace(/\s+/g, ' ').trim();
    const visible = visibleTextOf(best);
    const hasVisibleLabel = /^instructors?\b/i.test(visible);

    // Prefer the visible text (sr-only dupe already stripped) for the name.
    let name = visible.replace(/^\s*instructors?\s*:?\s*/i, '').trim();
    if (!name) {
        const fm = rawFull.match(/instructors?\s*:?\s*(.+)$/i);
        name = fm ? fm[1].trim() : '';
    }
    name = dedupeName(name);

    const labelMatch = rawFull.match(/^\s*(instructors?\s*:?)/i);
    const labelText = (labelMatch ? labelMatch[1] : 'Instructor:') + ' ';

    return { el: best, name, hasVisibleLabel, labelText };
}

// 3. Modern CX Class Search / Browse result cards — find the Instructor field
//    inside each result card (no dependency on hashed cx-jss* classes) and
//    replace its content with the rating badge(s).
function collectClassSearchTargets() {
    const targets = [];
    const cards = document.querySelectorAll('[class*="MuiCard-root"]');
    if (!cards.length) return targets;

    cards.forEach(card => {
        if (card.dataset.thrCsDone) return;

        const field = findInstructorField(card);
        if (!field) return;               // not rendered yet; retry on next scan

        card.dataset.thrCsDone = '1';
        targets.push({
            host: field.el,
            mode: 'replace-content',
            labelText: field.hasVisibleLabel ? field.labelText : '',
            rawName: field.name,
            markEmpty: true,
        });
    });
    return targets;
}

/* ── Injection ── */

function injectTarget(t) {
    const host = t.host;
    if (!host || host.dataset.tarheelProcessed) return;

    const parsedList = parseInstructors(t.rawName);
    if (!parsedList || parsedList.length === 0) {
        // Staff / TBA / empty — mark done so we don't rescan this node forever.
        if (t.markEmpty) host.dataset.tarheelProcessed = 'true';
        return;
    }

    host.dataset.tarheelProcessed = 'true';

    const multiWrapper = document.createElement('div');
    multiWrapper.className = 'thr-multi-wrapper';

    parsedList.forEach(parsed => {
        const profWrapper = document.createElement('div');
        profWrapper.textContent = parsed.display;
        profWrapper.style.fontSize = 'inherit';
        multiWrapper.appendChild(profWrapper);

        try {
            chrome.runtime.sendMessage({ professorName: parsed.search }, (response) => {
                if (chrome.runtime.lastError) {
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

    if (t.mode === 'replace-content') {
        // Own the field element's rendering: keep an optional visible label,
        // then render the badge(s) in place of the original name text/dupe.
        host.textContent = '';
        if (t.labelText) host.appendChild(document.createTextNode(t.labelText));
        host.appendChild(multiWrapper);
    } else {
        (t.hideEls || []).forEach(el => { if (el) el.style.display = 'none'; });
        (t.appendTo || host).appendChild(multiWrapper);
    }
}

/**
 * Scan the page for instructor name elements and inject ratings.
 */
function processProfessors() {
    const targets = [
        ...collectClassicTargets(),
        ...collectCartTargets(),
        ...collectClassSearchTargets(),
    ];
    targets.forEach(injectTarget);
}

/* ── Bootstrap ── */

function debounce(fn, wait) {
    let timer = null;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(fn, wait);
    };
}

// Run immediately
processProfessors();

// Watch for dynamic changes (pagination, navigation, CX re-renders).
// Debounced because CX result pages have very large card trees.
const scheduleScan = debounce(processProfessors, 150);
const observer = new MutationObserver(scheduleScan);

observer.observe(document.body, {
    childList: true,
    subtree: true
});