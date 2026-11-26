# Load tests (Grafana k6)

Two tests answer "how many shoppers can the store handle":

| Test | Question | Model |
|---|---|---|
| [browse.js](browse.js) | How many shoppers can browse at once? | Concurrency steps 100 → 500 → 1,000 → 2,500 → 5,000 → 10,000, each ramped over 2 min and held 10 min. A step that misses the targets stops the run. |
| [surge.js](surge.js) | What happens when a promotion brings 10,000 shoppers in a minute? | Arrival rate (10,000 over 60 s ≈ 167 new sessions a second) onto one promoted product, then 10 min of normal traffic to measure recovery. |

The scripts refuse to run against the live store ([lib/journeys.js](lib/journeys.js), `assertStaging`).

## Without staging: live store, browsing only

When there's no staging server, `browse.js` can run against the live store in read-only mode:

```sh
k6 run -e BASE_URL=https://toolshypermarket.com -e LIVE_READONLY=yes -e MAX_USERS=1000 -e HOLD=3 loadtest/browse.js
```

- Browsing only (home, catalogue, search, product pages). Cart actions are off, and `surge.js` refuses the live store.
- Gentler steps: 50 → 100 → 250 → 500 → 1,000 shoppers, never more than 1,000. A step that misses the targets stops the run.
- Run it at the quietest hour (about 1–4 am IST) and watch `docker stats` on the VPS, ready to stop it with Ctrl-C.
- Product view counts aren't affected: they're recorded by browser code, which k6 doesn't run.

It answers how many shoppers can browse at once and what slows first. Carts, checkout, oversell and the 10,000-shopper surge still need staging.

## 1. Staging: never test the live store

A test that shares anything with production slows real shoppers or touches real orders. Staging needs its own:

- **App server** on the same Hostinger plan as production (same CPU, memory and container limits). Deploy the same release.
- **Database:** a Neon branch copied from production, on the same compute size and connection limits. Deleted after testing.
- **R2 bucket** (or read-only use of a copy) and its own domain, e.g. `staging.toolshypermarket.com`, behind the same Cloudflare and caching rules as production.
- **Fake outside services**, so nothing reaches a customer or staff member:
  - `SMS_PROVIDER=console` (OTP codes go to the log), no `RESEND_API_KEY` (email prints to the log).
  - Razorpay **test** keys and a test webhook secret.
  - No real fulfilment or staff alerts.
- **Test inventory:** the store's catalogue is almost all enquiry-only, so carts accept almost nothing. Mark a handful of staging products as sold online with a price and stock, and pass their ids as `CART_PRODUCT_IDS`. For the promotion, one of them is the hot product.
- **Rate limits:** cart writes are limited to 60 a minute per shopper. A load generator sends from a few IPs, so it would measure the limiter, not the store. Staging needs those limits raised (a staging-only setting; see "Before the first run").

## 2. Pass criteria (agree these before running)

Judged per journey (home, catalogue, search, product, cart), so a fast homepage can't hide a slow cart:

- **Speed:** 95% of requests in each journey within 2 s.
- **Reliability:** fewer than 0.5% of checks fail. The cart check reads the cart back and requires the product as a buyable line; an HTTP 200 alone doesn't pass.
- **Load delivered:** `dropped_iterations` is 0, meaning the generator really sent the traffic asked for.
- **Order correctness** (checkout test, below): zero oversold units, zero duplicate confirmed orders.
- **Recovery:** after the surge, the recovery scenario's response times return to the baseline from a quiet run.

## 3. Running

Start small and only go up while the previous step passes:

```sh
# Baseline with a handful of shoppers, to know what "normal" looks like.
k6 run -e BASE_URL=https://staging.example.com -e CART_PRODUCT_IDS=12,34 -e MAX_USERS=100 -e HOLD=5 loadtest/browse.js

# Then 1,000 (catalogue → search → product → cart), then higher.
k6 run -e BASE_URL=… -e CART_PRODUCT_IDS=… -e MAX_USERS=1000 loadtest/browse.js

# Promotion surge.
k6 run -e BASE_URL=… -e HOT_PRODUCT=/products/<slug> -e HOT_PRODUCT_ID=<id> -e ARRIVALS=10000 -e SURGE_SECONDS=60 loadtest/surge.js
```

A laptop can generate a few hundred shoppers at most. For 1,000+ run k6 from a separate machine near the server, or from Grafana Cloud k6, and check `dropped_iterations` to confirm the load was really delivered.

Tune the session mix in `browseSession` (home → catalogue / search / product, 1 in 10 adds to cart) from the busiest hour in analytics.

## 4. Watch during each run

- Neon: active connections, connection wait time, slow queries, CPU.
- VPS: app container CPU and memory (`docker stats`), Caddy errors.
- Cloudflare: cache hit ratio on `media.` and the site.
- A few real phones browsing the site at the same time: product page load and Add to Cart response, compared with the quiet baseline.

## 5. Order correctness (separate, small test)

Oversell can only be checked through checkout, which needs signed-in customers. Seed a test SKU with 20 units and 30+ test customer accounts (OTP in console mode), have them all add it and check out at once with Razorpay test payments, then reconcile:

```sql
-- Confirmed units sold for the test SKU must not exceed the 20 seeded,
-- and no cart may have produced two confirmed orders.
select v.sku, sum(oi.quantity) as sold
from order_items oi join product_variants v on v.id = oi.variant_id
join orders o on o.id = oi.order_id
where v.sku = 'LOADTEST-SKU' and o.status in ('PAID', 'CONFIRMED')
group by v.sku;
```

(Adjust table and status names to the schema before use.) After the test, check that expired stock reservations were released and stock is back where it should be.

## 6. The result to report

- The highest shopper count that met every target.
- The first journey that failed at the next step, and why (database, CPU, cache).
- How long the store took to recover after the surge.

## Before the first run

- [ ] Staging environment built as in section 1.
- [ ] Staging-only way to raise rate limits (not built yet: needs a small, production-safe code change).
- [ ] Test products on sale with stock; ids noted.
- [ ] Busiest-hour analytics for the session mix.
- [ ] Load generator chosen (separate machine or Grafana Cloud k6).
