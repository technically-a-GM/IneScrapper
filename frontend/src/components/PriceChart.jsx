import { useState } from "react";
import { BarChart3 } from "lucide-react";

import EmptyState from "./EmptyState";

function priceLabel(price) {
  if (price === null || price === undefined) {
    return "No price yet";
  }

  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function formatAxisDate(value) {
  if (!value) return ["", ""];

  const date = new Date(value);

  const day = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);

  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return [day, time];
}

function formatTooltipDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function PriceChart({ history }) {
  const [hoveredId, setHoveredId] = useState(null);

  const data = [...history].reverse();

  const prices = data
    .map((item) => Number(item.price))
    .filter(Number.isFinite);

  if (!prices.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No price history yet"
        body="Successful scrapes will appear here as chart points."
      />
    );
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const padding = Math.max((maxPrice - minPrice) * 0.15, 500);
  const yMin = Math.max(0, minPrice - padding);
  const yMax = maxPrice + padding;
  const range = yMax - yMin || 1;

  const width = 820;
  const height = 330;

  const chart = {
    top: 25,
    right: 25,
    bottom: 75,
    left: 90,
  };

  const chartWidth =
    width - chart.left - chart.right;

  const chartHeight =
    height - chart.top - chart.bottom;

  const points = data.map((item, index) => {
    const x =
      data.length === 1
        ? chart.left + chartWidth / 2
        : chart.left +
          (index * chartWidth) / (data.length - 1);

    const y =
      height -
      chart.bottom -
      ((Number(item.price) - yMin) * chartHeight) /
        range;

    return {
      x,
      y,
      item,
    };
  });

  const line = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const hovered = points.find(
    (point) => point.item.id === hoveredId
  );

  const tickCount = 4;

  const yTicks = Array.from(
    { length: tickCount },
    (_, index) => {
      return yMin + (range * index) / (tickCount - 1);
    }
  );

  return (
    <div className="chartShell">
      <div className="chartContext">
        <strong>Price History</strong>
        <span>
          Successful scrape results over time
        </span>
      </div>

      <div className="chartWrap">
        <svg
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Product price history"
        >
          <text
            className="axisTitle yAxisTitle"
            x="18"
            y="145"
            transform="rotate(-90 18 145)"
          >
            Price (INR)
          </text>

          <text
            className="axisTitle"
            x={chart.left + chartWidth / 2}
            y={height - 12}
            textAnchor="middle"
          >
            Scrape time
          </text>

          {yTicks.map((tick) => {
            const y =
              height -
              chart.bottom -
              ((tick - yMin) * chartHeight) /
                range;

            return (
              <g key={tick}>
                <line
                  className="gridLine"
                  x1={chart.left}
                  y1={y}
                  x2={width - chart.right}
                  y2={y}
                />

                <text
                  className="axisLabel"
                  x={chart.left - 12}
                  y={y + 4}
                  textAnchor="end"
                >
                  {priceLabel(Math.round(tick / 100) * 100)}
                </text>
              </g>
            );
          })}

          <line
            className="axisLine"
            x1={chart.left}
            y1={height - chart.bottom}
            x2={width - chart.right}
            y2={height - chart.bottom}
          />

          <line
            className="axisLine"
            x1={chart.left}
            y1={chart.top}
            x2={chart.left}
            y2={height - chart.bottom}
          />

          {points.map((point, index) => {
            const [day, time] = formatAxisDate(
              point.item.scrapedAt
            );

            const showLabel =
              data.length <= 6 ||
              index === 0 ||
              index === points.length - 1 ||
              index % Math.ceil(data.length / 4) === 0;

            if (!showLabel) return null;

            return (
              <g key={`${point.item.id}-label`}>
                <line
                  className="tickLine"
                  x1={point.x}
                  y1={height - chart.bottom}
                  x2={point.x}
                  y2={height - chart.bottom + 6}
                />

                <text
                  className="axisLabel"
                  x={point.x}
                  y={height - chart.bottom + 24}
                  textAnchor="middle"
                >
                  {day}
                </text>

                <text
                  className="axisLabel mutedAxisLabel"
                  x={point.x}
                  y={height - chart.bottom + 42}
                  textAnchor="middle"
                >
                  {time}
                </text>
              </g>
            );
          })}

          {points.length > 1 && (
            <polyline
              className="priceLine"
              points={line}
            />
          )}

          {points.map((point) => {
            const active =
              hoveredId === point.item.id;

            return (
              <g
                key={point.item.id}
                className="chartPointGroup"
                onMouseEnter={() =>
                  setHoveredId(point.item.id)
                }
                onMouseLeave={() =>
                  setHoveredId(null)
                }
                onFocus={() =>
                  setHoveredId(point.item.id)
                }
                onBlur={() =>
                  setHoveredId(null)
                }
                tabIndex="0"
              >
                <circle
                  className="chartHitArea"
                  cx={point.x}
                  cy={point.y}
                  r="16"
                />

                <circle
                  className={
                    active
                      ? "chartPoint activePoint"
                      : "chartPoint"
                  }
                  cx={point.x}
                  cy={point.y}
                  r={active ? 7 : 5}
                />
              </g>
            );
          })}

          {hovered && (
            <foreignObject
              x={Math.min(
                Math.max(
                  hovered.x - 115,
                  chart.left
                ),
                width - 250
              )}
              y={Math.max(
                hovered.y - 125,
                chart.top
              )}
              width="240"
              height="115"
              pointerEvents="none"
            >
              <div className="chartTooltip">
                <div>
                  <span>Scraped</span>
                  <strong>
                    {formatTooltipDate(
                      hovered.item.scrapedAt
                    )}
                  </strong>
                </div>

                <div>
                  <span>Price</span>
                  <strong>
                    {priceLabel(hovered.item.price)}
                  </strong>
                </div>

                <div>
                  <span>Stock</span>
                  <strong>
                    {hovered.item.stockQuantity} -{" "}
                    {hovered.item.inStock
                      ? "In stock"
                      : "Out of stock"}
                  </strong>
                </div>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  );
}

export default PriceChart;