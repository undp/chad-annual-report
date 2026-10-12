#!/usr/bin/env python3
"""Derives the raster favicons from the UN emblem tile that
scripts/vendor-undp-ds.mjs cuts out of the design system's logo.

The SVG serves every browser that reads one. The two rasters sit at the site
root because that is where the rest look without being told: /favicon.ico
(Safari before 26, old Edge, feed readers, and any request that skips the
<link>) and /apple-touch-icon.png (iOS home screen and Safari favourites, which
want an opaque 180 px square).

PIL draws no SVG, so the tile is rendered once at 512 px by Playwright's
Chromium and scaled down from there. It is drawn on its own blue, read from the
square's fill: on the page's white, the antialiased edge of the square would
leave a pale rim round every icon.
Re-runnable: `npm run vendor:ds`, then `npm run favicons`."""
from io import BytesIO
from pathlib import Path
import re
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "src/assets/vendor/undp-ds/images/undp-emblem.svg"
ICO, TOUCH = ROOT / "src/favicon.ico", ROOT / "src/apple-touch-icon.png"
RENDER, ICO_SIZES, TOUCH_SIZE = 512, (16, 32, 48), 180

svg = SVG.read_text()
blue = re.search(r'<path[^>]*fill="(#[0-9A-Fa-f]{6})"', svg).group(1)
svg = svg.replace("<svg ", f'<svg width="{RENDER}" height="{RENDER}" preserveAspectRatio="none" style="display:block" ', 1)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": RENDER, "height": RENDER})
    page.set_content(f'<body style="margin:0;background:{blue}">{svg}</body>')
    big = Image.open(BytesIO(page.screenshot())).convert("RGB")
    browser.close()

frames = [big.resize((s, s), Image.LANCZOS) for s in ICO_SIZES]
frames[-1].save(ICO, format="ICO", sizes=[(s, s) for s in ICO_SIZES], append_images=frames[:-1])
big.resize((TOUCH_SIZE, TOUCH_SIZE), Image.LANCZOS).save(TOUCH, optimize=True)

for f in (ICO, TOUCH):
    print(f"{f.relative_to(ROOT)}: {f.stat().st_size} bytes")
