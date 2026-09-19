const { scrapeProduct } = require("./scraperService");

const {
  findTrackedProduct,
  listActiveTrackedProducts,
  recordScrapeRunForTrackedProduct,
} = require("../../db/price-tracker-db");

const activeScrapes = new Set();

function publicScrapeResult(scrapeResult) {
  return {
    ok: scrapeResult.ok,
    productId: scrapeResult.productId,
    url: scrapeResult.url,
    startedAt: scrapeResult.startedAt,
    finishedAt: scrapeResult.finishedAt,
    attemptCount: scrapeResult.attemptCount,
    result: scrapeResult.result || null,
    error: scrapeResult.error || null,
    attempts: scrapeResult.attempts || [],
  };
}

async function scrapeTrackedProduct(idOrProductId, options = {}) {
  const trackedProduct = await findTrackedProduct(idOrProductId);

  if (!trackedProduct) {
    throw Object.assign(new Error("Tracked product not found"), {
      statusCode: 404,
    });
  }

  if (activeScrapes.has(trackedProduct.id)) {
    throw Object.assign(
      new Error("Scrape already in progress for this product"),
      {
        statusCode: 409,
      }
    );
  }

  activeScrapes.add(trackedProduct.id);

  try {
    const scrapeResult = await scrapeProduct(trackedProduct.product_id, {
      headless: !options.headed,
    });

    const persisted = await recordScrapeRunForTrackedProduct(
      trackedProduct,
      scrapeResult
    );

    return {
      trackedProduct,
      scrape: publicScrapeResult(scrapeResult),
      persisted,
    };
  } finally {
    activeScrapes.delete(trackedProduct.id);
  }
}

async function scrapeAllTrackedProducts() {
  const products = await listActiveTrackedProducts();
  const results = [];

  for (const product of products) {
    try {
      const result = await scrapeTrackedProduct(product.id);

      results.push({
        productId: product.product_id,
        trackedProductId: product.id,
        ok: result.scrape.ok,
        result,
      });
    } catch (error) {
      results.push({
        productId: product.product_id,
        trackedProductId: product.id,
        ok: false,
        error: error.message,
      });
    }
  }

  return {
    total: products.length,
    successful: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

module.exports = {
  scrapeTrackedProduct,
  scrapeAllTrackedProducts,
};