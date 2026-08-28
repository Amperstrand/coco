import { J as UnknownMintError, T as normalizeUnit, U as ProofValidationError, l as generateSubId, p as normalizeMintUrl, x as DEFAULT_UNIT } from "./utils-CmANTq2P.js";
import { n as OperationIdLock, t as MintScopedLock } from "./MintScopedLock-aaq-Zge2.js";
import { t as normalizeMeltMethodData } from "./MeltMethodHandler-DULduEuY.js";
import { Amount } from "@cashu/cashu-ts";

//#region models/MeltQuote.ts
function meltQuoteFromBoltResponse(mintUrl, method, quote, options) {
	const now = options?.now ?? Date.now();
	return {
		mintUrl,
		method,
		quoteId: quote.quote,
		quote: quote.quote,
		request: quote.request,
		amount: Amount.from(quote.amount),
		unit: quote.unit,
		fee_reserve: Amount.from(quote.fee_reserve),
		expiry: quote.expiry,
		state: quote.state,
		payment_preimage: quote.payment_preimage,
		change: quote.change,
		lastObservedRemoteState: quote.state,
		lastObservedRemoteStateAt: now,
		createdAt: now,
		updatedAt: now
	};
}
function meltQuoteFromBolt11Response(mintUrl, quote, options) {
	return meltQuoteFromBoltResponse(mintUrl, "bolt11", quote, options);
}
function meltQuoteFromBolt12Response(mintUrl, quote, options) {
	return meltQuoteFromBoltResponse(mintUrl, "bolt12", quote, options);
}
function meltQuoteFromOnchainResponse(mintUrl, quote, options) {
	const now = options?.now ?? Date.now();
	const feeOptions = normalizeOnchainFeeOptions(quote.quote, quote.fee_options);
	return {
		mintUrl,
		method: "onchain",
		quoteId: quote.quote,
		quote: quote.quote,
		request: quote.request,
		amount: Amount.from(quote.amount),
		unit: quote.unit,
		fee_options: feeOptions,
		expiry: quote.expiry,
		state: quote.state,
		outpoint: quote.outpoint ?? void 0,
		change: quote.change,
		lastObservedRemoteState: quote.state,
		lastObservedRemoteStateAt: now,
		createdAt: now,
		updatedAt: now
	};
}
function meltQuoteToMethodSnapshot(quote) {
	if (quote.method === "onchain") return {
		quote: quote.quoteId,
		request: quote.request,
		method: "onchain",
		amount: quote.amount,
		unit: quote.unit,
		fee_options: quote.fee_options,
		selected_fee_index: null,
		outpoint: quote.outpoint ?? null,
		expiry: quote.expiry,
		state: quote.state,
		change: quote.change
	};
	return {
		quote: quote.quoteId,
		request: quote.request,
		method: quote.method,
		amount: quote.amount,
		unit: quote.unit,
		fee_reserve: quote.fee_reserve,
		expiry: quote.expiry,
		state: quote.state,
		payment_preimage: quote.payment_preimage ?? null,
		change: quote.change
	};
}
function resolveOnchainMeltFeeOption(quote, feeIndex) {
	const feeOptions = quote.fee_options;
	if (feeOptions.length === 0) throw new Error(`Melt quote ${quote.quoteId} has no onchain fee options`);
	if (feeIndex === void 0) throw new Error(`Melt quote ${quote.quoteId} requires an explicit feeIndex`);
	const feeOption = feeOptions.find((option) => option.fee_index === feeIndex);
	if (!feeOption) throw new Error(`Melt quote ${quote.quoteId} does not include onchain fee option ${feeIndex}`);
	return {
		feeIndex,
		feeOption
	};
}
function normalizeOnchainFeeOptions(quoteId, feeOptions) {
	if (!feeOptions || feeOptions.length === 0) throw new Error(`Onchain melt quote ${quoteId} did not include fee_options`);
	const seen = /* @__PURE__ */ new Set();
	return feeOptions.map((option) => {
		if (!Number.isFinite(option.fee_index) || !Number.isInteger(option.fee_index)) throw new Error(`Onchain melt quote ${quoteId} has invalid fee_index`);
		if (seen.has(option.fee_index)) throw new Error(`Onchain melt quote ${quoteId} has duplicate fee_index ${option.fee_index}`);
		seen.add(option.fee_index);
		if (!Number.isFinite(option.estimated_blocks) || !Number.isInteger(option.estimated_blocks) || option.estimated_blocks < 0) throw new Error(`Onchain melt quote ${quoteId} has invalid estimated_blocks`);
		return {
			fee_index: option.fee_index,
			fee_reserve: Amount.from(option.fee_reserve),
			estimated_blocks: option.estimated_blocks
		};
	});
}

