const express = require("express");
const { searchProducts } = require("../services/catalogService");
const {
  upsertTrackedProduct,
  listActiveTrackedProducts,
  getPriceHistoryForTrackedProduct,
  getScrapeLogsForTrackedProduct,
} = require("../../db/price-tracker-db");
const { scrapeTrackedProduct } = require("../services/scrapeManager");

const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function mapTrackedProduct(product) {
  return {
    id: product.id,
    productId: product.product_id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    sku: product.sku,
    url: product.url,
    active: product.active,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    currentPrice: product.current_price,
    currentStockText: product.current_stock_text,
    currentStockQuantity: product.current_stock_quantity,
    currentInStock: product.current_in_stock,
    lastScrapedAt: product.last_scraped_at,
  };
}

router.get(
  "/search",
  asyncRoute(async (req, res) => {
    const query = req.query.q || "";
    const page = Number.parseInt(req.query.page || "1", 10);
    const maxPages = Number.parseInt(req.query.maxPages || "50", 10);
    const result = await searchProducts(query, {
      startPage: Number.isFinite(page) && page > 0 ? page : 1,
      maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.min(maxPages, 20) : 10,
    });
    res.json(result);
  })
);

router.post(
  "/track",
  asyncRoute(async (req, res) => {
    const { productId, name, brand, category, sku, url } = req.body || {};

    if (!productId || !name || !url) {
      throw Object.assign(new Error("productId, name, and url are required"), {
        statusCode: 400,
      });
    }

    const trackedProduct = await upsertTrackedProduct({
      productId,
      name,
      brand,
      category,
      sku,
      url,
      active: true,
    });

    res.status(201).json(mapTrackedProduct(trackedProduct));
  })
);

router.get(
  "/tracked",
  asyncRoute(async (req, res) => {
    const products = await listActiveTrackedProducts();
    res.json({
      items: products.map(mapTrackedProduct),
    });
  })
);

router.get(
  "/:id/history",
  asyncRoute(async (req, res) => {
    const result = await getPriceHistoryForTrackedProduct(req.params.id);

    if (!result) {
      throw Object.assign(new Error("Tracked product not found"), { statusCode: 404 });
    }

    res.json({
      trackedProduct: mapTrackedProduct(result.trackedProduct),
      items: result.history.map((row) => ({
        id: row.id,
        price: Number(row.price),
        stockText: row.stock_text,
        stockQuantity: row.stock_quantity,
        inStock: row.in_stock,
        scrapedAt: row.scraped_at,
      })),
    });
  })
);

router.get(
  "/:id/logs",
  asyncRoute(async (req, res) => {
    const result = await getScrapeLogsForTrackedProduct(req.params.id);

    if (!result) {
      throw Object.assign(new Error("Tracked product not found"), { statusCode: 404 });
    }

    res.json({
      trackedProduct: mapTrackedProduct(result.trackedProduct),
      items: result.logs.map((row) => ({
        id: row.id,
        attemptNumber: row.attempt_number,
        status: row.status,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        error: row.error_message,
        priceFound: row.price_found === null ? null : Number(row.price_found),
        stockText: row.stock_text,
        stockQuantity: row.stock_quantity,
        inStock: row.in_stock,
      })),
    });
  })
);

router.post(
  "/:id/scrape",
  asyncRoute(async (req, res) => {
    const headed = req.query.headed === "true";

    const result = await scrapeTrackedProduct(req.params.id, {
      headed,
    });

    res.json(result);
  })
);

module.exports = router;
