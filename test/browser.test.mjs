// Real-browser checks: load the theme into a headless Chrome/Edge with T3 Code's own
// loader, then check which crab shows for every state.
// Skipped when no Chromium-based browser is found (set CHROME_PATH to point at one).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildTestPage, CASES, SIDEBAR, STATE_IDS } from './mock-page.mjs';

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ];
  return candidates.find((p) => p && fs.existsSync(p));
}

const browser = findBrowser();
let tmp, results;

before(() => {
  if (!browser) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clawd-browser-'));
  const page = path.join(tmp, 'test.html');
  fs.writeFileSync(page, buildTestPage());
  const dom = execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
    `--user-data-dir=${path.join(tmp, 'profile')}`, '--virtual-time-budget=1000', '--dump-dom',
    pathToFileURL(page).href,
  ], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
  const m = dom.match(/<pre id="results">([\s\S]*?)<\/pre>/);
  assert.ok(m, 'test page produced no results');
  results = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
});

after(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

const opts = { skip: browser ? false : 'no Chrome or Edge found (set CHROME_PATH)' };

test('T3 Code loader keeps every declaration', opts, () => {
  assert.deepEqual(results.stripped, []);
  assert.ok(results.rules > 50, `only ${results.rules} rules parsed`);
  assert.equal(results.spritesFound, STATE_IDS.length, 'every sprite resolves to its own image');
});

for (const [name, , , expected] of CASES) {
  test(`mascot shows "${expected}" for: ${name}`, opts, () => {
    const r = results.cases[name];
    assert.equal(r.cn, expected);
    assert.equal(r.mascotSize, '99px×72px');
    if (expected === 'idle') {
      assert.equal(r.mascotAnimation, 'clawd-rest');
      assert.ok(['done', 'idle'].includes(r.mascot), `resting mascot is ${r.mascot}`);
    } else {
      assert.equal(r.mascotAnimation, 'none');
      assert.equal(r.mascot, expected);
    }
  });
}

test('the "Working for…" row gets a working crab, or a compacting one', opts, () => {
  assert.deepEqual(results.cases.working.workingRow, ['working']);
  assert.deepEqual(results.cases.compacting.workingRow, ['compacting']);
});

test('only running or queued subagents get a mini crab', opts, () => {
  assert.deepEqual(results.cases.delegating.subagents, [['Running', 'subagent'], ['Completed', null]]);
  assert.deepEqual(results.cases['delegating (queued)'].subagents, [['Queued', 'subagent']]);
});

test('empty chat gets a mini crab walking on the message box, busy chats do not', opts, () => {
  assert.equal(results.cases.idle.walker, 'subagent');
  for (const [name, , rows] of CASES) if (/data-(timeline-row-kind|v2-item-type)/.test(rows)) assert.equal(results.cases[name].walker, null, name);
});

test('sidebar shows the right crab for each thread status', opts, () => {
  assert.deepEqual(results.sidebar, SIDEBAR.map(([, s]) => s));
});
