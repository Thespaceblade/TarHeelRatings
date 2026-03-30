const endpoint = process.env.CDP_URL || 'http://127.0.0.1:9222/json/list';

async function main() {
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw new Error(`CDP endpoint returned ${response.status}`);
    }

    const targets = await response.json();
    const rows = targets.map((target) => ({
        id: target.id,
        type: target.type,
        title: target.title,
        url: target.url,
        attached: target.attached,
    }));

    console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
    console.error(`Could not read Chrome DevTools targets from ${endpoint}`);
    console.error(error.message || String(error));
    process.exit(1);
});
