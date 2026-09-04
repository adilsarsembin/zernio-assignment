# Campaign budget

`POST /campaigns/budget` finds a user by phone and sets the daily budget of their Meta campaign via Zernio.

```json
{ "phoneNumber": "+972541234567", "budgetAmount": 250 }
```

Returns 200 with the campaign id and what Zernio sends back.

## Run

```
npm i
npx prisma generate
npm run start:dev
```

`.env`:

```
DATABASE_URL=postgresql://localhost:5432/zernio
ZERNIO_API_KEY=sk_...
```

Boots without a database, Prisma connects on the first query. With Postgres, `npx prisma db push` creates the table.

## Test

```
npm test -- campaigns.service
```

The Zernio client is injected under the `ZERNIO` token, so the test replaces it with a plain object and a `jest.fn()`. The mock rejects with the SDK's own `ZernioApiError` (409, `BUDGET_LEVEL_MISMATCH`) and the test checks the request body and the resulting 409.

Nest 12 is ESM only, so the test script runs jest with `--experimental-vm-modules`.

## Zernio

Docs used: Meta Ads overview and its Campaigns page, the update campaign reference, the error handling, rate limits and idempotency guides, the Node SDK page and the SDK source in `node_modules/@zernio/node/src`.

Meta keeps the budget either on the campaign (CBO) or on the ad sets (ABO). We only store a campaign id, so the call is `PUT /v1/ads/campaigns/{campaignId}` with `budget: { amount, type: 'daily' }`, which is `zernio.adcampaigns.updateAdCampaign` in the SDK. Amount is in whole currency units, same as our input. `accountId` is sent always, Zernio needs it for empty campaigns and ignores it otherwise.

SDK notes:

- Errors are thrown as `ZernioApiError` with `statusCode` and `code`. The envelope's `type` and `platformError` are dropped by the SDK, so mapping is by status and code.
- The `timeout` option of the client is not wired, so the service passes its own `AbortSignal.timeout`.
- Types come from `@hey-api/client-fetch`, which the SDK does not ship. Added as a dev dependency, otherwise every call is `any`.

## Assumptions

- `buget` and `quniue` in the brief are typos.
- ABO campaigns get a 409 instead of updating ad sets. The model has no ad set id.
- `metaAdAccountId` is unused, the update call does not take it.
- Nothing is stored, Zernio is the source of truth.
- Only `budgetAmount >= 1` is checked locally, Meta's minimum depends on currency.

## Failure modes

| Case | Response | Why |
|---|---|---|
| Invalid body | 400 | Validation pipe, nothing is called. |
| Phone not found | 404 | |
| User has no campaign | 409 | State problem, not a bad request. |
| Zernio 404 | 409 | Our campaign id is stale. |
| Zernio 409 | 409 | ABO campaign. |
| `platform_api_error` | 422 with Meta's message | Caller can change the amount. |
| `ads_connection_required` / `account_disconnected` | 409 | Owner has to reconnect Meta. |
| 429 | 503 with `retryAfter` | Retry later. |
| 400 / 401 / 403 / 500 / 501 | 502, logged | Our bug, key or billing, or their outage. |
| Timeout (10 s) | 504 | The update may have landed. No idempotency key on this endpoint, so no blind retry. |
| Network error | 502 | Request never reached Zernio. |
| No `ZERNIO_API_KEY` | App does not start | |
