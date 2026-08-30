# coco

A modular, TypeScript-first toolkit for building Cashu wallets and applications.

coco provides a complete foundation for Cashu development with a storage-agnostic
core that handles proof management, mint synchronization, quote lifecycle,
counter tracking, and state updates through a typed event bus. Published
packages now live under the `@cashu` npm scope.

Maintained adapters currently cover Node via `@cashu/coco-sqlite`, Bun via
`@cashu/coco-sqlite-bun`, web via `@cashu/coco-indexeddb`, and Expo/React
Native via `@cashu/coco-expo-sqlite`.

## Architecture

```
                    ┌─────────────┐
                    │   React     │
                    │   Wrapper   │
                    └──────┬──────┘
                           │ consumes
                           ▼
        ┌──────────────────────────────────┐
        │                                  │
        │      @cashu/coco-core           │
        │                                  │
        │  • Services & Business Logic     │
        │  • Event Bus                     │
        │  • Repository Interfaces         │
        │  • Plugin System (lifecycle)     │
        │                                  │
        └────┬──────────────┬──────────┬────────────┘
             │              │          │
      depends│       depends│   depends│
             ▼              ▼          ▼
   ┌────────────────┐ ┌──────────┐ ┌──────────────┐
   │ SQLite Adapters│ │ IndexedDB│ │ Expo SQLite  │
   │   Node + Bun   │ │ Adapter  │ │   Adapter    │
   └────────────────┘ └──────────┘ └──────────────┘
```

## Packages

- `@cashu/coco-core` — storage-agnostic core with services, typed event bus, and
  in-memory repositories for testing.
- `@cashu/coco-react` — React hooks and providers for integrating a Coco
  `Manager` into UI code.
- `@cashu/coco-sqlite` — Node adapter built on `better-sqlite3`.
- `@cashu/coco-indexeddb` — IndexedDB adapter for web environments.
- `@cashu/coco-expo-sqlite` — Expo SQLite adapter for React Native and Expo.
- `@cashu/coco-sqlite-bun` — Bun adapter built on `bun:sqlite`.
- `@cashu/coco-adapter-tests` — reusable storage adapter contract test helpers.
- `packages/cocod` — private Cashu wallet CLI and daemon that consumes the
  workspace core end to end (unpublished).
- `packages/docs` — VitePress documentation site for the repository.

## Philosophy

- **Modular and headless**: Bring your own storage and UI.
- **Strongly typed**: Clean TypeScript interfaces and event types.
- **Minimal dependencies**: Focus on correctness and clarity.

## Plugins

The core exposes a minimal plugin API to hook into lifecycle events with access to specific services.

- See `packages/core/README.md` → Plugins for details and examples.
- Register at construction or via `manager.use(plugin)`; dispose with `manager.dispose()`.

## Development

This repo uses Bun workspaces. Most packages build with `tsdown`; the React
package builds with `tsc -b` and Vite, and the docs site uses VitePress.

```bash
bun install
bun run build
bun run typecheck
bun run docs:dev
```

See `packages/core/README.md` for API details and package-level usage.

## Contributing

Please see `CONTRIBUTING.md` for contributor workflow, testing commands, changesets,
and scoped conventional commit message guidance.

---

# Amperstrand fork notes

We maintain this fork to run [pecan](https://github.com/Amperstrand/pecan) —
the giftcard.nok NOK Cashu mint — on coco with custom NUT-04/05 payment
methods that upstream coco cannot express without core changes.

## Branch structure

| Branch | Purpose | Upstream action |
|---|---|---|
| `main` | **Our deployment** — all changes merged, versions bumped, `dist/` committed for tarball consumption. Protected (PR required). | Track for our production state |
| `fix/indexeddb-method-preservation` | IndexedDB hardcoded `method: 'bolt11'` for stateful mint quote rows | Cherry-pick as a bug fix |
| `fix/snapshot-import-export` | `mintQuoteFromSnapshot` threw for custom methods; `mintQuoteToMethodSnapshot` relabeled everything `bolt12` | Cherry-pick as a bug fix |
| `fix/quotedata-roundtrip` | IndexedDB round-tripped only `quoteData.amount`, dropping `request`/`expected_sat` | Cherry-pick as a bug fix |
| `fix/methoddata-reconstruction` | `methodDataFromMeltQuote` returned `undefined` for custom methods | Cherry-pick as a bug fix |
| `fix/settlement-resume` | MeltSettlementProcessor boot filter dropped `executing` ops → reload mid-melt never resumed | Cherry-pick as a bug fix |
| `feat/type-opening` | Opened `MintQuote`/`MeltQuote` conditional types for custom methods | Review as an API proposal |
| `feat/check-melt-quote-for` | `MintAdapter.checkMeltQuoteFor` — generic melt quote state checks | Review as an API proposal |

Each `fix/*` and `feat/*` branch is a **single commit** — no merge commits,
no version bumps, no `dist/` changes. Upstream can cherry-pick, use as
context, or ignore entirely.

Full details: [issue #9](https://github.com/Amperstrand/coco/issues/9)
