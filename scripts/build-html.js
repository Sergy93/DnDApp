import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const templatePath = path.join(rootDir, 'src', 'templates', 'index.template.html');
const outputPath = path.join(rootDir, 'src', 'index.html');
const templatesDir = path.join(rootDir, 'src', 'templates');

function buildHtml() {
    if (!fs.existsSync(templatePath)) {
        console.error(`Template not found at: ${templatePath}`);
        process.exit(1);
    }

    let template = fs.readFileSync(templatePath, 'utf8');
    const includeRegex = /<!--\s*@include\s+["']([^"']+)["']\s*-->/g;

    const compiled = template.replace(includeRegex, (match, relPath) => {
        const filePath = path.join(templatesDir, relPath);
        if (!fs.existsSync(filePath)) {
            console.error(`Included template file not found: ${filePath}`);
            process.exit(1);
        }
        return fs.readFileSync(filePath, 'utf8').trimEnd();
    });

    fs.writeFileSync(outputPath, compiled, 'utf8');
    const lineCount = compiled.split('\n').length;
    console.log(`[build:html] Compiled src/index.html (${lineCount} lines) from src/templates/`);
}

buildHtml();
