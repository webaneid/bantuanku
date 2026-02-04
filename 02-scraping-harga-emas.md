# Tutorial Scraping Harga Emas Pluang

> Target: buat scraper Node.js ringan yang membaca harga emas per gram terkini dari laman https://pluang.com/asset/gold, lalu mengekstrak angka `currentMidPrice` beserta metrik pendukung yang tersedia di payload Next.js.

---

## 1. Memahami Sumber Data

1. Laman `https://pluang.com/asset/gold` dibangun dengan Next.js. Semua data awal dimuat di `<script id="__NEXT_DATA__" type="application/json">…</script>`.
2. Setelah di-decode menjadi JSON, struktur yang relevan berada di `props.pageProps` dengan beberapa key penting:
   - `goldAssetPerformance.currentMidPrice` → harga emas terakhir, misal `"Rp2.735.207"`.
   - `goldAssetPerformance.oneYear`/`fiveYear` → informasi high/low + persentase.
   - `goldMarketStatsData.stats` → statistik seperti drawdown 3M, komposisi beli/jual, dll.
3. Karena data sudah tersedia di HTML (server-side rendered), kita tidak butuh headless browser. Cukup HTTP GET biasa + parser HTML untuk mengambil isi script tersebut.

> ⚠️ **Catatan legal**: selalu periksa ketentuan layanan Pluang dan pastikan scraping hanya untuk pemakaian internal yang tidak melanggar `robots.txt` atau ToS. Batasi frekuensi request (misal tiap 5-10 menit) supaya tidak membebani server.

---

## 2. Persiapan Lingkungan

Minimal versi Node.js 18 (sudah punya `fetch` built-in). Instal dependensi berikut di folder kerja baru (misal `scripts/pluang-scraper`):

```bash
mkdir -p scripts/pluang-scraper
cd scripts/pluang-scraper
echo "{}" > package.json
npm install cheerio dayjs
```

- `cheerio` → parser HTML ringan untuk mengambil isi elemen `#__NEXT_DATA__`.
- `dayjs` → optional; mempermudah formatting timestamp ketika menyimpan hasil scraping.

Struktur awal:

```
scripts/
  pluang-scraper/
    package.json
    node_modules/
    scrape-gold.js   # akan kita buat di langkah berikut
```

---

## 3. Implementasi Scraper `scrape-gold.js`

```js
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import cheerio from "cheerio";
import dayjs from "dayjs";

const URL = "https://pluang.com/asset/gold";
const OUTPUT = path.resolve(process.cwd(), "gold-price.json");

async function fetchGoldPage() {
  const response = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Node scraper demo)"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseNextData(html) {
  const $ = cheerio.load(html);
  const raw = $("#__NEXT_DATA__").html();
  if (!raw) {
    throw new Error("__NEXT_DATA__ script tag not found");
  }
  return JSON.parse(raw);
}

function extractGoldPayload(nextData) {
  const pageProps = nextData?.props?.pageProps;
  if (!pageProps) {
    throw new Error("pageProps missing in __NEXT_DATA__");
  }

  const performance = pageProps.goldAssetPerformance;
  const stats = pageProps.goldMarketStatsData;

  const currentPriceText = performance?.currentMidPrice; // ex: "Rp2.735.207"
  const numericPrice = currentPriceText
    ? Number(currentPriceText.replace(/[^0-9]/g, ""))
    : null;

  return {
    scrapedAt: dayjs().toISOString(),
    currentMidPrice: currentPriceText,
    currentMidPriceNumber: numericPrice,
    oneYear: performance?.oneYear || null,
    fiveYear: performance?.fiveYear || null,
    keyStats: stats?.stats || [],
  };
}

async function main() {
  try {
    const html = await fetchGoldPage();
    const nextData = parseNextData(html);
    const payload = extractGoldPayload(nextData);
    fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2));
    console.log(`Harga emas tersimpan di ${OUTPUT}`);
    console.log(payload);
  } catch (err) {
    console.error("Scrape failed:", err);
    process.exitCode = 1;
  }
}

main();
```

