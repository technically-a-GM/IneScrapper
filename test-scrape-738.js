const { scrapeProduct } = require("./scraper-service");

async function main() {
  const result = await scrapeProduct("738");

  console.log("\nStructured result:");
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\nScrape failed: ${error.message}`);
  process.exitCode = 1;
});
