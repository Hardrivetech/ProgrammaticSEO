// Generate static pages: /index.html and /{country}/{year}.html using Nager.Date (no API key)
// Data source: https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}
// Countries list: https://date.nager.at/api/v3/AvailableCountries

import fs from "fs/promises";
import path from "path";
import https from "https";

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, "docs");
// Configure base path for GitHub Pages project site and site origin for canonicals
const BASE_PATH = "/ProgrammaticSEO"; // leading slash, no trailing slash
const SITE_ORIGIN = "https://hardrivetech.github.io";

const YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

// Google Analytics Measurement ID (optional). Enable by setting env GA_ID in CI.
const GA_ID = process.env.GA_ID || "";

// Affiliate links (replace YOUR_ID with your affiliate/ref IDs)
const AFFILIATES = {
  default: {
    travel: "https://example-travel-partner.com/?ref=YOUR_ID",
    gifts: "https://example-gifts.com/?ref=YOUR_ID",
  },
  // Country-specific overrides (optional)
  US: {
    travel: "https://example-travel-partner.com/us?ref=YOUR_ID",
    gifts: "https://example-gifts.com/us?ref=YOUR_ID",
  },
  GB: {
    travel: "https://example-travel-partner.com/uk?ref=YOUR_ID",
    gifts: "https://example-gifts.com/uk?ref=YOUR_ID",
  },
};

// Resolve affiliate links for a given country code
function affiliateFor(code) {
  const upper = (code || "").toUpperCase();
  const bookingAid = process.env.BOOKING_AID || "";
  const tripAlliance = process.env.TRIP_ALLIANCEID || "";
  const tripSid = process.env.TRIP_SID || "";
  const gygPartner = process.env.GYG_PARTNER_ID || "";

  // Prefer Booking.com (hotels), then Trip.com (flights), then GetYourGuide (tours)
  const travelCandidates = [];
  if (bookingAid)
    travelCandidates.push(
      `https://www.booking.com/index.html?aid=${bookingAid}`
    );
  if (tripAlliance && tripSid)
    travelCandidates.push(
      `https://www.trip.com/flights/?allianceid=${tripAlliance}&sid=${tripSid}`
    );
  if (gygPartner)
    travelCandidates.push(
      `https://www.getyourguide.com/?partner_id=${gygPartner}`
    );
  const travel = travelCandidates[0] || "https://www.trip.com/flights/"; // non-affiliate fallback

  // Amazon gifts affiliate (country-aware), falls back to non-affiliate search if tag missing
  const amazonTagDefault = process.env.AMAZON_TAG || "";
  const amazonTags = {
    US: process.env.AMAZON_TAG_US || amazonTagDefault,
    GB: process.env.AMAZON_TAG_GB || amazonTagDefault,
    CA: process.env.AMAZON_TAG_CA || amazonTagDefault,
    AU: process.env.AMAZON_TAG_AU || amazonTagDefault,
    IN: process.env.AMAZON_TAG_IN || amazonTagDefault,
  };
  const amazonTlds = {
    US: "com",
    GB: "co.uk",
    CA: "ca",
    AU: "com.au",
    IN: "in",
  };
  const tld = amazonTlds[upper] || "com";
  const tag = amazonTags[upper] || amazonTagDefault;
  const giftsBase = `https://www.amazon.${tld}/s?k=gifts+for+holidays`;
  const gifts = tag ? `${giftsBase}&tag=${tag}` : giftsBase;

  return { travel, gifts };
}

