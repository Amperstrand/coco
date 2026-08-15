import { t as SqlDatabase } from "../index-BWfrNssR.js";

//#region src/test/sqlDatabaseContract.d.ts
interface SqlDatabaseTestHandle {
  readonly database: SqlDatabase;
  dispose?(): void | Promise<void>;
}
interface SqlDatabaseContractOptions {
  createDatabase(): SqlDatabaseTestHandle | Promise<SqlDatabaseTestHandle>;
}
type TestResult = void | Promise<void>;
interface Matcher {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
}
interface Expect {
  (actual: unknown): Matcher;
}
interface SqlDatabaseContractTestApi {
  describe(name: string, fn: () => void): void;
  it(name: string, fn: () => TestResult, timeout?: number): void;
  expect: Expect;
}
declare function runSqlDatabaseContract(options: SqlDatabaseContractOptions, api: SqlDatabaseContractTestApi): void;
//#endregion
export { type SqlDatabaseContractOptions, type SqlDatabaseContractTestApi, type SqlDatabaseTestHandle, runSqlDatabaseContract };
//# sourceMappingURL=index.d.ts.map