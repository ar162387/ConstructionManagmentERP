const fs = require('fs');
const path = require('path');
const dir = './src/pages';

if (!fs.existsSync(dir)) {
    console.log("No pages dir");
    process.exit(0);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let changedFiles = 0;
for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    const initial = content;

    // Bump table base text
    content = content.replace(/(<table[^>]*className="[^"]*?\b)text-sm(\b[^"]*")/g, '$1text-base$2');

    // Bump th text-xs to text-sm
    content = content.replace(/(<th[^>]*className="[^"]*?\b)text-xs(\b[^"]*")/g, '$1text-sm$2');
    content = content.replace(/(<th[^>]*className="[^"]*?\b)text-\[10px\](\b[^"]*")/g, '$1text-xs$2');

    // Bump td text-xs to text-sm
    content = content.replace(/(<td[^>]*className="[^"]*?\b)text-xs(\b[^"]*")/g, '$1text-sm$2');
    content = content.replace(/(<td[^>]*className="[^"]*?\b)text-\[10px\](\b[^"]*")/g, '$1text-xs$2');

    if (content !== initial) {
        fs.writeFileSync(fp, content);
        changedFiles++;
        console.log("Updated", file);
    }
}

console.log("Done. Changed files:", changedFiles);
