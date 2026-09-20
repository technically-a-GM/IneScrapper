# INE Product Price Tracker

A full-stack product price tracking application built for the INE Software Engineer Intern assignment.

The application allows users to search products from the INE mock storefront, track products, scrape their current price and stock status, view price history, and inspect individual scraping attempts.

## Live Demo

- **Frontend:** https://ine-scrapper.vercel.app
- **Backend:** https://inescrapper.onrender.com
- **GitHub:** Add your repository link here

## Features

- Search products from the INE mock storefront
- Track products for price monitoring
- Scrape current price and stock status
- Retry failed scraping attempts
- Store price history
- Store individual scrape attempts and errors
- View price history using a chart
- View scrape logs for each product
- Headed Playwright scraping for demonstration
- Automatic scraping every 2 hours
- Protected scheduled scraping endpoint
- PostgreSQL database using Supabase

## Tech Stack

### Frontend

- React
- Vite
- CSS

### Backend

- Node.js
- Express
- Playwright

### Database

- Supabase PostgreSQL

### Deployment

- Vercel - Frontend
- Render - Backend
- cron-job.org - Scheduled scraping

## Application Architecture

```text
React Frontend
      |
      | HTTP API
      v
Express Backend
      |
      +-------------------+
      |                   |
      v                   v
Playwright            Supabase
Scraper               PostgreSQL
      |                   |
      |              +----+----+
      |              |         |
      |         price_history  scrape_logs
      |
      v
INE Mock Store
```

## How It Works

### 1. Product Search

The frontend sends a search request to the backend.

The backend retrieves product information from the INE mock storefront and returns the results to the frontend.

### 2. Tracking Products

When a user tracks a product, its basic information is stored in the `tracked_products` table in Supabase.

The tracked product can then be scraped manually or through the scheduled scraper.

### 3. Scraping

The scraper uses Playwright to open the product page on the INE mock storefront.

The store requires browser interaction before the price can be revealed. Playwright performs the required mouse movement and interacts with the price reveal mechanism.

The scraper then extracts:

- Current price
- Stock status
- Stock quantity when available

### 4. Retry Handling

The storefront can sometimes return temporary failures or slow responses.

Instead of stopping after the first failure, the scraper retries the operation.

Each attempt records information such as:

- Attempt number
- Start and finish time
- Error message
- Page state
- Relevant network responses

A price history entry is created only after a successful scrape.

### 5. Price History

Successful scrape results are stored in the `price_history` table.

The frontend uses this data to display the price history of a tracked product.

The history includes the recorded price and stock information for each successful scrape.

### 6. Scrape Logs

Every scraping attempt is stored in the `scrape_logs` table.

This allows the application to show whether a scrape succeeded, failed, or required retries.

## Scheduled Scraping

The application uses cron-job.org as an external scheduler.

The scheduled job runs every 2 hours and sends:

```text
POST /api/scrape/all
```

The endpoint is protected using a `CRON_SECRET`.

After authentication, the endpoint starts the scraping process in the background and returns a `202` response instead of waiting for all products to finish.

The flow is:

```text
cron-job.org
      |
      | POST /api/scrape/all
      v
Express Backend
      |
      | Verify CRON_SECRET
      v
Start background scrape
      |
      v
Scrape tracked products
      |
      +------> scrape_logs
      |
      +------> price_history
```

An overlap check prevents another scheduled scrape from starting while a previous scheduled scrape is still running.

## Database Structure

The application uses three main tables.

### tracked_products

Stores the products selected by users for tracking.

### price_history

Stores successful price and stock results over time.

### scrape_logs

Stores individual scraping attempts, including successful and failed attempts.

The tables are connected using PostgreSQL foreign keys.

## Project Structure

