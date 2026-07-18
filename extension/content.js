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

        container.appendChild(multiWrapper);
    });
}

// Run immediately
processProfessors();

// Watch for dynamic changes (pagination, navigation)
const observer = new MutationObserver(() => {
    processProfessors();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});