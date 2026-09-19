const { supabaseFetch } = require("./supabase-client");

function productUrlFor(productId) {
  return `https://demo.inelabteamdev.com/product/${encodeURIComponent(String(productId))}`;
}

function parsePriceToNumber(price) {
  if (price === null || price === undefined) return null;
  if (typeof price === "number") return Number.isFinite(price) ? price : null;

  const cleaned = String(price).replace(/[^\d.]/g, "");
  if (cleaned === "") return null;

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStock(stock) {
  if (!stock || typeof stock !== "object") return null;

  const text = stock.text === undefined || stock.text === null
    ? ""
    : String(stock.text).trim();
  const quantity = stock.quantity;
  const inStock = stock.inStock;

  if (text === "") return null;
  if (!Number.isInteger(quantity) || quantity < 0) return null;
  if (typeof inStock !== "boolean") return null;

  return {
    text,
    quantity,
    inStock,
  };
}

function normalizeProduct(product) {
  const productId = product?.productId;
  if (productId === undefined || productId === null || String(productId).trim() === "") {
    throw new Error("product.productId is required");
  }

  return {
    product_id: String(productId),
    name: product.name || `INE Product ${productId}`,
    brand: product.brand || null,
    category: product.category || null,
    sku: product.sku || null,
    url: product.url || productUrlFor(productId),
    active: product.active ?? true,
  };
}

function successfulSnapshotFromAttempt(attempt) {
  if (!attempt?.ok || !attempt.result) return null;

  const price = parsePriceToNumber(attempt.result.price);
  const stock = normalizeStock(attempt.result.stock);

  if (price === null || stock === null) return null;

  return {
    price,
    stock,
  };
}

async function upsertTrackedProduct(product) {
  const row = normalizeProduct(product);
  const rows = await supabaseFetch("/tracked_products?on_conflict=product_id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Tracked product upsert did not return exactly one row");
  }

  return rows[0];
}

function buildScrapeLogRows(trackedProductId, scrapeResult) {
  const attempts = Array.isArray(scrapeResult?.attempts) ? scrapeResult.attempts : [];
  const runStartedAt = scrapeResult?.startedAt || new Date().toISOString();
  const runFinishedAt = scrapeResult?.finishedAt || new Date().toISOString();

  return attempts.map((attempt) => {
    const snapshot = successfulSnapshotFromAttempt(attempt);
    const status = attempt.ok && snapshot !== null ? "SUCCESS" : "FAILED";

    return {
      tracked_product_id: trackedProductId,
      attempt_number: attempt.attempt,
      status,
      started_at: attempt.startedAt || runStartedAt,
      finished_at: attempt.finishedAt || runFinishedAt,
      error_message: status === "FAILED" ? attempt.error || "Scrape attempt failed" : null,
      price_found: snapshot === null ? null : snapshot.price,
      stock_text: snapshot === null ? null : snapshot.stock.text,
      stock_quantity: snapshot === null ? null : snapshot.stock.quantity,
      in_stock: snapshot === null ? null : snapshot.stock.inStock,
    };
  });
}

async function insertScrapeLogs(trackedProductId, scrapeResult) {
  const rows = buildScrapeLogRows(trackedProductId, scrapeResult);
  if (rows.length === 0) return [];

  return supabaseFetch("/scrape_logs", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });
}

async function insertPriceHistoryForSuccessfulResult(trackedProductId, scrapeResult) {
  if (!scrapeResult?.ok || !scrapeResult.result) return null;

  const price = parsePriceToNumber(scrapeResult.result.price);
  const stock = normalizeStock(scrapeResult.result.stock);

  if (price === null || stock === null) {
    throw new Error("Refusing to insert invalid price history snapshot");
  }

  const rows = await supabaseFetch("/price_history", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      tracked_product_id: trackedProductId,
      price,
      stock_text: stock.text,
      stock_quantity: stock.quantity,
      in_stock: stock.inStock,
      scraped_at: scrapeResult.finishedAt || new Date().toISOString(),
    }),
  });

  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Price history insert did not return exactly one row");
  }

  return rows[0];
}

