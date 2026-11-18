// Clawd crab state animations — generates minimal animated SVGs, a theme CSS snippet and a gallery.
// Run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Always build relative to this file, whatever directory it is run from.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.resolve('clawd');
fs.mkdirSync(OUT, { recursive: true });

const C = {
  fur: '#D97757', err: '#E5644E', warn: '#E0A458', eye: '#111',
  ink: '#eee', grey: '#888', key: '#333', keyTop: '#666', blue: '#6af', ok: '#7FB77E',
};
// canvas: 36x26, crab (24x15) at origin; viewBox offset does the centering
const VIEWBOX = '-6 -9 36 26';

// ---------- pixel helpers (everything becomes path data) ----------
const R = (x, y, w, h) => `M${x} ${y}h${w}v${h}h-${w}z`;
function B(rows, x, y) {
  let d = '';
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length;) {
      if (row[i] === '#') { let k = i; while (row[k] === '#') k++; d += R(x + i, y + j, k - i, 1); i = k; }
      else i++;
    }
  });
  return d;
}
const P = (d, { f, c, s } = {}) =>
  `<path${c ? ` class='${c}'` : ''}${f ? ` fill='${f}'` : ''}${s ? ` style='${s}'` : ''} d='${d}'/>`;
const dl = (s) => `animation-delay:${s}s`;

const G = {
  dot:   ['.....', '.....', '..#..'],
  plus:  ['.....', '..#..', '.###.', '..#..'],
  xstar: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  star:  ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  q:     ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  bang:  ['##', '##', '##', '##', '..', '##'],
  z:     ['####', '..#.', '.#..', '####'],
  zs:    ['###', '.#.', '###'],
  spark: ['..#..', '..#..', '##.##', '..#..', '..#..'],
  x:     ['#.#', '.#.', '#.#'],
  happy: ['.#.', '#.#'],
  ring:  ['.###.', '#...#', '#...#', '#...#', '.###.'],
  lb:    ['.##', '.#.', '#..', '.#.', '.##'],
  rb:    ['##.', '.#.', '..#', '.#.', '##.'],
  sl:    ['..#', '..#', '.#.', '#..', '#..'],
  drop:  ['.#.', '###', '###', '.#.'],
  gt:    ['#..', '.#.', '#..'],
  check: ['..#', '#.#', '.#.'],
  globe: ['.###.', '#.#.#', '#####', '#.#.#', '.###.'],
  globe2:['.###.', '##.##', '#####', '##.##', '.###.'],
};

// ---------- the crab ----------
// classes: c=crab u=upper(body+arms+eyes) f=fur l/r=arms e=eyes
function crab({ eyes = 'open', legs = 'normal', armY = 6, upper = '', front = '', back = '' } = {}) {
  const lh = legs === 'tucked' ? 2 : 3;
  const E = {
    open:   R(6, 3, 1, 3) + R(17, 3, 1, 3),
    up:     R(6, 2, 1, 3) + R(17, 2, 1, 3),
    down:   R(6, 4, 1, 3) + R(17, 4, 1, 3),
    closed: R(5, 5, 3, 1) + R(16, 5, 3, 1),
    x:      B(G.x, 5, 3) + B(G.x, 16, 3),
    happy:  B(G.happy, 5, 3) + B(G.happy, 16, 3),
  }[eyes];
  return `<g class='c'>${back}${P([4, 7, 15, 18].map((x) => R(x, 12, 2, lh)).join(''), { c: 'f' })}<g class='u'>` +
    `${P(R(0, armY, 3, 3), { c: 'f l' })}${P(R(21, armY, 3, 3), { c: 'f r' })}${P(R(3, 0, 18, 12), { c: 'f' })}` +
    `${P(E, { c: 'e', f: C.eye })}${upper}</g>${front}</g>`;
}

// flipbook: each frame visible for 1/n of the cycle
function flip(list, dur, x, y, f) {
  const n = list.length;
  return {
    svg: list.map((g, k) => P(B(g, x, y), { c: 's', f, s: k ? dl(+(k * dur / n).toFixed(2)) : '' })).join(''),
    css: `.s{opacity:0;animation:S ${dur}s steps(1) infinite}@keyframes S{0%{opacity:1}${+(100 / n).toFixed(2)}%{opacity:0}100%{opacity:0}}`,
  };
}

