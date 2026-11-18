// A fake T3 Code DOM that uses the same hooks as the real app (data-* attributes,
// aria labels, lucide icons). The theme is applied with T3 Code's own loader.
//   node test/mock-page.mjs          writes mock-preview.html to look at in a browser
//   buildTestPage()                  used by browser.test.mjs to check every state
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const working = (t = 'Working for 12s') => `<div data-timeline-row-kind="working"><div>${t}</div></div>`;
const tool = (icon, label) => `<div data-timeline-row-kind="work-live"><svg class="lucide lucide-${icon}" width="12" height="12"></svg> <span class="live-tool-shine">${label}</span></div>`;
const subagent = (name, status) => `<div data-v2-item-type="subagent" aria-description="${status}" style="display:flex;gap:6px;align-items:center">${name} · ${status}</div>`;

// [name, open thread's sidebar status, timeline rows, expected mascot sprite, { typed, focus } for the composer]
export const CASES = [
  ['idle', 'Done', '', 'idle'],
  ['working', 'Working', working(), 'working'],
  ['goal', 'Goal', '', 'working'],
  ['thinking', 'Working', `<div data-timeline-row-kind="thinking">Thinking</div>${working('Working for 3s')}`, 'thinking'],
  ['thinking (brain tool)', 'Working', tool('brain', 'Reasoning') + working(), 'thinking'],
  ['reading', 'Working', tool('eye', 'Read README.md') + working('Working for 8s'), 'reading'],
  ['searching code', 'Working', tool('search', 'Search "molt"') + working(), 'reading'],
  ['web search', 'Working', tool('globe', 'Search the web') + working(), 'browsing'],
  ['editing', 'Working', tool('square-pen', 'Edit claws.ts') + working(), 'editing'],
  ['terminal', 'Working', tool('terminal', 'npm test') + working(), 'terminal'],
  ['planning', 'Working', tool('list-todo', 'Update todos') + working(), 'planning'],
  ['other tool', 'Working', tool('wrench', 'Some MCP tool') + working(), 'working'],
  ['typing a message', 'Done', '<div data-timeline-row-kind="message">hi</div>', 'listening', { typed: true, focus: true }],
  ['typing while it works', 'Working', working(), 'listening', { typed: true, focus: true }],
  ['composer focused but empty', 'Done', '<div data-timeline-row-kind="message">hi</div>', 'idle', { focus: true }],
  ['text left in an unfocused composer', 'Done', '<div data-timeline-row-kind="message">hi</div>', 'idle', { typed: true }],
  ['compacting', 'Working', `<div data-timeline-row-kind="working"><div><span>Compacting… <span class="live-activity-focus"></span></span></div></div>`, 'compacting'],
  ['delegating', 'Working', subagent('auth-tests', 'Running') + subagent('perf-probe', 'Completed') + working('Working for 20s'), 'delegating'],
  ['delegating (queued)', 'Working', subagent('docs-sweep', 'Queued') + working(), 'delegating'],
  ['delegating (agent tool)', 'Working', tool('bot', 'Agent: explore') + working(), 'delegating'],
  ['subagents finished', 'Working', subagent('perf-probe', 'Completed') + working(), 'working'],
  ['approval', 'Approval', '<div data-v2-item-type="approval_request">Allow edit to claws.ts?</div>', 'waiting'],
  ['user input', 'Input', '<button data-pending-user-input-toggle>Answer question</button>', 'waiting'],
  ['waiting (sidebar only)', 'Waiting', '', 'waiting'],
  ['failed', 'Failed', '<div>Error: exit code 1</div>', 'error'],
  ['rate limited', 'Limited', '', 'error'],
];

// [sidebar status, expected sprite]
export const SIDEBAR = [
  ['Working', 'working'], ['Goal', 'working'], ['Setting up', 'working'],
  ['Approval', 'waiting'], ['Input', 'waiting'], ['Waiting', 'waiting'], ['Request', 'waiting'],
  ['Failed', 'error'], ['Limited', 'error'], ['Done', 'done'], ['Woke', 'sleeping'], ['Idle', null],
];

export const STATE_IDS = ['idle', 'thinking', 'working', 'reading', 'delegating', 'subagent',
  'waiting', 'error', 'done', 'sleeping', 'compacting', 'terminal', 'editing', 'browsing', 'planning', 'listening'];

const themeCss = () => JSON.parse(fs.readFileSync(path.join(ROOT, 't3-clawd-crab.json'), 'utf8')).css;
const loader = () => fs.readFileSync(path.join(HERE, 't3', 'loader.js'), 'utf8');

const BASE_STYLE = `body{margin:0;background:#191919;color:#eee;font:12px monospace;display:flex;gap:8px;padding:8px}
[data-slot=sidebar]{width:150px}ul{list-style:none;margin:0;padding:0}
button[data-sidebar-row]{display:block;width:100%;text-align:left;padding:6px;margin:2px 0;background:#222;color:#ddd;border:0}
main{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;height:150px}
form{border:1px solid #444;border-radius:8px;padding:10px;margin-top:40px}`;

const sidebarRow = (title, status, current) =>
  `<li data-thread-item><button data-sidebar-row${current ? ' aria-current="page"' : ''} aria-label="${title}, ${status}, app">${title}</button></li>`;

