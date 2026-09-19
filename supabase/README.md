# Supabase Setup

Apply `001_price_tracker_schema.sql` in the Supabase SQL editor for the project.

1. Open Supabase.
2. Select the project.
3. Go to SQL Editor.
4. Paste the full contents of `supabase/001_price_tracker_schema.sql`.
5. Run the query.

For local scripts, copy `.env.example` to `.env` and set:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the service role key only on the backend or local scripts. Do not expose it in a frontend.

## Tables

`tracked_products` stores one row per INE product being tracked. `product_id` is unique, so product `738` cannot be tracked twice.

`price_history` stores successful, validated snapshots only. Failed scrape attempts must not be inserted here.

`scrape_logs` stores one row per scraper attempt, whether it failed or succeeded.

## Relationships

`price_history.tracked_product_id` references `tracked_products.id` with `on delete cascade`.

`scrape_logs.tracked_product_id` references `tracked_products.id` with `on delete cascade`.

## Test Data

Run this after applying the schema and setting `.env`:

```powershell
$env:NODE_PATH='C:\Users\asus\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\asus\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\Ine New Project\scripts\test-db-layer-738.js'
```

The test inserts product `738` with a name beginning `[TEST DATA]`.
Remove it before deployment if you do not want seeded test data:

```sql
delete from public.tracked_products
where product_id = '738'
  and name like '[TEST DATA]%';
```
