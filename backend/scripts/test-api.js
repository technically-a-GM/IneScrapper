const http = require("http");
const { loadEnvFile } = require("./load-env");
const app = require("../../server/server");

loadEnvFile();

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.once("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}

async function fetchRealProduct738() {
  const response = await fetch("https://demo.inelabteamdev.com/api/product/738");
  if (!response.ok) {
    throw new Error(`INE product API returned ${response.status}`);
  }

  const product = await response.json();
  return {
    productId: String(product.id),
    name: product.name,
    brand: product.brand,
    category: product.category,
    sku: product.sku,
    url: "https://demo.inelabteamdev.com/product/738",
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function simplifyAttempts(attempts) {
  return attempts.map((attempt) => ({
    attempt: attempt.attempt,
    ok: attempt.ok,
    status: attempt.ok ? "SUCCESS" : "FAILED",
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    error: attempt.error || null,
    price: attempt.result?.price || null,
    stockText: attempt.result?.stock?.text || null,
    stockQuantity: attempt.result?.stock?.quantity ?? null,
    inStock: attempt.result?.stock?.inStock ?? null,
    network:
      attempt.networkEvents?.map((event) => ({
        method: event.method,
        status: event.status,
        path: new URL(event.url).pathname,
      })) || [],
  }));
}

function pickNewRows(afterRows, beforeCount, expectedCount) {
  const delta = afterRows.length - beforeCount;
  assert(delta === expectedCount, `Expected ${expectedCount} new rows, got ${delta}`);
  return afterRows.slice(0, expectedCount).reverse();
}

async function run() {
  const { server, baseUrl } = await listen(app);

  try {
    const report = {
      supabaseConnection: "not tested",
      statuses: {},
      counts: {},
      scrape: null,
      attempts: [],
      endpointChecks: {},
    };

    const health = await request(baseUrl, "/health");
    report.statuses.health = health.status;
    assert(health.status === 200 && health.body?.ok === true, "GET /health failed");

    const search = await request(baseUrl, "/api/products/search?q=Fitness");
    report.statuses.search = search.status;
    report.endpointChecks.searchReturned = search.body?.items?.length || 0;
    report.endpointChecks.searchPages = search.body?.searchedPages || 0;
    assert(search.status === 200 && Array.isArray(search.body?.items), "search failed");

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      report.supabaseConnection = "skipped: credentials missing";
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const product738 = await fetchRealProduct738();

    const track = await request(baseUrl, "/api/products/track", {
      method: "POST",
      body: JSON.stringify(product738),
    });
    report.statuses.track = track.status;
    assert(track.status === 201 && track.body?.productId === "738", "track failed");
    report.supabaseConnection = "succeeded";

    const trackedBefore = await request(baseUrl, "/api/products/tracked");
    report.statuses.trackedBefore = trackedBefore.status;
    assert(trackedBefore.status === 200, "tracked products failed before scrape");
    const trackedProduct738 = trackedBefore.body.items.find((item) => item.productId === "738");
    assert(trackedProduct738, "tracked_products does not contain product 738");
    report.counts.trackedProductsFor738 = trackedBefore.body.items.filter(
      (item) => item.productId === "738"
    ).length;

    const logsBefore = await request(baseUrl, "/api/products/738/logs");
    report.statuses.logsBefore = logsBefore.status;
    assert(logsBefore.status === 200, "logs endpoint failed before scrape");
    const historyBefore = await request(baseUrl, "/api/products/738/history");
    report.statuses.historyBefore = historyBefore.status;
    assert(historyBefore.status === 200, "history endpoint failed before scrape");
    const logsBeforeCount = logsBefore.body.items.length;
    const historyBeforeCount = historyBefore.body.items.length;

    const scrape = await request(baseUrl, "/api/products/738/scrape", {
      method: "POST",
      body: JSON.stringify({}),
    });
    report.statuses.scrape = scrape.status;
    assert(scrape.status === 200, "scrape endpoint failed");
    assert(scrape.body?.scrape?.attempts?.length > 0, "scrape returned no attempts");

    const scrapeResult = scrape.body.scrape;
    report.scrape = {
      ok: scrapeResult.ok,
      attemptCount: scrapeResult.attemptCount,
      price: scrapeResult.result?.price || null,
      stockText: scrapeResult.result?.stock?.text || null,
      stockQuantity: scrapeResult.result?.stock?.quantity ?? null,
      inStock: scrapeResult.result?.stock?.inStock ?? null,
      error: scrapeResult.error || null,
    };
    report.attempts = simplifyAttempts(scrapeResult.attempts);

    const logsAfter = await request(baseUrl, "/api/products/738/logs");
    report.statuses.logsAfter = logsAfter.status;
    assert(logsAfter.status === 200, "logs endpoint failed after scrape");
    const historyAfter = await request(baseUrl, "/api/products/738/history");
    report.statuses.historyAfter = historyAfter.status;
    assert(historyAfter.status === 200, "history endpoint failed after scrape");
    const trackedAfter = await request(baseUrl, "/api/products/tracked");
    report.statuses.trackedAfter = trackedAfter.status;
    assert(trackedAfter.status === 200, "tracked products endpoint failed after scrape");

    const newLogRows = pickNewRows(
      logsAfter.body.items,
      logsBeforeCount,
      scrapeResult.attemptCount
    );

    report.counts.scrapeAttemptsReturned = scrapeResult.attemptCount;
    report.counts.scrapeLogsBefore = logsBeforeCount;
    report.counts.scrapeLogsAfter = logsAfter.body.items.length;
    report.counts.scrapeLogsInserted = logsAfter.body.items.length - logsBeforeCount;
    report.counts.priceHistoryBefore = historyBeforeCount;
    report.counts.priceHistoryAfter = historyAfter.body.items.length;
    report.counts.priceHistoryInserted = historyAfter.body.items.length - historyBeforeCount;
    report.endpointChecks.historyWorks = true;
    report.endpointChecks.logsWorks = true;
    report.endpointChecks.trackedProductsWorks = true;

    newLogRows.forEach((logRow, index) => {
      const attempt = scrapeResult.attempts[index];
      assert(logRow.attemptNumber === attempt.attempt, "log attempt number mismatch");
      assert(logRow.status === (attempt.ok ? "SUCCESS" : "FAILED"), "log status mismatch");
      assert(Boolean(logRow.startedAt), "log missing startedAt");
      assert(Boolean(logRow.finishedAt), "log missing finishedAt");

      if (!attempt.ok) {
        assert(Boolean(logRow.error), "failed log missing error message");
      }
    });

    if (scrapeResult.ok) {
      assert(
        report.counts.priceHistoryInserted === 1,
        "successful scrape must create exactly one price_history row"
      );
      const latestHistory = historyAfter.body.items[0];
      const scrapedPriceNumber = Number(String(scrapeResult.result.price).replace(/[^\d.]/g, ""));
      assert(Number(latestHistory.price) === scrapedPriceNumber, "history price mismatch");
      assert(latestHistory.stockText === scrapeResult.result.stock.text, "history stock text mismatch");
      assert(
        latestHistory.stockQuantity === scrapeResult.result.stock.quantity,
        "history stock quantity mismatch"
      );
      assert(latestHistory.inStock === scrapeResult.result.stock.inStock, "history inStock mismatch");
    } else {
      assert(report.counts.priceHistoryInserted === 0, "failed scrape must not create price_history");
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
