//#region src/test/sqlDatabaseContract.ts
async function withDatabase(options, fn) {
	const handle = await options.createDatabase();
	try {
		return await fn(handle.database);
	} finally {
		await handle.dispose?.();
	}
}
async function expectRejects(fn) {
	try {
		await fn();
		return false;
	} catch {
		return true;
	}
}
function createDeferred() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
function runSqlDatabaseContract(options, api) {
	const { describe, expect, it } = api;
	describe("SQL database driver contract", () => {
		it("executes multiple statements with exec", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
          );

          INSERT INTO contract_items (label) VALUES ('alpha');
          INSERT INTO contract_items (label) VALUES ('beta');
        `);
				expect(await database.all("SELECT label FROM contract_items ORDER BY id ASC")).toEqual([{ label: "alpha" }, { label: "beta" }]);
			});
		});
		it("binds readonly positional parameters", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_params (
            text_value TEXT NOT NULL,
            number_value INTEGER NOT NULL,
            bigint_value INTEGER NOT NULL,
            bytes_value BLOB NOT NULL,
            null_value TEXT
          );
        `);
				const params = [
					"alpha",
					7,
					9n,
					new Uint8Array([
						1,
						2,
						3
					]),
					null
				];
				await database.run(`INSERT INTO contract_params
            (text_value, number_value, bigint_value, bytes_value, null_value)
           VALUES (?, ?, ?, ?, ?)`, params);
				expect(await database.get(`SELECT
             text_value,
             number_value,
             bigint_value,
             LENGTH(bytes_value) AS bytes_length,
             null_value
           FROM contract_params`)).toEqual({
					text_value: "alpha",
					number_value: 7,
					bigint_value: 9,
					bytes_length: 3,
					null_value: null
				});
			});
		});
		it("normalizes run results", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_run_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
          );
        `);
				const insertResult = await database.run("INSERT INTO contract_run_results (label) VALUES (?)", ["alpha"]);
				const updateResult = await database.run("UPDATE contract_run_results SET label = ? WHERE id = ?", ["beta", insertResult.lastInsertRowId]);
				expect(insertResult.lastInsertRowId).toBe(1);
				expect(insertResult.changes).toBe(1);
				expect(updateResult.changes).toBe(1);
			});
		});
		it("returns one row from get and all rows from all", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_query_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
          );

          INSERT INTO contract_query_results (label) VALUES ('alpha');
          INSERT INTO contract_query_results (label) VALUES ('beta');
        `);
				const first = await database.get("SELECT label FROM contract_query_results ORDER BY id ASC");
				const missing = await database.get("SELECT label FROM contract_query_results WHERE label = ?", ["missing"]);
				const all = await database.all("SELECT label FROM contract_query_results ORDER BY id ASC");
				expect(first).toEqual({ label: "alpha" });
				expect(missing).toBe(void 0);
				expect(all).toEqual([{ label: "alpha" }, { label: "beta" }]);
			});
		});
		it("commits successful transactions", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
          );
        `);
				await database.transaction(async (tx) => {
					await tx.run("INSERT INTO contract_transactions (label) VALUES (?)", ["alpha"]);
				});
				expect(await database.all("SELECT label FROM contract_transactions")).toEqual([{ label: "alpha" }]);
			});
		});
		it("rolls back failed transactions", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_transaction_rollbacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
          );
        `);
				const didReject = await expectRejects(async () => {
					await database.transaction(async (tx) => {
						await tx.run("INSERT INTO contract_transaction_rollbacks (label) VALUES (?)", ["alpha"]);
						throw new Error("rollback");
					});
				});
				const rows = await database.all("SELECT label FROM contract_transaction_rollbacks");
				expect(didReject).toBe(true);
				expect(rows).toHaveLength(0);
			});
		});
		it("rolls nested transactions into the parent transaction", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_nested_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
          );
        `);
				await database.transaction(async (outerTx) => {
					await outerTx.run("INSERT INTO contract_nested_transactions (label) VALUES (?)", ["outer"]);
					await outerTx.transaction(async (innerTx) => {
						await innerTx.run("INSERT INTO contract_nested_transactions (label) VALUES (?)", ["inner"]);
					});
				});
				expect(await database.all("SELECT label FROM contract_nested_transactions ORDER BY id ASC")).toEqual([{ label: "outer" }, { label: "inner" }]);
			});
		});
		it("serializes or isolates concurrent root transactions", async () => {
			await withDatabase(options, async (database) => {
				await database.exec(`
          CREATE TABLE contract_concurrent_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
          );
        `);
				const firstEntered = createDeferred();
				const releaseFirst = createDeferred();
				const firstTransaction = database.transaction(async (tx) => {
					await tx.run("INSERT INTO contract_concurrent_transactions (label) VALUES (?)", ["first"]);
					firstEntered.resolve();
					await releaseFirst.promise;
				});
				await firstEntered.promise;
				const secondTransaction = database.transaction(async (tx) => {
					await tx.run("INSERT INTO contract_concurrent_transactions (label) VALUES (?)", ["second"]);
				});
				releaseFirst.resolve();
				await Promise.all([firstTransaction, secondTransaction]);
				expect(await database.all("SELECT label FROM contract_concurrent_transactions ORDER BY id ASC")).toEqual([{ label: "first" }, { label: "second" }]);
			});
		});
	});
}

//#endregion
export { runSqlDatabaseContract };
//# sourceMappingURL=index.js.map