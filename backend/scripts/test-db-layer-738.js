const { loadEnvFile } = require("./load-env");
const {
  recordScrapeRun,
  getProductDebugRows,
  buildScrapeLogRows,
} = require("../db/price-tracker-db");

loadEnvFile();

const product738 = {
  productId: "738",
  name: "[TEST DATA] Amperage Fitness Band X",
  brand: "Amperage",
  category: "Wearables",
  sku: "AMP-10738",
  url: "https://demo.inelabteamdev.com/product/738",
  active: true,
};

const realisticSuccessfulScrape = {
  ok: true,
  productId: "738",
  url: "https://demo.inelabteamdev.com/product/738",
  startedAt: "2026-09-19T15:46:22.234Z",
  finishedAt: "2026-09-19T15:46:35.054Z",
  attempts: [
    {
      attempt: 1,
      ok: true,
      startedAt: "2026-09-19T15:46:22.234Z",
      finishedAt: "2026-09-19T15:46:35.054Z",
      result: {
        price: "₹7,186",
        stock: {
          text: "HURRY, JUST 9 LEFT",
          quantity: 9,
          inStock: true,
        },
      },
      networkEvents: [
        {
          method: "GET",
          status: 200,
          url: "https://demo.inelabteamdev.com/api/challenge",
        },
        {
          method: "POST",
          status: 200,
          url: "https://demo.inelabteamdev.com/api/session",
        },
        {
          method: "GET",
          status: 200,
          url: "https://demo.inelabteamdev.com/api/products/738/price",
        },
      ],
    },
  ],
  result: {
    price: "₹7,186",
    stock: {
      text: "HURRY, JUST 9 LEFT",
      quantity: 9,
      inStock: true,
    },
  },
};

function printDryRun() {
  console.log("Supabase credentials are missing; no database insert was attempted.");
  console.log("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then rerun this script.");
  console.log("\nRows that would be inserted for scrape_logs:");
  console.log(
    JSON.stringify(
      buildScrapeLogRows("tracked-product-uuid-from-upsert", realisticSuccessfulScrape),
      null,
      2
    )
  );
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    printDryRun();
    return;
  }

  const inserted = await recordScrapeRun(product738, realisticSuccessfulScrape);
  const verified = await getProductDebugRows("738");

  const latestLog = verified.scrapeLogs[0] || null;
  const latestHistory = verified.priceHistory[0] || null;

  const checks = {
    trackedProductsContains738: verified.trackedProduct?.product_id === "738",
    scrapeLogsContainsAttempt:
      latestLog?.attempt_number === 1 && latestLog?.status === "SUCCESS",
    priceHistoryContainsSuccessfulSnapshot:
      Number(latestHistory?.price) === 7186 &&
      latestHistory?.stock_text === "HURRY, JUST 9 LEFT" &&
      latestHistory?.stock_quantity === 9 &&
      latestHistory?.in_stock === true,
  };

  console.log("Inserted test data marker: product name starts with [TEST DATA].");
  console.log("\nInserted rows:");
  console.log(JSON.stringify(inserted, null, 2));
  console.log("\nVerification:");
  console.log(JSON.stringify(checks, null, 2));

  if (!Object.values(checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
