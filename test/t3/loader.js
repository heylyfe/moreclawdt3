// Copied from T3 Code (pingdotgg/t3code): packages/shared/src/themeCss.ts + apps/web/src/themeCss.ts.
// MIT License, Copyright (c) 2026 T3 Tools Inc. Applies theme CSS the way the app does and records what it strips.
const FETCHES_BY_STRING = /image-set\(|\bsrc\(/i;
const URL_NOT_LOCAL = /url\((?![ \t\n\f\r]*["']?(?:data:|#))/i;
const URL_OR_STRING =
  /url\((?![ \t\n\f\r]*["'])[^)]*|url\([ \t\n\f\r]*("[^"\n\r\f]*"|'[^'\n\r\f]*')|"[^"\n\r\f]*"|'[^'\n\r\f]*'/gi;
function withoutStrings(code) {
  return code.replace(URL_OR_STRING, (token, urlString) => {
    if (urlString !== undefined) return /^["'](?:data:|#)/i.test(urlString) ? "" : "url(";
    return token.startsWith('"') || token.startsWith("'") ? "" : token;
  });
}
const fetchesOutsideStrings = (c) => FETCHES_BY_STRING.test(c) || URL_NOT_LOCAL.test(c);
const themeCssValueFetches = (v) => v.includes("\\") || fetchesOutsideStrings(withoutStrings(v));
const stripped = [];
function stripDeclarations(rule) {
  if (!("style" in rule) || !(rule.style instanceof CSSStyleDeclaration)) return false;
  for (let i = rule.style.length - 1; i >= 0; i--) {
    const p = rule.style.item(i);
    if (themeCssValueFetches(rule.style.getPropertyValue(p))) { stripped.push(p); rule.style.removeProperty(p); }
  }
  return true;
}
function stripFetches(parent) {
  for (let i = parent.cssRules.length - 1; i >= 0; i--) {
    const rule = parent.cssRules[i];
    const hasStyle = stripDeclarations(rule);
    if (rule instanceof CSSKeyframesRule) { for (const f of rule.cssRules) stripDeclarations(f); }
    else if ("cssRules" in rule && "deleteRule" in rule) stripFetches(rule);
    else if (!hasStyle && !(rule instanceof CSSLayerStatementRule)) { stripped.push("rule"); parent.deleteRule(i); }
  }
}
const sheet = new CSSStyleSheet();
sheet.replaceSync(document.getElementById("theme").textContent);
stripFetches(sheet);
document.adoptedStyleSheets = [sheet];
window.__stripped = stripped;
