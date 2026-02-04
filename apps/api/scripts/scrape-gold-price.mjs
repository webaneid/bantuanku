#!/usr/bin/env node
/**
 * Scraper Harga Emas Pluang
 *
 * Script ini scrape harga emas terkini dari Pluang.com
 * dan update ke database settings untuk perhitungan zakat
 *
 * Usage:
 *   node scrape-gold-price.mjs
 *   node scrape-gold-price.mjs --dry-run  (preview only, tidak update DB)
 */

import pg from 'pg';
const { Client } = pg;

const URL = "https://pluang.com/asset/gold";
const isDryRun = process.argv.includes('--dry-run');

async function fetchGoldPage() {
  console.log('📡 Fetching gold price from Pluang...');
  const response = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Bantuanku/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

function parseNextData(html) {
  // Extract __NEXT_DATA__ script tag content
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  if (!match) {
    throw new Error('__NEXT_DATA__ script tag not found');
  }

  return JSON.parse(match[1]);
}

function extractGoldPrice(nextData) {
  const pageProps = nextData?.props?.pageProps;
  if (!pageProps) {
    throw new Error('pageProps missing in __NEXT_DATA__');
  }

  const performance = pageProps.goldAssetPerformance;
  const currentPriceText = performance?.currentMidPrice; // "Rp2.735.207"

  if (!currentPriceText) {
    throw new Error('currentMidPrice not found');
  }

  // Convert "Rp2.735.207" to 2735207
  const numericPrice = Number(currentPriceText.replace(/[^0-9]/g, ""));

  return {
    priceText: currentPriceText,
    priceNumber: numericPrice,
    scrapedAt: new Date().toISOString(),
    oneYear: performance?.oneYear || null,
  };
}

async function updateDatabase(goldPrice) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://webane@localhost:5432/bantuanku'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Update zakat_gold_price setting
    const result = await client.query(`
      INSERT INTO settings (key, value, category, type, label, description, updated_at)
      VALUES ('zakat_gold_price', $1, 'zakat', 'number', 'Harga Emas', 'Harga emas per gram dalam Rupiah', NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = $1,
        updated_at = NOW()
      RETURNING *
    `, [goldPrice.priceNumber.toString()]);

    console.log('✅ Database updated successfully');
    console.log('   Setting:', result.rows[0].key);
    console.log('   Old value:', result.rows[0].value);
    console.log('   New value:', goldPrice.priceNumber);

    return result.rows[0];
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    console.log('🚀 Starting gold price scraper...\n');

    // Step 1: Fetch HTML
    const html = await fetchGoldPage();
    console.log('✅ Page fetched successfully\n');

    // Step 2: Parse __NEXT_DATA__
    const nextData = parseNextData(html);
    console.log('✅ __NEXT_DATA__ parsed successfully\n');

    // Step 3: Extract gold price
    const goldPrice = extractGoldPrice(nextData);
    console.log('💰 Gold Price Information:');
    console.log('   Price (formatted):', goldPrice.priceText);
    console.log('   Price (numeric):', goldPrice.priceNumber.toLocaleString('id-ID'));
    console.log('   Scraped at:', goldPrice.scrapedAt);

    if (goldPrice.oneYear) {
      console.log('   52W High:', goldPrice.oneYear.ath);
      console.log('   52W Low:', goldPrice.oneYear.atl);
    }
    console.log('');

    // Step 4: Update database (if not dry-run)
    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - Database not updated');
      console.log('   Run without --dry-run to update database');
    } else {
      await updateDatabase(goldPrice);
    }

    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
