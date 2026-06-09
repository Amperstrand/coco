import { Database } from 'bun:sqlite';

export function createD1Mock(): D1Database {
  const sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');

  return {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async run(): Promise<D1Result<never>> {
              const stmt = sqlite.prepare(sql);
              const info = stmt.run(...params);
              return {
                meta: {
                  changes: info.changes,
                  last_row_id: info.lastInsertRowid as number,
                  rows_read: -1,
                  rows_written: -1,
                },
                results: [],
                success: true,
              };
            },

            async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
              const stmt = sqlite.prepare(sql);
              const rows = stmt.all(...params) as T[];
              return {
                results: rows,
                success: true,
                meta: {
                  changes: -1,
                  last_row_id: -1,
                  rows_read: rows.length,
                  rows_written: -1,
                },
              };
            },

            async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
              const stmt = sqlite.prepare(sql);
              const row = stmt.get(...params) as T | undefined;
              if (row === undefined) return null;
              if (colName !== undefined && row !== null && typeof row === 'object') {
                return (row as Record<string, unknown>)[colName] as T ?? null;
              }
              return row ?? null;
            },
          };
        },

        async run(): Promise<D1Result<never>> {
          const stmt = sqlite.prepare(sql);
          const info = stmt.run();
          return {
            meta: {
              changes: info.changes,
              last_row_id: info.lastInsertRowid as number,
              rows_read: -1,
              rows_written: -1,
            },
            results: [],
            success: true,
          };
        },

        async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
          const stmt = sqlite.prepare(sql);
          const rows = stmt.all() as T[];
          return {
            results: rows,
            success: true,
            meta: {
              changes: -1,
              last_row_id: -1,
              rows_read: rows.length,
              rows_written: -1,
            },
          };
        },

        async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
          const stmt = sqlite.prepare(sql);
          const row = stmt.get() as T | undefined;
          if (row === undefined) return null;
          if (colName !== undefined && row !== null && typeof row === 'object') {
            return (row as Record<string, unknown>)[colName] as T ?? null;
          }
          return row ?? null;
        },
      };
    },

    async exec(sql: string): Promise<D1ExecResult> {
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const results: D1Result<unknown>[] = [];

      for (const statement of statements) {
        sqlite.exec(statement);
        results.push({
          results: [],
          success: true,
          meta: { changes: -1, last_row_id: -1, rows_read: -1, rows_written: -1 },
        });
      }

      return { results };
    },

    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      sqlite.exec('BEGIN');
      try {
        const results: D1Result<T>[] = [];
        for (const stmt of statements) {
          const result = await (stmt as { run(): Promise<D1Result<T>> }).run();
          results.push(result);
        }
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },

    async dump(): Promise<ArrayBuffer> {
      throw new Error('D1 mock: dump() not implemented');
    },
  };
}
