const DEFAULT_ENDPOINT = process.env.CDP_URL || 'http://127.0.0.1:9222/json/list';

function parseArgs(argv) {
    const args = {
        endpoint: DEFAULT_ENDPOINT,
        targetTitle: 'Class Search',
        timeoutMs: 12000,
        testFilter: '',
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--endpoint') {
            args.endpoint = argv[++i] || DEFAULT_ENDPOINT;
        } else if (arg === '--target-title') {
            args.targetTitle = argv[++i] || 'Class Search';
        } else if (arg === '--timeout-ms') {
            args.timeoutMs = Number(argv[++i] || 12000);
        } else if (arg === '--test') {
            args.testFilter = (argv[++i] || '').trim();
        } else if (arg === '--help' || arg === '-h') {
            console.log(`Usage: node scripts/test-class-search.mjs [options]

Options:
  --endpoint <json/list url>
  --target-title <page title substring>
  --timeout-ms <ms>
  --test <test name substring>
`);
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

async function fetchTargets(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw new Error(`CDP endpoint returned ${response.status}`);
    }
    return response.json();
}

function selectTarget(targets, titleSubstring) {
    return targets.find((target) => target.type === 'page' && target.title.includes(titleSubstring)) || null;
}

class CdpClient {
    constructor(webSocketDebuggerUrl) {
        this.socket = new WebSocket(webSocketDebuggerUrl);
        this.nextId = 1;
        this.pending = new Map();
        this.eventListeners = new Map();
        this.openPromise = new Promise((resolve, reject) => {
            this.socket.addEventListener('open', resolve, { once: true });
            this.socket.addEventListener('error', reject, { once: true });
        });

        this.socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const pending = this.pending.get(message.id);
                if (!pending) return;
                this.pending.delete(message.id);
                if (message.error) {
                    pending.reject(new Error(message.error.message || 'Unknown CDP error'));
                } else {
                    pending.resolve(message.result || {});
                }
                return;
            }

            const listeners = this.eventListeners.get(message.method);
            if (!listeners?.length) return;
            listeners.forEach((listener) => {
                try {
                    listener(message.params || {});
                } catch (_) { /* noop */ }
            });
        });
    }

    async ready() {
        await this.openPromise;
    }

    send(method, params = {}) {
        const id = this.nextId++;
        const payload = JSON.stringify({ id, method, params });
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.socket.send(payload);
        });
    }

    on(method, listener) {
        const listeners = this.eventListeners.get(method) || [];
        listeners.push(listener);
        this.eventListeners.set(method, listeners);
    }

    close() {
        try {
            this.socket.close();
        } catch (_) { /* noop */ }
    }
}

function summarizeContext(context) {
    return {
        id: context.id,
        origin: context.origin || '',
        name: context.name || '',
        auxData: context.auxData || {},
    };
}

async function delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

function pickClassSearchContexts(contexts) {
    const newestFirst = [...contexts].reverse();
    const csDefault = newestFirst.find((context) =>
        context.origin === 'https://cs.cc.unc.edu' &&
        context.auxData?.isDefault
    );
    const csIsolated = newestFirst.find((context) =>
        context.origin.startsWith('chrome-extension://') &&
        context.auxData?.frameId === csDefault?.auxData?.frameId
    );

    if (!csDefault) {
        throw new Error('Could not find the default Class Search execution context.');
    }

    return { pageContextId: csDefault.id, extensionContextId: csIsolated?.id || 0 };
}

function buildPageContextResolver(executionContexts) {
    return () => pickClassSearchContexts(executionContexts.map(summarizeContext)).pageContextId;
}

async function evaluate(client, expression, contextId, returnByValue = true) {
    const result = await client.send('Runtime.evaluate', {
        expression,
        contextId,
        awaitPromise: true,
        returnByValue,
    });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
    }
    return result.result?.value;
}

function jsonExpr(value) {
    return JSON.stringify(value);
}

