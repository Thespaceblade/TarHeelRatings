#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const PROGRAMS_INDEX_URL = 'https://catalog.unc.edu/programs/';
const DEFAULT_OUTPUT_DIR = path.join(repoRoot, 'extension', 'data');
const DEFAULT_CONCURRENCY = 6;

const STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'at',
    'by',
    'for',
    'from',
    'in',
    'of',
    'on',
    'or',
    'the',
    'to',
    'with',
    'course',
    'courses',
    'requirement',
    'requirements',
    'major',
    'minor',
    'program',
]);

const GENERIC_GROUP_TITLES = new Set([
    'requirements',
    'core requirements',
    'additional requirements',
    'program requirements',
    'course list',
    'gateway course',
    'core courses',
]);

const SELECTION_WORD_TO_COUNT = new Map([
    ['one', 1],
    ['two', 2],
    ['three', 3],
    ['four', 4],
    ['five', 5],
    ['six', 6],
    ['seven', 7],
    ['eight', 8],
    ['nine', 9],
    ['ten', 10],
]);

function parseArgs(argv) {
    const args = {
        outputDir: DEFAULT_OUTPUT_DIR,
        concurrency: DEFAULT_CONCURRENCY,
        limit: 0,
        programs: [],
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--output-dir' && argv[i + 1]) {
            args.outputDir = path.resolve(repoRoot, argv[++i]);
            continue;
        }
        if (arg === '--concurrency' && argv[i + 1]) {
            args.concurrency = Math.max(1, Number.parseInt(argv[++i], 10) || DEFAULT_CONCURRENCY);
            continue;
        }
        if (arg === '--limit' && argv[i + 1]) {
            args.limit = Math.max(0, Number.parseInt(argv[++i], 10) || 0);
            continue;
        }
        if (arg === '--program' && argv[i + 1]) {
            const value = String(argv[++i] || '').trim().toLowerCase();
            if (value) args.programs.push(value);
            continue;
        }
    }

    return args;
}

function decodeHtmlEntities(value) {
    return String(value || '')
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&apos;/gi, "'")
        .replace(/&#39;/gi, "'")
        .replace(/&ldquo;/gi, '"')
        .replace(/&rdquo;/gi, '"')
        .replace(/&lsquo;/gi, "'")
        .replace(/&rsquo;/gi, "'")
        .replace(/&ndash;/gi, '-')
        .replace(/&mdash;/gi, '-')
        .replace(/&middot;/gi, '·')
        .replace(/&uuml;/gi, 'u')
        .replace(/&ouml;/gi, 'o')
        .replace(/&eacute;/gi, 'e');
}

function stripTags(value, { preserveBreaks = false } = {}) {
    let text = String(value || '');
    if (preserveBreaks) {
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/p>/gi, '\n');
        text = text.replace(/<\/li>/gi, '\n');
        text = text.replace(/<\/tr>/gi, '\n');
    }
    text = text.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '');
    text = text.replace(/<img\b[^>]*>/gi, ' ');
    text = text.replace(/<[^>]+>/g, ' ');
    text = decodeHtmlEntities(text);
    text = text.replace(/\u00a0/g, ' ');
    if (preserveBreaks) {
        return text
            .split('\n')
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .join('\n');
    }
    return text.replace(/\s+/g, ' ').trim();
}

