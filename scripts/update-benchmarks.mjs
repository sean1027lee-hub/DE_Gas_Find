// Builds src/data/benchmarks.json from the EU Weekly Oil Bulletin price history
// (© European Union, reuse under CC BY 4.0). Runs weekly in GitHub Actions.
//   node scripts/update-benchmarks.mjs            → write JSON
//   node scripts/update-benchmarks.mjs --inspect  → print workbook structure only
import ExcelJS from "exceljs";
import { writeFileSync, mkdirSync } from "node:fs";

const SOURCE =
  "https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx";
const OUT = "src/data/benchmarks.json";
const YEARS_OF_HISTORY = 10;
const FUELS = ["euro95", "diesel"];

async function download(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Tankpreis-PWA data updater" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.warn(`download attempt ${attempt} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw new Error("download failed");
}

const plain = (v) => (v && typeof v === "object" && !(v instanceof Date) && "result" in v ? v.result : v);

function toNumber(v) {
  v = plain(v);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function toDate(v) {
  v = plain(v);
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (typeof v === "number" && v > 30000 && v < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  }
  return null;
}

/** Reads one "prices" sheet into { date → { CODE → { euro95, diesel } } } (€/L). */
function readPriceSheet(ws, kind) {
  const header = ws.getRow(1);
  const cols = []; // { col, code, fuel }
  const re = new RegExp(`^([A-Z]{2,3})_price_${kind}_(euro95|diesel)$`);
  for (let c = 1; c <= ws.columnCount; c++) {
    const m = String(plain(header.getCell(c).value) ?? "").trim().match(re);
    if (m) cols.push({ col: c, code: m[1], fuel: m[2] });
  }
  if (!cols.some((c) => c.code === "DE")) throw new Error(`sheet "${ws.name}": DE columns not found`);
  const rows = new Map();
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const date = toDate(row.getCell(1).value);
    if (!date) continue;
    const entry = {};
    for (const { col, code, fuel } of cols) {
      const per1000 = toNumber(row.getCell(col).value);
      // Sanity: retail fuel between 0.3 and 5 €/L.
      const perLitre = per1000 !== null && per1000 > 300 && per1000 < 5000 ? Math.round(per1000) / 1000 : null;
      (entry[code] ??= { euro95: null, diesel: null })[fuel] = perLitre;
    }
    rows.set(date, entry);
  }
  return rows;
}

function findSheet(wb, kind) {
  const ws = wb.worksheets.find((s) => {
    const row = s.getRow(1);
    for (let c = 1; c <= Math.min(s.columnCount, 80); c++) {
      if (String(plain(row.getCell(c).value) ?? "") === `DE_price_${kind}_euro95`) return true;
    }
    return false;
  });
  if (!ws) throw new Error(`no sheet with DE_price_${kind}_euro95`);
  return ws;
}

/** Most recent value for code/fuel on or before `date`, at most `maxWeeks` back. */
function latestValue(dates, rows, code, fuel, fromIndex, maxWeeks = 4) {
  for (let i = fromIndex; i < Math.min(dates.length, fromIndex + maxWeeks); i++) {
    const v = rows.get(dates[i])?.[code]?.[fuel];
    if (v != null) return { value: v, date: dates[i] };
  }
  return null;
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function build(buf) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const withTax = readPriceSheet(findSheet(wb, "with_tax"), "with_tax");
  const withoutTax = readPriceSheet(findSheet(wb, "wo_tax"), "wo_tax");

  // Newest first.
  const dates = [...withTax.keys()].sort().reverse();
  const latestDate = dates.find((d) => withTax.get(d)?.DE?.euro95 != null && withTax.get(d)?.DE?.diesel != null);
  if (!latestDate) throw new Error("no German prices found");
  const ageDays = (Date.now() - new Date(latestDate).getTime()) / 86400000;
  if (ageDays > 35) throw new Error(`latest German price is ${Math.round(ageDays)} days old (${latestDate})`);
  const latestIndex = dates.indexOf(latestDate);

  // Germany: weekly series, oldest → newest.
  const cutoff = addDays(latestDate, -365 * YEARS_OF_HISTORY - 7);
  const deDates = dates.filter((d) => d >= cutoff && d <= latestDate).reverse();
  const germany = { dates: deDates, euro95: [], diesel: [] };
  for (const d of deDates) for (const f of FUELS) germany[f].push(withTax.get(d)?.DE?.[f] ?? null);

  // Tax share, Germany, latest week.
  const germanyTax = { date: latestDate };
  for (const f of FUELS) {
    const total = withTax.get(latestDate).DE[f];
    const net = withoutTax.get(latestDate)?.DE?.[f] ?? null;
    germanyTax[f] = net !== null && net < total ? { total, net } : null;
  }

  // Countries: latest value (≤ 4 weeks old) + value ~1 year earlier.
  const yearAgoIndex = dates.findIndex((d) => d <= addDays(latestDate, -364));
  const codes = [...new Set(Object.keys(withTax.get(latestDate)))].sort();
  const countries = [];
  for (const code of codes) {
    const entry = { code };
    let any = false;
    for (const f of FUELS) {
      const now = latestValue(dates, withTax, code, f, latestIndex);
      const ago = yearAgoIndex >= 0 ? latestValue(dates, withTax, code, f, yearAgoIndex) : null;
      entry[f] = now ? now.value : null;
      entry[`${f}Date`] = now ? now.date : null;
      entry[`${f}YearAgo`] = ago ? ago.value : null;
      any ||= !!now;
    }
    if (any) countries.push(entry);
  }

  return {
    source: {
      name: "EU Weekly Oil Bulletin",
      publisher: "European Commission, DG ENER",
      url: "https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en",
      license: "CC BY 4.0",
      note: "Weekly average consumer prices incl. taxes (Monday). Euro-super 95 ≈ Super E5.",
    },
    generatedAt: new Date().toISOString(),
    latestDate,
    germany,
    germanyTax,
    countries,
  };
}

const cellText = (v) => {
  v = plain(v);
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(typeof v === "object" ? JSON.stringify(v) : v).slice(0, 40);
};

async function inspect(buf) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  for (const ws of wb.worksheets) {
    console.log(`\n=== SHEET "${ws.name}" rows=${ws.rowCount} cols=${ws.columnCount}`);
    for (const r of [1, 3, 4, 5]) {
      const row = ws.getRow(r);
      const cells = [];
      for (let c = 1; c <= Math.min(ws.columnCount, 40); c++) cells.push(cellText(row.getCell(c).value));
      console.log(`r${r}: ${cells.join(" | ")}`);
    }
  }
}

const buf = await download(SOURCE);
console.log(`downloaded ${buf.length} bytes`);
if (process.argv.includes("--inspect")) {
  await inspect(buf);
} else {
  const data = await build(buf);
  mkdirSync("src/data", { recursive: true });
  writeFileSync(OUT, JSON.stringify(data) + "\n");
  const de = data.countries.find((c) => c.code === "DE");
  console.log(`latest ${data.latestDate}: DE euro95 ${de.euro95} diesel ${de.diesel}; ${data.germany.dates.length} weeks; ${data.countries.length} countries`);
  console.log(JSON.stringify(data.countries));
  console.log(JSON.stringify(data.germanyTax));
}
