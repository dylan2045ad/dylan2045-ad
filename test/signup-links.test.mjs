import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const NEWSLETTER_URL = "https://dylan2045-ad.netlify.app/newsletter";

describe("newsletter signup path", () => {
  it("homepage signup CTA points at the canonical Netlify signup page", () => {
    const html = read("index.html");
    const match = html.match(
      /<a[^>]*href="([^"]+)"[^>]*>\s*Get The Signal free\s*<\/a>/i,
    );
    assert.ok(match, "homepage 'Get The Signal free' CTA not found");
    assert.equal(match[1], NEWSLETTER_URL);
  });

  it("hub signup CTA points at the canonical Netlify signup page", () => {
    const html = read("hub.html");
    const match = html.match(
      /<a[^>]*href="([^"]+)"[^>]*>\s*Get the next Signal free\s*<\/a>/i,
    );
    assert.ok(match, "hub 'Get the next Signal free' CTA not found");
    assert.equal(match[1], NEWSLETTER_URL);
  });

  it("keeps root-relative /newsletter hrefs off the mirrored pages (they 404 on GitHub Pages)", () => {
    for (const page of ["index.html", "hub.html", "signal.html", "thanks.html", "tools/index.html"]) {
      const html = read(page);
      assert.equal(
        html.includes('href="/newsletter"'),
        false,
        `${page} still links to root-relative /newsletter`,
      );
    }
  });

  it("signup page keeps the Netlify form wiring", () => {
    const html = read("newsletter/index.html");
    assert.match(html, /name="signal-newsletter"/);
    assert.match(html, /data-netlify="true"/);
    assert.match(html, /action="\/newsletter\/thanks\/"/);
    assert.match(html, /type="email"[^>]*required/);
    assert.match(html, /name="consent"[^>]*required/);
  });

  it("signup page keeps the GitHub Pages mirror redirect to Netlify", () => {
    const html = read("newsletter/index.html");
    assert.ok(
      html.includes("dylan2045ad.github.io"),
      "mirror redirect hostname check missing",
    );
    assert.ok(
      html.includes("location.replace('https://dylan2045-ad.netlify.app'"),
      "mirror redirect target missing",
    );
  });
});
