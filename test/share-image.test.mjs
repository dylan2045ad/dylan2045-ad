import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { it } from "node:test";

const html = readFileSync("index.html", "utf8");
const data = JSON.parse(readFileSync("data/issues.json", "utf8"));
const latest = [...data.issues].sort((a, b) => Number(b.number) - Number(a.number))[0];
const number = String(latest.number).padStart(2, "0");
const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];

function meta(key) {
  return html.match(new RegExp(`<meta\\b[^>]*(?:property|name)="${key}"[^>]*content="([^"]+)"`, "i"))?.[1];
}

it("static title and Open Graph summary describe the latest release", () => {
  assert.ok(html.includes(`<title>The Signal — Issue ${number}: ${latest.title} | Dylan from 2045</title>`));
  assert.equal(meta("og:title"), `The Signal — Issue ${number}: ${latest.title}`);
  assert.ok(meta("og:description")?.includes(latest.teaser));
});

it("share image tags use the latest release's existing cover", () => {
  assert.ok(canonical);
  assert.ok(existsSync(latest.cover));
  const image = new URL(latest.cover, canonical).href;
  assert.equal(meta("og:image"), image);
  assert.equal(meta("twitter:image"), image);
  assert.ok(Number(meta("og:image:width")) > 0);
  assert.ok(Number(meta("og:image:height")) > 0);
});

it("no-JavaScript issue fallback agrees with the release index", () => {
  assert.ok(html.includes(`id="issue-no">Issue ${number}</p>`));
  assert.ok(html.includes(`id="issue-title">${latest.title}</h1>`));
  assert.ok(html.includes(`id="issue-date" datetime="${latest.date}"`));
  assert.match(html, new RegExp(`id="issue-cover"\\s+src="${latest.cover.replaceAll(".", "\\.")}"`));
  const href = html.match(/<a\b[^>]*id="cta-free"[^>]*href="([^"]+)"/i)?.[1];
  assert.equal(href, latest.page || latest.url || data.canonicalPayhip);
  assert.ok(html.includes(`Read Issue ${number} free</a>`));
});

it("local issue pages stay within the canonical project path", () => {
  const base = new URL(canonical);
  for (const issue of data.issues.filter((entry) => entry.page)) {
    assert.ok(!issue.page.startsWith("/"), `Issue ${issue.number}: root-relative page breaks project hosting`);
    assert.ok(!issue.page.includes(".."));
    assert.ok(existsSync(issue.page), `Issue ${issue.number}: local page missing`);
    const target = new URL(issue.page, base);
    assert.equal(target.origin, base.origin);
    assert.ok(target.pathname.startsWith(base.pathname));
  }
});