// shared CSS pieces
const ty = (n) => `transform:translateY(${n}px)`;
const tx = (n) => `transform:translateX(${n}px)`;
const bob = (d, sel = '.u') => `${sel}{animation:b ${d}s steps(1) infinite}@keyframes b{50%{${ty(1)}}}`;
const blink = (d, at) => `.e{transform-origin:50% 50%;animation:k ${d}s steps(1) infinite}@keyframes k{${at}%{transform:scaleY(.34)}${at + 4}%{transform:none}}`;

// ---------- states ----------
const states = [];
const add = (id, title, blurb, inner, css, vb = VIEWBOX) => states.push({ id, title, blurb, inner, css, vb });

add('idle', 'Idle', 'Ready for a prompt. Breathes, blinks.',
  crab(), bob(2.4) + blink(4.2, 88));

{
  const sp = flip([G.dot, G.plus, G.xstar, G.star, G.xstar, G.plus], 0.84, 10, -8, C.fur);
  const dots = P(R(14, -2, 1, 1), { c: 't', f: C.ink }) + P(R(13, -4, 1, 1), { c: 't', f: C.ink, s: dl(0.3) });
  add('thinking', 'Thinking', 'Spinner glyph above the shell; eyes up, looking around.',
    crab({ eyes: 'up', back: sp.svg + dots }),
    sp.css + bob(1.8) +
    `.e{animation:L 3.2s steps(1) infinite}@keyframes L{30%{${tx(-1)}}60%{${tx(1)}}85%{transform:none}}` +
    `.t{opacity:0;animation:T 1.2s steps(1) infinite}@keyframes T{0%{opacity:1}50%{opacity:0}}`);
}

{
  let keys = '';
  for (let x = 3; x < 21; x += 2) keys += R(x, 13, 1, 1);
  const kb = P(R(2, 12, 20, 3), { f: C.key }) + P(R(2, 14, 20, 1), { f: '#222' }) + P(keys, { f: C.keyTop }) +
    [[5, 0], [11, 0.27], [15, 0.11], [9, 0.43], [19, 0.6], [13, 0.71]]
      .map(([x, d]) => P(R(x, 13, 1, 1), { c: 'h', f: C.fur, s: d ? dl(d) : '' })).join('');
  const code = [[G.lb, 1, C.fur, 0], [G.sl, 10, C.ink, 0.6], [G.rb, 19, C.warn, 1.2]]
    .map(([g, x, f, d]) => P(B(g, x, -5), { c: 'o', f, s: d ? dl(d) : '' })).join('');
  add('working', 'Working', 'Hammering the keyboard; code bits fly out.',
    crab({ eyes: 'down', armY: 9, front: kb, back: code }),
    bob(0.64) +
    `.l,.r{animation:p .3s steps(1) infinite}.r{animation-delay:-.15s}@keyframes p{50%{${ty(-1)}}}` +
    `.h{opacity:0;animation:H .8s steps(1) infinite}@keyframes H{0%{opacity:1}15%{opacity:0}}` +
    `.o{opacity:0;animation:O 1.8s steps(6) infinite}@keyframes O{0%,80%{opacity:1}100%{opacity:0;${ty(-4)}}}`);
}

{
  const mag = `<g class='m'>${P(R(5, 2, 3, 3), { f: C.blue, s: 'opacity:.35' })}${P(B(G.ring, 4, 1) + R(9, 6, 1, 1), { f: C.ink })}${P(R(10, 7, 1, 1) + R(11, 8, 1, 1), { f: '#3a3a3a' })}</g>`;
  add('reading', 'Reading / searching', 'Magnifier sweeps the files (Read, Grep, Glob).',
    crab({ upper: mag }),
    `.m{animation:M 3s steps(6) infinite}@keyframes M{50%{${tx(12)}}}` +
    `.e{animation:F 3s steps(2) infinite}@keyframes F{0%,100%{${tx(-1)}}50%{${tx(1)}}}.r{${ty(1)}}`);
}