export function appBody(status, rows, extraSidebar = [], { typed = false } = {}) {
  const editor = `<div class="composer-tiptap" contenteditable="true">${typed ? 'make the crab dance' : ''}</div>` +
    (typed ? '' : '<div class="pointer-events-none text-placeholder">Ask Clawd anything…</div>');
  return `<div data-slot="sidebar"><ul>${sidebarRow('Fix auth', status, true)}${extraSidebar.join('')}</ul></div>
<main data-workspace-area="conversation"><div class="messages-timeline-scroll">${rows}</div><form data-chat-composer-form><div data-slot="composer-host">${editor}</div></form></main>`;
}

function themeScript(css) {
  if (/<\/script/i.test(css)) throw new Error('theme css contains </script');
  return `<script type="text/plain" id="theme">${css}</script>`;
}

/** One page that swaps each case into the body and records which sprite shows where. */
export function buildTestPage() {
  // Headless browsers never give the page focus, so :focus cannot match there. Swap it for an
  // attribute the test sets; theme.test.mjs checks that the real rule uses :focus.
  const css = themeCss().replaceAll('.composer-tiptap:focus', '.composer-tiptap[data-test-focus]');
  const cases = JSON.stringify(CASES.map(([name, status, rows, , o = {}]) => ({ name, focus: !!o.focus, body: appBody(status, rows, [], o) })));
  const sidebar = JSON.stringify(SIDEBAR.map(([status], i) => sidebarRow(`Thread ${i}`, status, false)));
  return `<!doctype html><html class="dark"><head><meta charset="utf-8"><style>${BASE_STYLE}</style>${themeScript(css)}</head>
<body><script>${loader()}</script><script>
const IDS = ${JSON.stringify(STATE_IDS)}, CASES = ${cases}, SIDEBAR = ${sidebar};
const probe = document.createElement('i');
document.documentElement.append(probe);
const sprite = {}, value = {};
for (const id of IDS) {
  probe.style.backgroundImage = 'var(--clawd-' + id + ')';
  sprite[getComputedStyle(probe).backgroundImage] = id;
  value[getComputedStyle(document.documentElement).getPropertyValue('--clawd-' + id).trim()] = id;
}
const bg = (el, pseudo) => { const b = getComputedStyle(el, pseudo).backgroundImage; return b === 'none' ? null : (sprite[b] ?? 'unknown'); };
const out = { stripped: window.__stripped, rules: document.adoptedStyleSheets[0].cssRules.length, spritesFound: Object.keys(sprite).length, cases: {} };
for (const c of CASES) {
  document.body.innerHTML = c.body;
  if (c.focus) document.querySelector('.composer-tiptap').setAttribute('data-test-focus', '');
  const form = document.querySelector('[data-chat-composer-form]');
  const before = getComputedStyle(form, '::before');
  out.cases[c.name] = {
    cn: value[getComputedStyle(form).getPropertyValue('--cn').trim()] ?? 'unknown',
    mascot: bg(form, '::before'),
    mascotAnimation: before.animationName,
    mascotSize: before.width + '×' + before.height,
    workingRow: [...document.querySelectorAll('[data-timeline-row-kind=working]')].map((r) => bg(r, '::before')),
    walker: bg(form, '::after'),
    subagents: [...document.querySelectorAll('[data-v2-item-type=subagent]')].map((r) => [r.getAttribute('aria-description'), bg(r, '::before')]),
  };
}
document.body.innerHTML = appBody('Idle', '', SIDEBAR);
out.sidebar = [...document.querySelectorAll('[data-sidebar-row]:not([aria-current])')].map((r) => bg(r, '::after'));
document.body.innerHTML = '<pre id="results"></pre>';
document.getElementById('results').textContent = JSON.stringify(out);
function appBody(status, rows, extra = []) { return ${JSON.stringify(appBody('%STATUS%', '%ROWS%'))}.replace('%STATUS%', status).replace('%ROWS%', rows).replace('</ul>', extra.join('') + '</ul>'); }
</script></body></html>`;
}

/** A page for people: every case side by side, each in its own frame. */
export function buildPreviewPage() {
  const css = themeCss();
  const extra = SIDEBAR.slice(0, 4).map(([status], i) => sidebarRow(['Molt shell', 'Pinch test', 'Sand docs', 'Tide pool'][i], status, false));
  const frame = (status, rows, o) => `<!doctype html><html class="dark"><head><meta charset="utf-8"><style>${BASE_STYLE}</style>${themeScript(css)}</head><body>${appBody(status, rows, extra, o)}<script>${o?.focus ? "addEventListener('load',()=>document.querySelector('.composer-tiptap').focus())" : ''}</script><script>${loader()}</script></body></html>`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Clawd Crab mock preview</title></head>
<body style="margin:0;background:#111;color:#aaa;font:12px monospace;display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:6px;padding:6px">
${CASES.map(([name, status, rows, , o]) => `<div><div>${name}</div><iframe style="width:100%;height:230px;border:1px solid #333" srcdoc="${esc(frame(status, rows, o))}"></iframe></div>`).join('\n')}
</body></html>`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.join(ROOT, 'mock-preview.html');
  fs.writeFileSync(out, buildPreviewPage());
  console.log('wrote', out);
}
