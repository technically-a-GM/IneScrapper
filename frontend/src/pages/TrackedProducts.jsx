import {
  Clock,
  History,
  Loader2,
  RefreshCw,
  Monitor,
  ShoppingBag,
} from "lucide-react";

import EmptyState from "../components/EmptyState";
import Message from "../components/Message";
import StatusPill from "../components/StatusPill";

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
    return "No price history yet";
  }

  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function TrackedProducts({
  products,
  loading,
  error,
  scrapingId,
  latestScrape,
  onScrape,
  onSelect,
}) {
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Tracked Products</h2>
          <p>
            Products currently being monitored by the price tracker.
          </p>
        </div>
      </div>

      {error && <Message tone="error">{error}</Message>}

      {loading && <Message>Loading tracked products...</Message>}

      {!loading && products.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="No tracked products"
          body="Search the catalog and track a product first."
        />
      )}

      <div className="trackedList">
        {products.map((product) => {
          const hasHistory =
            product.currentPrice !== null &&
            product.currentPrice !== undefined;

          const isScraping = scrapingId === product.productId;

          const scrape =
            latestScrape?.productId === product.productId
              ? latestScrape
              : null;

          return (
            <article className="trackedCard" key={product.id}>
              <div className="trackedMain">
                <div>
                  <h3>{product.name}</h3>

                  <p>
                    {product.brand || "Unknown brand"}
                    {" · "}
                    {product.category || "Uncategorized"}
                    {" · ID "}
                    {product.productId}
                  </p>
                </div>

                <div className="priceBlock">
                  <strong>{priceLabel(product.currentPrice)}</strong>

                  <span>
                    {hasHistory
                      ? product.currentStockText
                      : "Run a scrape to capture stock"}
                  </span>
                </div>
              </div>

              <div className="trackedMeta">
                {hasHistory ? (
                  <StatusPill
                    tone={product.currentInStock ? "success" : "danger"}
                  >
                    {product.currentInStock ? "In stock" : "Out of stock"}
                  </StatusPill>
                ) : (
                  <StatusPill>No snapshot</StatusPill>
                )}

                <span>
                  <Clock size={15} />
                  {formatDate(product.lastScrapedAt)}
                </span>

                {scrape && (
                  <StatusPill tone={scrape.ok ? "success" : "danger"}>
                    Latest scrape {scrape.ok ? "succeeded" : "failed"} after{" "}
                    {scrape.attemptCount} attempt
                    {scrape.attemptCount === 1 ? "" : "s"}
                  </StatusPill>
                )}
              </div>

              {scrape?.attempts?.length > 1 && (
                <div className="attemptMini">
                  {scrape.attempts.map((attempt) => (
                    <span
                      key={attempt.attempt}
                      className={
                        attempt.ok ? "miniSuccess" : "miniFail"
                      }
                    >
                      Attempt {attempt.attempt}:{" "}
                      {attempt.ok
                        ? "SUCCESS"
                        : `FAILED - ${attempt.error}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="actions">
                <button
                  type="button"
                  onClick={() => onScrape(product, false)}
                  disabled={isScraping}
                >
                  {isScraping ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <RefreshCw size={18} />
                  )}

                  {isScraping ? "Scraping..." : "Scrape Now"}
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => onScrape(product, true)}
                  disabled={isScraping}
                >
                  {isScraping ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Monitor size={18} />
                  )}

                  Headed Demo
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => onSelect(product)}
                >
                  <History size={18} />
                  View Details
                </button>
              </div>

              <p className="headedNote">
                Opens a visible browser for the local scraper demo.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default TrackedProducts;