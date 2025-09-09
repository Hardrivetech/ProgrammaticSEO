// Generate static pages: /index.html and /{country}/{year}.html using Nager.Date (no API key)
// Data source: https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}
// Countries list: https://date.nager.at/api/v3/AvailableCountries

import fs from "fs/promises";
import path from "path";
import https from "https";

const ROOT = path.resolve("c:/Users/wingdoodles/Desktop/WebDev/RandomGame");
const OUT_DIR = path.join(ROOT, "docs");
// Configure base path for GitHub Pages project site and site origin for canonicals
const BASE_PATH = "/ProgrammaticSEO"; // leading slash, no trailing slash
const SITE_ORIGIN = "https://hardrivetech.github.io";

const YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

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
  const canonicalTag = canonical
    ? `<link rel=\"canonical\" href=\"${canonical}\">`
    : "";
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
  const content = `
    <p>Below are the public holidays for <strong>${htmlEscape(
      country.name
    )}</strong> in <strong>${year}</strong>.</p>
    ${holidaysTable(holidays)}
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

async function main() {
  await ensureDir(OUT_DIR);

  // Fetch countries
  const countries = await fetchJson(
    "https://date.nager.at/api/v3/AvailableCountries"
  );

  // You can shrink the initial scope to speed up build by slicing
  const limited = countries.slice(0, 25); // start small; adjust later

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
  console.log("Build complete. Output in /docs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
