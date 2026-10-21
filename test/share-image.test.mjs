import assert from "node:assert/strict";

import { existsSync, readFileSync } from "node:fs";

import { it } from "node:test";

const h = readFileSync("index.html", "utf8");

const I = "https://dylan2045ad.github.io/dylan2045-ad/1-signal-issue-08-cover.jpg";

it("share image tags", () => {
  
assert.ok(h.includes(`content="${I}"`));
  
assert.ok(h.includes(`name="twitter:image" content="${I}"`));
  
assert.ok(existsSync("1-signal-issue-08-cover.jpg"));
  
});



