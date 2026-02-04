# 💰 Gold Price Auto-Update System

## Overview

Sistem auto-update harga emas dari Pluang.com untuk perhitungan zakat nisab di aplikasi Bantuanku.

## Features

✅ **Auto-scraping** harga emas dari Pluang.com
✅ **UI Button** untuk manual update via dashboard
✅ **API Endpoint** untuk programmatic update
✅ **Cron Script** untuk scheduled auto-update
✅ **Database Integration** langsung update setting `zakat_gold_price`

---

## Cara Kerja

### 1. Data Source
- **URL**: https://pluang.com/asset/gold
- **Method**: Parse `__NEXT_DATA__` JSON dari server-side rendered page
- **Field**: `props.pageProps.goldAssetPerformance.currentMidPrice`
- **Format**: "Rp2.735.207" → dikonversi ke number `2735207`

### 2. Update Flow

```
┌─────────────────┐
│  Pluang.com     │
│  Gold Page      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Scraper Script │ ──► Parse __NEXT_DATA__
│  scrape-gold-   │     Extract currentMidPrice
│  price.mjs      │     Convert to number
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│   settings      │ ──► UPDATE zakat_gold_price
│   table         │
└─────────────────┘
```

---

## Usage

### Option 1: Manual Update via UI (Recommended)

1. Login sebagai **Super Admin**
2. Buka **Dashboard → Settings → General Settings**
3. Klik tab **"Setting Zakat"**
4. Di field **"Harga Emas (Rp/gram)"**, klik tombol:
   ```
   🔄 Auto Update dari Pluang
   ```
5. Harga akan otomatis ter-update dari Pluang.com

**Screenshot**:
```
┌─────────────────────────────────────────┐
│ Harga Emas (Rp/gram) *                  │
│ ┌─────────────────────────────────────┐ │
│ │ Rp │ 2735207                        │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │  🔄 Auto Update dari Pluang         │ │
│ └─────────────────────────────────────┘ │
│ Update manual atau klik tombol untuk    │
│ ambil harga terkini dari Pluang.com     │
└─────────────────────────────────────────┘
```

### Option 2: Via Script (Manual)

#### Dry-run (preview only):
```bash
cd apps/api/scripts
node scrape-gold-price.mjs --dry-run
```

#### Actual update:
```bash
cd apps/api/scripts
node scrape-gold-price.mjs
```

Output:
```
🚀 Starting gold price scraper...
📡 Fetching gold price from Pluang...
✅ Page fetched successfully
✅ __NEXT_DATA__ parsed successfully

💰 Gold Price Information:
   Price (formatted): Rp2.735.207
   Price (numeric): 2.735.207
   Scraped at: 2026-01-21T00:43:36.194Z
   52W High: 52W High: Rp3.227.664
   52W Low: 52W Low: Rp1.487.617

✅ Database updated successfully
   Setting: zakat_gold_price
   New value: 2735207

✅ Script completed successfully!
```

### Option 3: Via API

```bash
curl -X POST http://localhost:50245/v1/admin/settings/auto-update-gold-price \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "message": "Harga emas berhasil diperbarui dari Pluang",
  "data": {
    "priceText": "Rp2.735.207",
    "priceNumber": 2735207,
    "updatedAt": "2026-01-21T08:00:00.000Z"
  }
}
```

### Option 4: Scheduled Auto-Update (Production)

#### Setup Cron Job

Edit crontab:
```bash
crontab -e
```

Add line (update setiap hari jam 9 pagi):
```cron
0 9 * * * /path/to/bantuanku/apps/api/scripts/cron-update-gold-price.sh >> /var/log/gold-price.log 2>&1
```

#### Alternative: GitHub Actions

Create `.github/workflows/update-gold-price.yml`:

```yaml
name: Update Gold Price Daily

on:
  schedule:
    # Run every day at 2 AM UTC (9 AM WIB)
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  update-gold-price:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd apps/api
          npm install pg

      - name: Run gold price scraper
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd apps/api/scripts
          node scrape-gold-price.mjs

      - name: Notify on failure
        if: failure()
        run: |
          echo "Gold price update failed!"
          # Add notification logic (email, Slack, etc.)
```

