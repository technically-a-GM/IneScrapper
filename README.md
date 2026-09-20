# INE Product Price Tracker

A full-stack product price tracking application built for the INE Software Engineer Intern assignment.

The application allows users to search products from the INE mock storefront, track products, scrape their current price and stock status, view price history, and inspect individual scraping attempts.

## Live Demo

- Frontend: https://ine-scrapper.vercel.app
- Backend: https://inescrapper.onrender.com
- GitHub: [Add your GitHub repository link]

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
