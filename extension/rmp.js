const CACHE_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 day cache
const CACHE_SIZE = 100;
const CACHE_VERSION = 'v4'; // bumped to invalidate stale overrides
const PROGRAM_INDEX_DATA_URL = chrome?.runtime?.getURL
    ? chrome.runtime.getURL('extension/data/unc-program-index.json')
    : '';
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

/* ── Tracker text parsing ── */

const TRACKER_PAGE_IGNORE_PATTERNS = [
    /^(Tar Heel Tracker|Current page|Requirement Group|Careers|View PDF|View All|Expand All|Hide Satisfied Requirements|Expand Lines|Collapse Lines|Collapse All|Finished Loading)$/i,
    /^Navigated to /i,
    /^Lines$/i,
    /^for /i,
    /^Reminder:/i,
    /^Important\b/i,
    /^Note:/i,
    /^[•*·-]\s*/i,
    /^\d+\)\s*/i,
    /^Catalog Year\b/i,
    /^Requirement Term:/i,
    /^Requirement overview$/i,
    /^Courses$/i,
    /^\d+ courses needed$/i,
    /^\d+$/,
    /^\d+\.\d+$/,
    /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,
    /^\d+\s+of\s+\d+\s+Requirements Satisfied$/i,
    /^Complete \d+%$/i,
    /^View Courses$/i,
    /^No Courses$/i,
    /^In Progress$/i,
    /^Completed Courses$/i,
    /^Required$/i,
    /^Completed$/i,
    /^Needed$/i,
    /^Required\s+Completed\s+Needed$/i,
    /^(SATISFIED|SATISFIED - IP|NOT SATISFIED)$/i,
    /^\((RG|RQ)\d+/i,
    /^(RG|RQ)\d+/i,
    /\((RG|RQ)\d+\)$/i,
    /^Global Limits$/i,
    /^Degree Requirements$/i,
    /^In-Progress Courses(?:\/Temporary Grades)?$/i,
    /^General Education Notices$/i,
    /^Major Rules:?$/i,
    /^First-Year Foundations$/i,
    /^Courses Taken\b.*\bLater$/i,
    /^Focus Capacities$/i,
    /^Empirical Investigative Lab(?:oratory)?$/i,
    /^Reflection and Integration:/i,
    /^Disciplinary Distribution$/i,
    /^Major: /i,
    /^Minor: /i,
    /^Additional: /i,
    /^Core Courses$/i,
    /^Subfield Check$/i,
    /^University Requirements for (Majors|Minors)$/i,
    /^Electives$/i,
    /^Non-Degree Applicable Courses$/i,
    /^Focus Capacities Tally$/i,
    /^Graduation Clearance$/i,
    /^Minimum Degree Hours\b/i,
    /^Minimum Cumulative Grade Point Average\b/i,
    /^You are following /i,
    /^Calculated Hours for Your Enrollment Appointment$/i,
];

const TRACKER_CONTAINER_SUMMARY_PATTERNS = [
    /^\d+\s+of\s+\d+\s+Requirements Satisfied$/i,
    /^Complete \d+%$/i,
    /^Expand All$/i,
    /^Expand Lines$/i,
    /^Collapse Lines$/i,
    /^Collapse All$/i,
    /^Finished Loading$/i,
];

const TRACKER_REQUIREMENT_DETAIL_PATTERNS = [
    /^Required$/i,
    /^Completed$/i,
    /^Needed$/i,
    /^Required\s+Completed\s+Needed$/i,
    /^\d+$/,
    /^\d+\.\d+$/,
    /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,
];

const TRACKER_GENERAL_SECTION_PATTERNS = [
    /^First-Year Foundations$/i,
    /^Focus Capacities$/i,
    /^Reflection and Integration:?$/i,
    /^General Education Notices$/i,
    /^University Requirements for (Majors|Minors)$/i,
    /^Campus Life Experience$/i,
    /^Degree Requirements$/i,
    /^Global Limits$/i,
];

