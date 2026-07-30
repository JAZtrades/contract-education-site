import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const officialSiteUrl = "https://jazcryptoeducation.com/";
const pages = [
  "index.html",
  "contract.html",
  "schedule.html",
  "manage-booking.html",
  "pay.html",
  "complete.html",
  "thank-you.html",
  "404.html",
];

function attributes(tag) {
  const parsed = new Map();
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    parsed.set(match[1].toLowerCase(), match[3]);
  }
  return parsed;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function tagWithAttribute(html, name, attribute, value) {
  return tags(html, name).find((tag) => attributes(tag).get(attribute)?.toLowerCase() === value);
}

function assertRedirectPage(page) {
  const html = readFileSync(resolve(root, page), "utf8");

  assert.equal(tags(html, "main").length, 1, `${page}: expected one main landmark`);
  assert.equal(tags(html, "h1").length, 1, `${page}: expected one h1`);
  assert.equal(tags(html, "a").length, 1, `${page}: expected only the official-site fallback link`);
  assert.equal(tags(html, "script").length, 1, `${page}: expected one inline redirect script`);
  assert.match(html, /<meta\s+name=["']description["'][^>]+content=["'][^"']+["']/i, `${page}: missing description`);

  const canonicalTags = tags(html, "link")
    .filter((tag) => attributes(tag).get("rel")?.toLowerCase() === "canonical");
  assert.equal(canonicalTags.length, 1, `${page}: expected one canonical link`);
  assert.equal(attributes(canonicalTags[0]).get("href"), officialSiteUrl, `${page}: incorrect canonical URL`);

  const stylesheetTags = tags(html, "link")
    .filter((tag) => attributes(tag).get("rel")?.toLowerCase() === "stylesheet");
  assert.equal(stylesheetTags.length, 1, `${page}: expected only redirect.css`);
  assert.equal(attributes(stylesheetTags[0]).get("href"), "redirect.css", `${page}: incorrect stylesheet`);

  const robotsTag = tagWithAttribute(html, "meta", "name", "robots");
  assert.ok(robotsTag, `${page}: missing robots directive`);
  assert.equal(attributes(robotsTag).get("content"), "noindex,follow");

  const referrerTag = tagWithAttribute(html, "meta", "name", "referrer");
  assert.ok(referrerTag, `${page}: missing referrer policy`);
  assert.equal(attributes(referrerTag).get("content"), "no-referrer");

  const refreshTag = tagWithAttribute(html, "meta", "http-equiv", "refresh");
  assert.ok(refreshTag, `${page}: missing redirect fallback`);
  assert.equal(attributes(refreshTag).get("content"), `0; url=${officialSiteUrl}`);

  assert.match(
    html,
    /window\.location\.replace\(["']https:\/\/jazcryptoeducation\.com\/["']\)/,
    `${page}: redirect must replace the legacy history entry`,
  );

  const fallbackLink = tags(html, "a")[0];
  assert.equal(attributes(fallbackLink).get("href"), officialSiteUrl, `${page}: incorrect fallback destination`);
  assert.match(fallbackLink, /legacy-redirect__link/, `${page}: fallback link must retain accessible styling`);

  assert.doesNotMatch(html, /jaztrades\.github\.io|contract-education-site/i, `${page}: legacy host reference remains`);
  assert.doesNotMatch(
    html,
    /\b(?:index|contract|schedule|manage-booking|pay|complete|thank-you)\.html\b/i,
    `${page}: legacy internal page reference remains`,
  );
  assert.doesNotMatch(html, /<(?:form|img|nav|header|footer)\b/i, `${page}: retired site content remains`);
}

for (const page of pages) assertRedirectPage(page);

assert.equal(existsSync(resolve(root, "CNAME")), false, "legacy GitHub Pages repo must not claim the new domain");

const redirectStyles = readFileSync(resolve(root, "redirect.css"), "utf8");
assert.doesNotMatch(redirectStyles, /display:\s*none/i, "fallback must not rely on hiding retired content");
assert.match(redirectStyles, /\.legacy-redirect__link:focus-visible\s*\{/);

console.log(`Validated ${pages.length} redirect-only pages.`);
