# Public Holidays Programmatic SEO Site

Static site that lists public holidays by country and year using the free Nager.Date API. Builds to `/docs` for GitHub Pages. Automated daily.

## Quick start

1. In `scripts/generate.mjs`, set:
   - `BASE_PATH = "/ProgrammaticSEO"`
   - `SITE_ORIGIN = "https://hardrivetech.github.io"`
2. Commit and push to GitHub (default branch `main`).
3. Enable GitHub Pages in repository settings:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages` (the workflow publishes here)
4. Run the workflow manually once (Actions → Build and Deploy → Run workflow) or push to trigger.

## Local build (optional)

Requires Node 18+.

```bash
# Windows PowerShell
node scripts/generate.mjs
```

Output goes to `/docs`. Open `docs/index.html` in a browser.

## Notes

- Initial build uses first 25 countries to keep runtime short; increase the slice in `generate.mjs` later.
- No API keys required. Respect API rate limits; scheduled daily build is conservative.
