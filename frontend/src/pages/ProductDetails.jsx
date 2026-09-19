import { useEffect, useState } from "react";
import { Activity, BarChart3 } from "lucide-react";

import {
  getProductHistory,
  getProductLogs,
} from "../api";

import EmptyState from "../components/EmptyState";
import Message from "../components/Message";
import PriceChart from "../components/PriceChart";
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
    return "-";
  }

  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function duration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) {
    return "-";
  }

  const ms =
    new Date(finishedAt).getTime() -
    new Date(startedAt).getTime();

  if (!Number.isFinite(ms) || ms < 0) {
    return "-";
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function ProductDetails({
  product,
  refreshKey,
  onClose,
}) {
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError("");

      try {
        const [
          historyResponse,
          logsResponse,
        ] = await Promise.all([
          getProductHistory(product.productId),
          getProductLogs(product.productId),
        ]);

        if (!active) {
          return;
        }

        setHistory(historyResponse.items || []);
        setLogs(logsResponse.items || []);
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [product.productId, refreshKey]);

  return (
    <section className="details panel">
      <div className="sectionHeader">
        <div>
          <h2>{product.name}</h2>

          <p>
            {product.brand || "Unknown brand"}
            {" · "}
            {product.category ||
              "Uncategorized"}
            {" · ID "}
            {product.productId}
          </p>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {loading && (
        <Message>
          Loading product details...
        </Message>
      )}

      {error && (
        <Message tone="error">
          {error}
        </Message>
      )}

      {!loading && !error && (
        <>
          <div className="subsection">
            <h3>Price History</h3>

            {history.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No history yet"
                body="Run Scrape Now to store the first successful snapshot."
              />
            ) : (
              <>
                <PriceChart history={history} />

                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Scraped At</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {history.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {formatDate(
                              row.scrapedAt
                            )}
                          </td>

                          <td>
                            {priceLabel(row.price)}
                          </td>

                          <td>
                            {row.stockText}{" "}
                            ({row.stockQuantity})
                          </td>

                          <td>
                            {row.inStock
                              ? "In stock"
                              : "Out of stock"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="subsection">
            <h3>Scrape Logs</h3>

            {logs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No scrape attempts yet"
                body="Every future attempt will appear here, including failures."
              />
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Attempt</th>
                      <th>Status</th>
                      <th>Result</th>
                      <th>Duration</th>
                      <th>Error</th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className={
                          log.status === "FAILED"
                            ? "failedRow"
                            : ""
                        }
                      >
                        <td>
                          {formatDate(
                            log.startedAt
                          )}
                        </td>

                        <td>
                          {log.attemptNumber}
                        </td>

                        <td>
                          <StatusPill
                            tone={
                              log.status ===
                              "SUCCESS"
                                ? "success"
                                : "danger"
                            }
                          >
                            {log.status}
                          </StatusPill>
                        </td>

                        <td>
                          {log.priceFound !==
                            null &&
                          log.priceFound !==
                            undefined
                            ? `${priceLabel(
                                log.priceFound
                              )} / ${
                                log.stockText
                              }`
                            : "-"}
                        </td>

                        <td>
                          {duration(
                            log.startedAt,
                            log.finishedAt
                          )}
                        </td>

                        <td>
                          {log.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default ProductDetails;