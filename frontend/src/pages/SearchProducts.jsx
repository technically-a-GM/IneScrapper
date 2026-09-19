import { useState } from "react";
import {
  Loader2,
  PackageCheck,
  Search,
} from "lucide-react";

import {
  searchProducts,
  trackProduct,
} from "../api";

import Message from "../components/Message";
import EmptyState from "../components/EmptyState";

function SearchProducts({ trackedIds, onTracked }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);

  const [loading, setLoading] = useState(false);
  const [trackingId, setTrackingId] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSearch(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await searchProducts(query);

      setResults(response.items || []);
      setMeta(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack(product) {
    setTrackingId(product.productId);
    setError("");
    setNotice("");

    try {
      await trackProduct(product);

      setNotice(`${product.name} is now tracked.`);

      await onTracked();
    } catch (err) {
      setError(err.message);
    } finally {
      setTrackingId("");
    }
  }

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Search Products</h2>
          <p>
            Find a product from the INE catalog and start
            tracking it.
          </p>
        </div>
      </div>

      <form
        className="searchBar"
        onSubmit={handleSearch}
      >
        <Search size={18} />

        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Try Fitness, Watch, Band, Hub"
          aria-label="Search product name"
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <Loader2
              className="spin"
              size={18}
            />
          ) : (
            <Search size={18} />
          )}

          Search
        </button>
      </form>

      {notice && (
        <Message tone="success">
          {notice}
        </Message>
      )}

      {error && (
        <Message tone="error">
          {error}
        </Message>
      )}

      {loading && (
        <Message>
          Searching the catalog...
        </Message>
      )}

      {!loading &&
        meta &&
        results.length === 0 && (
          <EmptyState
            icon={Search}
            title="No products found"
            body="Try a broader product name."
          />
        )}

      {results.length > 0 && (
        <div className="resultMeta">
          {results.length} result
          {results.length === 1 ? "" : "s"} found
          after searching{" "}
          {meta?.searchedPages || 0} catalog page
          {meta?.searchedPages === 1 ? "" : "s"}.
        </div>
      )}

      <div className="productGrid">
        {results.map((product) => {
          const alreadyTracked = trackedIds.has(
            String(product.productId)
          );

          const tracking =
            trackingId === product.productId;

          return (
            <article
              className="productCard"
              key={product.productId}
            >
              <div>
                <h3>{product.name}</h3>

                <p>
                  {product.brand || "Unknown brand"}
                  {" · "}
                  {product.category ||
                    "Uncategorized"}
                </p>
              </div>

              <dl>
                <div>
                  <dt>SKU</dt>
                  <dd>{product.sku || "-"}</dd>
                </div>

                <div>
                  <dt>ID</dt>
                  <dd>{product.productId}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() =>
                  handleTrack(product)
                }
                disabled={
                  alreadyTracked || tracking
                }
              >
                {tracking ? (
                  <Loader2
                    className="spin"
                    size={18}
                  />
                ) : (
                  <PackageCheck size={18} />
                )}

                {alreadyTracked
                  ? "Tracked"
                  : tracking
                    ? "Tracking..."
                    : "Track"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default SearchProducts;