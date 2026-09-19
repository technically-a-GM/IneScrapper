import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Search,
  ShoppingBag,
} from "lucide-react";

import {
  getTrackedProducts,
  scrapeProduct,
} from "./api";

import Dashboard from "./pages/Dashboard";
import SearchProducts from "./pages/SearchProducts";
import TrackedProducts from "./pages/TrackedProducts";
import ProductDetails from "./pages/ProductDetails";
import Message from "./components/Message";

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scrapingId, setScrapingId] = useState("");
  const [latestScrape, setLatestScrape] = useState(null);
  const [message, setMessage] = useState("");

  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);

  const trackedIds = useMemo(() => {
    return new Set(
      tracked.map((product) => String(product.productId))
    );
  }, [tracked]);

  async function loadTracked() {
    setLoading(true);
    setError("");

    try {
      const response = await getTrackedProducts();
      const items = response.items || [];

      setTracked(items);
      return items;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTracked();
  }, []);

  async function handleScrape(product, headed = false) {
  setScrapingId(product.productId);
  setMessage("");
  setError("");

  try {
    const response = await scrapeProduct(product.productId, headed);
    const scrape = response.scrape;

    setLatestScrape({
      productId: product.productId,
      ...scrape,
    });

    if (scrape.ok) {
      setMessage(
        `${headed ? "Headed" : "Normal"} scrape succeeded for ${
          product.name
        } after ${scrape.attemptCount} attempt${
          scrape.attemptCount === 1 ? "" : "s"
        }.`
      );
    } else {
      setMessage(
        `${headed ? "Headed" : "Normal"} scrape failed for ${
          product.name
        }; all attempts were logged.`
      );
    }

    const freshProducts = await loadTracked();

    const freshProduct = freshProducts.find(
      (item) => item.productId === product.productId
    );

    if (freshProduct) {
      setSelectedProduct((current) => {
        if (current?.productId === product.productId) {
          return freshProduct;
        }

        return current;
      });

      setDetailsRefreshKey((value) => value + 1);
    }
  } catch (err) {
    setMessage(`Scrape request failed: ${err.message}`);
  } finally {
    setScrapingId("");
  }
}

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark">INE</span>

          <div>
            <h1>Price Tracker</h1>
            <p>Track product prices and stock over time</p>
          </div>
        </div>

        <nav>
          <button
            className={activeView === "dashboard" ? "active" : ""}
            onClick={() => setActiveView("dashboard")}
          >
            <Activity size={17} />
            Dashboard
          </button>

          <button
            className={activeView === "search" ? "active" : ""}
            onClick={() => setActiveView("search")}
          >
            <Search size={17} />
            Search
          </button>

          <button
            className={activeView === "tracked" ? "active" : ""}
            onClick={() => setActiveView("tracked")}
          >
            <ShoppingBag size={17} />
            Tracked Products
          </button>
        </nav>
      </header>

      <main>
        <section className="summaryBand">
          <div>
            <span>Tracked Products</span>
            <strong>{tracked.length}</strong>
          </div>

          <div>
            <span>With Price History</span>
            <strong>
              {
                tracked.filter(
                  (product) =>
                    product.currentPrice !== null &&
                    product.currentPrice !== undefined
                ).length
              }
            </strong>
          </div>

          <div>
            <span>Latest Scrape</span>
            <strong>
              {latestScrape
                ? latestScrape.ok
                  ? "Success"
                  : "Failed"
                : "None this session"}
            </strong>
          </div>
        </section>

        {message && (
          <Message
            tone={
              message.toLowerCase().includes("failed")
                ? "error"
                : "success"
            }
          >
            {message}
          </Message>
        )}

        {activeView === "dashboard" && (
          <Dashboard
            products={tracked}
            loading={loading}
            error={error}
            latestScrape={latestScrape}
            onNavigate={setActiveView}
          />
        )}

        {activeView === "search" && (
          <SearchProducts
            trackedIds={trackedIds}
            onTracked={loadTracked}
          />
        )}

        {activeView === "tracked" && (
          <TrackedProducts
            products={tracked}
            loading={loading}
            error={error}
            scrapingId={scrapingId}
            latestScrape={latestScrape}
            onScrape={handleScrape}
            onSelect={setSelectedProduct}
          />
        )}

        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            refreshKey={detailsRefreshKey}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </main>
    </div>
  );
}

export default App;