// DELEGATING (orchestrator deploys subagents): mini crabs get flung out of the shell
const MINI = ['.########.', '.########.', '##########', '.########.'];
const MINI_LEGS = ['.#.#..#.#.', '#.#....#.#'];
const mini = (x, y, legs = MINI_LEGS[0]) => P(B(MINI, x, y) + B([legs], x, y + 4), { c: 'f' }) + P(R(x + 2, y + 1, 1, 1) + R(x + 7, y + 1, 1, 1), { f: C.eye });
{
  const minis = [1, 2, 3, 4].map((i) => `<g class='m m${i}'>${mini(7, -5)}</g>`).join('');
  const go = (s) => `@keyframes ${s > 0 ? 'G' : 'H'}{0%{transform:translate(0,5px)}5%{transform:none}` +
    `15%{transform:translate(${-4 * s}px,-4px)}25%{transform:translate(${-9 * s}px,-1px)}32%{transform:translate(${-12 * s}px,7px)}` +
    `37%{transform:translate(${-13 * s}px,15px)}62%,100%{transform:translate(${-26 * s}px,15px)}}`;
  add('delegating', 'Deploying subagents', 'Orchestrator mode: flings mini crabs out to do the work.',
    minis + P(B(G.plus, 10, -9), { c: 'k', f: C.warn }) + crab({ eyes: 'up' }),
    bob(0.8) +
    `.m{transform:translate(0,5px);animation:G 3.2s steps(3) infinite}.m2,.m4{animation-name:H}.m2{animation-delay:.8s}.m3{animation-delay:1.6s}.m4{animation-delay:2.4s}` +
    go(1) + go(-1) +
    `.l,.r{animation:A 1.6s steps(1) infinite}.r{animation-delay:.8s}@keyframes A{0%{${ty(-3)}}25%{transform:none}}` +
    `.k{opacity:0;animation:K .8s steps(1) infinite}@keyframes K{0%{opacity:1}20%{opacity:0}}`);
}

// SUBAGENT (tiny, for each running subagent row): one mini crab scuttling in place
{
  const legs = MINI_LEGS.map((l, k) => `<g class='s'${k ? ` style='${dl(0.15)}'` : ''}>${mini(0, 0, l)}</g>`).join('');
  add('subagent', 'Subagent', 'Mini crab for each running subagent row.',
    legs,
    `.s{opacity:0;animation:S .3s steps(1) infinite}@keyframes S{0%{opacity:1}50%{opacity:0}}`, '-1 -1 12 7');
}

add('waiting', 'Waiting on you', 'Needs approval or an answer. Waves, holds up a "?".',
  crab({ back: P(B(G.q, 10, -8), { c: 'q', f: C.warn }) }),
  `.q{animation:b 1s steps(1) infinite}@keyframes b{50%{${ty(-1)}}}` +
  `.r{animation:w 1.6s steps(1) infinite}@keyframes w{10%,30%{${ty(-3)}}20%,40%{${ty(-4)}}50%{transform:none}}` +
  `.u{animation:j 1.6s steps(1) infinite}@keyframes j{60%{${ty(1)}}70%{transform:none}}` + blink(3.4, 85));

{
  const smoke = [[5, 0], [11, 0.5], [16, 1]].map(([x, d]) => P(R(x, -2, 2, 2), { c: 'k', f: C.grey, s: d ? dl(d) : '' })).join('');
  add('error', 'Error', 'Tool failed / exit code 1. Flashes red, X eyes, sweats.',
    crab({ eyes: 'x', back: smoke + P(B(G.bang, -4, -6), { c: 'x', f: C.err }), upper: P(B(G.drop, 22, -1), { c: 'd', f: C.blue }) }),
    `.f{animation:R 1.6s steps(1) infinite}@keyframes R{0%,24%{fill:${C.err}}12%,36%{fill:${C.fur}}}` +
    `.c{animation:s 1.6s steps(1) infinite}@keyframes s{0%,12%{${tx(-1)}}6%,18%{${tx(1)}}24%{transform:none}}` +
    `.d{animation:D 1.6s steps(5) infinite}@keyframes D{0%{opacity:0}30%{opacity:1;transform:none}100%{opacity:0;${ty(5)}}}` +
    `.k{opacity:0;animation:K 1.5s steps(5) infinite}@keyframes K{0%{opacity:.9}100%{opacity:0;${ty(-6)}}}` +
    `.x{animation:X .8s steps(1) infinite}@keyframes X{50%{opacity:0}}`);
}