---

## Files Structure

```
apps/api/
├── scripts/
│   ├── scrape-gold-price.mjs      # Main scraper script
│   ├── cron-update-gold-price.sh  # Cron wrapper
│   └── README.md                   # Scripts documentation
└── src/
    └── routes/
        └── admin/
            └── settings.ts         # API endpoint for auto-update

apps/admin/
└── src/
    └── app/
        └── dashboard/
            └── settings/
                └── general/
                    └── page.tsx    # UI with auto-update button
```

---

## Environment Variables

Script memerlukan database connection:

```bash
DATABASE_URL=postgresql://user:password@host:port/bantuanku
```

**Default** (if not set):
```
postgresql://webane@localhost:5432/bantuanku
```

---

## Technical Details

### Scraper Implementation

```javascript
// 1. Fetch HTML page
const response = await fetch("https://pluang.com/asset/gold");
const html = await response.text();

// 2. Extract __NEXT_DATA__ JSON
const match = html.match(/<script id="__NEXT_DATA__".*?>(.*?)<\/script>/);
const nextData = JSON.parse(match[1]);

// 3. Get gold price
const priceText = nextData.props.pageProps.goldAssetPerformance.currentMidPrice;
// "Rp2.735.207"

// 4. Convert to number
const priceNumber = Number(priceText.replace(/[^0-9]/g, ""));
// 2735207

// 5. Update database
await db.update(settings)
  .set({ value: priceNumber.toString() })
  .where(eq(settings.key, "zakat_gold_price"));
```

### Database Schema

```sql
-- settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP,
  updated_by TEXT
);

-- Specific record for gold price
INSERT INTO settings VALUES (
  'zakat_gold_price',      -- key
  '2735207',               -- value (updated by scraper)
  'zakat',                 -- category
  'number',                -- type
  'Harga Emas',            -- label
  'Harga emas per gram...' -- description
);
```

---

## Monitoring & Troubleshooting

### Check Current Gold Price

```sql
SELECT
  key,
  value,
  updated_at,
  updated_by
FROM settings
WHERE key = 'zakat_gold_price';
```

### View Cron Logs

```bash
tail -f /var/log/gold-price.log
```

### Test Scraper

```bash
# Dry run (no database update)
node scrape-gold-price.mjs --dry-run

# Actual run
node scrape-gold-price.mjs
```

### Common Issues

#### ❌ "pg module not found"
**Solution**:
```bash
cd apps/api
npm install pg
```

#### ❌ "Database connection failed"
**Solution**: Check `DATABASE_URL` environment variable
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

#### ❌ "__NEXT_DATA__ not found"
**Solution**: Pluang website structure changed. Update parsing logic in `parseNextData()` function.

#### ❌ "currentMidPrice not found"
**Solution**: JSON structure changed. Check `nextData.props.pageProps.goldAssetPerformance` path.

---

## Legal & Compliance

⚠️ **Important Notes**:

1. **Rate Limiting**: Script runs max 1x per day (respect server resources)
2. **User-Agent**: Clear identification: `"Mozilla/5.0 (compatible; Bantuanku/1.0)"`
3. **robots.txt**: Always check and comply with Pluang's robots.txt
4. **Terms of Service**: For internal use only, not for commercial redistribution
5. **Data Usage**: Only extract gold price, no other data
6. **Attribution**: Data sourced from Pluang.com

### Robots.txt Compliance

Check before using:
```bash
curl https://pluang.com/robots.txt
```

---

## Maintenance

### Update Schedule
- **Daily**: Automated via cron (9 AM)
- **Manual**: Anytime via UI button
- **Emergency**: Via script or API

### Version History
- **v1.0** (2026-01-21): Initial implementation
  - Basic scraper with __NEXT_DATA__ parsing
  - API endpoint for auto-update
  - UI button integration
  - Cron job setup

---

## Support

For issues or questions:
1. Check logs: `/var/log/gold-price.log`
2. Run dry-run: `node scrape-gold-price.mjs --dry-run`
3. Contact development team

---

**Last Updated**: 2026-01-21
**Maintained by**: Bantuanku Development Team
