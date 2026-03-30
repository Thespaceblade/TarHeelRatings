const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
    const inputPath = process.argv[2];
    if (!inputPath) {
        throw new Error('Usage: node test_parse.js <tracker-text-file>');
    }

    const textPath = path.resolve(inputPath);
    const trackerText = await fs.readFile(textPath, 'utf8');
    const { parseTrackerPageText } = await import('./extension/tracker-parser.mjs');
    const requirements = parseTrackerPageText(trackerText);

    console.log('Text file:', textPath);
    console.log('Characters:', trackerText.length);
    console.log('Missing requirements:', requirements.length);
    console.log(JSON.stringify(requirements, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
