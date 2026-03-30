/* ── Tar Heel Tracker DOM text parsing helpers ── */

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
        .replace(/\s*\([^)]*\)\s*$/g, (match) => /\bRG|RQ\b/i.test(match) ? '' : match)
        .trim();
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

function normalizeSearchScopeKind(kind) {
    const value = normalizeTrackerPageLine(kind).toLowerCase();
    if (!value) return '';
    if (value === 'majors') return 'major';
    if (value === 'minors') return 'minor';
    return value;
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

function pushRequirement(requirements, title, details = '', context = {}) {
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
        details,
        ...normalizedContext,
    });
}

export function parseTrackerPageData(fullText) {
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

export function parseTrackerPageText(fullText) {
    return parseTrackerPageData(fullText).requirements;
}

export function parseTrackerTextWithContext(fullText) {
    return parseTrackerPageData(fullText);
}

export function parseTrackerText(fullText) {
    return parseTrackerPageText(fullText);
}

export async function extractTextFromPDF() {
    throw new Error('PDF parsing is disabled. Open the Tar Heel Tracker page and sync from the page content instead.');
}

export async function extractTrackerTextFromPDF() {
    throw new Error('PDF parsing is disabled. Open the Tar Heel Tracker page and sync from the page content instead.');
}

export async function parseTrackerPDFBuffer() {
    throw new Error('PDF parsing is disabled. Open the Tar Heel Tracker page and sync from the page content instead.');
}
