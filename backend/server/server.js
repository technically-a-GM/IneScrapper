const express = require("express");
const cors = require("cors");
const path = require("path");

const { loadEnvFile } = require("../scripts/load-env");
const productRoutes = require("./routes/productRoutes");
const scrapeRoutes = require("./routes/scrapeRoutes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorHandler");

loadEnvFile(path.join(__dirname, "..", "..", ".env"));

const app = express();
const port = Number.parseInt(process.env.PORT || "3001", 10);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/products", productRoutes);
app.use("/api/scrape", scrapeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`INE price tracker API listening on port ${port}`);
  });
}

module.exports = app;