```text
INE New Project/
│
├── backend/
│   ├── db/
│   │   ├── price-tracker-db.js
│   │   └── supabase-client.js
│   │
│   └── server/
│       ├── middleware/
│       │
│       ├── routes/
│       │   ├── productRoutes.js
│       │   └── scrapeRoutes.js
│       │
│       ├── services/
│       │   ├── catalogService.js
│       │   ├── scrapeManager.js
│       │   └── scraperService.js
│       │
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── api.js
│       ├── App.jsx
│       └── main.jsx
│
├── supabase/
│   └── 001_price_tracker_schema.sql
│
├── scraper-service.js
├── scrape-product-738.js
├── test-scrape-738.js
├── package.json
└── .env.example
```

## Local Setup

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <PROJECT_FOLDER>
```

### 2. Install backend dependencies

From the project root:

```bash
npm install
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure environment variables

Create a `.env` file in the project root.

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=your_cron_secret
PLAYWRIGHT_HEADLESS=true
```

Do not commit the `.env` file to GitHub.

### 5. Start the backend

From the project root:

```bash
npm run dev:server
```

The backend runs on:

```text
http://localhost:7000
```

### 6. Start the frontend

Open another terminal:

```bash
npm run dev:client
```

The frontend will be available through the Vite development server.

## Scraper Testing

A scraper test for product `738` can be run using:

```bash
npm run test:scraper
```

The scraper prints each attempt and the final result.

Example:

```text
Attempt 1/6
FAILED ...

Attempt 2/6
SUCCESS price=₹94,462 stock=OUT OF STOCK
```

The scraper also supports headed mode for demonstration purposes.

Headed scraping should be run locally because the Render production environment does not provide a graphical browser display.

## Production Deployment

### Frontend

The React frontend is deployed on Vercel.

The production frontend uses:

```env
VITE_API_BASE_URL=https://inescrapper.onrender.com
```

### Backend

The Express backend is deployed on Render.

The production server starts with:

```bash
node backend/server/server.js
```

### Database

Supabase PostgreSQL is used for persistent storage.

The backend connects to Supabase using the Supabase JavaScript client.

### Scheduler

cron-job.org is configured to call:

```text
https://inescrapper.onrender.com/api/scrape/all
```

using the `POST` method.

The request includes:

```text
Authorization: Bearer <CRON_SECRET>
```

The job is scheduled to run every 2 hours.

## API Overview

### Health Check

```text
GET /health
```

Checks whether the backend is running.

### Product Search

```text
GET /api/products/search
```

Searches products from the INE mock storefront.

### Track Product

```text
POST /api/products/track
```

Adds a product to the tracked products list.

### Get Tracked Products

```text
GET /api/products/tracked
```

Returns the tracked products.

### Scrape Product

```text
POST /api/products/:id/scrape
```

Runs a scrape for a specific tracked product.

### Product History

```text
GET /api/products/:id/history
```

Returns successful price history for a product.

### Scrape Logs

```text
GET /api/products/:id/logs
```

Returns scraping attempts for a product.

### Scheduled Scrape

```text
POST /api/scrape/all
```

Starts scraping for all tracked products.

This endpoint requires the configured `CRON_SECRET`.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Supabase access |
| `CRON_SECRET` | Protects the scheduled scraping endpoint |
| `PLAYWRIGHT_HEADLESS` | Controls Playwright headless mode |
| `VITE_API_BASE_URL` | Frontend API base URL |

Never commit actual secret values to the repository.

## Reliability Considerations

The scraper was designed to handle temporary failures from the storefront.

The main reliability measures are:

1. Multiple scraping attempts
2. Timeout handling
3. Retry delays
4. Price and stock validation
5. Recording failed attempts
6. Recording relevant network responses
7. Saving price history only after successful scraping
8. Preventing overlapping scheduled scrape runs

This helps prevent temporary scraping failures from silently stopping the process or creating incorrect price-history entries.

## Future Improvements

Possible improvements include:

- Price change notifications
- More detailed scraper monitoring
- More advanced price analytics
- Historical price comparison
- Additional scraping health metrics
- User authentication

## Author

**Abhinav Tiwari**

B.Tech Computer Science & Engineering

Built as part of the INE Software Engineer Intern assignment.
