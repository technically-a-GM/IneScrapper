import {
  ShoppingBag,
} from "lucide-react";

import EmptyState from "../components/EmptyState";
import Message from "../components/Message";

function formatDate(value) {
  if (!value) {
    return "Not scraped yet";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function priceLabel(price) {
  if (price === null || price === undefined) {
    return "No price yet";
  }

  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function Dashboard({
  products,
  loading,
  error,
  latestScrape,
  onNavigate,
}) {
  const withHistory = products.filter(
    (product) =>
      product.currentPrice !== null &&
      product.currentPrice !== undefined
  );

  const recentlyScraped = [...withHistory]
    .sort(
      (a, b) =>
        new Date(b.lastScrapedAt || 0) -
        new Date(a.lastScrapedAt || 0)
    )
    .slice(0, 3);

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Dashboard</h2>
          <p>
            A quick look at your tracked products and
            recent scraping activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("tracked")}
        >
          <ShoppingBag size={18} />
          Tracked Products
        </button>
      </div>

      {error && (
        <Message tone="error">
          {error}
        </Message>
      )}

      {loading && (
        <Message>
          Loading dashboard...
        </Message>
      )}

      {!loading && products.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="No tracked products"
          body="Use Search to add a product from the INE catalog."
        />
      )}

      {products.length > 0 && (
        <div className="dashboardGrid">
          <div className="dashboardPanel">
            <span>Total tracked</span>
            <strong>{products.length}</strong>
          </div>

          <div className="dashboardPanel">
            <span>With price history</span>
            <strong>{withHistory.length}</strong>
          </div>

          <div className="dashboardPanel">
            <span>Latest session scrape</span>
            <strong>
              {latestScrape
                ? latestScrape.ok
                  ? "Success"
                  : "Failed"
                : "None"}
            </strong>
          </div>
        </div>
      )}

      {recentlyScraped.length > 0 && (
        <div className="recentList">
          <h3>Recent successful snapshots</h3>

          {recentlyScraped.map((product) => (
            <div
              className="recentItem"
              key={product.id}
            >
              <div>
                <strong>{product.name}</strong>
                <span>
                  {formatDate(
                    product.lastScrapedAt
                  )}
                </span>
              </div>

              <div>
                <strong>
                  {priceLabel(
                    product.currentPrice
                  )}
                </strong>

                <span>
                  {product.currentStockText}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Dashboard;