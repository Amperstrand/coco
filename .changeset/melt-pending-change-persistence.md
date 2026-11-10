---
'@cashu/coco-adapter-tests': patch
'@cashu/coco-indexeddb': patch
'@cashu/coco-sql-storage': patch
'@cashu/coco-sqlite': patch
'@cashu/coco-sqlite-bun': patch
'@cashu/coco-expo-sqlite': patch
---

Preserve `pendingChange` overpay signatures through the IndexedDB and SQL melt-operation row
conversions (new nullable `pendingChangeJson` field, SQL migration `039_melt_operation_pending_change`,
Dexie version 34) so pending melts can still claim their change after persistence, verified by a
repository contract regression test that round-trips a pending melt through every adapter.
