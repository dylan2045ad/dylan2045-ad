import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import vm from "node:vm";

const html = readFileSync("index.html", "utf8");
const data = JSON.parse(readFileSync("data/issues.json", "utf8"));
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1]).find((text) => text.includes("function render(data)"));
function anchorById(id) {
  const anchor = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .find((match) => new RegExp(`\\bid="${id}"`).test(match[1]));
  return {
    href: anchor[1].match(/\bhref="([^"]+)"/)[1],
    textContent: anchor[2].replace(/<[^>]+>/g, "").trim(),
  };
}

const primary = anchorById("cta-kit");
const freeIssue = anchorById("cta-free");
const headline = html.match(/id="issue-title">([^<]*)<\/h1>/)[1];
const teaser = html.match(/id="issue-teaser">\s*([^<]*?)\s*<\/p>/)[1];

function element() {
  return {
    href: "", textContent: "", children: [], style: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    removeAttribute(name) { delete this[name]; },
  };
}

function rendered() {
  const ids = new Map();
  const document = {
    title: "",
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, element());
      return ids.get(id);
    },
    createElement() { return element(); },
  };
  Object.assign(document.getElementById("cta-kit"), primary, {
    target: "_blank", rel: "noopener",
  });
  Object.assign(document.getElementById("cta-free"), freeIssue, {
    target: "_blank", rel: "noopener",
  });
  document.getElementById("issue-title").textContent = headline;
  document.getElementById("issue-teaser").textContent = teaser;
  const noNetwork = { then() { return this; }, catch() { return this; } };
  const context = { document, fetch: () => noNetwork };
  vm.runInNewContext(script, context, { timeout: 1000 });
  context.render(data);
  return { document, ids };
}

it("release rendering preserves the primary CTA configured in static HTML", () => {
  const { ids } = rendered();
  assert.equal(ids.get("cta-kit").href, primary.href);
  assert.equal(ids.get("cta-kit").textContent, primary.textContent);
  assert.equal(ids.get("cta-kit").target, "_blank");
  assert.equal(ids.get("cta-kit").rel, "noopener");
});

it("Japanese issue archive link stays inside the Pages project", () => {
  const { ids } = rendered();
  const all = (node) => [node, ...node.children.flatMap(all)];
  const link = all(ids.get("archive")).find((node) => node.textContent === "日本語版 (07-Nippon)");
  assert.ok(link);
  assert.equal(link.href, "signal-issue-07-nippon.html");
  assert.equal(new URL(link.href, "https://dylan2045ad.github.io/dylan2045-ad/").pathname,
    "/dylan2045-ad/signal-issue-07-nippon.html");
});

it("approved hero copy stays put while cover and archive follow the release index", () => {
  const { ids, document } = rendered();
  const latest = [...data.issues].sort((a, b) => Number(b.number) - Number(a.number))[0];
  assert.equal(ids.get("issue-title").textContent, headline);
  assert.equal(ids.get("issue-teaser").textContent, teaser);
  assert.equal(ids.get("cta-free").href, freeIssue.href);
  assert.equal(ids.get("cta-free").textContent, freeIssue.textContent);
  assert.equal(ids.get("issue-cover").src, latest.cover);
  assert.equal(ids.get("archive").children.length, data.issues.length);
  assert.ok(document.title.includes(latest.title));
});