const TRACKER_SECTION_SCOPE_PATTERNS = [
    { pattern: /^Major Rules:?$/i, kind: 'major' },
    { pattern: /^Major Courses:?$/i, kind: 'major' },
    { pattern: /^Minor Rules:?$/i, kind: 'minor' },
    { pattern: /^Minor Courses:?$/i, kind: 'minor' },
    { pattern: /^Additional Rules:?$/i, kind: 'additional' },
    { pattern: /^Additional Courses:?$/i, kind: 'additional' },
    { pattern: /^Track Requirements:?$/i, kind: 'track' },
    { pattern: /^Concentration Requirements:?$/i, kind: 'concentration' },
];

const PROGRAM_MATCH_STOP_WORDS = new Set([
    'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
    'major', 'minor', 'program',
]);

let programIndexPromise = null;
let programIndexData = null;

function normalizeTrackerPageLine(line) {
    return line
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeTrackerPageTitle(line) {
    return normalizeTrackerPageLine(line)
        .replace(/^Expand\s+/i, '')
        .replace(/\s+details$/i, '')
        .replace(/\s*\((?:RG|RQ)\d+(?::LN\d+)?\)\s*$/i, '')
        .replace(/\s*\((?:Expand|Open)\b[^)]*\)$/i, '')
        .trim();
}

function normalizeTrackerProgramLabel(label) {
    return normalizeTrackerPageLine(String(label || ''))
        .replace(/\s*\((?:RG|RQ)\d+(?::LN\d+)?\)\s*$/i, '')
        .trim();
}

function normalizeSearchScopeKind(kind) {
    const value = normalizeTrackerPageLine(kind).toLowerCase();
    if (!value) return '';
    if (value === 'majors') return 'major';
    if (value === 'minors') return 'minor';
    return value;
}

function normalizeTrackerProgramKind(kind, label = '') {
    const normalizedKind = normalizeSearchScopeKind(kind);
    if (normalizedKind !== 'additional') return normalizedKind;

    const normalizedLabel = normalizeTrackerPageTitle(label).toLowerCase();
    if (/\bminor\b/.test(normalizedLabel)) return 'minor';
    if (/\bmajor\b/.test(normalizedLabel)) return 'major';
    if (/\btrack\b/.test(normalizedLabel)) return 'track';
    if (/\bconcentration\b/.test(normalizedLabel)) return 'concentration';
    if (/\bcertificate\b/.test(normalizedLabel)) return 'certificate';
    return 'additional';
}

function parseTrackerProgramDeclaration(line) {
    const match = normalizeTrackerPageLine(line).match(/^(Major|Minor|Additional|Track|Concentration|Certificate):\s*(.+)$/i);
    if (!match) return null;

    const label = normalizeTrackerProgramLabel(match[2]);
    if (!label) return null;

    return {
        kind: normalizeTrackerProgramKind(match[1], label),
        label,
    };
}

function parseTrackerFollowingProgram(line) {
    const normalizedLine = normalizeTrackerPageLine(line);
    if (!/^You are following /i.test(normalizedLine)) return null;

    const label = normalizeTrackerProgramLabel(
        normalizedLine
            .replace(/^You are following\s+/i, '')
            .replace(/\s+requirements?.*$/i, '')
            .trim()
    );
    if (!/\b(major|minor|track|concentration|certificate)\b/i.test(label)) return null;

    const kindMatch = label.match(/\b(major|minor|track|concentration|certificate)\b/i);
    return {
        kind: normalizeTrackerProgramKind(kindMatch?.[1] || 'additional', label),
        label,
    };
}

function parseTrackerCatalogYear(line) {
    const match = normalizeTrackerPageLine(line).match(/^Catalog Year\b[:\s-]*(20\d{2}-20\d{2})/i);
    return match?.[1] || '';
}

