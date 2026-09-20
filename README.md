# INE Product Price Tracker

A full-stack product price tracking application built for the INE Software Engineer Intern assignment.

The application allows users to search products from the INE mock storefront, track products, scrape their current price and stock status, view price history, and inspect individual scraping attempts.

## Live Demo

- Frontend: https://ine-scrapper.vercel.app
- Backend: https://inescrapper.onrender.com

## Features

- Search products from the INE mock storefront
- Track products for price monitoring
- Scrape current price and stock status
- Automatic retry when a scrape attempt fails
- Store price history
- Store individual scrape attempts and errors
- Price history chart
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
                  hosted on Render
                         |
             +-----------+-----------+
             |                       |
             v                       v
        Playwright              Supabase
         Scraper                PostgreSQL
             |                       |
             |                +------+------+
             |                |             |
             |          price_history  scrape_logs
             |
             v
       INE Mock Store
```

How It Works
1. Product Search

The frontend requests products from the backend. The backend retrieves product information from the INE mock storefront and returns the results to the frontend.

2. Tracking Products

When a product is tracked, its basic information is stored in the tracked_products table in Supabase.

3. Scraping

The scraper uses Playwright to open the product page on the INE mock storefront.

The store requires browser interaction before the price can be revealed, so Playwright performs the required mouse movement and interacts with the price reveal button.

The scraper then reads:

Current price
Stock status
Stock quantity when available
4. Retry Handling

Scraping can fail because of slow responses or temporary errors.

The scraper retries failed attempts instead of silently stopping.

A scrape run can make multiple attempts before being marked as failed.

Each attempt records information such as:

Attempt number
Start and finish time
Error message
Page state
Relevant network responses

A price history entry is created only after a successful scrape.

5. Price History

Successful scrape results are stored in the price_history table.

The frontend uses this data to display the product's price history in a chart.

6. Scrape Logs

Every scrape attempt is stored in the scrape_logs table.

This makes it possible to see whether a scrape succeeded, failed, or required retries.

Scheduled Scraping

The application uses cron-job.org as an external scheduler.

The scheduled job runs every 2 hours and sends:

POST /api/scrape/all

The endpoint is protected using a CRON_SECRET.

The endpoint returns immediately with a 202 response and starts the scraping process in the background. This prevents the external scheduler from waiting for the entire scraping process to finish.

The flow is:

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
Database Structure

The application uses three main tables.

tracked_products

Stores the products selected by users for tracking.

price_history

Stores successful price and stock results over time.

scrape_logs

Stores individual scraping attempts, including successful and failed attempts.

The relationships are handled using PostgreSQL foreign keys.

Project Structure
INE New Project/
│
├── backend/
│   ├── db/
│   │   ├── price-tracker-db.js
│   │   └── supabase-client.js
│   │
│   └── server/
│       ├── middleware/
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
├── db/
│   ├── price-tracker-db.js
│   └── supabase-client.js
│
├── supabase/
│   └── 001_price_tracker_schema.sql
│
├── scraper-service.js
├── test-scrape-738.js
├── scrape-product-738.js
├── package.json
└── .env.example
Local Setup
1. Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <PROJECT_FOLDER>
2. Install backend dependencies
npm install
3. Install frontend dependencies
cd frontend
npm install
cd ..
4. Configure environment variables

Create a .env file in the project root.

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=your_cron_secret
PLAYWRIGHT_HEADLESS=true

Do not commit the .env file to GitHub.

5. Start the backend
npm run dev:server

The backend runs locally on:

http://localhost:7000
6. Start the frontend

In another terminal:

npm run dev:client

The frontend will be available through the Vite development server.

Scraper Testing

A scraper test for product 738 can be run using:

npm run test:scraper

The scraper prints each attempt and the final result.

Example:

Attempt 1/6
FAILED ...

Attempt 2/6
SUCCESS price=₹94,462 stock=OUT OF STOCK

The scraper also supports headed mode for demonstration purposes.

Headed scraping should be run locally because the Render production environment does not provide a graphical browser display.

Production Deployment
Frontend

The React frontend is deployed on Vercel.

The production frontend uses:

VITE_API_BASE_URL=https://inescrapper.onrender.com
Backend

The Express backend is deployed on Render.

The production server starts with:

node backend/server/server.js
Database

Supabase PostgreSQL is used for persistent storage.

The backend accesses Supabase using the Supabase JavaScript client.

Scheduler

cron-job.org is configured to call:

https://inescrapper.onrender.com/api/scrape/all

using:

POST

with the authorization header:

Authorization: Bearer <CRON_SECRET>

The job is scheduled every 2 hours.

API Overview
Health Check
GET /health

Checks whether the backend is running.

Search Products
GET /api/products/search

Searches the INE mock storefront catalog.

Track Product
POST /api/products/track

Adds a product to the tracked products list.

Get Tracked Products
GET /api/products/tracked

Returns tracked products.

Scrape Product
POST /api/products/:id/scrape

Runs a scrape for a specific tracked product.

Product History
GET /api/products/:id/history

Returns successful price history for a product.

Scrape Logs
GET /api/products/:id/logs

Returns scraping attempts for a product.

Scheduled Scrape
POST /api/scrape/all

Starts scraping for all tracked products.

This endpoint requires the configured CRON_SECRET.

Environment Variables
Variable	Purpose
SUPABASE_URL	Supabase project URL
SUPABASE_SERVICE_ROLE_KEY	Backend Supabase access
CRON_SECRET	Protects the scheduled scraping endpoint
PLAYWRIGHT_HEADLESS	Controls Playwright headless mode
VITE_API_BASE_URL	Frontend API base URL

Never commit actual secret values to the repository.

Reliability Considerations

The scraper was designed around the fact that the storefront can return temporary failures.

The main reliability measures are:

Multiple scraping attempts
Timeout handling
Retry delays
Price and stock validation
Recording failed attempts
Recording relevant network responses
Saving price history only after successful scraping
Preventing overlapping scheduled scrape runs

This prevents a temporary scraping failure from silently stopping the scheduled process or creating an incorrect price-history entry.

Future Improvements

Possible improvements include:

More detailed scraper monitoring
Email or notification alerts for price changes
User authentication
More advanced price analytics
Historical price comparison
Additional scraping health metrics
Author

Abhinav Tiwari

B.Tech Computer Science & Engineering

Built as part of the INE Software Engineer Intern assignment.
