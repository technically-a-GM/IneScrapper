const { chromium } = require("playwright");

const STORE_BASE_URL = "https://demo.inelabteamdev.com";
const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_ATTEMPT_TIMEOUT_MS = 20000;
const DEFAULT_SLOW_MO_MS = 75;

function envFlag(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function productUrlFor(productId) {
  return `${STORE_BASE_URL}/product/${encodeURIComponent(String(productId))}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text) {
  return text
    .replace(/\u200b/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePrice(price) {
  return normalizeText(price).replace(/\s+/g, "").replace(/^Rs\.?/i, "Rs.");
}

function parsePrice(text) {
  const normalized = normalizeText(text);
  const patterns = [
    /(?:₹|Rs\.?)\s*[\d,\s]+(?:\.\d{1,2})?/i,
    /(?:price|current price)\s*:?\s*(\$?\s*\d[\d,\s]*(?:\.\d{1,2})?)/i,
    /\$\s*\d[\d,\s]*(?:\.\d{1,2})?/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return normalizePrice(match[1] || match[0]);
  }

  return null;
}

function parseStock(text) {
  const normalized = normalizeText(text);

  if (/out of stock/i.test(normalized)) {
    return {
      text: "OUT OF STOCK",
      quantity: 0,
      inStock: false,
    };
  }

  const quantityMatch =
    normalized.match(/(\d+)\s*(?:units?|items?)?\s*(?:available|left|in stock)/i) ||
    normalized.match(/(?:in stock|stock|availability)\s*:?\s*(?:·\s*)?(\d+)/i);

  if (quantityMatch) {
    const quantity = Number.parseInt(quantityMatch[1], 10);
    return {
      text: normalized.toUpperCase(),
      quantity,
      inStock: quantity > 0,
    };
  }

  if (/in stock/i.test(normalized)) {
    return {
      text: normalized.toUpperCase(),
      quantity: null,
      inStock: true,
    };
  }

  return null;
}

async function visibleText(locator) {
  return locator
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number.parseFloat(style.opacity || "1") > 0 &&
            box.width > 0 &&
            box.height > 0
          );
        })
        .map((element) => element.innerText || element.textContent || "")
        .join(" ")
    )
    .then(normalizeText);
}

async function dismissCookieBanner(page, timeoutMs) {
  const acceptCookies = page.locator('button[aria-label="Accept cookies"]');
  await acceptCookies.waitFor({ state: "visible", timeout: Math.min(timeoutMs, 1500) }).catch(() => null);

  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click({ timeout: Math.min(timeoutMs, 3000), force: true });
  }

  await page
    .locator(".cookie-overlay")
    .waitFor({ state: "hidden", timeout: Math.min(timeoutMs, 2500) })
    .catch(() => null);
}

async function launchChromium({
  headless = envFlag("PLAYWRIGHT_HEADLESS", true),
  slowMoMs = DEFAULT_SLOW_MO_MS,
  logger = console,
} = {}) {
  const launchOptions = {
    headless,
    slowMo: headless ? 0 : slowMoMs,
  };

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    logger.warn?.(
      `Bundled Chromium launch failed: ${error.message.split("\n")[0]}`
    );
  }

  for (const channel of ["chrome", "msedge", "chromium"]) {
    try {
      return await chromium.launch({ ...launchOptions, channel });
    } catch (error) {
      logger.warn?.(
        `Chromium channel "${channel}" launch failed: ${
          error.message.split("\n")[0]
        }`
      );
    }
  }

  throw new Error("Unable to launch a Chromium browser.");
}

async function waitForResult(page, priceResponsePromise, attemptTimeoutMs) {
  const response = await priceResponsePromise;
  let priceApi = null;

  if (response && !response.error) {
    const body = await response.text().catch(() => "");
    priceApi = {
      status: response.status(),
      ok: response.ok(),
      body,
    };

    if (!response.ok()) {
      throw new Error(`price endpoint returned ${response.status()}: ${body}`);
    }
  }

  const successBlock = page.locator(".price-success").first();
  await successBlock.waitFor({ state: "visible", timeout: Math.min(attemptTimeoutMs, 10000) });

  const priceText = await visibleText(successBlock.locator(".price-main *"));
  const stockText = await visibleText(successBlock.locator(".stock-badge"));
  const blockText = normalizeText(await successBlock.innerText());
  const price = parsePrice(priceText) || parsePrice(blockText);
  const stock = parseStock(stockText) || parseStock(blockText);

  if (price === null || stock === null) {
    throw new Error(
      `missing/invalid result after reveal: price=${
        price === null ? "missing" : price
      }, stock=${stock === null ? "missing" : stock.text}, successBlock="${blockText.slice(
        0,
        300
      )}"`
    );
  }

  return {
    price,
    stock,
    priceApi,
  };
}

