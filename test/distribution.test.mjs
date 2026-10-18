import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

const ROOT = new URL("../", import.meta.url).pathname;
const BASE = "https://dylan2045-ad.netlify.app";
const SHOP = "https://dylan2045ad-store.myshopify.com";
const COLLECTION = `${SHOP}/collections/the-1-shop`;
const FIELD_KIT = `${SHOP}/products/the-ai-creator-field-kit`;
const PAYHIP_KIT = "https://payhip.com/b/V472q";

const canonicalPages = [
  ["index.html", `${BASE}/`],
  ["blue-stone-ranch-eternal-flame.html", `${BASE}/blue-stone-ranch-eternal-flame.html`],
  ["signal.html", `${BASE}/signal.html`],
  ["hub.html", `${BASE}/hub.html`],
  ["signal-issue-06.html", `${BASE}/signal-issue-06.html`],
  ["signal-issue-07.html", `${BASE}/signal-issue-07.html`],
  ["signal-issue-07-nippon.html", `${BASE}/signal-issue-07-nippon.html`],
];

// Pages where Dylan confirmed the LAUNCH5 launch offer stays (2026-10-17).
const promoPages = [
  "index.html",
  "hub.html",
  "signal.html",
  "thanks.html",
  "signal-issue-06.html",
  "signal-issue-07-nippon.html",
];

function readText(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function attr(tag, name) {
  return new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1] ?? "";
}

function metaValue(html, property) {
  const tag = tags(html, "meta").find((item) => attr(item, "property") === property);
  return tag ? attr(tag, "content") : "";
}

function anchorRecords(html) {
  return [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a\s*>/gi)].map((match) => {
    const opening = /^<a\b[^>]*>/i.exec(match[0])?.[0] ?? match[0];
    const inner = match[0].slice(opening.length).replace(/<[^>]*>/g, " ");
    return {
      tag: match[0],
      href: attr(opening, "href"),
      id: attr(opening, "id"),
      text: inner.replace(/\s+/g, " ").trim(),
    };
  });
}

function htmlFiles(dir = ROOT) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".git") return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

