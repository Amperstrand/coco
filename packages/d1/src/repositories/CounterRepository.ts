import type { CounterRepository, Counter } from '@cashu/coco-core';
import type { D1Db } from '../db.ts';

export class D1CounterRepository implements CounterRepository {
  private readonly db: D1Db;

  constructor(db: D1Db) {
    this.db = db;
  }

  async getCounter(mintUrl: string, keysetId: string): Promise<Counter | null> {
    const row = await this.db.get<{ counter: number }>(
      'SELECT counter FROM coco_cashu_counters WHERE local_name = ? AND mintUrl = ? AND keysetId = ? LIMIT 1',
      [this.db.localName, mintUrl, keysetId],
    );
    if (!row) return null;
    return { mintUrl, keysetId, counter: row.counter } satisfies Counter;
  }

  async setCounter(mintUrl: string, keysetId: string, counter: number): Promise<void> {
    await this.db.run(
      `INSERT INTO coco_cashu_counters (local_name, mintUrl, keysetId, counter)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl, keysetId) DO UPDATE SET counter = excluded.counter`,
      [this.db.localName, mintUrl, keysetId, counter],
    );
  }
}
