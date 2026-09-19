const CATALOG_URL = "https://demo.inelabteamdev.com/api/catalog";
const PAGE_SIZE = 20;
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_ATTEMPTS = 3;

const pageCache = new Map();

function productUrlFor(productId) {
  return `https://demo.inelabteamdev.com/product/${encodeURIComponent(String(productId))}`;
}

function mapCatalogProduct(product) {
  return {
    productId: String(product.id),
    name: product.name,
    brand: product.brand || null,
    category: product.category || null,
    sku: product.sku || null,
    url: productUrlFor(product.id),
  };
}

async function fetchCatalogPage(page) {
  const cached = pageCache.get(page);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `${CATALOG_URL}?page=${page}&pageSize=${PAGE_SIZE}`;
  let response = null;
  let lastError = null;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(url);
      lastError = null;

      if (response.ok || attempt === FETCH_ATTEMPTS) {
        break;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }

  if (!response && lastError) {
    throw Object.assign(new Error(`Catalog API request failed: ${lastError.message}`), {
      statusCode: 502,
    });
  }

  if (!response.ok) {
    throw Object.assign(new Error(`Catalog API returned ${response.status}`), {
      statusCode: 502,
    });
  }

  const data = await response.json();
  pageCache.set(page, {
    cachedAt: Date.now(),
    data,
  });
  return data;
}

async function searchProducts(query, options = {}) {
  const q = String(query || "").trim().toLowerCase();
  const limit = options.limit || 20;
  const startPage = options.startPage || 1;
  const maxPages = options.maxPages || 50;
  const matches = [];
  let page = startPage;
  let pages = 1;
  let searchedPages = 0;

  do {
    const catalogPage = await fetchCatalogPage(page);
    pages = catalogPage.pages || pages;
    searchedPages += 1;

    for (const item of catalogPage.items || []) {
      const name = String(item.name || "").toLowerCase();
      if (!q || name.includes(q)) {
        matches.push(mapCatalogProduct(item));
      }

      if (matches.length >= limit) {
        return {
          query,
          startPage,
          searchedPages,
          totalPages: pages,
          hasMore: page < pages,
          nextPage: page < pages ? page + 1 : null,
          items: matches,
        };
      }
    }

    page += 1;
  } while (page <= pages && searchedPages < maxPages);

  return {
    query,
    startPage,
    searchedPages,
    totalPages: pages,
    hasMore: page <= pages,
    nextPage: page <= pages ? page : null,
    items: matches,
  };
}

module.exports = {
  searchProducts,
  mapCatalogProduct,
};