async function runAttempt(browser, productId, attemptNumber, options) {
  const productUrl = productUrlFor(productId);
  const { attemptTimeoutMs } = options;
  const startedAt = new Date().toISOString();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const networkEvents = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("/api/challenge") ||
      url.includes("/api/session") ||
      url.includes(`/api/products/${productId}/price`)
    ) {
      networkEvents.push({
        method: response.request().method(),
        status: response.status(),
        url,
      });
    }
  });

  try {
    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: Math.min(attemptTimeoutMs, 12000),
    });

    await dismissCookieBanner(page, attemptTimeoutMs);

    const revealButton = page.getByRole("button", { name: /reveal price/i });
    await revealButton.waitFor({ state: "visible", timeout: Math.min(attemptTimeoutMs, 8000) });
    await revealButton.waitFor({
      state: "attached",
      timeout: Math.min(attemptTimeoutMs, 8000),
    });

    await dismissCookieBanner(page, attemptTimeoutMs);

    const priceBlock = page.locator(".price-block").first();
    const box = await priceBlock.boundingBox({ timeout: Math.min(attemptTimeoutMs, 6000) });
    if (!box) {
      throw new Error("price block was not visible");
    }

    await page.mouse.move(Math.max(0, box.x - 24), Math.max(0, box.y - 24));
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.45, {
      steps: 5,
    });
    for (let move = 0; move < 10; move += 1) {
      const x = box.x + box.width * (0.18 + (move % 6) * 0.11);
      const y = box.y + box.height * (0.25 + (move % 4) * 0.15);
      await page.mouse.move(x, y, { steps: 3 });
      await sleep(60);
    }
    await sleep(700);

    await page.waitForFunction(
      () => {
        const buttons = [...document.querySelectorAll("button")];
        const button = buttons.find((candidate) =>
          /reveal price/i.test(candidate.innerText || candidate.textContent || "")
        );
        return Boolean(button && !button.disabled);
      },
      null,
      { timeout: Math.min(attemptTimeoutMs, 6000) }
    );

    const priceResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes(`/api/products/${productId}/price`) &&
          response.request().method() === "GET",
        { timeout: Math.min(attemptTimeoutMs, 12000) }
      )
      .catch((error) => ({ error }));

    await dismissCookieBanner(page, attemptTimeoutMs);
    await revealButton.click({ timeout: Math.min(attemptTimeoutMs, 6000) });
    const result = await waitForResult(page, priceResponsePromise, attemptTimeoutMs);

    return {
      attempt: attemptNumber,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      result,
      networkEvents,
    };
  } catch (error) {
    const pageState = await page
      .evaluate(() => ({
        url: location.href,
        title: document.title,
        text: document.body ? document.body.innerText.slice(0, 500) : "",
      }))
      .catch(() => null);

    return {
      attempt: attemptNumber,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message,
      pageState,
      networkEvents,
    };
  } finally {
    await context.close();
  }
}

async function scrapeProduct(productId, options = {}) {
  if (productId === undefined || productId === null || String(productId).trim() === "") {
    throw new Error("productId is required");
  }

  const normalizedProductId = String(productId);
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const attemptTimeoutMs = options.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? 1000;
  const logger = options.logger ?? console;
  const productUrl = productUrlFor(normalizedProductId);
  const startedAt = new Date().toISOString();
  const browser = await launchChromium({
    headless: options.headless ?? envFlag("PLAYWRIGHT_HEADLESS", true),
    slowMoMs: options.slowMoMs ?? DEFAULT_SLOW_MO_MS,
    logger,
  });
  const attempts = [];

  try {
    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
      logger.log?.(`\nAttempt ${attemptNumber}/${maxAttempts}`);
      const attempt = await runAttempt(browser, normalizedProductId, attemptNumber, {
        attemptTimeoutMs,
      });
      attempts.push(attempt);

      if (attempt.ok) {
        logger.log?.(
          `SUCCESS price=${attempt.result.price} stock=${attempt.result.stock.text}`
        );
        return {
          ok: true,
          productId: normalizedProductId,
          url: productUrl,
          startedAt,
          finishedAt: new Date().toISOString(),
          attempts,
          attemptCount: attempts.length,
          result: attempt.result,
        };
      }

      logger.log?.(`FAILED ${attempt.error}`);

      if (attemptNumber < maxAttempts) {
        await sleep(retryDelayMs * attemptNumber);
      }
    }

    return {
      ok: false,
      productId: normalizedProductId,
      url: productUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      attempts,
      attemptCount: attempts.length,
      error: `all ${maxAttempts} attempts failed`,
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeProduct,
  productUrlFor,
  parsePrice,
  parseStock,
};