async function getFormState(client, getPageContextId) {
    return evaluate(client, `(() => {
        const findInputByLabel = (labelText) => {
            const normalize = (text) => String(text || '').toLowerCase().replace(/\\s+/g, ' ').trim();
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
                if (normalize(label.textContent).replace(/\\*/g, '') !== normalize(labelText)) continue;
                const forId = label.getAttribute('for');
                if (forId) {
                    const linked = document.getElementById(forId);
                    if (linked) return linked;
                }
                const parent = label.closest('[role="combobox"]') || label.parentElement;
                const input = parent?.querySelector('input');
                if (input) return input;
            }
            return null;
        };

        const subjectInput = findInputByLabel('Subject');
        const catalogInput = document.getElementById('CATALOG_NBR');
        const attrInput = findInputByLabel('Course Attribute');
        const attrValueInput = findInputByLabel('Course Attribute Value');
        const tracker = document.getElementById('thr-tracker-container');
        const launcher = document.getElementById('thr-class-search-launcher');
        const visibleOptions = Array.from(document.querySelectorAll('[role="option"]'))
            .map((el) => (el.textContent || '').replace(/\\s+/g, ' ').trim())
            .filter(Boolean);

        return {
            href: location.href,
            title: document.title,
            subject: subjectInput ? String(subjectInput.value || '').trim() : '',
            catalog: catalogInput ? String(catalogInput.value || '').trim() : '',
            courseAttribute: attrInput ? String(attrInput.value || '').trim() : '',
            courseAttributeValue: attrValueInput ? String(attrValueInput.value || '').trim() : '',
            trackerOpen: !!tracker?.classList.contains('thr-open'),
            trackerBusy: tracker?.dataset?.busy || '',
            launcherBusy: launcher?.dataset?.busy || '',
            launcherStatus: launcher?.dataset?.status || '',
            visibleOptions,
            bodyText: (document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 800),
        };
    })()`, getPageContextId());
}

async function runDomAction(client, getPageContextId, source) {
    return evaluate(client, source, getPageContextId());
}

async function waitFor(client, getPageContextId, predicateSource, timeoutMs, label, options = {}) {
    const pollIntervalMs = Math.max(100, Number(options.pollIntervalMs || 150));
    const initialDelayMs = Math.max(0, Number(options.initialDelayMs || 0));
    if (initialDelayMs) {
        await delay(initialDelayMs);
    }
    const deadline = Date.now() + timeoutMs;
    let lastValue = null;
    while (Date.now() < deadline) {
        try {
            lastValue = await evaluate(client, predicateSource, getPageContextId());
            if (lastValue?.ok) {
                return lastValue;
            }
        } catch (error) {
            lastValue = { ok: false, error: error.message || String(error) };
        }
        await delay(pollIntervalMs);
    }

    const state = await getFormState(client, getPageContextId);
    throw new Error(`${label} timed out. Last check: ${JSON.stringify(lastValue)}. Current state: ${JSON.stringify(state)}`);
}

async function waitForIdle(client, getPageContextId, timeoutMs, label = 'Class Search idle') {
    return waitFor(client, getPageContextId, `(() => {
        const tracker = document.getElementById('thr-tracker-container');
        const launcher = document.getElementById('thr-class-search-launcher');
        const busy = tracker?.dataset?.busy === 'true' || launcher?.dataset?.busy === 'true';
        return { ok: !busy, busy };
    })()`, timeoutMs, label, { pollIntervalMs: 500 });
}

async function ensureTrackerOpen(client, getPageContextId, timeoutMs) {
    const state = await getFormState(client, getPageContextId);
    if (state.trackerOpen) return;

    await runDomAction(client, getPageContextId, `(() => {
        const launcher = document.getElementById('thr-class-search-launcher');
        if (!launcher) return { ok: false, reason: 'missing-launcher' };
        launcher.click();
        return { ok: true };
    })()`);

    await waitFor(client, getPageContextId, `(() => ({
        ok: !!document.getElementById('thr-tracker-container')?.classList.contains('thr-open')
    }))()`, timeoutMs, 'Tracker open');
}

async function clickSubcourse(client, getPageContextId, course) {
    return runDomAction(client, getPageContextId, `(() => {
        const button = Array.from(document.querySelectorAll('.thr-subcourse-btn'))
            .find((el) => (el.getAttribute('data-course') || '').trim() === ${jsonExpr(course)});
        if (!button) return { ok: false, reason: 'missing-subcourse', course: ${jsonExpr(course)} };
        button.click();
        return { ok: true, text: button.textContent.trim() };
    })()`);
}

async function clickDirectCard(client, getPageContextId, title) {
    return runDomAction(client, getPageContextId, `(() => {
        const card = Array.from(document.querySelectorAll('.thr-tracker-card[data-thr-action-mode="direct-search"]'))
            .find((el) => el.querySelector('.thr-tracker-card-title')?.textContent?.trim() === ${jsonExpr(title)});
        if (!card) return { ok: false, reason: 'missing-direct-card', title: ${jsonExpr(title)} };
        card.click();
        return { ok: true };
    })()`);
}