{
  const sp = [[-5, -4, C.warn, 0], [25, -2, C.ink, 0.4], [-4, 7, C.ink, 0.8], [26, 8, C.warn, 1.2]]
    .map(([x, y, f, d]) => P(B(G.spark, x, y), { c: 'w', f, s: d ? dl(d) : '' })).join('');
  add('done', 'Done', 'Turn finished. Happy hop, arms up, sparkles.',
    sp + crab({ eyes: 'happy' }),
    `.c{animation:J 1.6s steps(1) infinite}@keyframes J{10%,62%{${ty(1)}}18%{${ty(-2)}}26%{${ty(-4)}}40%{${ty(-5)}}50%{${ty(-3)}}56%,70%{transform:none}}` +
    `.l,.r{animation:A 1.6s steps(1) infinite}@keyframes A{18%{${ty(-3)}}50%{${ty(-1)}}56%{transform:none}}` +
    `.w{opacity:0;animation:W 1.6s steps(1) infinite}@keyframes W{0%{opacity:1}20%{opacity:.4}30%{opacity:0}}`);
}

{
  const zz = [[G.z, 0], [G.zs, 1], [G.z, 2]].map(([g, d]) => P(B(g, 21, -2), { c: 'z', f: C.ink, s: d ? dl(d) : '' })).join('');
  add('sleeping', 'Sleeping', 'Nothing going on for a while. Tucked legs, Zzz.',
    `<g transform='translate(0 1)'>${crab({ eyes: 'closed', legs: 'tucked', back: zz })}</g>`,
    bob(3.2) + `.z{opacity:0;animation:Z 3s steps(6) infinite}@keyframes Z{15%{opacity:1}100%{opacity:0;transform:translate(4px,-6px)}}`);
}

{
  const walls = P(R(-5, -1, 2, 16), { c: 'a', f: C.grey }) + P(R(27, -1, 2, 16), { c: 'a b', f: C.grey });
  const lines = P(R(4, -7, 16, 1) + R(6, -5, 12, 1) + R(4, -3, 14, 1), { c: 'n', f: C.ink });
  const kf = (name, t) => `@keyframes ${name}{0%,15%,85%,100%{transform:none}40%,60%{transform:${t}}}`;
  add('compacting', 'Compacting', 'Squeezing the conversation to free up context.',
    walls + lines + `<g class='q'>${crab({ eyes: 'closed' })}</g>`,
    `.a,.q,.n{animation:V 2.4s steps(3) infinite}.b{animation-name:Y}.q{transform-origin:50% 100%;animation-name:Q}` +
    `.n{transform-origin:50% 100%;animation-name:N}` + kf('V', tx(6).slice(10)) + kf('Y', tx(-6).slice(10)) +
    kf('Q', 'scaleX(.75)') + `@keyframes N{40%,60%{transform:scaleY(.2)}85%{opacity:0}}`);
}

// ---------- v1 beta 2: more crabs ----------
// One-shot reveal: hidden, then shown from `on`% until `off`% of the loop.
const reveal = (name, on, off = 92) => `@keyframes ${name}{0%{opacity:0}${on}%{opacity:1}${off}%{opacity:0}}`;

