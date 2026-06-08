/**
 * Thin async wrapper around Cloudflare D1's prepared statement API.
 * Provides run/get/all/exec methods compatible with the coco repository pattern.
 */
export class D1Db {
  readonly localName: string;

  constructor(readonly db: D1Database, localName: string) {
    this.localName = localName;
  }

  async run(sql: string, params: unknown[] = []): Promise<{ meta: D1Result<never>['meta'] }> {
    const result = await this.db.prepare(sql).bind(...params).run();
    return { meta: result.meta };
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.db.prepare(sql).bind(...params).all<T>();
    return result.results ?? [];
  }

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).bind(...params).first<T>() as T | undefined;
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }
}

export function getUnixTimeSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function getUnixTimeMs(): number {
  return Date.now();
}