//#endregion
//#region operations/melt/MeltOperation.ts
function isInitOperation(op) {
	return op.state === "init";
}
function isPreparedOperation(op) {
	return op.state === "prepared";
}
function isExecutingOperation(op) {
	return op.state === "executing";
}
function isPendingOperation(op) {
	return op.state === "pending";
}
function isFinalizedOperation(op) {
	return op.state === "finalized";
}
function isRollingBackOperation(op) {
	return op.state === "rolling_back";
}
function isRolledBackOperation(op) {
	return op.state === "rolled_back";
}
/**
* Check if operation has PreparedData (any state after init)
*/
function hasPreparedData(op) {
	return op.state !== "init";
}
/**
* Check if operation is in a terminal state
*/
function isTerminalOperation(op) {
	return op.state === "finalized" || op.state === "rolled_back" || op.state === "failed";
}
/**
* Creates a new SendOperation in init state
*/
function createMeltOperation(id, mintUrl, meta, unit = DEFAULT_UNIT, options) {
	const now = Date.now();
	return {
		...meta,
		id,
		state: "init",
		mintUrl,
		unit: normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT }),
		...options?.quoteId ? { quoteId: options.quoteId } : {},
		createdAt: now,
		updatedAt: now
	};
}

//#endregion
//#region operations/melt/MeltOperationService.ts
/**
* MeltOperationService orchestrates melt sagas while delegating
* method-specific behavior to MeltMethodHandlers.
*/
var MeltOperationService = class {
	handlerProvider;
	meltOperationRepository;
	quoteLifecycle;
	proofRepository;
	proofService;
	mintService;
	walletService;
	mintAdapter;
	eventBus;
	logger;
	operationIdLock = new OperationIdLock();
	recoveryLock = null;
	mintScopedLock;
	constructor(handlerProvider, meltOperationRepository, quoteLifecycle, proofRepository, proofService, mintService, walletService, mintAdapter, eventBus, logger, mintScopedLock) {
		this.handlerProvider = handlerProvider;
		this.meltOperationRepository = meltOperationRepository;
		this.quoteLifecycle = quoteLifecycle;
		this.proofRepository = proofRepository;
		this.proofService = proofService;
		this.mintService = mintService;
		this.walletService = walletService;
		this.mintAdapter = mintAdapter;
		this.eventBus = eventBus;
		this.logger = logger;
		this.mintScopedLock = mintScopedLock ?? new MintScopedLock();
	}
	buildDeps() {
		return {
			proofRepository: this.proofRepository,
			proofService: this.proofService,
			walletService: this.walletService,
			mintService: this.mintService,
			mintAdapter: this.mintAdapter,
			eventBus: this.eventBus,
			logger: this.logger
		};
	}
	async acquireOperationLock(operationId) {
		return this.operationIdLock.acquire(operationId);
	}
	isOperationLocked(operationId) {
		return this.operationIdLock.isLocked(operationId);
	}
	isRecoveryInProgress() {
		return this.recoveryLock !== null;
	}
	async resolvePendingSettlementQuote(op, canonicalQuote) {
		if (canonicalQuote) {
			if (canonicalQuote.state === "PAID" && !Array.isArray(canonicalQuote.change)) return this.quoteLifecycle.refreshMeltQuote(op.mintUrl, op.method, op.quoteId);
			return canonicalQuote;
		}
		const persistedQuote = await this.quoteLifecycle.getMeltQuote(op.mintUrl, op.method, op.quoteId);
		if (persistedQuote?.state === "PAID" && Array.isArray(persistedQuote.change)) return persistedQuote;
		return this.quoteLifecycle.refreshMeltQuote(op.mintUrl, op.method, op.quoteId);
	}
	async init(mintUrl, method, methodData, unit = DEFAULT_UNIT, options) {
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		if (!await this.mintService.isTrustedMint(mintUrl)) throw new UnknownMintError(`Mint ${mintUrl} is not trusted`);
		let normalizedMethodData;
		try {
			normalizedMethodData = normalizeMeltMethodData(methodData);
			if ("amountSats" in normalizedMethodData && normalizedMethodData.amountSats !== void 0 && normalizedMethodData.amountSats.isZero()) throw new ProofValidationError("Amount must be a positive number");
		} catch (error) {
			if (error instanceof ProofValidationError) throw error;
			throw new ProofValidationError("Amount must be a positive number");
		}
		const id = generateSubId();
		const createOperation = async (operationMintUrl, operationQuoteId) => {
			const operation = createMeltOperation(id, operationMintUrl, {
				method,
				methodData: normalizedMethodData
			}, normalizedUnit, operationQuoteId ? { quoteId: operationQuoteId } : void 0);
			await this.meltOperationRepository.create(operation);
			return operation;
		};
		const operation = options?.quoteId ? await this.createQuoteBoundInitOperation(mintUrl, method, options.quoteId, normalizedUnit, createOperation) : await createOperation(mintUrl);
		this.logger?.debug("Melt operation created", {
			operationId: id,
			mintUrl: operation.mintUrl,
			method,
			unit: normalizedUnit,
			quoteId: operation.quoteId
		});
		return operation;
	}
	async createQuoteBoundInitOperation(mintUrl, method, quoteId, expectedUnit, createOperation) {
		const releaseMintLock = await this.mintScopedLock.acquire(normalizeMintUrl(mintUrl));
		try {
			const quote = await this.quoteLifecycle.requireMeltQuoteForPrepare(mintUrl, method, quoteId, expectedUnit);
			const existing = await this.getTrackedOperationForQuote(quote.mintUrl, method, quote.quoteId);
			if (existing) throw new Error(`Melt quote ${quote.quoteId} is already tracked by operation ${existing.id} in state ${existing.state}`);
			return createOperation(quote.mintUrl, quote.quoteId);
		} finally {
			releaseMintLock();
		}
	}
	async getTrackedOperationForQuote(mintUrl, method, quoteId) {
		const matching = (await this.meltOperationRepository.getByQuoteId(mintUrl, quoteId)).filter((operation) => operation.method === method);
		if (matching.length === 0) return null;
		return matching.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
	}
	async prepareExistingQuote(quoteRef, options = {}) {
		const quote = await this.quoteLifecycle.requireMeltQuoteRefForPrepare(quoteRef);
		const methodData = this.methodDataFromMeltQuote(quote, options);
		const initOperation = await this.init(quote.mintUrl, quote.method, methodData, quote.unit, { quoteId: quote.quoteId });
		return this.prepare(initOperation.id);
	}
	methodDataFromMeltQuote(quote, options = {}) {
		switch (quote.method) {
			case "bolt11": return { invoice: quote.request };
			case "bolt12": return { offer: quote.request };
			case "onchain": {
				const { feeIndex } = resolveOnchainMeltFeeOption(quote, options.feeIndex);
				return {
					address: quote.request,
					amountSats: quote.amount,
					feeIndex
				};
			}
		}
	}
	/**
	* Prepare the operation by reserving proofs and creating outputs.
	* After this step, the operation can be executed or rolled back.
	*
	* If preparation fails, automatically attempts to recover the init operation.
	* Throws if the operation is already in progress.
	*/
	async prepare(operationId) {
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.meltOperationRepository.getById(operationId);
			if (!operation || operation.state !== "init") throw new Error(`Cannot prepare operation ${operationId}: expected state 'init' but found '${operation?.state ?? "not found"}'`);
			const initOp = operation;
			const releaseMintLock = await this.mintScopedLock.acquire(initOp.mintUrl);
			try {
				const handler = this.handlerProvider.get(initOp.method);
				await this.mintService.assertMethodUnitSupported(initOp.mintUrl, 5, initOp.method, initOp.unit);
				const { wallet } = await this.walletService.getWalletWithActiveKeysetId(initOp.mintUrl, initOp.unit);
				const quote = await this.quoteLifecycle.loadMeltQuoteSnapshotForOperation(initOp);
				const preparedOp = {
					...await handler.prepare({
						...this.buildDeps(),
						operation: initOp,
						wallet,
						quote
					}),
					state: "prepared",
					updatedAt: Date.now()
				};
				await this.meltOperationRepository.update(preparedOp);
				await this.eventBus.emit("melt-op:prepared", {
					mintUrl: preparedOp.mintUrl,
					operationId: preparedOp.id,
					operation: preparedOp
				});
				this.logger?.info("Melt operation prepared", {
					operationId: preparedOp.id,
					method: preparedOp.method
				});
				return preparedOp;
			} catch (e) {
				await this.tryRecoverInitOperation(initOp);
				throw e;
			} finally {
				releaseMintLock();
			}
		} finally {
			releaseLock();
		}
	}
	/**
	* Execute the prepared operation.
	* Performs the melt (swap if needed) and processes the result.
	*
	* If execution fails after transitioning to 'executing' state,
	* automatically attempts to recover the operation.
	* Throws if the operation is already in progress.
	*/
	async execute(operationId) {
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.meltOperationRepository.getById(operationId);
			if (!operation || operation.state !== "prepared") throw new Error(`Cannot execute operation ${operationId}: expected state 'prepared' but found '${operation?.state ?? "not found"}'`);
			const executing = {
				...operation,
				state: "executing",
				updatedAt: Date.now()
			};
			await this.meltOperationRepository.update(executing);
			try {
				const handler = this.handlerProvider.get(executing.method);
				const { wallet } = await this.walletService.getWalletWithActiveKeysetId(executing.mintUrl, executing.unit);
				const reservedProofs = (await this.proofRepository.getProofsByOperationId(executing.mintUrl, executing.id)).filter((p) => p.usedByOperationId === operationId);
				const result = await handler.execute({
					...this.buildDeps(),
					operation: executing,
					wallet,
					reservedProofs
				});
				switch (result.status) {
					case "PAID": {
						const finalizedOp = {
							...result.finalized,
							state: "finalized",
							updatedAt: Date.now()
						};
						await this.meltOperationRepository.update(finalizedOp);
						await this.eventBus.emit("melt-op:finalized", {
							mintUrl: finalizedOp.mintUrl,
							operationId: finalizedOp.id,
							operation: finalizedOp
						});
						this.logger?.info("Melt operation executing -> finalized (immediate)", {
							operationId: finalizedOp.id,
							method: finalizedOp.method
						});
						return finalizedOp;
					}
					case "PENDING": {
						const pendingOp = {
							...result.pending,
							state: "pending",
							updatedAt: Date.now()
						};
						await this.meltOperationRepository.update(pendingOp);
						await this.eventBus.emit("melt-op:pending", {
							mintUrl: pendingOp.mintUrl,
							operationId: pendingOp.id,
							operation: pendingOp
						});
						this.logger?.info("Melt operation executing -> pending", {
							operationId: pendingOp.id,
							method: pendingOp.method
						});
						return pendingOp;
					}
					case "FAILED": throw new Error(result.failed.error ?? "Melt execution failed");
				}
			} catch (e) {
				await this.tryRecoverExecutingOperation(executing);
				throw e;
			}
		} finally {
			releaseLock();
		}
	}
	async finalize(operationId, options = {}) {
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.meltOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			if (operation.state === "finalized") {
				this.logger?.debug("Operation already finalized", { operationId });
				const finalizedOp = operation;
				return {
					changeAmount: finalizedOp.changeAmount,
					effectiveFee: finalizedOp.effectiveFee,
					finalizedData: finalizedOp.finalizedData
				};
			}
			if (operation.state === "rolled_back" || operation.state === "rolling_back") {
				this.logger?.debug("Operation was rolled back or is rolling back, skipping finalization", { operationId });
				return {
					changeAmount: void 0,
					effectiveFee: void 0,
					finalizedData: void 0
				};
			}
			if (operation.state !== "pending") throw new Error(`Cannot finalize operation in state ${operation.state}`);
			const pendingOp = operation;
			const handler = this.handlerProvider.get(pendingOp.method);
			const canonicalQuote = await this.resolvePendingSettlementQuote(pendingOp, options.canonicalQuote);
			const finalizeResult = await handler.finalize?.({
				...this.buildDeps(),
				operation: pendingOp,
				canonicalQuote
			});
			const finalized = {
				...pendingOp,
				state: "finalized",
				updatedAt: Date.now(),
				changeAmount: finalizeResult?.changeAmount,
				effectiveFee: finalizeResult?.effectiveFee,
				finalizedData: finalizeResult?.finalizedData
			};
			await this.meltOperationRepository.update(finalized);
			await this.eventBus.emit("melt-op:finalized", {
				mintUrl: pendingOp.mintUrl,
				operationId,
				operation: finalized
			});
			this.logger?.info("Melt operation finalized", {
				operationId,
				changeAmount: finalized.changeAmount,
				effectiveFee: finalized.effectiveFee
			});
			return {
				changeAmount: finalized.changeAmount,
				effectiveFee: finalized.effectiveFee,
				finalizedData: finalized.finalizedData
			};
		} finally {
			releaseLock();
		}
	}
	async rollback(operationId, reason = "Rolled back", options = {}) {
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.meltOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			if (operation.state === "finalized" || operation.state === "rolled_back" || operation.state === "rolling_back" || operation.state === "init" || operation.state === "executing") throw new Error(`Cannot rollback operation in state ${operation.state}`);
			if (!hasPreparedData(operation)) throw new Error(`Operation ${operationId} is not in a rollbackable state`);
			const handler = this.handlerProvider.get(operation.method);
			const { wallet } = await this.walletService.getWalletWithActiveKeysetId(operation.mintUrl, operation.unit);
			if (operation.state === "pending") {
				const pendingOp = operation;
				const canonicalQuote = await this.resolvePendingSettlementQuote(pendingOp);
				const decision = await handler.checkPending?.({
					...this.buildDeps(),
					operation: pendingOp,
					wallet,
					canonicalQuote
				});
				if (decision !== "rollback") throw new Error(`Cannot rollback pending operation: quote state is not UNPAID (decision: ${decision})`);
			}
			let opForRollback = operation;
			const rolling = {
				...operation,
				state: "rolling_back",
				updatedAt: Date.now()
			};
			await this.meltOperationRepository.update(rolling);
			opForRollback = rolling;
			await handler.rollback?.({
				...this.buildDeps(),
				operation: opForRollback,
				wallet
			});
			await this.markAsRolledBack(opForRollback, reason);
		} finally {
			releaseLock();
		}
	}
	/**
	* Recover pending operations on startup.
	* This should be called during initialization.
	* Throws if recovery is already in progress.
	*/
	async recoverPendingOperations() {
		if (this.recoveryLock) throw new Error("Recovery is already in progress");
		let releaseRecoveryLock;
		this.recoveryLock = new Promise((resolve) => {
			releaseRecoveryLock = resolve;
		});
		try {
			let initCount = 0;
			let executingCount = 0;
			let pendingCount = 0;
			let rollingBackCount = 0;
			let orphanCount = 0;
			const initOps = await this.meltOperationRepository.getByState("init");
			for (const op of initOps) {
				await this.recoverInitOperation(op);
				initCount++;
			}
			const preparedOps = await this.meltOperationRepository.getByState("prepared");
			for (const op of preparedOps) this.logger?.warn("Found stale prepared operation, user can rollback manually", { operationId: op.id });
			const executingOps = await this.meltOperationRepository.getByState("executing");
			for (const op of executingOps) try {
				await this.recoverExecutingOperation(op);
				executingCount++;
			} catch (e) {
				this.logger?.error("Error recovering executing operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			const pendingOps = await this.meltOperationRepository.getByState("pending");
			for (const op of pendingOps) try {
				await this.checkPendingOperation(op.id);
				pendingCount++;
			} catch (e) {
				this.logger?.error("Error checking pending melt operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			const rollingBackOps = await this.meltOperationRepository.getByState("rolling_back");
			for (const op of rollingBackOps) {
				this.logger?.warn("Found operation stuck in rolling_back state. This indicates a crash during rollback. Manual recovery may be needed.", {
					operationId: op.id,
					mintUrl: op.mintUrl,
					method: op.method
				});
				rollingBackCount++;
			}
			this.logger?.info("Recovery completed", {
				initOperations: initCount,
				executingOperations: executingCount,
				pendingOperations: pendingCount,
				rollingBackOperations: rollingBackCount,
				orphanedReservations: orphanCount
			});
		} finally {
			this.recoveryLock = null;
			releaseRecoveryLock();
		}
	}
	async checkPendingOperation(operationId) {
		const op = await this.getOperation(operationId);
		if (!op || op.state !== "pending") throw new Error(`Cannot check operation ${operationId}: expected state 'pending' but found '${op?.state ?? "not found"}'`);
		const persistedQuote = await this.quoteLifecycle.getMeltQuote(op.mintUrl, op.method, op.quoteId);
		if (persistedQuote?.state === "PAID") {
			await this.finalize(op.id, { canonicalQuote: persistedQuote });
			return "finalize";
		}
		const handler = this.handlerProvider.get(op.method);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(op.mintUrl, op.unit);
		const quote = await this.quoteLifecycle.refreshMeltQuoteById({
			mintUrl: op.mintUrl,
			quoteId: op.quoteId
		});
		const decision = await handler.checkPending?.({
			...this.buildDeps(),
			operation: op,
			wallet,
			canonicalQuote: quote
		}) ?? "stay_pending";
		if (decision === "finalize") {
			await this.finalize(op.id, { canonicalQuote: quote });
			return "finalize";
		} else if (decision === "rollback") {
			await this.rollback(op.id, "Rollback requested by handler");
			return "rollback";
		} else {
			this.logger?.debug("Pending melt remains pending", { operationId: op.id });
			return "stay_pending";
		}
	}
	async markAsRolledBack(op, error) {
		const rolledBack = {
			...op,
			state: "rolled_back",
			updatedAt: Date.now(),
			error
		};
		await this.meltOperationRepository.update(rolledBack);
		await this.eventBus.emit("melt-op:rolled-back", {
			mintUrl: op.mintUrl,
			operationId: op.id,
			operation: rolledBack
		});
		this.logger?.info("Melt operation rolled back", {
			operationId: op.id,
			error
		});
		return rolledBack;
	}
	/**
	* Clean up a failed init operation.
	* Releases any orphaned proof reservations and deletes the operation.
	*/
	async recoverInitOperation(op) {
		const orphanedForOp = (await this.proofRepository.getReservedProofs()).filter((p) => p.usedByOperationId === op.id);
		if (orphanedForOp.length > 0) await this.proofService.releaseProofs(op.mintUrl, orphanedForOp.map((p) => p.secret));
		await this.meltOperationRepository.delete(op.id);
		this.logger?.info("Cleaned up failed init operation", { operationId: op.id });
	}
	/**
	* Attempts to recover an init operation, swallowing recovery errors.
	* If recovery fails, logs warning and leaves for startup recovery.
	*/
	async tryRecoverInitOperation(op) {
		try {
			await this.recoverInitOperation(op);
			this.logger?.info("Recovered init operation after failure", { operationId: op.id });
		} catch (recoveryError) {
			this.logger?.warn("Failed to recover init operation, will retry on next startup", {
				operationId: op.id,
				error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
			});
		}
	}
	/**
	* Recover an executing operation.
	* Delegates to handler for proof cleanup and state determination.
	* Updates operation state based on handler result (finalized, pending, or failed).
	*/
	async recoverExecutingOperation(op, options) {
		const releaseLock = options?.skipLock ? void 0 : await this.acquireOperationLock(op.id);
		try {
			const current = await this.meltOperationRepository.getById(op.id);
			if (!current) {
				this.logger?.warn("Melt operation missing during recovery", { operationId: op.id });
				return;
			}
			if (current.state === "finalized" || current.state === "failed" || current.state === "rolled_back") return;
			if (current.state !== "executing") {
				this.logger?.debug("Melt operation not executing during recovery", {
					operationId: current.id,
					state: current.state
				});
				return;
			}
			const executing = current;
			const handler = this.handlerProvider.get(executing.method);
			const { wallet } = await this.walletService.getWalletWithActiveKeysetId(executing.mintUrl, executing.unit);
			const result = await handler.recoverExecuting({
				...this.buildDeps(),
				operation: executing,
				wallet
			});
			switch (result.status) {
				case "PAID": {
					const finalizedOp = {
						...result.finalized,
						state: "finalized",
						updatedAt: Date.now()
					};
					await this.meltOperationRepository.update(finalizedOp);
					await this.eventBus.emit("melt-op:finalized", {
						mintUrl: finalizedOp.mintUrl,
						operationId: finalizedOp.id,
						operation: finalizedOp
					});
					this.logger?.info("Recovered executing operation as finalized", { operationId: executing.id });
					break;
				}
				case "PENDING": {
					const pendingOp = {
						...result.pending,
						state: "pending",
						updatedAt: Date.now()
					};
					await this.meltOperationRepository.update(pendingOp);
					await this.eventBus.emit("melt-op:pending", {
						mintUrl: pendingOp.mintUrl,
						operationId: pendingOp.id,
						operation: pendingOp
					});
					this.logger?.info("Recovered executing operation as pending", { operationId: executing.id });
					break;
				}
				case "FAILED":
					await this.markAsRolledBack(executing, result.failed.error ?? "Recovered: operation failed");
					break;
			}
		} finally {
			if (releaseLock) releaseLock();
		}
	}
	/**
	* Attempts to recover an executing operation, swallowing recovery errors.
	* If recovery fails (e.g., mint unreachable), logs warning and leaves
	* for startup recovery.
	*/
	async tryRecoverExecutingOperation(op) {
		try {
			await this.recoverExecutingOperation(op, { skipLock: true });
			this.logger?.info("Recovered executing operation after failure", { operationId: op.id });
		} catch (recoveryError) {
			this.logger?.warn("Failed to recover executing operation, will retry on next startup", {
				operationId: op.id,
				error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
			});
		}
	}
	async getOperation(operationId) {
		return this.meltOperationRepository.getById(operationId);
	}
	async getOperationByQuote(mintUrl, method, quoteId) {
		const matching = (await this.meltOperationRepository.getByQuoteId(mintUrl, quoteId)).filter((operation) => operation.method === method && hasPreparedData(operation));
		if (matching.length === 0) return null;
		if (matching.length > 1) throw new Error(`Found ${matching.length} melt operations for mint ${mintUrl}, method ${method}, and quote ${quoteId}`);
		return matching[0];
	}
	async getOperationByQuoteIdentity(identity) {
		const quote = await this.quoteLifecycle.getMeltQuoteById(identity);
		if (!quote) return null;
		const operations = await this.meltOperationRepository.getByQuoteId(normalizeMintUrl(quote.mintUrl), quote.quoteId);
		if (operations.length === 0) return null;
		if (operations.length > 1) throw new Error(`Found ${operations.length} melt operations for mint ${quote.mintUrl} and quote ${quote.quoteId}`);
		return operations[0];
	}
	async listOperationsByQuote(mintUrl, quoteId) {
		return (await this.meltOperationRepository.getByQuoteId(normalizeMintUrl(mintUrl), quoteId)).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
	}
	async getPendingOperations() {
		return this.meltOperationRepository.getPending();
	}
	async getPreparedOperations() {
		return (await this.meltOperationRepository.getByState("prepared")).filter((op) => op.state === "prepared");
	}
};

//#endregion
export { isFinalizedOperation as a, isPreparedOperation as c, isTerminalOperation as d, meltQuoteFromBolt11Response as f, resolveOnchainMeltFeeOption as g, meltQuoteToMethodSnapshot as h, isExecutingOperation as i, isRolledBackOperation as l, meltQuoteFromOnchainResponse as m, createMeltOperation as n, isInitOperation as o, meltQuoteFromBolt12Response as p, hasPreparedData as r, isPendingOperation as s, MeltOperationService as t, isRollingBackOperation as u };