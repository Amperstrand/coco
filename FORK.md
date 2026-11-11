# FORK.md — Amperstrand/coco Charter

**What this repo is:** a mirror of [`cashubtc/coco`](https://github.com/cashubtc/coco)
`master` plus Amperstrand purpose branches for **testing, dogfooding, and
showcasing**. Not a deployment fork, not an upstream-contribution staging area.

## Policy

- **`main` is a pristine upstream mirror.** No local commits, ever. Syncing is
  fast-forward only (`git push amperstrand upstream/master:main --force` behind
  a temporary protection lift, or delete+recreate under admin).
- **Upstream is fetch-only.** We do not open PRs, issues, or comments on
  `cashubtc/*` (org etiquette: external repos are research surfaces only).
  Findings worth sharing get written up in Amperstrand repos instead.
- **Consumption is pinned git URLs** with committed `dist/` and version tags,
  per [`Amperstrand/hackathon-tooling` → forked-dependency-management](https://github.com/Amperstrand/hackathon-tooling/blob/main/patterns/cloudflare/forked-dependency-management.md).
  Nobody tracks a moving ref.

## Branch taxonomy

| Branch | Status | Purpose / revive trigger |
|---|---|---|
| `main` | live | Upstream master mirror |
| `feat/d1-adapter` | **to port** | Cloudflare D1 adapter (`@amperstrand/coco-d1`). Port source: `cf-d1` branch **plus** the newer dangling-lineage commits preserved under `pin/lnforward` and `pin/cashuexchange` (getMintQuoteById, workerd per-statement schema exec). Consumers: lnforward, cashuexchange, silent.energy (vendored). |
| money-safety cluster (`fix/pending-melt-change-preservation` + PR #15 work) | **parked** on `release/1.0.x` | pendingChange preservation, pre-melt swap override, NUT-08 zero-value guard, orphaned-change restore. Revive when: (a) a variable-fee fiat rail lands (fee_reserve ceiling ⇒ change structurally unavoidable), or (b) androidpay decides to migrate to coco. |
| settlement-resume (`fix/settlement-resume`) | **parked** | Executing-melt boot resume; upstream still lacks it. Same triggers as above. |
| `feat/check-melt-quote-for` + public handler registration | **parked** | Upstream still exports only types — no runtime registration API. Revive on androidpay coco-migration or any custom-method dogfood. |
| custom-method platform (type-opening, keyRingService export, quoteData round-trip, …) | **deprecated** | Superseded by upstream's own open `MeltMethodDefinitions` + handler architecture (2026-10 audit). Kept for history on old branches. |
| `release/1.0.x` (+ tag `v1.0.10`) | **frozen** | The deployment-fork era, end-stamped 2026-11-10. Contains everything above in working order, incl. the validated money-safety cluster. |
| `pin/*` tags | **frozen** | Containment for consumer-pinned dangling SHAs — never delete. |

## Update 2026-11-11 — upstream landed #277 (crash recovery for `rolling_back`)

Upstream merged the Send half of cashubtc/coco#277 today: PR #613
"fix(core): settle interrupted send reclaims during recovery" (12:59 UTC)
plus pre-merge commit e475563 "fence reclaim abandonment and settle stored
reclaim outputs" (08:40 UTC, review follow-ups). The Melt `rolling_back`
recovery was already on master (refresh quote → UNPAID → release
"Recovered legacy rollback", else defer). Verified by reading master's
`SendOperationService.ts` / `MeltOperationService.ts` (2026-11-11).

Consequences for this fork:

- **June crash-recovery patch SUPERSEDED.** `9d07b84` ("feat(core): automatic
  recovery for rolling_back operations (Send + Melt)", riding the
  `pin/lnforward` / `pin/cashuexchange` lineages) is now covered upstream for
  both halves — master settles from mint evidence with a stored reclaim
  request, strict `requireComplete` NUT-09 restore, recipient-claimed →
  finalized in one transaction, and `ops.send.recovery.run()` as the on-demand
  trigger. Keep `pin/*` frozen as history; do not carry the patch forward.
- **settlement-resume residue is now ~1 commit.** `fix/settlement-resume` is
  1 commit / 1 file (`MeltSettlementProcessor.ts`) ahead of master as of today
  (was "upstream still lacks it" in the table above — stale now). Re-diff
  against master before any revive; the settlement-processor architecture
  itself was adopted upstream.
- **Money-safety cluster unaffected** (`fix/pending-melt-change-preservation`
  still 18 commits ahead — different bug class: change preservation, not
  crash recovery). Revive triggers unchanged.
- **Mirror pending:** `main` is 15 behind upstream master as of 2026-11-11
  ~13:00 UTC (incl. #613 and the proof-observation refactors). Routine
  fast-forward per Policy.

## History pointers

- Restructure decision + 28-commit audit: coco#16, PR #15, and the 2026-11-10
  session record in `Amperstrand/pr-review-audit` (`coco-14-fix-report.md`).
- Why the money-safety cluster exists: androidpay#1, cashubtc/cdk#2792,
  cashu-ts#1079 — and the live-proven app-layer mitigation (pre-swap to exact
  denominations) that made parking it safe.
- Variable-fee fiat design note: NUT-05 `fee_reserve` is a ceiling; NUT-08
  returns the difference as change, including on quote-check for async rails.
  The mint side (pecan/cashu-cf) must quote percent-based reserves with expiry
  and serve change on `check_melt_quote`.