// TERMINAL (Bash tool): types a command into a tiny shell, output appears
{
  const chars = [0, 1, 2, 3, 4].map((i) => P(R(6 + 2 * i, -7, 1, 3), { c: `t t${i}`, f: C.ink })).join('');
  const term = P(R(1, -9, 22, 8), { f: '#555' }) + P(R(2, -8, 20, 6), { f: '#111' }) +
    P(B(G.gt, 3, -7), { f: C.ok }) + chars +
    P(R(3, -3, 14, 1), { c: 't t5', f: C.grey }) + P(R(17, -5, 2, 1), { c: 'k', f: C.ink });
  add('terminal', 'Running a command', 'Bash tool: taps out a command, output scrolls in.',
    crab({ eyes: 'up', back: term }),
    bob(1.3) +
    `.l,.r{animation:p .4s steps(1) infinite}.r{animation-delay:-.2s}@keyframes p{50%{${ty(-1)}}}` +
    `.t{animation:T0 2.6s steps(1) infinite}` + [1, 2, 3, 4, 5].map((i) => `.t${i}{animation-name:T${i}}`).join('') +
    [8, 18, 28, 38, 48, 62].map((on, i) => reveal(`T${i}`, on)).join('') +
    `.k{animation:K .6s steps(1) infinite}@keyframes K{50%{opacity:0}}`);
}

// EDITING (Edit/Write tools): snips the old line out, a new green one appears
{
  const old = `<g class='o'>${P(R(1, -6, 3, 1) + R(5, -6, 15, 1), { f: C.err })}</g>`;
  const neu = `<g class='n'>${P(R(1, -3, 3, 1) + R(2, -4, 1, 3) + R(5, -3, 12, 1), { f: C.ok })}</g>`;
  add('editing', 'Snipping code', 'Edit tool: snips out the old line, a new one grows in.',
    crab({ eyes: 'up', back: old + neu + P(B(G.x, 21, -8), { c: 'x', f: C.warn }) }),
    bob(1.2) +
    `.o{animation:O 2.4s steps(1) infinite}@keyframes O{40%{${ty(1)}}48%{opacity:.6;${ty(3)}}56%,100%{opacity:0}}` +
    `.n{animation:N 2.4s steps(1) infinite}${reveal('N', 60, 100)}` +
    `.r{animation:A 2.4s steps(1) infinite}@keyframes A{16%{${ty(-9)}}26%{${ty(-8)}}34%{${ty(-9)}}44%{transform:none}}` +
    `.x{opacity:0;animation:X 2.4s steps(1) infinite}${reveal('X', 34, 42)}`);
}

// BROWSING (web search / fetch): surfing the web on a board, globe spinning
{
  let wave = '';
  for (let x = -14; x < 34; x += 6) wave += R(x, 16, 4, 1);
  const globe = flip([G.globe, G.globe2], 0.8, 24, -8, C.blue);
  const spray = [[-6, 12, 0], [-5, 10, 0.3]].map(([x, y, d]) => P(R(x, y, 1, 1), { c: 'k', f: C.ink, s: d ? dl(d) : '' })).join('');
  add('browsing', 'Surfing the web', 'Web search and fetch: rides the wave, globe spinning.',
    globe.svg + P(wave, { c: 'v', f: C.blue }) + spray +
    `<g class='q'>${crab({ eyes: 'happy', armY: 3 })}${P(R(-3, 15, 30, 1) + R(-4, 14, 1, 1) + R(27, 14, 1, 1), { f: C.warn })}</g>`,
    globe.css +
    `.v{animation:V .9s steps(3) infinite}@keyframes V{100%{${tx(-6)}}}` +
    `.q{animation:Q 1.6s steps(1) infinite}@keyframes Q{25%{${ty(-1)}}50%{transform:none}75%{${ty(1)}}}` +
    `.k{opacity:0;animation:K .9s steps(3) infinite}@keyframes K{0%{opacity:1}100%{opacity:0;transform:translate(-2px,-3px)}}`);
}

// PLANNING (todo list): ticks off a checklist on a clipboard
{
  let paper = P(R(7, 3, 10, 9), { f: C.ink }) + P(R(10, 2, 4, 2), { f: C.grey });
  [4, 7, 10].forEach((y, i) => {
    paper += P(R(8, y, 2, 2) + R(11, y, 5, 1), { f: '#999' }) + P(B(G.check, 8, y - 1), { c: `t t${i}`, f: C.ok });
  });
  add('planning', 'Making a plan', 'Todo list: ticks items off a clipboard one by one.',
    crab({ eyes: 'down', armY: 8, front: paper }),
    bob(2) + blink(3.6, 70) +
    `.t{animation:T0 3s steps(1) infinite}.t1{animation-name:T1}.t2{animation-name:T2}` +
    [15, 40, 65].map((on, i) => reveal(`T${i}`, on)).join(''));
}