function normalizeTitle(value) {
    return stripTags(value)
        .toLowerCase()
        .replace(/[–—-]/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizeTitle(value) {
    return normalizeTitle(value)
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token && !STOP_WORDS.has(token) && token.length > 1);
}

function dedupeStrings(values) {
    return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function stripProgramQualifiers(value) {
    return String(value || '')
        .replace(/\bmajor\b/gi, '')
        .replace(/\bminor\b/gi, '')
        .replace(/\bcertificate\b/gi, '')
        .replace(/\bconcentration\b/gi, '')
        .replace(/\btrack\b/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+,/g, ',')
        .trim()
        .replace(/,\s*$/, '')
        .trim();
}

function titleCaseKind(title, keywords) {
    const lowerTitle = title.toLowerCase();
    const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
    if (lowerKeywords.includes('minors') || /\bminor\b/.test(lowerTitle)) return 'minor';
    if (lowerKeywords.includes('certificates') || /\bcertificate\b/.test(lowerTitle)) return 'certificate';
    if (/\btrack\b/.test(lowerTitle)) return 'track';
    if (/\bconcentration\b/.test(lowerTitle)) return 'concentration';
    if (/\bmajor\b/.test(lowerTitle) || /\bb\.[a-z]/.test(lowerTitle)) return 'major';
    return 'program';
}

function getTitleText(html, className) {
    const match = html.match(new RegExp(`<span class="${className}">([\\s\\S]*?)<\\/span>`, 'i'));
    return stripTags(match?.[1] || '');
}

function getHoursFromRow(rowHtml) {
    const match = rowHtml.match(/<td class="hourscol">([\s\S]*?)<\/td>/i);
    return stripTags(match?.[1] || '');
}

function getCellValues(rowHtml) {
    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    return {
        codeHtml: cells[0] || '',
        titleHtml: cells[1] || '',
        hoursHtml: cells[2] || '',
    };
}

function extractCourseCodes(codeHtml) {
    const codes = [];

    for (const match of codeHtml.matchAll(/showCourse\(this,\s*'([^']+)'\)/g)) {
        const code = match[1].replace(/\s+/g, ' ').trim().toUpperCase();
        if (code && !codes.includes(code)) codes.push(code);
    }

    return codes;
}

function slugFromHref(href) {
    return String(href || '')
        .replace(/^https?:\/\/catalog\.unc\.edu/i, '')
        .replace(/\/+$/, '')
        .split('/')
        .filter(Boolean)
        .pop() || '';
}

function extractSelectionCount(title) {
    const match = normalizeTitle(title).match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b(?=.*\b(?:following|among)\b)/i);
    if (!match) return null;
    const raw = match[1].toLowerCase();
    if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
    return SELECTION_WORD_TO_COUNT.get(raw) || null;
}

function inferGroupType(title) {
    const normalized = normalizeTitle(title);
    if (
        /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b.*\b(?:following|among)\b/.test(normalized) ||
        /\bchoose\b/.test(normalized)
    ) {
        return 'selection_rule';
    }
    if (/^or\b/.test(normalized)) return 'alternative';
    return 'section';
}

function buildGroupId(programSlug, tableIndex, groupIndex, title) {
    const normalized = normalizeTitle(title).replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
    return `${programSlug}-t${tableIndex}-g${groupIndex}-${normalized || 'group'}`;
}

function isGenericLookupTitle(title) {
    const normalized = normalizeTitle(title);
    if (!normalized || GENERIC_GROUP_TITLES.has(normalized)) return true;
    if (/^(one|two|three|four|five|six|seven|eight|nine|ten|\d+) of the following$/.test(normalized)) return true;
    if (/^(one|two|three|four|five|six|seven|eight|nine|ten|\d+) from among the following.*$/.test(normalized)) return true;
    return tokenizeTitle(normalized).length < 2;
}

function summarizeRequirementNotes(requirementHtml) {
    const notes = [];
    const body = requirementHtml.match(/<div id="requirementstextcontainer"[\s\S]*?>([\s\S]*?)<\/div>\s*(?:<div id="sampleplantextcontainer"|<div id="opportunitiestextcontainer"|<div id="otherprogramstextcontainer"|<div id="contactstextcontainer"|<\/div>\s*<\/div>)/i)?.[1] || '';

    for (const li of body.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
        const text = stripTags(li[1], { preserveBreaks: true });
        if (text) notes.push(text);
    }

    return notes;
}

function findNearestSectionHeading(html, endIndex) {
    const windowStart = Math.max(0, endIndex - 2500);
    const snippet = html.slice(windowStart, endIndex);
    const matches = [...snippet.matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
    const lastMatch = matches[matches.length - 1];
    return stripTags(lastMatch?.[2] || '');
}

function parseCourseListTable(tableHtml, programSlug, tableIndex, sectionHeading = '') {
    const caption = stripTags(tableHtml.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] || '') || 'Course List';
    const effectiveSectionHeading = stripTags(sectionHeading);
    const defaultGroupTitle = isGenericLookupTitle(caption) && effectiveSectionHeading
        ? effectiveSectionHeading
        : caption;
    const tbody = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || '';
    const rows = [...tbody.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)];
    const groups = [];
    let currentHeader = effectiveSectionHeading || '';
    let currentGroup = null;

    function startGroup(title, kind, hours) {
        const group = {
            id: buildGroupId(programSlug, tableIndex, groups.length + 1, title),
            title: stripTags(title),
            normalizedTitle: normalizeTitle(title),
            kind,
            header: currentHeader || '',
            hours: stripTags(hours || ''),
            selectionCount: extractSelectionCount(title),
            courses: [],
            courseRows: [],
        };
        groups.push(group);
        currentGroup = group;
        return group;
    }

    for (const [, attrs, rowHtml] of rows) {
        const className = attrs.match(/class="([^"]+)"/i)?.[1] || '';
        const classes = new Set(className.split(/\s+/).filter(Boolean));
        const rowText = stripTags(rowHtml);
        if (!rowText) continue;

        if (classes.has('areaheader')) {
            currentHeader = getTitleText(rowHtml, 'courselistcomment') || rowText;
            startGroup(currentHeader, 'areaheader', getHoursFromRow(rowHtml));
            continue;
        }

        const { codeHtml, titleHtml, hoursHtml } = getCellValues(rowHtml);
        const hasCodeCell = /<td class="codecol">/i.test(rowHtml);
        const codes = hasCodeCell ? extractCourseCodes(codeHtml) : [];
        const hasComment = /courselistcomment/i.test(rowHtml);

        if (hasComment && codes.length === 0) {
            const commentTitle = getTitleText(rowHtml, 'courselistcomment') || rowText;
            startGroup(commentTitle, inferGroupType(commentTitle), hoursHtml);
            continue;
        }

        if (codes.length > 0) {
            if (!currentGroup) {
                startGroup(currentHeader || defaultGroupTitle, 'implicit_section', hoursHtml);
            }

            const rowRecord = {
                codes,
                title: stripTags(titleHtml, { preserveBreaks: true }),
                hours: stripTags(hoursHtml),
                isAlternative: classes.has('orclass'),
            };

            currentGroup.courseRows.push(rowRecord);
            for (const code of codes) {
                if (!currentGroup.courses.includes(code)) currentGroup.courses.push(code);
            }
        }
    }

    return {
        caption,
        sectionHeading: effectiveSectionHeading,
        groups: groups.filter((group) => group.title),
    };
}

