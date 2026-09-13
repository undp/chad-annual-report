# UNDP Chad — Annual Report 2025

Interactive scrollytelling microsite (EN/FR), built as a static site and deployed to
GitHub Pages on `annualreport.chad.undp.org`.

## Stack

- **Eleventy 3** — static build, one page per language (`/en/`, `/fr/`)
- **esbuild** — bundles the animation layer (GSAP + ScrollTrigger)
- **Plain CSS** — design tokens in `src/assets/css/tokens.css` (the Figma file has
  no variables, so the token layer was derived from the raw design values)
- **Fonts** — Proxima Nova + Söhne Breit, self-hosted from the public
  [`undp/design-system`](https://github.com/undp/design-system) repository

## Commands

```bash
npm install
npm run dev      # local preview at http://localhost:8080, JS rebuilt on change
npm run build    # production build into _site/
node scripts/sync-fr.mjs      # regenerate fr.json keys from en.json
node scripts/placeholders.mjs # create placeholders for assets not delivered yet
```

## Content

All copy lives in `src/_data/copy/`, one file per language:

- `en.json` is **canonical**: it defines the page structure (chapters, block types,
  image paths, counter values). English is also the fallback for any missing translation.
- `fr.json` carries **only the translated strings**. `scripts/sync-fr.mjs` keeps its
  keys in sync with English and reports how many strings are still untranslated.
- Rendering never crashes on partial content: the `t` filter falls back to English.

Adding a language = adding its code to `site.langs` plus a `copy/<lang>.json`.

## Structure

```
src/
  _data/copy/{en,fr}.json   content
  _data/site.json           languages, canonical URL, GA4 id
  _includes/layouts/        base layout (head, meta, OG, fonts)
  _includes/sections/       header, hero, impact, chapter, priorities, closing, footer
  assets/css/               tokens.css · base.css · sections.css
  assets/js/animations/     counter.js · scroll-reveal.js · parallax.js
  report.njk                paginated over site.langs → /en/, /fr/
  index.njk                 root: client-side language redirect (Pages has no server redirects)
```

## Accessibility & motion

Counters pre-render their final value and only animate on scroll; scroll reveal moves
elements without touching opacity, so contrast never drops mid-animation; parallax and
word-fade are disabled under `prefers-reduced-motion`. Target: WCAG 2.1 AA.

## Deployment

`.github/workflows/deploy.yml` builds on push to `main` and publishes to GitHub Pages.
For a project-page staging URL (not the custom domain), build with
`PATH_PREFIX=/undp-chad-annual-report/ npm run build`.

## Open items

- Chad map in the hero: static / parallax / animated — pending design decision
- "learn more" CTAs: modal, accordion or external link — pending design decision
- Mobile frames not provided: the small-screen rules in `sections.css` are proposals
- Real image exports and the downloadable PDF still to be delivered (placeholders in place)

## Images

`src/assets/img/*` is generated, not hand-placed. The sources are the raw Figma
exports in `src/assets/figma/` (git-ignored, ~84 MB), and `scripts/build-images.py`
maps each one to its slot, caps the long edge at 1400 px, strips EXIF and writes a
JPEG + WebP pair:

    npm run images

To refresh the raw exports: open the Chad Annual Report file in Figma Desktop with
the MCP server on (`127.0.0.1:3845`), select the `Chad Annual Report Storytelling`
frame, call `get_design_context` and download the `localhost:3845/assets/*` URLs it
returns. The asset hashes and the Figma node name each one comes from are recorded
in the `PHOTOS` / `BACKDROPS` / `SVGS` tables at the top of the script.

Two gradients stay as images because they are mesh gradients (`hero-bg`,
`youth-panel`); the flat chapter bands are CSS `linear-gradient`s sampled from the
design and cost nothing.
