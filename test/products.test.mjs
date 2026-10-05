import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import handler from "../netlify/functions/products.mjs";

const ORIGIN = "https://dylan2045-ad.netlify.app";
const PAY_TO = "0x0c7DF03a4c5be953386654F5C565f94D790147C7";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const PRODUCTS = {
  signal: "https://payhip.com/b/4tHmb",
  "field-kit": "https://payhip.com/b/V472q",
  "one-screen-brief": "https://payhip.com/b/HJTMj",
  "agent-forgets": "https://payhip.com/b/TCFOa",
  "deploy-sheet": "https://payhip.com/b/HA8Ik",
};

function get(slug, headers = {}) {
  return handler(
    new Request(`${ORIGIN}/products/${slug}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "dylan-source-test",
        ...headers,
      },
    }),
  );
}

describe("GET /products/:slug", () => {
  it("returns 404 for an unknown slug and does not ask for payment", async () => {
    const response = await get("not-a-product");
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("PAYMENT-REQUIRED"), null);
    const body = await response.json();
    assert.deepEqual(body, { error: "Not found" });
  });

  it("returns 402 with an exact $0.01 Base USDC challenge for each known slug", async () => {
    for (const [slug, url] of Object.entries(PRODUCTS)) {
      const response = await get(slug);
      assert.equal(response.status, 402, slug);
      const encoded = response.headers.get("PAYMENT-REQUIRED");
      assert.ok(encoded, `${slug} missing PAYMENT-REQUIRED`);
      const required = decodePaymentRequiredHeader(encoded);
      assert.equal(required.x402Version, 2);
      assert.equal(required.resource.serviceName, "Dylan Source Data");
      assert.deepEqual(required.resource.tags, [
        "agents",
        "source-notes",
        "templates",
        "payhip",
      ]);
      assert.equal(required.resource.mimeType, "application/json");
      assert.equal(required.resource.url, `${ORIGIN}/products/${slug}`);
      assert.equal(required.accepts.length, 1);
      const accept = required.accepts[0];
      assert.equal(accept.scheme, "exact");
      assert.equal(accept.network, "eip155:8453");
      assert.equal(accept.payTo, PAY_TO);
      assert.equal(accept.amount, "10000");
      assert.equal(accept.asset.toLowerCase(), USDC_BASE.toLowerCase());
      const bazaar = required.extensions.bazaar;
      assert.equal(bazaar.routeTemplate, "/products/:slug");
      assert.equal(bazaar.info.input.type, "http");
      assert.equal(bazaar.info.input.method, "GET");
      assert.deepEqual(bazaar.info.input.pathParams, { slug });
      assert.equal(bazaar.info.output.example.url, PRODUCTS.signal);
      const body = await response.json();
      assert.deepEqual(body, {});
      assert.equal(JSON.stringify(body).includes(url), false);
    }
  });

  it("keeps a browser unpaid request on 402 with the payment header", async () => {
    const response = await get("signal", {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0",
    });
    assert.equal(response.status, 402);
    assert.ok(response.headers.get("PAYMENT-REQUIRED"));
    assert.match(response.headers.get("content-type") || "", /text\/html/);
  });

  it("does not return the note when the payment header is not a signature", async () => {
    const response = await get("deploy-sheet", {
      "PAYMENT-SIGNATURE": "not-a-payment",
    });
    assert.equal(response.status, 402);
    assert.ok(response.headers.get("PAYMENT-REQUIRED"));
    const body = await response.json();
    assert.equal(body.note, undefined);
    assert.equal(body.url, undefined);
  });
});