describe("Netlify distribution", () => {
  it("keeps the $1 catalog copy independent of a stale inventory count", () => {
    const home = readText("index.html");
    assert.doesNotMatch(home, /one of seven small tools/i);
    assert.match(home, /pick a small tool for one specific job/i);
  });

  it("continues the free to $1 to $17 Shopify ladder after signup", () => {
    const links = anchorRecords(readText("newsletter/thanks/index.html"));
    const dollarIndex = links.findIndex((link) => link.href === COLLECTION);
    const kitIndex = links.findIndex((link) => link.href === FIELD_KIT);
    assert.ok(dollarIndex >= 0, "signup confirmation needs a $1 Shopify step");
    assert.ok(kitIndex > dollarIndex, "$1 Shopify step precedes the $17 kit");
    assert.ok(links.some((link) => link.href === PAYHIP_KIT && /also on Payhip/i.test(link.text)));
  });

  it("uses one Netlify canonical and matching Open Graph URL per sitemap page", () => {
    for (const [file, expected] of canonicalPages) {
      const html = readText(file);
      const canonicalTags = tags(html, "link").filter((tag) => attr(tag, "rel") === "canonical");
      assert.equal(canonicalTags.length, 1, `${file} should have exactly one canonical`);
      assert.equal(attr(canonicalTags[0], "href"), expected, `${file} canonical`);
      assert.equal(metaValue(html, "og:url"), expected, `${file} Open Graph URL`);
      assert.doesNotMatch(attr(canonicalTags[0], "href"), /github\.io/i, `${file} canonical host`);
      const image = metaValue(html, "og:image");
      if (image) assert.ok(image.startsWith(`${BASE}/`), `${file} share image should use the Netlify host`);
    }
  });

  it("advertises exactly the canonical pages through one sitemap", () => {
    const xml = readText("sitemap.xml");
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    assert.deepEqual(locations, canonicalPages.map(([, url]) => url));
    const robots = readText("robots.txt");
    const sitemapLines = robots.split(/\r?\n/).filter((line) => /^\s*Sitemap:/i.test(line));
    assert.deepEqual(sitemapLines, [`Sitemap: ${BASE}/sitemap.xml`]);
    assert.doesNotMatch(robots, /github\.io/i);
  });

  it("keeps local HTML links relative so they work under any host or project path", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(file, "utf8");
      for (const tag of html.match(/<(?:a|img|link|script|source|form|iframe)\b[^>]*>/gi) ?? []) {
        for (const name of ["href", "src", "action", "poster"]) {
          const value = attr(tag, name);
          assert.ok(!value.startsWith("/") || value.startsWith("//"), `${relative(ROOT, file)} has root-relative ${name}: ${value.slice(0, 100)}`);
        }
      }
    }
    const manifest = JSON.parse(readText("data/issues.json"));
    for (const issue of manifest.issues) {
      if (!issue.page) continue;
      assert.ok(!issue.page.startsWith("/"), `issue ${issue.number} page path should be relative`);
      assert.ok(existsSync(join(ROOT, issue.page)), `missing local issue page ${issue.page}`);
    }
  });

  it("makes Shopify the primary Field Kit and $1 Shop destination while keeping other stores visible", () => {
    const home = readText("index.html");
    assert.match(home, /id="start-here"/, "first-sale section remains present");
    assert.match(home, /id="archive"/, "issue archive remains present");
    assert.match(home, /id="dollar-shop"/, "store section remains present");
    const homeLinks = anchorRecords(home);
    const heroKit = homeLinks.find((link) => link.id === "cta-kit");
    assert.ok(heroKit, "hero Field Kit CTA exists");
    assert.equal(heroKit.href, FIELD_KIT);
    assert.match(heroKit.text, /AI Creator Field Kit/);
    assert.match(heroKit.text, /\$17/);
    assert.match(heroKit.text, /Shopify/);
    assert.ok(homeLinks.filter((link) => link.href === COLLECTION).length >= 2, "hero and shop-section CTAs point to the Shopify $1 collection");
    assert.ok(homeLinks.some((link) => link.href === PAYHIP_KIT && /also on Payhip/i.test(link.text)), "Payhip remains a Field Kit alternative");

    const manifest = JSON.parse(readText("data/issues.json"));
    assert.equal(manifest.fieldKit.name, "The AI Creator Field Kit");
    assert.equal(manifest.fieldKit.priceLabel, "$17");
    assert.equal(manifest.fieldKit.url, FIELD_KIT);
    assert.match(home, /price \+ " on Shopify"/);

    const hubLinks = anchorRecords(readText("hub.html"));
    assert.ok(hubLinks.some((link) => link.href === FIELD_KIT && /Shopify/.test(link.text)), "hub Field Kit CTA points to Shopify");
    const visibleStores = home + readText("hub.html");
    assert.match(visibleStores, /payhip\.com/);
    assert.match(visibleStores, /gumroad\.com/);
    assert.match(visibleStores, /ko-fi\.com/);
  });

  it("keeps the approved LAUNCH5 launch offer and adds no new signup provider", () => {
    for (const file of promoPages) {
      const html = readText(file);
      assert.match(html, /LAUNCH5/, `${file} keeps the approved LAUNCH5 offer`);
    }
    const home = readText("index.html");
    assert.doesNotMatch(home, /<form\b/i, "homepage itself stays free of inline email forms");
    assert.doesNotMatch(home, /type=["']email["']/i, "homepage has no email input");
    for (const file of htmlFiles()) {
      const html = readFileSync(file, "utf8");
      assert.doesNotMatch(html, /substack|buttondown|mailchimp|convertkit|beehiiv/i, `${relative(ROOT, file)} must not add an unapproved newsletter provider`);
    }
  });
});
