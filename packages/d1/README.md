# @amperstrand/coco-d1

> ⚠️ Experimental: This is an AI-built adapter for Cloudflare D1. Not production-tested.

Cloudflare D1 storage adapter for the [coco](https://github.com/cashubtc/coco) Cashu wallet framework.

## Install

```bash
npm install @amperstrand/coco-d1
```

## Usage

```ts
import { initializeCoco } from '@cashu/coco-core';
import { D1Repositories } from '@amperstrand/coco-d1';

// In your Cloudflare Worker, D1 is available as an env binding
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const repositories = new D1Repositories({ d1Database: env.DB, localName: 'user-identifier' });
    await repositories.init();

    const manager = await initializeCoco({
      repo: repositories,
      seedGetter: async () => mySeed,
    });

    // Use manager.mint, manager.wallet, manager.ops, etc.
  },
};
```

## wrangler.toml

```toml
[[d1_databases]]
binding = "DB"
database_name = "coco-wallet"
database_id = "your-database-id"
```

## Notes

- **Fresh schema**: Applies the complete final schema as a single batch (no incremental migrations). Suitable for new D1 databases.
- **`withTransaction()`**: Creates scoped repository instances for the callback. D1 does not support `BEGIN`/`COMMIT`/`ROLLBACK`. Serializability relies on D1's single-writer guarantee. A future version may use `db.batch()` for true atomicity.
- **Async-only**: All methods are async, matching D1's API (unlike the sqlite3 adapter which wraps sync better-sqlite3 calls).
- **Amount columns are TEXT**: Matches the latest upstream schema where all amount columns store serialized string values.

## Upstream

Based on [cashubtc/coco](https://github.com/cashubtc/coco) — the modular Cashu wallet framework.
