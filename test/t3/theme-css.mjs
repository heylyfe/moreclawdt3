// Copied from T3 Code (pingdotgg/t3code), packages/shared/src/themeCss.ts and
// packages/contracts/src/server.ts, as of 2026-11-17. MIT License,
// Copyright (c) 2026 T3 Tools Inc. Types removed; logic unchanged.
// The tests use it to check the theme the same way T3 Code does.

export const THEME_CSS_MAX_LENGTH = 100_000;
export const THEME_NAME_MAX_LENGTH = 48;
export const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const COLOR_ROLE_KEY = /^[a-zA-Z][a-zA-Z0-9]{0,63}$/;

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

function fetchesOutsideStrings(code) {
  return FETCHES_BY_STRING.test(code) || URL_NOT_LOCAL.test(code);
}

/** Whether one declaration value can load a remote file. Clients drop those declarations. */
export function themeCssValueFetches(value) {
  return value.includes("\\") || fetchesOutsideStrings(withoutStrings(value));
}

/** A text check for early feedback. The client check is the guard. */
export function themeCssLoadsRemoteFiles(css) {
  const code = withoutStrings(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  return /@import/i.test(code) || fetchesOutsideStrings(code);
}
