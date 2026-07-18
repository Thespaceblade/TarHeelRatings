const CACHE_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 day cache
const CACHE_SIZE = 100;
const CACHE_VERSION = 'v4'; // bumped to invalidate stale overrides
const REPLACEMENTS = {
    // Add UNC-specific name overrides here if needed
    // e.g. "Portal Name": "RMP Name"
};

/* ── Helpers ── */

const SUFFIXES_RE = /\b(jr\.?|sr\.?|ii|iii|iv|phd|ph\.d\.?|md|m\.d\.?|dr\.?)\s*$/i;

/**
 * Strip diacritics / accents:  "José" → "Jose"
 */
function stripAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize a name for comparison: lowercase, trim, strip accents & suffixes.
 */
function normForMatch(str) {
    return stripAccents(str)
        .toLowerCase()
        .trim()
        .replace(SUFFIXES_RE, '')
        .trim();
}

/* ── Cache management ── */

async function maintainCacheSize() {
    const allItems = await chrome.storage.local.get(null);
    const entries = Object.entries(allItems)
        .filter(([, value]) => value && value.timestamp)
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    if (entries.length >= CACHE_SIZE) {
        const toDelete = entries.slice(0, 50).map(([key]) => key);
        await chrome.storage.local.remove(toDelete);
    }
}

/* ── Name matching ── */

/**
 * Robust name matcher.  Handles:
 *   - Trailing spaces in RMP data        ("Prairie " vs "Prairie")
 *   - Middle names / initials            ("Prairie Rose Goodwin" vs "Prairie Goodwin")
 *   - Accented characters                ("José" vs "Jose")
 *   - Suffixes                           ("Smith Jr." vs "Smith")
 *   - Single-initial first names         ("J Smith" matches "John Smith")
 *   - Hyphenated last names              ("Smith-Jones" must match exactly)
 */
function namesMatch(searchName, rmpFirstName, rmpLastName) {
    const search = normForMatch(searchName);
    const rmpFirst = normForMatch(rmpFirstName);
    const rmpLast  = normForMatch(rmpLastName);
    const fullRMP  = `${rmpFirst} ${rmpLast}`;

    // 1. Exact full-name match
    if (search === fullRMP) return true;

    // 2. Split into tokens
    const searchTokens = search.split(/\s+/);
    if (searchTokens.length < 2) return false; // need at least first + last

    const searchLast  = searchTokens[searchTokens.length - 1];
    const searchFirst = searchTokens[0];

    // 3. Last name must match
    if (searchLast !== rmpLast) return false;

    // 4. First name matching (flexible)
    //    - If either side is 1-2 chars (initial), just check first letter
    //    - Otherwise require one to be a prefix of the other
    if (searchFirst.length <= 2 || rmpFirst.length <= 2) {
        // Initial match: first characters must agree
        return searchFirst.charAt(0) === rmpFirst.charAt(0);
    }

    if (rmpFirst.startsWith(searchFirst) || searchFirst.startsWith(rmpFirst)) {
        return true;
    }

    return false;
}

/* ── RMP Query ── */

async function queryRMP(name) {
    const resolvedName = REPLACEMENTS[name] || name;
    const cacheKey = `rmp_${CACHE_VERSION}_${resolvedName.toLowerCase().trim()}`;

    // Check cache
    const stored = await chrome.storage.local.get(cacheKey);
    const cached = stored[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
    }

    // Query RMP GraphQL
    const headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
        "Content-Type": "application/json",
        "Origin": "https://www.ratemyprofessors.com",
        "Referer": "https://www.ratemyprofessors.com"
    };

    let data;
    try {
        const response = await fetch("https://www.ratemyprofessors.com/graphql", {
            method: "POST",
            headers,
            body: JSON.stringify({
                query: `
                query {
                    newSearch {
                        teachers(query: {text: "${resolvedName}", schoolID: "U2Nob29sLTEyMzI="}) {
                            edges {
                                node {
                                    legacyId
                                    firstName
                                    lastName
                                    avgRating
                                    avgDifficulty
                                    wouldTakeAgainPercent
                                    numRatings
                                    department
                                    ratings(first: 1) { 
                                        edges { node { date } }
                                    }   
                                }
                            }
                        }
                    }
                }
                `
            })
        });
        data = await response.json();
    } catch (err) {
        // Network error — do NOT cache so we retry next time
        console.warn('[TarHeelRatings] RMP fetch failed:', err.message);
        return null;
    }

    // Validate response structure
    const professors = data?.data?.newSearch?.teachers?.edges;
    if (!professors || !professors.length) {
        await chrome.storage.local.set({ [cacheKey]: { data: null, timestamp: Date.now() } });
        return null;
    }

    // Filter by name match
    const matches = professors.filter(edge =>
        namesMatch(resolvedName, edge.node.firstName, edge.node.lastName)
    );

    let match;
    if (matches.length) {
        // Pick the match with the most ratings
        match = matches.reduce((best, cur) =>
            cur.node.numRatings > best.node.numRatings ? cur : best
        );
    } else if (professors.length === 1) {
        // Fallback: if only one result came back from the school-filtered query,
        // accept it (the RMP search already constrained to UNC)
        match = professors[0];
    } else {
        await chrome.storage.local.set({ [cacheKey]: { data: null, timestamp: Date.now() } });
        return null;
    }

    const prof = match.node;
    prof.lastRating = prof.ratings?.edges[0]?.node?.date || null;

    await maintainCacheSize();
    await chrome.storage.local.set({ [cacheKey]: { data: prof, timestamp: Date.now() } });

    return prof;
}

/* ── Message listener ── */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.professorName) {
        queryRMP(request.professorName)
            .then(data => {
                if (data) {
                    sendResponse({ success: true, data });
                } else {
                    sendResponse({ success: false, error: "Not found" });
                }
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
