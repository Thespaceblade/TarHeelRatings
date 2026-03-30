const DEFAULT_ENDPOINT = process.env.CDP_URL || 'http://127.0.0.1:9222/json/list';
import { readFile } from 'node:fs/promises';

function parseArgs(argv) {
    const args = {
        endpoint: DEFAULT_ENDPOINT,
        targetId: '',
        targetTitle: '',
        targetUrl: '',
        expr: '',
        exprFile: '',
        listContexts: false,
        listFrames: false,
        contextId: 0,
        contextName: '',
        contextOrigin: '',
        extensionOnly: false,
        timeoutMs: 1500,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--target-id') {
            args.targetId = argv[++i] || '';
        } else if (arg === '--target-title') {
            args.targetTitle = argv[++i] || '';
        } else if (arg === '--target-url') {
            args.targetUrl = argv[++i] || '';
        } else if (arg === '--expr') {
            args.expr = argv[++i] || '';
        } else if (arg === '--expr-file') {
            args.exprFile = argv[++i] || '';
        } else if (arg === '--context-id') {
            args.contextId = Number(argv[++i] || 0);
        } else if (arg === '--context-name') {
            args.contextName = argv[++i] || '';
        } else if (arg === '--context-origin') {
            args.contextOrigin = argv[++i] || '';
        } else if (arg === '--extension') {
            args.extensionOnly = true;
        } else if (arg === '--list-contexts') {
            args.listContexts = true;
        } else if (arg === '--list-frames') {
            args.listFrames = true;
        } else if (arg === '--endpoint') {
            args.endpoint = argv[++i] || DEFAULT_ENDPOINT;
        } else if (arg === '--timeout-ms') {
            args.timeoutMs = Number(argv[++i] || 1500);
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

function printHelp() {
    console.log(`Usage: node scripts/cdp-probe.mjs [options]

Options:
  --target-id <id>
  --target-title <substring>
  --target-url <substring>
  --expr <javascript expression>
  --expr-file <path>
  --list-contexts
  --list-frames
  --context-id <id>
  --context-name <substring>
  --context-origin <substring>
  --extension
  --endpoint <json/list url>
  --timeout-ms <ms>
`);
}

async function fetchTargets(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw new Error(`CDP endpoint returned ${response.status}`);
    }
    return response.json();
}

function selectTarget(targets, args) {
    if (args.targetId) {
        return targets.find((target) => target.id === args.targetId) || null;
    }

    const pages = targets.filter((target) => target.type === 'page' || target.type === 'iframe');
    return pages.find((target) => {
        if (args.targetTitle && !target.title.includes(args.targetTitle)) return false;
        if (args.targetUrl && !target.url.includes(args.targetUrl)) return false;
        return true;
    }) || null;
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

function flattenFrameTree(node, rows = []) {
    if (!node?.frame) return rows;
    rows.push({
        id: node.frame.id,
        parentId: node.frame.parentId || '',
        url: node.frame.url || '',
        name: node.frame.name || '',
        securityOrigin: node.frame.securityOrigin || '',
    });
    (node.childFrames || []).forEach((child) => flattenFrameTree(child, rows));
    return rows;
}

function summarizeContext(context) {
    return {
        id: context.id,
        origin: context.origin || '',
        name: context.name || '',
        auxData: context.auxData || {},
    };
}

function pickContext(contexts, args) {
    if (args.contextId) {
        return contexts.find((context) => context.id === args.contextId) || null;
    }

    if (args.contextName) {
        const match = contexts.find((context) => (context.name || '').includes(args.contextName));
        if (match) return match;
    }

    if (args.contextOrigin) {
        const match = contexts.find((context) => (context.origin || '').includes(args.contextOrigin));
        if (match) return match;
    }

    if (args.extensionOnly) {
        const extensionContext = contexts.find((context) => (context.origin || '').startsWith('chrome-extension://'));
        if (extensionContext) return extensionContext;
    }

    return contexts.find((context) => !context.auxData?.isDefault) || contexts[0] || null;
}

async function delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.exprFile) {
        args.expr = await readFile(args.exprFile, 'utf8');
    }
    const targets = await fetchTargets(args.endpoint);
    const target = selectTarget(targets, args);

    if (!target?.webSocketDebuggerUrl) {
        throw new Error('Could not find a matching CDP target with a debugger websocket.');
    }

    const client = new CdpClient(target.webSocketDebuggerUrl);
    const executionContexts = [];

    client.on('Runtime.executionContextCreated', ({ context }) => {
        executionContexts.push(context);
    });

    await client.ready();
    await client.send('Runtime.enable');
    let pageDomainAvailable = true;
    try {
        await client.send('Page.enable');
    } catch (_) {
        pageDomainAvailable = false;
    }
    await delay(args.timeoutMs);

    let frames = [];
    if (pageDomainAvailable) {
        try {
            const frameTree = await client.send('Page.getFrameTree');
            frames = flattenFrameTree(frameTree.frameTree);
        } catch (_) {
            frames = [];
        }
    }
    const contexts = executionContexts.map(summarizeContext);

    const output = {
        target: {
            id: target.id,
            title: target.title,
            type: target.type,
            url: target.url,
        },
    };

    if (args.listFrames) {
        output.frames = frames;
    }

    if (args.listContexts) {
        output.contexts = contexts;
    }

    if (args.expr) {
        const selectedContext = pickContext(executionContexts, args);
        if (!selectedContext) {
            throw new Error('No matching execution context found.');
        }

        const evaluation = await client.send('Runtime.evaluate', {
            expression: args.expr,
            awaitPromise: true,
            returnByValue: true,
            includeCommandLineAPI: true,
            contextId: selectedContext.id,
        });

        output.selectedContext = summarizeContext(selectedContext);
        output.result = evaluation.result?.value;
        if (evaluation.exceptionDetails) {
            output.exceptionDetails = evaluation.exceptionDetails;
        }
    }

    console.log(JSON.stringify(output, null, 2));
    client.close();
}

main().catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
});
