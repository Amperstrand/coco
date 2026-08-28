import { B as OperationInProgressError } from "./utils-CmANTq2P.js";

//#region operations/OperationIdLock.ts
/**
* In-memory fail-fast lock keyed by operation ID.
*
* If an operation ID is already locked, acquire throws immediately.
*/
var OperationIdLock = class {
	locks = /* @__PURE__ */ new Map();
	async acquire(operationId) {
		if (this.locks.has(operationId)) throw new OperationInProgressError(operationId);
		const entry = { waiters: [] };
		this.locks.set(operationId, entry);
		let released = false;
		return () => {
			if (released) return;
			released = true;
			if (this.locks.get(operationId) !== entry) return;
			this.locks.delete(operationId);
			for (const waiter of entry.waiters) waiter();
		};
	}
	async waitForUnlock(operationId) {
		const entry = this.locks.get(operationId);
		if (!entry) return;
		await new Promise((resolve) => {
			entry.waiters.push(resolve);
		});
	}
	isLocked(operationId) {
		return this.locks.has(operationId);
	}
};

//#endregion
//#region operations/MintScopedLock.ts
/**
* In-memory FIFO lock keyed by mint URL.
*
* This lock coordinates proof selection/reservation critical sections across
* operation services within a single runtime.
*/
var MintScopedLock = class {
	queues = /* @__PURE__ */ new Map();
	async acquire(mintUrl) {
		let queue = this.queues.get(mintUrl);
		if (!queue) {
			queue = {
				locked: false,
				waiters: []
			};
			this.queues.set(mintUrl, queue);
		}
		if (queue.locked) await new Promise((resolve) => {
			queue.waiters.push(resolve);
		});
		queue.locked = true;
		let released = false;
		return () => {
			if (released) return;
			released = true;
			const next = queue.waiters.shift();
			if (next) {
				next();
				return;
			}
			queue.locked = false;
			this.queues.delete(mintUrl);
		};
	}
};

//#endregion
export { OperationIdLock as n, MintScopedLock as t };