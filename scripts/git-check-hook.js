import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function readStdin() {
    try {
        return fs.readFileSync(0, 'utf-8');
    } catch {
        return '';
    }
}

function didAgentModifyInCurrentTurn(transcriptPath) {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return true;
    try {
        const lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
        let lastUserIdx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes('"USER_INPUT"')) {
                lastUserIdx = i;
                break;
            }
        }
        const turnLines = lastUserIdx >= 0 ? lines.slice(lastUserIdx + 1) : lines;
        const writeTools = ['write_to_file', 'replace_file_content', 'multi_replace_file_content'];
        return turnLines.some(line => writeTools.some(tool => line.includes(`"${tool}"`)));
    } catch {
        return true;
    }
}

function main() {
    const rawInput = readStdin();
    let payload = {};
    try {
        payload = rawInput ? JSON.parse(rawInput) : {};
    } catch {
        payload = {};
    }

    if (payload.terminationReason && payload.terminationReason !== 'NO_TOOL_CALL') {
        process.stdout.write(JSON.stringify({}));
        return;
    }

    if (!didAgentModifyInCurrentTurn(payload.transcriptPath)) {
        process.stdout.write(JSON.stringify({}));
        return;
    }

    try {
        const status = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf-8' }).trim();
        let unpushedCount = 0;
        try {
            const unpushed = execSync('git rev-list @{u}..HEAD --count', { cwd: repoRoot, encoding: 'utf-8' }).trim();
            unpushedCount = parseInt(unpushed, 10) || 0;
        } catch {
            unpushedCount = 0;
        }

        if (status.length > 0 || unpushedCount > 0) {
            process.stdout.write(JSON.stringify({
                decision: 'continue',
                reason: 'Uncommitted changes or unpushed commits detected in the repository. Per AGENTS.md Section 6, please stage all changes, commit with a descriptive English message, and push to origin main before finishing.'
            }));
            return;
        }
    } catch {
        // Fallback: allow stop if git check fails unexpectedly
    }

    process.stdout.write(JSON.stringify({}));
}

main();