### Penjelasan langkah demi langkah

1. **HTTP request** – gunakan `fetch` bawaan Node 18 dengan header `User-Agent` yang jelas.
2. **Parsing HTML** – `cheerio.load()` memungkinkan kita memakai selector CSS (`#__NEXT_DATA__`).
3. **JSON decode** – isi script sudah valid JSON, jadi cukup `JSON.parse`.
4. **Ekstraksi** – ambil field yang diperlukan:
   - `currentMidPrice` (string berformat Rupiah)
   - `oneYear` & `fiveYear` untuk data high/low
   - `goldMarketStatsData.stats` untuk key stats
5. **Normalisasi angka** – untuk keperluan kalkulasi, hapus karakter non-digit sebelum `Number()`.
6. **Output** – simpan sebagai `gold-price.json` + log ke console supaya mudah diawasi sistem monitoring.

> 💡 Bisa juga langsung push ke database atau publish ke message queue alih-alih file. Bagian `fs.writeFileSync` tinggal diganti sesuai kebutuhan.

---

## 4. Menjalankan Scraper

```bash
cd scripts/pluang-scraper
node scrape-gold.js
```

Contoh output (`gold-price.json`):

```json
{
  "scrapedAt": "2026-01-21T07:40:38.123Z",
  "currentMidPrice": "Rp2.735.207",
  "currentMidPriceNumber": 2735207,
  "oneYear": {
    "ath": "52W High: Rp3.227.664",
    "atl": "52W Low: Rp1.487.617",
    "athPercentage": "<font color=#FF504B>-15,26%</font>",
    "athDate": "17 October 2025",
    "atlDate": "21 January 2025"
  },
  "fiveYear": { "ath": "5Y High: Rp3.227.664", "atl": "5Y Low: Rp776.853,5" },
  "keyStats": [
    { "key": "3M Drawdown", "value": "<font color=#FF504B>20,76%</font>" },
    { "key": "Trading Activity", "value": "<font color=#1FC62A>55% Beli</font> | ..." }
  ]
}
```

---

## 5. Menjadwalkan (Opsional)

Gunakan `cron` atau GitHub Actions untuk menjalankan per beberapa menit.

### Contoh cron lokal (setiap 15 menit)

```cron
*/15 * * * * /usr/local/bin/node /path/to/scripts/pluang-scraper/scrape-gold.js >> /var/log/pluang-gold.log 2>&1
```

### Contoh GitHub Actions (harian)

```yaml
name: Scrape Pluang Gold
on:
  schedule:
    - cron: "0 * * * *"
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
        working-directory: scripts/pluang-scraper
      - run: node scrape-gold.js
        working-directory: scripts/pluang-scraper
      - uses: actions/upload-artifact@v4
        with:
          name: gold-price
          path: scripts/pluang-scraper/gold-price.json
```

---

## 6. Pengembangan Lanjut

1. **Normalisasi Output** – simpan angka Rupiah dalam bentuk float + metadata (gram vs ons) agar mudah diolah.
2. **Alerting** – bandingkan harga terbaru dengan rata-rata 24 jam, kirim notifikasi jika loncatan > X%.
3. **Multi Asset** – `__NEXT_DATA__` juga memuat `goldSimilarAssetData`. Kamu bisa memperluas scraper untuk aset lain dengan mengganti URL.
4. **API fallback** – jika Pluang menyediakan endpoint resmi (misal GraphQL/REST), beralih ke API untuk stabilitas lebih baik.
5. **Snapshot historis** – push hasil ke DB time-series (Influx, Timescale) untuk charting internal.

---

Sekarang kamu punya panduan lengkap untuk membangun scraper Node.js sederhana yang memanen harga emas terkini dari Pluang. Silakan kembangkan sesuai kebutuhan pipeline Bantuanku. Semoga membantu!