function parseProgramPage(html, programMeta) {
    const pageTitle = stripTags(html.match(/<h1 class="page-title">([\s\S]*?)<\/h1>/i)?.[1] || '') || programMeta.title;
    const requirementNotes = summarizeRequirementNotes(html);
    const tables = [...html.matchAll(/<table class="sc_courselist">([\s\S]*?)<\/table>/gi)]
        .map((match, index) => {
            const sectionHeading = findNearestSectionHeading(html, match.index);
            return parseCourseListTable(match[0], programMeta.slug, index + 1, sectionHeading);
        })
        .filter((table) => table.groups.length > 0);

    return {
        ...programMeta,
        pageTitle,
        requirementNotes,
        tables,
    };
}

function buildProgramAliases(program) {
    const title = stripTags(program.title);
    const pageTitle = stripTags(program.pageTitle);
    const aliases = dedupeStrings([
        title,
        pageTitle,
        title.replace(/,/g, ''),
        pageTitle.replace(/,/g, ''),
        stripProgramQualifiers(title),
        stripProgramQualifiers(pageTitle),
        title.split(',')[0],
        pageTitle.split(',')[0],
    ]);

    return {
        aliases,
        normalizedAliases: dedupeStrings(aliases.map((alias) => normalizeTitle(alias))),
    };
}

