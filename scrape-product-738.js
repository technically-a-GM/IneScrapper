const { scrapeProduct } = require("./scraper-service");

const productId = process.env.PRODUCT_ID || "738";

async function main() {
  const result = await scrapeProduct(productId);

  if (result.ok) {
    console.log("Network:", JSON.stringify(result.attempts.at(-1).networkEvents, null, 2));
    console.log(
      "\nFinal result:",
      JSON.stringify(
        {
          productId: result.productId,
          url: result.url,
          attempts: result.attemptCount,
          price: result.result.price,
          stock: result.result.stock.text,
        },
        null,
        2
      )
    );
    return;
  }

  console.error(`\nScrape failed: ${result.error}`);
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nScrape failed: ${error.message}`);
  process.exitCode = 1;
});
