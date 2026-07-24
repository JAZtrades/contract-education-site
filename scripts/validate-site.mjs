import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "index.html",
  "contract.html",
  "schedule.html",
  "manage-booking.html",
  "pay.html",
  "complete.html",
  "thank-you.html",
];
const canonicalUrls = new Map(
  pages.map((page) => [
    page,
    `https://jaztrades.github.io/contract-education-site/${page === "index.html" ? "" : page}`,
  ]),
);

function attributes(tag) {
  const parsed = new Map();
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    parsed.set(match[1].toLowerCase(), match[3]);
  }
  return parsed;
}

function localTarget(page, rawReference) {
  if (
    !rawReference
    || rawReference.startsWith("#")
    || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(rawReference)
  ) {
    return null;
  }
  const [withoutFragment, fragment = ""] = rawReference.split("#", 2);
  const path = withoutFragment.split("?", 1)[0];
  return {
    path: resolve(root, dirname(page), path || page),
    fragment: decodeURIComponent(fragment),
  };
}

function hexRgb(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  assert.ok(match, `expected a six-digit hex color, received ${value}`);
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255);
}

function relativeLuminance(value) {
  const [red, green, blue] = hexRgb(value).map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function assertPage(page) {
  const path = resolve(root, page);
  const html = readFileSync(path, "utf8");
  const ids = [...html.matchAll(/\sid\s*=\s*(["'])(.*?)\1/gs)].map((match) => match[2]);
  const idSet = new Set(ids);

  assert.equal((html.match(/<main\b/gi) ?? []).length, 1, `${page}: expected one main`);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${page}: expected one h1`);
  assert.equal(idSet.size, ids.length, `${page}: duplicate id`);
  assert.match(html, /<meta\s+name=["']description["'][^>]+content=["'][^"']+["']/i, `${page}: missing description`);

  const canonicalTags = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
  assert.equal(canonicalTags.length, 1, `${page}: expected one canonical link`);
  assert.equal(
    attributes(canonicalTags[0][0]).get("href"),
    canonicalUrls.get(page),
    `${page}: incorrect canonical URL`,
  );

  const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  for (let index = 1; index < headingLevels.length; index += 1) {
    assert.ok(
      headingLevels[index] <= headingLevels[index - 1] + 1,
      `${page}: heading level skips from h${headingLevels[index - 1]} to h${headingLevels[index]}`,
    );
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    assert.ok(attrs.has("alt"), `${page}: image is missing alt text`);
  }

  const labels = new Set(
    [...html.matchAll(/<label\b[^>]*>/gi)]
      .map((match) => attributes(match[0]).get("for"))
      .filter(Boolean),
  );
  for (const match of html.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.get("type") ?? "").toLowerCase() === "hidden") continue;
    const id = attrs.get("id");
    assert.ok(
      attrs.has("aria-label") || attrs.has("aria-labelledby") || (id && labels.has(id)),
      `${page}: form control ${id ?? "without id"} is missing an accessible label`,
    );
  }

  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.get("target") ?? "").toLowerCase() === "_blank") {
      assert.match(attrs.get("rel") ?? "", /(?:^|\s)noopener(?:\s|$)/i, `${page}: new-tab link lacks noopener`);
    }
  }

  for (const match of html.matchAll(/<(?:a|img|link|script)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const reference = attrs.get("href") ?? attrs.get("src");
    const target = localTarget(page, reference);
    if (!target) continue;
    assert.ok(existsSync(target.path), `${page}: missing local target ${reference}`);
    if (target.fragment && target.path.endsWith(".html")) {
      const targetHtml = readFileSync(target.path, "utf8");
      const targetIds = new Set(
        [...targetHtml.matchAll(/\sid\s*=\s*(["'])(.*?)\1/gs)].map((idMatch) => idMatch[2]),
      );
      assert.ok(targetIds.has(target.fragment), `${page}: missing fragment ${reference}`);
    }
  }

  assert.doesNotMatch(html, /web3forms|http:\/\//i, `${page}: obsolete or insecure integration reference`);
}

for (const page of pages) assertPage(page);

const sharedStyles = readFileSync(resolve(root, "styles.css"), "utf8");
const polishStyles = readFileSync(resolve(root, "carlsbad-polish.css"), "utf8");
const bookingPage = readFileSync(resolve(root, "manage-booking.html"), "utf8");

const controlBorder = sharedStyles.match(/--control-border:\s*(#[0-9a-f]{6})\s*;/i)?.[1];
assert.ok(controlBorder, "styles.css: missing control border color");
assert.ok(
  contrastRatio(controlBorder, "#ffffff") >= 3,
  "styles.css: control border must have at least 3:1 contrast against white",
);
assert.ok(
  (sharedStyles.match(/border:\s*1px solid var\(--control-border\)/g) ?? []).length >= 2,
  "styles.css: editable and fallback form controls must use the accessible border",
);

const formMessageBase = sharedStyles.match(/\.form-message\s*\{([^}]*)\}/s)?.[1] ?? "";
assert.doesNotMatch(
  formMessageBase,
  /display:\s*none/i,
  "styles.css: the empty status live region must remain in the accessibility tree",
);
assert.match(sharedStyles, /\.form-message:empty\s*\{[^}]*position:\s*absolute/s);
assert.match(sharedStyles, /\.form-message\.success,\s*\.form-message\.error\s*\{[^}]*position:\s*static/s);

assert.match(
  polishStyles,
  /@media\s*\(max-width:\s*640px\)[\s\S]*?\.nav-links a\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/,
  "carlsbad-polish.css: mobile navigation labels must wrap safely",
);
assert.match(
  polishStyles,
  /@media\s*\(max-width:\s*640px\)[\s\S]*?\.page-hero h1\s*\{[^}]*font-size:\s*clamp\(2rem,\s*11vw,\s*2\.5rem\);/,
  "carlsbad-polish.css: long page headings must fit a 320px viewport",
);
assert.match(
  polishStyles,
  /@media\s*\(max-width:\s*360px\)[\s\S]*?\.nav-links\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
  "carlsbad-polish.css: the narrowest navigation must use readable two-column labels",
);
assert.match(
  polishStyles,
  /@media\s*\(max-width:\s*360px\)[\s\S]*?\.nav-links \.nav-cta\s*\{[^}]*grid-column:\s*auto;/,
  "carlsbad-polish.css: the two-column navigation must keep its final row balanced",
);
assert.match(polishStyles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.match(polishStyles, /prefers-reduced-motion:[\s\S]*?scroll-behavior:\s*auto;/);
assert.match(polishStyles, /prefers-reduced-motion:[\s\S]*?\.btn:hover,[\s\S]*?transform:\s*none;/);

const requestTypeTag = [...bookingPage.matchAll(/<select\b[^>]*>/gi)]
  .find((match) => attributes(match[0]).get("id") === "request-type")?.[0];
assert.ok(requestTypeTag, "manage-booking.html: missing request type select");
assert.equal(attributes(requestTypeTag).get("aria-expanded"), "false");
assert.match(
  bookingPage,
  /requestType\.setAttribute\(['"]aria-expanded['"],\s*String\(isReschedule\)\)/,
  "manage-booking.html: request type must expose the controlled field state",
);

const publicCopy = pages.map((page) => readFileSync(resolve(root, page), "utf8")).join("\n");
assert.match(publicCopy, /Private Cryptocurrency Education Session/);
assert.match(publicCopy, /Complete Cryptocurrency Education Package/);
assert.match(publicCopy, /Custom Cryptocurrency Education Service/);
assert.match(publicCopy, /\$249/);
assert.match(publicCopy, /\$799/);
assert.match(publicCopy, /\$399\.50/);
assert.doesNotMatch(publicCopy, /\$499|custom amount|subscription payment/i);
assert.doesNotMatch(
  publicCopy,
  /(?:admin-payments|admin|calendar|dashboard|jaz-llc-test-site)\.html|portrait-loader\.js/i,
);

console.log(`Validated ${pages.length} public pages.`);