function isTrackerGeneralSectionLine(line) {
    const normalized = normalizeTrackerPageTitle(line);
    return TRACKER_GENERAL_SECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getMostRecentProgram(activePrograms, desiredKind, currentProgram) {
    const normalizedKind = normalizeSearchScopeKind(desiredKind);
    if (currentProgram && currentProgram.kind === normalizedKind) {
        return currentProgram;
    }

    for (let index = activePrograms.length - 1; index >= 0; index -= 1) {
        const program = activePrograms[index];
        if (program.kind === normalizedKind) return program;
    }

    return null;
}

function resolveSectionProgram(line, activePrograms, currentProgram) {
    const normalized = normalizeTrackerPageTitle(line);
    if (!normalized) return { program: currentProgram, sectionLabel: '' };

    const scopedSection = TRACKER_SECTION_SCOPE_PATTERNS.find(({ pattern }) => pattern.test(normalized));
    if (scopedSection) {
        return {
            program: getMostRecentProgram(activePrograms, scopedSection.kind, currentProgram),
            sectionLabel: normalized,
        };
    }

    if (isTrackerGeneralSectionLine(normalized)) {
        return {
            program: null,
            sectionLabel: normalized,
        };
    }

    if (/^(Core Courses|Electives|Subfield Check|Course Check)\b/i.test(normalized)) {
        return {
            program: currentProgram,
            sectionLabel: normalized,
        };
    }

    return {
        program: currentProgram,
        sectionLabel: '',
    };
}

function pushActiveProgram(activePrograms, declaration) {
    const normalizedLabel = normalizeTrackerProgramLabel(declaration?.label);
    const kind = normalizeTrackerProgramKind(declaration?.kind, normalizedLabel);
    if (!normalizedLabel || !kind) return null;

    const existing = activePrograms.find((program) => program.kind === kind && program.label === normalizedLabel);
    if (existing) return existing;

    const program = {
        kind,
        label: normalizedLabel,
        order: activePrograms.length,
    };
    activePrograms.push(program);
    return program;
}

function buildTrackerLineContexts(lines) {
    const activePrograms = [];
    const lineContexts = [];
    let currentProgram = null;
    let currentSectionLabel = '';
    let catalogYear = '';

    lines.forEach((line, index) => {
        const declaration = parseTrackerProgramDeclaration(line) || parseTrackerFollowingProgram(line);
        if (declaration) {
            currentProgram = pushActiveProgram(activePrograms, declaration);
            currentSectionLabel = '';
        } else {
            const lineCatalogYear = parseTrackerCatalogYear(line);
            if (lineCatalogYear) {
                catalogYear = lineCatalogYear;
            }

            const nextScope = resolveSectionProgram(line, activePrograms, currentProgram);
            if (nextScope.program !== currentProgram || nextScope.sectionLabel) {
                currentProgram = nextScope.program;
                currentSectionLabel = nextScope.sectionLabel || currentSectionLabel;
            }
        }

        lineContexts[index] = {
            programKind: currentProgram?.kind || '',
            programLabel: currentProgram?.label || '',
            sectionLabel: currentSectionLabel || '',
        };
    });

    return {
        catalogYear,
        activePrograms,
        lineContexts,
    };
}

function isTrackerPageNoiseLine(line) {
    const normalized = normalizeTrackerPageTitle(line);
    if (!normalized) return true;
    if (normalized.length > 110) return true;
    if (/\bGPA\b/i.test(normalized)) return true;
    if (/\.$/.test(normalized) && !/^(Course Check:|Subfield Check:)/i.test(normalized)) {
        return true;
    }
    if (/\b(?:students?\s+must|the following|a minimum|effective fall|if you have|this line|course sharing rules|all inquiries must be sent|courses? used|courses? with grades|below is a list)\b/i.test(normalized)) {
        return true;
    }
    return TRACKER_PAGE_IGNORE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isTrackerContainerSummaryLine(line) {
    const normalized = normalizeTrackerPageLine(line);
    return TRACKER_CONTAINER_SUMMARY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isTrackerRequirementDetailLine(line) {
    const normalized = normalizeTrackerPageLine(line);
    if (!normalized) return true;
    return TRACKER_REQUIREMENT_DETAIL_PATTERNS.some((pattern) => pattern.test(normalized));
}

function extractTrackerRequirementDetails(lines, titleIndex, statusIndex) {
    const nearby = lines
        .slice(titleIndex + 1, statusIndex)
        .map(normalizeTrackerPageLine)
        .filter(Boolean);
    const joined = nearby.join(' ');
    const tallyMatch = joined.match(/Required\s+Completed\s+Needed\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);

    if (tallyMatch && Number(tallyMatch[3]) > 0) {
        return `${tallyMatch[1]} required, ${tallyMatch[2]} completed, ${tallyMatch[3]} needed`;
    }

    return '';
}

function findTrackerRequirementTitle(lines, statusIndex, lineContexts) {
    const scanStart = Math.max(0, statusIndex - 10);

    for (let titleIndex = statusIndex - 1; titleIndex >= scanStart; titleIndex--) {
        const candidate = normalizeTrackerPageTitle(lines[titleIndex]);
        if (!candidate || isTrackerPageNoiseLine(candidate) || isTrackerRequirementDetailLine(candidate)) {
            continue;
        }

        const betweenLines = lines.slice(titleIndex + 1, statusIndex);
        if (betweenLines.some(isTrackerContainerSummaryLine)) {
            continue;
        }

        return {
            title: candidate,
            details: extractTrackerRequirementDetails(lines, titleIndex, statusIndex),
            context: lineContexts?.[titleIndex] || { programKind: '', programLabel: '', sectionLabel: '' },
        };
    }

    return {
        title: '',
        details: '',
        context: { programKind: '', programLabel: '', sectionLabel: '' },
    };
}

function pushRequirement(requirements, title, details, context = {}) {
    const normalizedTitle = normalizeTrackerPageTitle(title);
    if (!normalizedTitle || isTrackerPageNoiseLine(normalizedTitle)) {
        return;
    }
    const normalizedContext = {
        programKind: context?.programKind || '',
        programLabel: normalizeTrackerProgramLabel(context?.programLabel || ''),
        sectionLabel: normalizeTrackerPageTitle(context?.sectionLabel || ''),
    };
    const existing = requirements.find((req) =>
        req.title === normalizedTitle &&
        (req.programKind || '') === normalizedContext.programKind &&
        (req.programLabel || '') === normalizedContext.programLabel &&
        (req.sectionLabel || '') === normalizedContext.sectionLabel
    );
    if (existing) {
        if (!existing.details && details) {
            existing.details = details;
        }
        return;
    }
    requirements.push({
        title: normalizedTitle,
        status: 'Not Satisfied',
        details: details || '',
        ...normalizedContext,
    });
}

function parseTrackerPageData(fullText) {
    const requirements = [];
    const lines = fullText
        .replace(/\r/g, '')
        .split('\n')
        .map(normalizeTrackerPageLine)
        .filter(Boolean);
    const { catalogYear, activePrograms, lineContexts } = buildTrackerLineContexts(lines);

    for (let i = 0; i < lines.length; i++) {
        if (lines[i] !== 'NOT SATISFIED') continue;

        const { title, details, context } = findTrackerRequirementTitle(lines, i, lineContexts);
        if (title) {
            pushRequirement(requirements, title, details, context);
        }
    }

    const campusLifeMatch = fullText.match(/Campus Life Experience[\s\S]{0,800}?Required\s+Completed\s+Needed\s+(\d+)\s+(\d+)\s+(\d+)/i);
    if (campusLifeMatch && Number(campusLifeMatch[3]) > 0) {
        pushRequirement(
            requirements,
            'Campus Life Experience',
            `${campusLifeMatch[1]} required, ${campusLifeMatch[2]} completed, ${campusLifeMatch[3]} needed`
        );
    }

    return {
        requirements,
        context: {
            catalogYear,
            activePrograms,
        },
    };
}

function parseTrackerPageText(fullText) {
    return parseTrackerPageData(fullText).requirements;
}

function normalizeProgramMatchText(text) {
    return normalizeTrackerPageTitle(text)
        .toLowerCase()
        .replace(/[–—-]/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizeProgramMatchText(text) {
    return normalizeProgramMatchText(text)
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token && token.length > 1 && !PROGRAM_MATCH_STOP_WORDS.has(token));
}

function getProgramKindsForMatching(kind) {
    const normalized = normalizeSearchScopeKind(kind);
    if (!normalized) return [];
    if (normalized === 'additional') {
        return ['track', 'concentration', 'certificate', 'program'];
    }
    return [normalized];
}

function scoreProgramMatch(label, program) {
    const normalizedLabel = normalizeProgramMatchText(label);
    const aliases = Array.isArray(program?.normalizedAliases) && program.normalizedAliases.length
        ? program.normalizedAliases.map((alias) => normalizeProgramMatchText(alias)).filter(Boolean)
        : [program?.title, program?.pageTitle].map(normalizeProgramMatchText).filter(Boolean);

    if (!normalizedLabel || !aliases.length) return 0;
    if (aliases.includes(normalizedLabel)) return 100;
    if (aliases.some((alias) => alias.includes(normalizedLabel) || normalizedLabel.includes(alias))) return 88;

    const labelTokens = tokenizeProgramMatchText(normalizedLabel);
    if (!labelTokens.length) return 0;

    let bestScore = 0;
    for (const alias of aliases) {
        const aliasTokens = tokenizeProgramMatchText(alias);
        if (!aliasTokens.length) continue;

        const overlapCount = labelTokens.filter((token) => aliasTokens.includes(token)).length;
        if (overlapCount === 0) continue;

        const tokenScore = Math.round((overlapCount / Math.max(labelTokens.length, aliasTokens.length)) * 78);
        if (tokenScore > bestScore) {
            bestScore = tokenScore;
        }
    }

    return bestScore;
}

async function loadProgramIndexData() {
    if (programIndexData) return programIndexData;
    if (!PROGRAM_INDEX_DATA_URL) return null;
    if (!programIndexPromise) {
        programIndexPromise = fetch(PROGRAM_INDEX_DATA_URL)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Program index request failed with ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => {
                programIndexData = payload || { programs: {} };
                return programIndexData;
            })
            .catch((error) => {
                console.warn('[TarHeelRatings] Failed to load program index data:', error);
                programIndexData = { programs: {} };
                return programIndexData;
            });
    }

    return programIndexPromise;
}

async function matchTrackerPrograms(context) {
    const programIndex = await loadProgramIndexData();
    const programsBySlug = programIndex?.programs || {};
    const candidates = Object.values(programsBySlug);

    return (Array.isArray(context?.activePrograms) ? context.activePrograms : []).map((trackerProgram) => {
        const candidateKinds = getProgramKindsForMatching(trackerProgram.kind);
        const scopedCandidates = candidates.filter((candidate) => candidateKinds.includes(candidate.kind));
        let bestMatch = null;
        let bestScore = 0;
        let secondScore = 0;

        scopedCandidates.forEach((candidate) => {
            const score = scoreProgramMatch(trackerProgram.label, candidate);
            if (score > bestScore) {
                secondScore = bestScore;
                bestScore = score;
                bestMatch = candidate;
            } else if (score > secondScore) {
                secondScore = score;
            }
        });

        const confident = !!bestMatch && bestScore >= 72 && (bestScore >= 96 || (bestScore - secondScore) >= 8);
        return {
            ...trackerProgram,
            matched: confident,
            programSlug: confident ? bestMatch.slug : '',
            programTitle: confident ? bestMatch.title : '',
            programKind: confident ? bestMatch.kind : '',
            matchScore: confident ? bestScore : 0,
        };
    });
}

function findMatchedTrackerProgram(activePrograms, requirement) {
    return (Array.isArray(activePrograms) ? activePrograms : []).find((program) =>
        program.label === requirement.programLabel &&
        program.kind === requirement.programKind
    ) || null;
}

function parseCatalogYearStart(value) {
    const match = String(value || '').match(/(20\d{2})-(20\d{2})/);
    return match ? Number.parseInt(match[1], 10) : 0;
}

async function buildTrackerContext(parseResult) {
    const matchedPrograms = await matchTrackerPrograms(parseResult?.context || {});
    const programIndex = await loadProgramIndexData();
    const trackerCatalogYear = parseResult?.context?.catalogYear || '';
    const programCatalogYear = programIndex?.catalogYear || '';

    return {
        catalogYear: trackerCatalogYear,
        catalogSourceYear: programCatalogYear,
        usesApproximateCatalogYear:
            !!trackerCatalogYear &&
            !!programCatalogYear &&
            parseCatalogYearStart(trackerCatalogYear) > 0 &&
            parseCatalogYearStart(programCatalogYear) > parseCatalogYearStart(trackerCatalogYear),
        activePrograms: matchedPrograms,
    };
}

function enrichRequirementsWithProgramMatches(requirements, trackerContext) {
    return (Array.isArray(requirements) ? requirements : []).map((requirement) => {
        if (!requirement?.programLabel) {
            return {
                ...requirement,
                programSlug: '',
            };
        }

        const matchedProgram = findMatchedTrackerProgram(trackerContext?.activePrograms, requirement);
        return {
            ...requirement,
            programSlug: matchedProgram?.matched ? matchedProgram.programSlug : '',
        };
    });
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

async function parseAndStoreTrackerText(text, url) {
    await chrome.storage.local.set({
        thr_missing_requirements: null,
        thr_tracker_context: null,
        thr_tracker_status: 'parsing',
        thr_tracker_error: '',
        thr_tracker_source_url: url || '',
        thr_tracker_updated_at: Date.now(),
    });

    try {
        const parseResult = parseTrackerPageData(text);
        const trackerContext = await buildTrackerContext(parseResult);
        const requirements = enrichRequirementsWithProgramMatches(parseResult.requirements, trackerContext);
        const summaryMatch = text.match(/\b(\d+)\s+of\s+(\d+)\s+Requirements Satisfied\b/i);
        const allSatisfiedBySummary = summaryMatch && Number(summaryMatch[1]) === Number(summaryMatch[2]);
        const allSatisfiedByPercent = /\bComplete\s+100%\b/i.test(text);

        if (requirements.length > 0) {
            await chrome.storage.local.set({
                thr_missing_requirements: requirements,
                thr_tracker_context: trackerContext,
                thr_tracker_status: 'parsed',
                thr_tracker_error: '',
                thr_tracker_source_url: url || '',
                thr_tracker_updated_at: Date.now(),
            });
            return requirements;
        }

        if (/\bNOT SATISFIED\b/i.test(text)) {
            throw new Error('Tracker page loaded, but requirement details were not expanded enough to sync.');
        }

        if (allSatisfiedBySummary || allSatisfiedByPercent) {
            await chrome.storage.local.set({
                thr_missing_requirements: [],
                thr_tracker_context: trackerContext,
                thr_tracker_status: 'all_satisfied',
                thr_tracker_error: '',
                thr_tracker_source_url: url || '',
                thr_tracker_updated_at: Date.now(),
            });
            return [];
        }

        throw new Error('Tar Heel Tracker page is still loading.');
    } catch (error) {
        await chrome.storage.local.set({
            thr_missing_requirements: null,
            thr_tracker_context: null,
            thr_tracker_status: 'error',
            thr_tracker_error: error?.message || String(error),
            thr_tracker_source_url: url || '',
            thr_tracker_updated_at: Date.now(),
        });
        throw error;
    }
}

/* ── Message listener ── */

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'PARSE_TRACKER_TEXT' && request.text) {
            parseAndStoreTrackerText(request.text, request.url || sender?.tab?.url || '')
                .then(requirements => {
                    sendResponse({ success: true, count: requirements.length });
                })
                .catch(err => {
                    console.error('[TarHeelRatings] Tracker text parse error:', err);
                    sendResponse({ success: false, error: err.message });
                });
            return true;
        }

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
}