async function clickDisabledCard(client, getPageContextId, title) {
    return runDomAction(client, getPageContextId, `(() => {
        const card = Array.from(document.querySelectorAll('.thr-tracker-card[data-thr-action-mode="disabled"]'))
            .find((el) => el.querySelector('.thr-tracker-card-title')?.textContent?.trim() === ${jsonExpr(title)});
        if (!card) return { ok: false, reason: 'missing-disabled-card', title: ${jsonExpr(title)} };
        card.click();
        return { ok: true };
    })()`);
}

async function waitForSettledSearch(client, getPageContextId, timeoutMs, matcher, label) {
    return waitFor(client, getPageContextId, `(() => {
        const normalize = (text) => String(text || '').toLowerCase().replace(/\\s+/g, ' ').trim();
        const findInputByLabel = (labelText) => {
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
                const text = normalize(label.textContent).replace(/\\*/g, '');
                if (text !== normalize(labelText)) continue;
                const forId = label.getAttribute('for');
                if (forId) {
                    const linked = document.getElementById(forId);
                    if (linked) return linked;
                }
                const parent = label.closest('[role="combobox"]') || label.parentElement;
                const input = parent?.querySelector('input');
                if (input) return input;
            }
            return null;
        };
        const subject = String(findInputByLabel('Subject')?.value || '').trim();
        const catalog = String(document.getElementById('CATALOG_NBR')?.value || '').trim();
        const courseAttribute = String(findInputByLabel('Course Attribute')?.value || '').trim();
        const courseAttributeValue = String(findInputByLabel('Course Attribute Value')?.value || '').trim();
        const tracker = document.getElementById('thr-tracker-container');
        const launcher = document.getElementById('thr-class-search-launcher');
        const busy = tracker?.dataset?.busy === 'true' || launcher?.dataset?.busy === 'true';
        const state = { subject, catalog, courseAttribute, courseAttributeValue, busy, href: location.href };
        const checks = ${matcher};
        const ok = (!busy) &&
            (!checks.subjectIncludes || normalize(subject).includes(normalize(checks.subjectIncludes))) &&
            (!checks.catalogEquals || catalog === checks.catalogEquals) &&
            (!checks.catalogBlank || !catalog) &&
            (!checks.courseAttributeIncludes || normalize(courseAttribute).includes(normalize(checks.courseAttributeIncludes))) &&
            (!checks.courseAttributeValueIncludes || normalize(courseAttributeValue).includes(normalize(checks.courseAttributeValueIncludes)));
        return { ok, state };
    })()`, timeoutMs, label, {
        initialDelayMs: 3500,
        pollIntervalMs: 900,
    });
}

