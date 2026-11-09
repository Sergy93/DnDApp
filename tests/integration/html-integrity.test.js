import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createCharacterSheet } from '../../src/app.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'src/index.html');

test('HTML Integrity & Structural Layout Validation', async (t) => {
    await t.test('build:html runs cleanly and compiles index.html', () => {
        execSync('node scripts/build-html.js', { cwd: ROOT_DIR, stdio: 'pipe' });
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'src/index.html should exist after build');
    });

    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

    await t.test('All HTML tags are balanced without orphan or mismatched tags', () => {
        const voidTags = new Set([
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
        ]);
        let i = 0;
        const stack = [];
        const n = html.length;
        const errors = [];

        function getLine(idx) {
            return html.slice(0, idx).split('\n').length;
        }

        while (i < n) {
            if (html.startsWith('<!--', i)) {
                const end = html.indexOf('-->', i + 4);
                if (end === -1) { errors.push({ msg: 'Unclosed comment', line: getLine(i) }); break; }
                i = end + 3;
                continue;
            }
            if (html.startsWith('<!', i)) {
                const end = html.indexOf('>', i + 2);
                i = end + 1;
                continue;
            }
            if (html[i] === '<') {
                const startIdx = i;
                const isClosing = html[i + 1] === '/';
                i = isClosing ? i + 2 : i + 1;
                let tagName = '';
                while (i < n && /[a-zA-Z0-9\-]/.test(html[i])) {
                    tagName += html[i++];
                }
                tagName = tagName.toLowerCase();

                let inQuote = false;
                let quoteChar = '';
                let isSelfClosing = false;
                while (i < n) {
                    const c = html[i];
                    if (inQuote) {
                        if (c === quoteChar) inQuote = false;
                    } else {
                        if (c === '"' || c === "'") {
                            inQuote = true;
                            quoteChar = c;
                        } else if (c === '/' && html[i + 1] === '>') {
                            isSelfClosing = true;
                            i += 2;
                            break;
                        } else if (c === '>') {
                            i++;
                            break;
                        }
                    }
                    i++;
                }

                if (!tagName) continue;
                if (voidTags.has(tagName) || isSelfClosing) continue;

                const line = getLine(startIdx);
                if (!isClosing) {
                    stack.push({ tag: tagName, line });
                } else {
                    if (stack.length === 0) {
                        errors.push({ msg: 'Unexpected closing tag', tag: tagName, line });
                    } else {
                        const top = stack[stack.length - 1];
                        if (top.tag === tagName) {
                            stack.pop();
                        } else {
                            errors.push({ msg: 'Mismatched closing tag', expected: top.tag, got: tagName, openedAt: top.line, line });
                        }
                    }
                }
                continue;
            }
            i++;
        }

        assert.equal(errors.length, 0, `HTML contains tag errors: ${JSON.stringify(errors.slice(0, 5))}`);
        assert.equal(stack.length, 0, `HTML has unclosed tags: ${JSON.stringify(stack.slice(-5))}`);
    });

    await t.test('Container hierarchy preserves centering and flex layout', () => {
        // Body has centering flex classes
        assert.match(html, /<body[^>]*class="[^"]*justify-center[^"]*"/, 'body should contain justify-center for centering');

        // Main card wrapper has max-w-6xl
        assert.match(html, /<div[^>]*class="[^"]*max-w-6xl[^"]*"/, 'card container should have max-w-6xl');

        // All 5 tab sections must exist inside <main>
        const mainOpenIndex = html.indexOf('<main');
        const mainCloseIndex = html.indexOf('</main>');
        assert.ok(mainOpenIndex !== -1, '<main> tag must exist');
        assert.ok(mainCloseIndex > mainOpenIndex, '</main> tag must close after <main>');

        const requiredTabs = ['profile', 'combat', 'inventory', 'progression', 'quests'];
        for (const tab of requiredTabs) {
            const sectionRegex = new RegExp(`<section[^>]*x-show="activeTab === '${tab}'"`, 'i');
            const match = sectionRegex.exec(html);
            assert.ok(match, `Tab section for '${tab}' must be present in index.html`);
            assert.ok(
                match.index > mainOpenIndex && match.index < mainCloseIndex,
                `Tab section for '${tab}' must reside inside <main>`
            );
        }
    });

    await t.test('DOM Element IDs are strictly unique across compiled HTML', () => {
        const idRegex = /\sid=["']([^"']+)["']/g;
        let match;
        const seenIds = new Map();
        const duplicates = [];

        while ((match = idRegex.exec(html)) !== null) {
            const id = match[1];
            // Skip Alpine expressions or template interpolation in IDs if any
            if (id.includes('{') || id.includes('$')) continue;
            if (seenIds.has(id)) {
                duplicates.push(id);
            } else {
                seenIds.set(id, true);
            }
        }

        assert.deepEqual(duplicates, [], `Duplicate DOM IDs found in index.html: ${duplicates.join(', ')}`);
    });

    await t.test('Alpine event handlers bound in HTML exist on createCharacterSheet', () => {
        const sheet = createCharacterSheet();
        // Match expressions like @click="foo(...)" or @change="bar(...)"
        const handlerRegex = /@(click|change|input|submit)(?:\.prevent|\.stop)?=["']\s*([a-zA-Z0-9_$]+)\s*\(/g;
        let m;
        const missingMethods = new Set();
        // Built-ins, Alpine globals or JS control statements that are not sheet methods
        const allowedGlobals = new Set(['alert', 'confirm', 'console', 'parseInt', 'parseFloat', 'if', 'while', 'for']);

        while ((m = handlerRegex.exec(html)) !== null) {
            const methodName = m[2];
            if (allowedGlobals.has(methodName)) continue;
            if (typeof sheet[methodName] !== 'function') {
                missingMethods.add(methodName);
            }
        }

        assert.deepEqual(
            Array.from(missingMethods),
            [],
            `HTML binds unknown methods in createCharacterSheet: ${Array.from(missingMethods).join(', ')}`
        );
    });
});