async function recordScrapeRun(product, scrapeResult) {
  const trackedProduct = await upsertTrackedProduct(product);
  const scrapeLogs = await insertScrapeLogs(trackedProduct.id, scrapeResult);
  const priceHistory = await insertPriceHistoryForSuccessfulResult(
    trackedProduct.id,
    scrapeResult
  );

  return {
    trackedProduct,
    scrapeLogs,
    priceHistory,
  };
}

async function findTrackedProduct(idOrProductId) {
  const value = String(idOrProductId);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidPattern.test(value)) {
    const idQuery = `/tracked_products?id=eq.${encodeURIComponent(value)}&select=*&limit=1`;
    const idRows = await supabaseFetch(idQuery);

    if (Array.isArray(idRows) && idRows.length > 0) {
      return idRows[0];
    }
  }

  const productRows = await supabaseFetch(
    `/tracked_products?product_id=eq.${encodeURIComponent(value)}&select=*&limit=1`
  );

  return productRows?.[0] || null;
}

async function listActiveTrackedProducts() {
  const trackedProducts = await supabaseFetch(
    "/tracked_products?active=eq.true&select=*&order=created_at.desc"
  );

  const withLatest = [];

  for (const product of trackedProducts) {
    const latestRows = await supabaseFetch(
      `/price_history?tracked_product_id=eq.${product.id}&select=*&order=scraped_at.desc&limit=1`
    );
    const latest = latestRows?.[0] || null;

    withLatest.push({
      ...product,
      current_price: latest?.price ?? null,
      current_stock_text: latest?.stock_text ?? null,
      current_stock_quantity: latest?.stock_quantity ?? null,
      current_in_stock: latest?.in_stock ?? null,
      last_scraped_at: latest?.scraped_at ?? null,
    });
  }

  return withLatest;
}

async function getPriceHistoryForTrackedProduct(idOrProductId) {
  const trackedProduct = await findTrackedProduct(idOrProductId);
  if (!trackedProduct) return null;

  const history = await supabaseFetch(
    `/price_history?tracked_product_id=eq.${trackedProduct.id}&select=*&order=scraped_at.desc`
  );

  return {
    trackedProduct,
    history,
  };
}

async function getScrapeLogsForTrackedProduct(idOrProductId) {
  const trackedProduct = await findTrackedProduct(idOrProductId);
  if (!trackedProduct) return null;

  const logs = await supabaseFetch(
    `/scrape_logs?tracked_product_id=eq.${trackedProduct.id}&select=*&order=started_at.desc`
  );

  return {
    trackedProduct,
    logs,
  };
}

async function recordScrapeRunForTrackedProduct(trackedProduct, scrapeResult) {
  const scrapeLogs = await insertScrapeLogs(trackedProduct.id, scrapeResult);
  const priceHistory = await insertPriceHistoryForSuccessfulResult(
    trackedProduct.id,
    scrapeResult
  );

  return {
    trackedProduct,
    scrapeLogs,
    priceHistory,
  };
}

async function getProductDebugRows(productId) {
  const productRows = await supabaseFetch(
    `/tracked_products?product_id=eq.${encodeURIComponent(String(productId))}&select=*`
  );
  const trackedProduct = productRows?.[0] || null;

  if (!trackedProduct) {
    return {
      trackedProduct: null,
      scrapeLogs: [],
      priceHistory: [],
    };
  }

  const scrapeLogs = await supabaseFetch(
    `/scrape_logs?tracked_product_id=eq.${trackedProduct.id}&select=*&order=started_at.desc`
  );
  const priceHistory = await supabaseFetch(
    `/price_history?tracked_product_id=eq.${trackedProduct.id}&select=*&order=scraped_at.desc`
  );

  return {
    trackedProduct,
    scrapeLogs,
    priceHistory,
  };
}

module.exports = {
  recordScrapeRun,
  recordScrapeRunForTrackedProduct,
  upsertTrackedProduct,
  findTrackedProduct,
  listActiveTrackedProducts,
  getPriceHistoryForTrackedProduct,
  getScrapeLogsForTrackedProduct,
  insertScrapeLogs,
  insertPriceHistoryForSuccessfulResult,
  buildScrapeLogRows,
  getProductDebugRows,
  parsePriceToNumber,
  normalizeStock,
};