function buildTests() {
    return [
        {
            name: 'launcher-opens-tracker',
            async run(client, getPageContextId, timeoutMs) {
                await ensureTrackerOpen(client, getPageContextId, timeoutMs);
                const state = await getFormState(client, getPageContextId);
                return {
                    trackerOpen: state.trackerOpen,
                    launcherBusy: state.launcherBusy,
                };
            },
        },
        {
            name: 'math-524',
            async run(client, getPageContextId, timeoutMs) {
                await ensureTrackerOpen(client, getPageContextId, timeoutMs);
                const click = await clickSubcourse(client, getPageContextId, 'MATH 524');
                if (!click?.ok) throw new Error(JSON.stringify(click));
                const result = await waitForSettledSearch(
                    client,
                    getPageContextId,
                    timeoutMs,
                    jsonExpr({ subjectIncludes: 'mathematics', catalogEquals: '524' }),
                    'MATH 524 search'
                );
                return result.state;
            },
        },
        {
            name: 'stor-415',
            async run(client, getPageContextId, timeoutMs) {
                await ensureTrackerOpen(client, getPageContextId, timeoutMs);
                const click = await clickSubcourse(client, getPageContextId, 'STOR 415');
                if (!click?.ok) throw new Error(JSON.stringify(click));
                const result = await waitForSettledSearch(
                    client,
                    getPageContextId,
                    timeoutMs,
                    jsonExpr({ subjectIncludes: 'operations research', catalogEquals: '415' }),
                    'STOR 415 search'
                );
                return result.state;
            },
        },
        {
            name: 'jwst-100',
            async run(client, getPageContextId, timeoutMs) {
                await ensureTrackerOpen(client, getPageContextId, timeoutMs);
                const click = await clickSubcourse(client, getPageContextId, 'JWST 100');
                if (!click?.ok) throw new Error(JSON.stringify(click));
                const result = await waitForSettledSearch(
                    client,
                    getPageContextId,
                    timeoutMs,
                    jsonExpr({ subjectIncludes: 'jewish studies', catalogEquals: '100' }),
                    'JWST 100 search'
                );
                return result.state;
            },
        },
        {
            name: 'reli-above-400',
            async run(client, getPageContextId, timeoutMs) {
                await ensureTrackerOpen(client, getPageContextId, timeoutMs);
                const click = await clickDirectCard(client, getPageContextId, 'Course Check: Two minor courses must be numbered above 400');
                if (!click?.ok) throw new Error(JSON.stringify(click));
                const result = await waitForSettledSearch(
                    client,
                    getPageContextId,
                    timeoutMs,
                    jsonExpr({ subjectIncludes: 'religious studies', catalogBlank: true }),
                    'RELI department search'
                );
                return result.state;
            },
        },
        {
            name: 'research-and-discovery',
            async run(client, getPageContextId, timeoutMs) {
                await ensureTrackerOpen(client, getPageContextId, timeoutMs);
                const click = await clickDirectCard(client, getPageContextId, 'Research and Discovery');
                if (!click?.ok) throw new Error(JSON.stringify(click));
                const result = await waitForSettledSearch(
                    client,
                    getPageContextId,
                    timeoutMs,
                    jsonExpr({
                        courseAttributeIncludes: 'idea',
                        courseAttributeValueIncludes: 'research',
                        catalogBlank: true,
                    }),
                    'Research and Discovery search'
                );
                return result.state;
            },
        },
        {
            name: 'campus-life-disabled',
            async run(client, getPageContextId, timeoutMs) {
                await ensureTrackerOpen(client, getPageContextId, timeoutMs);
                const before = await getFormState(client, getPageContextId);
                const click = await clickDisabledCard(client, getPageContextId, 'Campus Life Experience');
                if (!click?.ok) throw new Error(JSON.stringify(click));
                await delay(700);
                const after = await getFormState(client, getPageContextId);
                if (
                    before.subject !== after.subject ||
                    before.catalog !== after.catalog ||
                    before.courseAttribute !== after.courseAttribute ||
                    before.courseAttributeValue !== after.courseAttributeValue
                ) {
                    throw new Error(`Disabled card changed form state: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
                }
                return after;
            },
        },
    ];
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const targets = await fetchTargets(args.endpoint);
    const target = selectTarget(targets, args.targetTitle);
    if (!target?.webSocketDebuggerUrl) {
        throw new Error(`Could not find a matching target with title containing "${args.targetTitle}"`);
    }

    const client = new CdpClient(target.webSocketDebuggerUrl);
    const executionContexts = [];

    client.on('Runtime.executionContextCreated', ({ context }) => {
        executionContexts.push(context);
    });

    await client.ready();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await delay(1200);

    const contexts = executionContexts.map(summarizeContext);
    const getPageContextId = buildPageContextResolver(executionContexts);
    const initialState = await getFormState(client, getPageContextId);

    if (!/class search/i.test(initialState.title)) {
        throw new Error(`Matched context is not the live Class Search page: ${JSON.stringify(initialState)}`);
    }

    const tests = buildTests().filter((test) =>
        !args.testFilter || test.name.includes(args.testFilter)
    );

    if (!tests.length) {
        throw new Error(`No tests matched "${args.testFilter}"`);
    }

    const results = [];
    let failed = 0;

    for (const test of tests) {
        try {
            await waitForIdle(client, getPageContextId, args.timeoutMs, `Idle before ${test.name}`);
            const detail = await test.run(client, getPageContextId, args.timeoutMs);
            await waitForIdle(client, getPageContextId, args.timeoutMs, `Idle after ${test.name}`);
            results.push({ name: test.name, ok: true, detail });
        } catch (error) {
            failed += 1;
            results.push({
                name: test.name,
                ok: false,
                error: error.message || String(error),
            });
            try {
                await waitForIdle(client, getPageContextId, Math.min(args.timeoutMs, 20000), `Recovery after ${test.name}`);
            } catch (_) {
                break;
            }
        }
    }

    console.log(JSON.stringify({
        target: {
            id: target.id,
            title: target.title,
            url: target.url,
        },
        initialState,
        results,
        summary: {
            total: results.length,
            failed,
            passed: results.length - failed,
        },
    }, null, 2));

    client.close();
    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
});