// LISTENING (you are typing): looks down at your message, "…" bubble
{
  const bubble = P(R(14, -9, 9, 1) + R(13, -8, 11, 3) + R(14, -5, 9, 1) + R(14, -4, 2, 1) + R(14, -3, 1, 1), { f: C.ink });
  const dots = [15, 18, 21].map((x, i) => P(R(x, -7, 1, 1), { c: 'd', f: C.eye, s: i ? dl(i * 0.2) : '' })).join('');
  add('listening', 'Listening', 'You are typing: looks down at your message, nodding along.',
    crab({ eyes: 'down', back: bubble + dots }),
    bob(1.6) + blink(3, 80) +
    `.d{animation:D 1.2s steps(1) infinite}@keyframes D{0%{${ty(-1)}}25%{transform:none}}`);
}

// ---------- emit ----------
const svgFor = (s) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${s.vb}' shape-rendering='crispEdges'>` +
  `<style>*{transform-box:fill-box}.f{fill:${C.fur}}${s.css}@media(prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}</style>${s.inner}</svg>`;
// Only # and % need escaping inside url("...") since the SVG uses single quotes throughout.
const dataUri = (svg) => `data:image/svg+xml,${svg.replaceAll('%', '%25').replaceAll('#', '%23')}`;

let css = '/* Clawd state sprites — usage: background:var(--clawd-working) center/contain no-repeat */\n:root{\n';
const sizes = [];
for (const s of states) {
  s.svg = svgFor(s);
  s.uri = dataUri(s.svg);
  fs.writeFileSync(path.join(OUT, `clawd-${s.id}.svg`), s.svg);
  css += `--clawd-${s.id}:url("${s.uri}");\n`;
  sizes.push([s.id, s.svg.length, s.uri.length]);
}
css += '}\n';
fs.writeFileSync(path.join(OUT, 'clawd-theme.css'), css);

const tmpl = fs.readFileSync(path.resolve('gallery.template.html'), 'utf8');
const data = states.map(({ id, title, blurb, uri }) => ({ id, title, blurb, uri }));
const { version } = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
fs.writeFileSync(path.resolve('clawd-gallery.html'), tmpl.replace('/*STATES*/[]', JSON.stringify(data)).replaceAll('%VERSION%', version));

// ---------- mod CSS + merged theme ----------
const minify = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{};])\s*/g, '$1').replace(/;}/g, '}');
const vars = ':root{' + states.map((s) => `--clawd-${s.id}:url("${s.uri}")`).join(';') + '}';
const mod = fs.readFileSync(path.resolve('mod.template.css'), 'utf8');
fs.writeFileSync(path.join(OUT, 'clawd-mod.css'), `${vars}\n\n${mod}`);

const base = JSON.parse(fs.readFileSync(path.resolve('vendor/t3-clawd.json'), 'utf8'));
// T3 Code drops any declaration value with a backslash, so the original "\2318N"
// (the ⌘N hint on New chat) never shows. Write the character itself instead.
base.css = base.css.replaceAll('"\\2318N"', '"⌘N"');
const merged = { ...base, name: 'Clawd Crab', css: `${base.css}${vars}${minify(mod)}` };
fs.writeFileSync(path.resolve('t3-clawd-crab.json'), JSON.stringify(merged, null, 2));
console.log(`theme css: ${base.css.length} (t3-clawd) + ${merged.css.length - base.css.length} (crab) = ${merged.css.length} / 100000`);

console.table(Object.fromEntries(sizes.map(([id, svg, uri]) => [id, { svg, uri }])));
console.log('total svg bytes:', sizes.reduce((a, s) => a + s[1], 0), '| clawd-theme.css:', css.length);