// Simple per-country description text
function countryDescription(country, year) {
  const code = (country.countryCode || "").toUpperCase();
  const name = htmlEscape(country.name || "");
  const overrides = {
    US: `${name} observes federal and state holidays. Popular observances include New Year's Day, Independence Day, Thanksgiving, and Christmas.`,
    GB: `${name} has UK bank holidays and regional observances across England, Scotland, Wales, and Northern Ireland.`,
    CA: `${name} includes national holidays and provincial observances throughout the year.`,
    AU: `${name} features national holidays and state-based public holidays staggered across the calendar.`,
    IN: `${name} observes national holidays alongside diverse religious and regional festivals.`,
  };
  return (
    overrides[code] ||
    `${name} observes a mix of national, cultural, and religious holidays throughout ${year}.`
  );
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;
        if (statusCode !== 200) {
          res.resume();
          reject(
            new Error(`Request Failed. Status Code: ${statusCode} for ${url}`)
          );
          return;
        }
        let rawData = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (rawData += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function htmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pageLayout({ title, description, content, canonical }) {
  const escapedTitle = htmlEscape(title);
  const escapedDesc = htmlEscape(description);
  let canonicalTag = canonical
    ? `<link rel=\"canonical\" href=\"${canonical}\">`
    : "";
  const canonicalUrl = canonical || `${SITE_ORIGIN}${BASE_PATH}/`;
  const analytics = GA_ID
    ? `<script async src=\"https://www.googletagmanager.com/gtag/js?id=${GA_ID}\"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);} 
gtag('js', new Date());
gtag('config', '${GA_ID}');
</script>`
    : "";
  const headExtras = `
<meta property=\"og:title\" content=\"${escapedTitle}\"/>
<meta property=\"og:description\" content=\"${escapedDesc}\"/>
<meta property=\"og:url\" content=\"${canonicalUrl}\"/>
<meta property=\"og:type\" content=\"website\"/>
<meta name=\"twitter:card\" content=\"summary\"/>
${analytics}
`;
  canonicalTag += headExtras;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapedTitle}</title>
<meta name="description" content="${escapedDesc}"/>
<link rel="sitemap" type="application/xml" href="${BASE_PATH}/sitemap.xml"/>
${canonicalTag}
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,\"Helvetica Neue\",Arial;max-width:900px;margin:2rem auto;padding:0 1rem;line-height:1.6}
  a{color:#0b69c7;text-decoration:none}
  a:hover{text-decoration:underline}
  header{margin-bottom:1rem}
  nav{margin:1rem 0}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem}
  footer{margin-top:2rem;font-size:0.9rem;color:#666}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ddd;padding:6px}
  th{background:#f8f8f8}
</style>
</head>

<body>
<header>
  <h1>${escapedTitle}</h1>
  <p>${escapedDesc}</p>
</header>
<nav><a href="${BASE_PATH}/">Home</a></nav>
<main>
${content}
</main>
<footer>
  <p>Data: Nager.Date public holidays API. Built automatically.</p>
  <p><a href="${BASE_PATH}/">Home</a> · <a href="${BASE_PATH}/sitemap.xml">Sitemap</a></p>
</footer>
</body>
</html>`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFile(fp, content) {
  await ensureDir(path.dirname(fp));
  await fs.writeFile(fp, content, "utf8");
}

async function buildIndex(countries) {
  const yearLinks = YEARS.map((y) => `<a href="#y-${y}">${y}</a>`).join(" · ");
  const countriesGrid = countries
    .map((c) => {
      const code = c.countryCode;
      const name = htmlEscape(c.name);
      const links = YEARS.map(
        (y) => `<a href="${BASE_PATH}/${code}/${y}.html">${y}</a>`
      ).join(" · ");
      return `<div><strong>${name}</strong><br/>${links}</div>`;
    })
    .join("");

  const content = `
  <section>
    <p>Browse public holidays by country and year. Auto-updated.</p>
    <p>Years: ${yearLinks}</p>
  </section>
  <section class="grid">${countriesGrid}</section>
  `;

  const html = pageLayout({
    title: "Public Holidays by Country and Year",
    description:
      "Programmatic SEO site listing public holidays for each country across years.",
    content,
    canonical: `${SITE_ORIGIN}${BASE_PATH}/`,
  });
  await writeFile(path.join(OUT_DIR, "index.html"), html);
}

function holidaysTable(holidays) {
  const rows = holidays
    .map((h) => {
      const date = htmlEscape(h.date);
      const localName = htmlEscape(h.localName || "");
      const name = htmlEscape(h.name || "");
      const types = Array.isArray(h.types) ? h.types.join(", ") : h.types || "";
      return `<tr><td>${date}</td><td>${localName}</td><td>${name}</td><td>${htmlEscape(
        types
      )}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Date</th><th>Local Name</th><th>English Name</th><th>Types</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function buildCountryYearPage(country, year, holidays) {
  const title = `${country.name} Public Holidays in ${year}`;
  const description = `Official public holidays for ${country.name} (${country.countryCode}) in ${year}.`;

  // Affiliate CTAs
  const aff = affiliateFor(country.countryCode);
  const cta = `<p>
    <a href="${aff.travel}">Compare flights and hotels</a> ·
    <a href="${aff.gifts}">Send gifts and flowers</a>
  </p>`;
  const desc = countryDescription(country, year);

  // Automated tips based on holiday distribution
  let tips = "";
  try {
    const dates = holidays
      .map((h) => new Date(h.date))
      .filter((d) => !isNaN(d));
    if (dates.length) {
      const byMonth = Array.from({ length: 12 }, () => 0);
      for (const d of dates) byMonth[d.getUTCMonth()]++;
      const peakIndex = byMonth.indexOf(Math.max(...byMonth));
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const peakMonth = monthNames[peakIndex];
      const sorted = dates.slice().sort((a, b) => a - b);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const fmt = (d) => d.toISOString().slice(0, 10);
      tips = `<p><em>Tips:</em> ${htmlEscape(country.name)} has ${
        dates.length
      } public holidays in ${year}. Peak month: ${peakMonth}. Consider planning travel and gifts around these dates (first: ${fmt(
        first
      )}, last: ${fmt(last)}).</p>`;
    }
  } catch (_) {}

  const content = `
    ${cta}
    <p>Below are the public holidays for <strong>${htmlEscape(
      country.name
    )}</strong> in <strong>${year}</strong>.</p>
    <p>${htmlEscape(desc)}</p>
    ${holidaysTable(holidays)}
    ${tips}
    ${cta}
    <p><a href="${BASE_PATH}/${country.countryCode}/${
    year + 1
  }.html">Next year →</a></p>
  `;
  const html = pageLayout({
    title,
    description,
    content,
    canonical: `${SITE_ORIGIN}${BASE_PATH}/${country.countryCode}/${year}.html`,
  });
  const outPath = path.join(OUT_DIR, country.countryCode, `${year}.html`);
  await writeFile(outPath, html);
}

async function buildSitemap(countryCodes) {
  const urls = [
    `<url><loc>${SITE_ORIGIN}${BASE_PATH}/</loc></url>`,
    ...countryCodes.flatMap((code) =>
      YEARS.map(
        (y) =>
          `<url><loc>${SITE_ORIGIN}${BASE_PATH}/${code}/${y}.html</loc></url>`
      )
    ),
  ].join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  await writeFile(path.join(OUT_DIR, "sitemap.xml"), xml);
}

async function buildRobots() {
  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}${BASE_PATH}/sitemap.xml\n`;
  await writeFile(path.join(OUT_DIR, "robots.txt"), robots);
}

async function build404() {
  const html = pageLayout({
    title: "Page not found",
    description: "The page you were looking for doesn’t exist.",
    content: `<p>We couldn't find that page.</p><p>Go back to the <a href="${BASE_PATH}/">home page</a>.</p>`,
    canonical: `${SITE_ORIGIN}${BASE_PATH}/404.html`,
  });
  await writeFile(path.join(OUT_DIR, "404.html"), html);
}

async function main() {
  await ensureDir(OUT_DIR);

  // Fetch countries
  const countries = await fetchJson(
    "https://date.nager.at/api/v3/AvailableCountries"
  );

  // You can shrink the initial scope to speed up build by slicing
  const limited = countries; // all countries

  await buildIndex(limited);

  for (const country of limited) {
    for (const year of YEARS) {
      try {
        const holidays = await fetchJson(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/${country.countryCode}`
        );
        await buildCountryYearPage(country, year, holidays);
      } catch (err) {
        console.error(
          "Failed to fetch/build",
          country.countryCode,
          year,
          err.message
        );
      }
    }
  }

  await buildSitemap(limited.map((c) => c.countryCode));
  await buildRobots();
  await build404();
  console.log("Build complete. Output in /docs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
