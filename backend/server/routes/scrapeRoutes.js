const express = require("express");

const { scrapeAllTrackedProducts } = require("../services/scrapeManager");

const router = express.Router();

let scrapeRunning = false;

function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

router.post(
  "/all",
  asyncRoute(async (req, res) => {
    const secret = process.env.CRON_SECRET;

    if (!secret) {
      throw Object.assign(
        new Error("CRON_SECRET is not configured"),
        { statusCode: 500 }
      );
    }

    const auth = req.headers.authorization;

    if (auth !== `Bearer ${secret}`) {
      throw Object.assign(
        new Error("Unauthorized"),
        { statusCode: 401 }
      );
    }

    if (scrapeRunning) {
      return res.status(409).json({
        ok: false,
        error: "A scheduled scrape is already running.",
      });
    }

    scrapeRunning = true;

    res.status(202).json({
      ok: true,
      status: "started",
      message: "Scheduled scrape started.",
    });

    scrapeAllTrackedProducts()
      .then((summary) => {
        console.log("Scheduled scrape finished:", summary);
      })
      .catch((error) => {
        console.error("Scheduled scrape failed:", error);
      })
      .finally(() => {
        scrapeRunning = false;
      });
  })
);

module.exports = router;