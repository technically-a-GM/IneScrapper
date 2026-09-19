const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:3001";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }

  return body;
}

export function searchProducts(query, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return apiRequest(`/api/products/search?${params}`);
}

export function trackProduct(product) {
  return apiRequest("/api/products/track", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function getTrackedProducts() {
  return apiRequest("/api/products/tracked");
}

export function scrapeProduct(productId, headed = false) {
  const params = headed ? "?headed=true" : "";

  return apiRequest(
    `/api/products/${encodeURIComponent(productId)}/scrape${params}`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export function getProductHistory(productId) {
  return apiRequest(`/api/products/${encodeURIComponent(productId)}/history`);
}

export function getProductLogs(productId) {
  return apiRequest(`/api/products/${encodeURIComponent(productId)}/logs`);
}
