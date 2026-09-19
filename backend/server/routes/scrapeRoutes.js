const express = require("express");

const { scrapeAllTrackedProducts } = require("../services/scrapeManager");

const router = express.Router();

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

    const summary = await scrapeAllTrackedProducts();

    res.json(summary);
  })
);

module.exports = router;