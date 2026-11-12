# Project Architecture — Dylan From 2045 Hub

## Overview

A zero-dependency, single-file static site. Everything lives in `index.html` with inline CSS.

## Key Files

- `index.html` — the entire site: markup + all styles inline
- `signal.html` — dedicated `/signal` page: free Signal signup (Payhip 4tHmb) + $17 Field Kit upsell (Payhip V472q)
- `thanks.html` — email-capture confirmation page; links the free Signal (`https://payhip.com/b/4tHmb`) and the $17 Field Kit
- `og-image.png` — social share image ("THE SIGNAL")
- `header.jpg` — header image (swap this file to change the hero photo)
- `netlify.toml` — publish from repo root + pretty-URL redirects for /signal and /thanks

## Funnel Conventions (monetization plan, Aug 2026)

- Hero = The Signal, free (single CTA → `https://payhip.com/b/4tHmb`); upsell = $17 Field Kit `https://payhip.com/b/V472q`. Canonical funnel; do not link Signal to Gumroad.
- Books live only in the Books section, below Signal
- Shopify = primary store (dylan2045ad-store.myshopify.com); Payhip = Signal + Field Kit funnel; Gumroad/Ko-fi = secondary mirrors. GitHub Pages is canonical; Netlify updated at most monthly.
- Suno is under Media (not a shop); aggregators are under Labs (not offers)
- Footer links: Gumroad, Ko-fi (tips), YouTube, Site — nothing else
- Email capture is a one-field Netlify form (`signal-list`), action=/thanks

## Design Conventions

- Color palette: `#050a24` background, `#00eaff` cyan, `#ff2bd6` magenta, `#9d5bff` purple
- Neon glow via `text-shadow` and `box-shadow`; no external font or icon libraries
- Buttons: `.btn-m` (magenta), `.btn-c` (cyan), `.btn-p` (purple for book cards)
- All external links use `target="_blank" rel="noopener"`

## Non-obvious Decisions

- The hero `<img>` uses an `onerror` handler to fall back to a "header image" placeholder so the page looks fine before `header.jpg` is replaced.
- No build step — `netlify.toml` sets `publish = "."` so Netlify serves the repo root directly.
