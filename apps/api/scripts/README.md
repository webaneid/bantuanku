# Scripts Documentation

## Gold Price Scraper

### Overview
Auto-update harga emas dari Pluang.com untuk perhitungan zakat nisab.

### Files
- `scrape-gold-price.mjs` - Main scraper script
- `cron-update-gold-price.sh` - Cron wrapper script

### Manual Usage

#### Test scraper (dry-run, tidak update database):
```bash
cd apps/api/scripts
node scrape-gold-price.mjs --dry-run
```

#### Update database:
```bash
cd apps/api/scripts
node scrape-gold-price.mjs
```

### Auto-Update via API
API endpoint tersedia untuk update harga emas via UI:

```http
POST /v1/admin/settings/auto-update-gold-price
Authorization: Bearer <token>
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

### Setup Cron Job

#### Development (Local)
Edit crontab:
```bash
crontab -e
```

Add this line (update setiap hari jam 9 pagi):
```cron
0 9 * * * /Users/webane/sites/bantuanku/apps/api/scripts/cron-update-gold-price.sh >> /var/log/gold-price-cron.log 2>&1
```

#### Production (Server)
```bash
# Setup cron on server
crontab -e

# Add (sesuaikan path):
0 9 * * * /path/to/apps/api/scripts/cron-update-gold-price.sh >> /var/log/gold-price-cron.log 2>&1
```

#### Alternative: GitHub Actions
Buat file `.github/workflows/update-gold-price.yml`:

```yaml
name: Update Gold Price

on:
  schedule:
    # Run setiap hari jam 2 pagi UTC (9 pagi WIB)
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Update gold price
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd apps/api/scripts
          npm install pg
          node scrape-gold-price.mjs
```

### Environment Variables

Script membutuhkan koneksi database:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

Default (jika tidak ada env var):
```
postgresql://webane@localhost:5432/bantuanku
```

### Monitoring

#### Check last update:
```sql
SELECT * FROM settings WHERE key = 'zakat_gold_price';
```

#### View cron logs:
```bash
tail -f /var/log/gold-price-cron.log
```

### Troubleshooting

#### Script fails with "pg module not found"
```bash
cd apps/api
npm install pg
```

#### Database connection fails
Check `DATABASE_URL` environment variable atau hardcoded connection string di script.

#### Pluang website structure changed
Update the HTML parsing logic di `parseNextData()` function jika Pluang mengubah struktur `__NEXT_DATA__`.

### Legal & Ethics

⚠️ **Important**:
- Scraping dilakukan sesuai robots.txt Pluang
- Request dibatasi (hanya 1x per hari)
- User-Agent jelas: "Mozilla/5.0 (compatible; Bantuanku/1.0)"
- Hanya untuk internal use, bukan komersial
- Selalu cek Terms of Service Pluang

### Support

Jika ada pertanyaan atau issues, hubungi development team.
