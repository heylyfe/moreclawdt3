// Static checks: the theme file is valid for T3 Code, nothing gets stripped,
// and the committed files match a fresh build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  THEME_CSS_MAX_LENGTH, THEME_NAME_MAX_LENGTH, HEX_COLOR, COLOR_ROLE_KEY,
  themeCssLoadsRemoteFiles, themeCssValueFetches,
} from './t3/theme-css.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const theme = JSON.parse(read('t3-clawd-crab.json'));
export const STATES = ['idle', 'thinking', 'working', 'reading', 'delegating', 'subagent',
  'waiting', 'error', 'done', 'sleeping', 'compacting', 'terminal', 'editing', 'browsing', 'planning', 'listening'];

test('theme file matches the T3 Code theme schema', () => {
  assert.equal(theme.version, 1);
  assert.equal(typeof theme.name, 'string');
  assert.equal(theme.name, theme.name.trim());
  assert.ok(theme.name.length > 0 && theme.name.length <= THEME_NAME_MAX_LENGTH);
  assert.ok(['light', 'dark'].includes(theme.appearance));
  for (const k of ['canvas', 'accent']) if (k in theme) assert.match(theme[k], HEX_COLOR, k);
  const palettes = [theme.colors, theme.variants?.light, theme.variants?.dark].filter(Boolean);
  for (const p of palettes) for (const [k, v] of Object.entries(p)) {
    assert.match(k, COLOR_ROLE_KEY, `color key ${k}`);
    assert.ok(v.trim() === v && v.length > 0 && v.length <= 64, `color value ${k}`);
  }
  const allowed = new Set(['version', 'name', 'appearance', 'canvas', 'accent', 'colors', 'variants', 'css']);
  for (const k of Object.keys(theme)) assert.ok(allowed.has(k), `unexpected field ${k}`);
});

test(`theme css fits in ${THEME_CSS_MAX_LENGTH.toLocaleString('en')} characters`, () => {
  assert.ok(theme.css.length <= THEME_CSS_MAX_LENGTH, `css is ${theme.css.length}`);
});

test('theme css loads no remote files (T3 Code text check)', () => {
  assert.equal(themeCssLoadsRemoteFiles(theme.css), false);
  assert.doesNotMatch(theme.css, /@import/i);
  // T3 Code drops declaration values with a backslash. The only ones allowed are the
  // escaped "/" in Tailwind class selectors like .group\/sidebar-status-slot.
  const bad = [...theme.css.matchAll(/\\(?!\/)/g)].map((m) => theme.css.slice(m.index - 30, m.index + 10));
  assert.deepEqual(bad, [], 'backslash in a declaration value');
});

test('every sprite is defined once and T3 Code accepts its value', () => {
  for (const id of STATES) {
    const m = [...theme.css.matchAll(new RegExp(`--clawd-${id}:(url\\("[^"]*"\\))`, 'g'))];
    assert.equal(m.length, 1, `--clawd-${id}`);
    assert.equal(themeCssValueFetches(m[0][1]), false, `--clawd-${id} would be stripped`);
    assert.ok(m[0][1].startsWith('url("data:image/svg+xml,'), `--clawd-${id} is a data URI`);
  }
});

test('the mod uses every sprite it needs', () => {
  for (const id of STATES) assert.ok(theme.css.includes(`var(--clawd-${id})`), `var(--clawd-${id}) unused`);
});

test('listening only triggers on a focused composer with text in it', () => {
  assert.ok(theme.css.includes('[data-chat-composer-form]:has(.composer-tiptap:focus):not(:has(.text-placeholder))'));
});

test('the original t3-clawd theme is kept as-is', () => {
  const base = JSON.parse(read('vendor/t3-clawd.json'));
  assert.ok(theme.css.startsWith(base.css.replaceAll('"\\2318N"', '"⌘N"')));
  assert.deepEqual(theme.colors, base.colors);
  assert.deepEqual(theme.variants, base.variants);
});

test('each SVG is small, self-contained and safe to embed', () => {
  for (const id of STATES) {
    const svg = read(`clawd/clawd-${id}.svg`);
    assert.match(svg, /^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg' viewBox='[-\d. ]+'/);
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(!svg.includes('"'), 'double quote would end url("...")');
    assert.ok(!svg.includes('\\'));
    assert.doesNotMatch(svg, /href|<script|<image|@import/i, 'no external references or scripts');
    assert.equal((svg.match(/<path/g) || []).length, (svg.match(/\/>/g) || []).length, 'paths are closed');
    assert.ok(svg.length < 4096, `${id} is ${svg.length} bytes`);
    assert.ok(svg.includes('@media(prefers-reduced-motion:reduce)'), `${id} ignores reduced motion`);
  }
});

test('the version has a changelog entry and shows in the gallery', () => {
  const { version } = JSON.parse(read('package.json'));
  assert.match(version, /^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/);
  assert.ok(read('CHANGELOG.md').includes(`## [${version}]`), `CHANGELOG.md has no entry for ${version}`);
  assert.ok(read('clawd-gallery.html').includes(`v${version}`));
});

test('the README shows every crab', () => {
  const readme = read('README.md');
  for (const id of STATES) assert.ok(readme.includes(`clawd/clawd-${id}.svg`), `README is missing ${id}`);
});

test('the README size badge and install note match the theme size', () => {
  const readme = read('README.md');
  const k = Math.round(theme.css.length / 1000);
  assert.ok(readme.includes(`theme_css-${k}k%20%2F%20100k`), `update the README badge to ${k}k`);
  const approx = (Math.round(theme.css.length / 100) * 100).toLocaleString('en');
  assert.ok(readme.includes(`about ${approx}`), `update "about ${approx}" in the README`);
});

test('committed files match a fresh build', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clawd-build-'));
  try {
    const src = ['build.mjs', 'package.json', 'mod.template.css', 'gallery.template.html', 'vendor/t3-clawd.json'];
    for (const f of src) {
      fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
      fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f));
    }
    execFileSync(process.execPath, [path.join(tmp, 'build.mjs')], { stdio: 'pipe' });
    const out = ['t3-clawd-crab.json', 'clawd-gallery.html', 'clawd/clawd-theme.css', 'clawd/clawd-mod.css',
      ...STATES.map((id) => `clawd/clawd-${id}.svg`)];
    const norm = (s) => s.replace(/\r\n/g, '\n');
    for (const f of out) {
      assert.equal(norm(fs.readFileSync(path.join(tmp, f), 'utf8')), norm(read(f)), `${f} is stale: run npm run build`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