function buildProgramIndex(programs) {
    const programsBySlug = {};

    for (const program of programs) {
        const { aliases, normalizedAliases } = buildProgramAliases(program);
        const groups = program.tables
            .flatMap((table) => table.groups.map((group) => ({
                id: group.id,
                title: group.title,
                header: group.header || table.sectionHeading || '',
                kind: group.kind,
                selectionCount: group.selectionCount,
                courses: [...group.courses].sort(),
            })))
            .filter((group) => group.courses.length > 0);

        programsBySlug[program.slug] = {
            slug: program.slug,
            title: program.title,
            pageTitle: program.pageTitle,
            url: program.url,
            kind: program.kind,
            aliases,
            normalizedAliases,
            groups,
        };
    }

    return programsBySlug;
}

function extractCatalogYear(html) {
    const yearMatch = html.match(/\b(20\d{2}-20\d{2})\s+Academic Catalog\b/i);
    return yearMatch?.[1] || '';
}

function buildLookup(programs) {
    const entries = new Map();

    function upsertLookupEntry(lookupTitle, group, program) {
        if (!lookupTitle || isGenericLookupTitle(lookupTitle)) return;
        const normalizedTitle = normalizeTitle(lookupTitle);
        const key = normalizedTitle;
        if (!entries.has(key)) {
            entries.set(key, {
                title: stripTags(lookupTitle),
                normalizedTitle,
                tokens: tokenizeTitle(lookupTitle),
                courses: [],
                programs: [],
                sources: [],
            });
        }

        const entry = entries.get(key);
        for (const code of group.courses) {
            if (!entry.courses.includes(code)) entry.courses.push(code);
        }

        if (!entry.programs.some((item) => item.slug === program.slug)) {
            entry.programs.push({
                slug: program.slug,
                title: program.title,
                url: program.url,
                kind: program.kind,
            });
        }

        entry.sources.push({
            programSlug: program.slug,
            groupId: group.id,
            groupTitle: group.title,
            header: group.header,
            kind: group.kind,
        });
    }

    for (const program of programs) {
        for (const table of program.tables) {
            for (const group of table.groups) {
                if (!group.courses.length) continue;
                upsertLookupEntry(group.title, group, program);
                if (group.header && normalizeTitle(group.header) !== normalizeTitle(group.title)) {
                    upsertLookupEntry(`${group.header}: ${group.title}`, group, program);
                }
            }
        }
    }

    return [...entries.values()]
        .map((entry) => ({
            ...entry,
            courses: entry.courses.sort(),
            programs: entry.programs.sort((a, b) => a.title.localeCompare(b.title)),
        }))
        .sort((a, b) => a.title.localeCompare(b.title));
}

async function fetchText(url) {
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const response = await fetch(url, {
                headers: {
                    'user-agent': 'TarHeelRatings catalog builder',
                },
            });

            if (!response.ok) {
                throw new Error(`Request failed with ${response.status} for ${url}`);
            }

            return response.text();
        } catch (error) {
            lastError = error;
            if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError || `Request failed for ${url}`));
}

