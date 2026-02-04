#!/bin/bash
#
# Cron script untuk auto-update harga emas setiap hari
#
# Setup cron (edit dengan: crontab -e):
# 0 9 * * * /path/to/cron-update-gold-price.sh >> /var/log/gold-price-cron.log 2>&1
#
# Penjelasan: Run setiap hari jam 9 pagi
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_SCRIPT="$SCRIPT_DIR/scrape-gold-price.mjs"

echo "========================================="
echo "Gold Price Auto-Update Cron"
echo "Started at: $(date)"
echo "========================================="

# Check if node script exists
if [ ! -f "$NODE_SCRIPT" ]; then
    echo "ERROR: Script not found: $NODE_SCRIPT"
    exit 1
fi

# Run the scraper
node "$NODE_SCRIPT"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Gold price updated successfully"
else
    echo "❌ Gold price update failed with exit code: $EXIT_CODE"
fi

echo "Finished at: $(date)"
echo ""

exit $EXIT_CODE
