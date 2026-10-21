// Downloads the EU Weekly Oil Bulletin price history and writes src/data/benchmarks.json.
// Run in CI (GitHub Actions, weekly). `--inspect` only prints the workbook structure.
import ExcelJS from "exceljs";

const SOURCE =
  "https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx";

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

const cellText = (v) => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") return JSON.stringify(v.result ?? v.richText?.map((r) => r.text).join("") ?? v).slice(0, 40);
  return String(v).slice(0, 40);
};

async function inspect(buf) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  for (const ws of wb.worksheets) {
    console.log(`\n=== SHEET "${ws.name}" rows=${ws.rowCount} cols=${ws.columnCount}`);
    const show = (r) => {
      const row = ws.getRow(r);
      const cells = [];
      for (let c = 1; c <= Math.min(ws.columnCount, 60); c++) cells.push(cellText(row.getCell(c).value));
      console.log(`r${r}: ${cells.join(" | ")}`);
    };
    for (let r = 1; r <= Math.min(ws.rowCount, 12); r++) show(r);
    for (let r = Math.max(13, ws.rowCount - 2); r <= ws.rowCount; r++) show(r);
  }
}

const buf = await download(SOURCE);
console.log(`downloaded ${buf.length} bytes`);
if (process.argv.includes("--inspect")) await inspect(buf);
