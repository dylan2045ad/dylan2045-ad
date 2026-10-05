import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions/bazaar";

const PAY_TO = "0x0c7DF03a4c5be953386654F5C565f94D790147C7";
const NETWORK = "eip155:8453";
const FACILITATOR_URL =
  (process.env.FACILITATOR_URL || "").trim() || "https://facilitator.payai.network";

const PRODUCTS = {
  signal: {
    url: "https://payhip.com/b/4tHmb",
    note: "The Signal is Dylan's source brief. The Payhip file is the issue.",
  },
  "field-kit": {
    url: "https://payhip.com/b/V472q",
    note: "Field Kit is the paid decision system. The Payhip file is the kit.",
  },
  "one-screen-brief": {
    url: "https://payhip.com/b/HJTMj",
    note: "One-screen brief source note. The Payhip file is the brief.",
  },
  "agent-forgets": {
    url: "https://payhip.com/b/TCFOa",
    note: "Why your AI agent forgets: four ways agents lose track, plus a State Capsule prompt. The Payhip file is the full note.",
  },
  "deploy-sheet": {
    url: "https://payhip.com/b/HA8Ik",
    note: "Chief Charlie deploy sheet: a one-page checklist for shipping work done with AI agents. The Payhip file is the sheet.",
  },
};

const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
  timeoutMs: 20_000,
});

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme())
  .registerExtension(bazaarResourceServerExtension);

const routes = {
  "GET /products/:slug": {
    accepts: {
      scheme: "exact",
      price: "$0.01",
      network: NETWORK,
      payTo: PAY_TO,
    },
    description: "Dylan source note and the matching Payhip link for one product slug.",
    mimeType: "application/json",
    serviceName: "Dylan Source Data",
    tags: ["agents", "source-notes", "templates", "payhip"],
    extensions: {
      ...declareDiscoveryExtension({
        pathParamsSchema: {
          properties: {
            slug: {
              type: "string",
              description:
                "Product slug: signal, field-kit, one-screen-brief, agent-forgets, or deploy-sheet.",
            },
          },
          required: ["slug"],
        },
        output: {
          example: {
            slug: "signal",
            note: PRODUCTS.signal.note,
            url: PRODUCTS.signal.url,
          },
          schema: {
            properties: {
              slug: { type: "string" },
              note: { type: "string" },
              url: { type: "string" },
            },
            required: ["slug", "note", "url"],
          },
        },
      }),
    },
  },
};

const app = new Hono();

app.use("/products/:slug", async (c, next) => {
  if (c.req.method !== "GET") {
    await next();
    return;
  }
  const slug = c.req.param("slug");
  if (!Object.hasOwn(PRODUCTS, slug)) {
    return c.json({ error: "Not found" }, 404);
  }
  await next();
});

app.use(paymentMiddleware(routes, resourceServer));

app.get("/products/:slug", (c) => {
  const slug = c.req.param("slug");
  const product = PRODUCTS[slug];
  if (!product) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(
    { slug, note: product.note, url: product.url },
    200,
    { "Cache-Control": "private, no-store" },
  );
});

function withAgentHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "PAYMENT-SIGNATURE, Content-Type");
  headers.set(
    "Access-Control-Expose-Headers",
    "PAYMENT-REQUIRED, PAYMENT-RESPONSE, EXTENSION-RESPONSES",
  );
  headers.set("Netlify-CDN-Cache-Control", "no-store");
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "private, no-store");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return withAgentHeaders(new Response(null, { status: 204 }));
  }
  return withAgentHeaders(await app.fetch(request));
}

export const config = {
  path: "/products/:slug",
};