function extractProgramEntries(html) {
    const isotope = html.match(/<ul class="isotope">([\s\S]*?)<\/ul>/i)?.[1] || '';
    const items = [...isotope.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi)];
    const programs = [];
    const seen = new Set();

    for (const [, attrs, itemHtml] of items) {
        const className = attrs.match(/class="([^"]+)"/i)?.[1] || '';
        if (!/\bfilter_57\b/.test(className)) continue;

        const href = itemHtml.match(/<a href="([^"]+)"/i)?.[1] || '';
        if (!href.startsWith('/undergraduate/programs-study/')) continue;

        const title = getTitleText(itemHtml, 'title');
        if (!title) continue;

        const keywords = [...itemHtml.matchAll(/<span class="keyword">([\s\S]*?)<\/span>/gi)]
            .map((match) => stripTags(match[1]))
            .filter(Boolean);

        const absoluteUrl = new URL(href, PROGRAMS_INDEX_URL).toString();
        const slug = slugFromHref(href);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);

        programs.push({
            slug,
            title,
            url: absoluteUrl,
            href,
            keywords,
            kind: titleCaseKind(title, keywords),
        });
    }

    return programs.sort((a, b) => a.title.localeCompare(b.title));
}

async function mapLimit(items, limit, iteratee) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await iteratee(items[index], index);
        }
    }

    const workerCount = Math.min(Math.max(1, limit), Math.max(items.length, 1));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    await fs.mkdir(args.outputDir, { recursive: true });

    console.log(`[catalog] Fetching programs index: ${PROGRAMS_INDEX_URL}`);
    const indexHtml = await fetchText(PROGRAMS_INDEX_URL);
    const catalogYear = extractCatalogYear(indexHtml);
    let programs = extractProgramEntries(indexHtml);

    if (args.programs.length > 0) {
        programs = programs.filter((program) =>
            args.programs.some((needle) =>
                program.slug === needle || program.title.toLowerCase().includes(needle)
            )
        );
    }

    if (args.limit > 0) {
        programs = programs.slice(0, args.limit);
    }

    console.log(`[catalog] Found ${programs.length} undergraduate program pages`);

    const errors = [];
    const parsedPrograms = (await mapLimit(programs, args.concurrency, async (program, index) => {
        const prefix = `[catalog] ${index + 1}/${programs.length} ${program.slug}`;
        try {
            console.log(`${prefix} fetch`);
            const html = await fetchText(program.url);
            const parsed = parseProgramPage(html, program);
            console.log(`${prefix} parsed ${parsed.tables.length} tables`);
            return parsed;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`${prefix} failed: ${message}`);
            errors.push({ slug: program.slug, url: program.url, message });
            return null;
        }
    })).filter(Boolean);

    const programCatalog = {
        generatedAt: new Date().toISOString(),
        source: PROGRAMS_INDEX_URL,
        catalogYear,
        count: parsedPrograms.length,
        errors,
        programs: parsedPrograms,
    };

    const requirementLookup = {
        generatedAt: programCatalog.generatedAt,
        source: PROGRAMS_INDEX_URL,
        count: 0,
        entries: buildLookup(parsedPrograms),
    };
    requirementLookup.count = requirementLookup.entries.length;

    const programIndex = {
        generatedAt: programCatalog.generatedAt,
        source: PROGRAMS_INDEX_URL,
        catalogYear,
        count: parsedPrograms.length,
        programs: buildProgramIndex(parsedPrograms),
    };

    const catalogPath = path.join(args.outputDir, 'unc-program-catalog.json');
    const lookupPath = path.join(args.outputDir, 'unc-requirement-lookup.json');
    const programIndexPath = path.join(args.outputDir, 'unc-program-index.json');

    await fs.writeFile(catalogPath, JSON.stringify(programCatalog, null, 2) + '\n', 'utf8');
    await fs.writeFile(lookupPath, JSON.stringify(requirementLookup, null, 2) + '\n', 'utf8');
    await fs.writeFile(programIndexPath, JSON.stringify(programIndex, null, 2) + '\n', 'utf8');

    console.log(`[catalog] Wrote ${catalogPath}`);
    console.log(`[catalog] Wrote ${lookupPath}`);
    console.log(`[catalog] Wrote ${programIndexPath}`);
    console.log(`[catalog] Parsed ${parsedPrograms.length} programs, ${requirementLookup.count} lookup entries, ${errors.length} errors`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
