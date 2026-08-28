import { B as OperationInProgressError, E as normalizeUnitAmount, J as UnknownMintError, T as normalizeUnit, U as ProofValidationError, d as getSecretsFromSerializedOutputData, f as mapProofToCoreProof, l as generateSubId, p as normalizeMintUrl } from "./utils-CmANTq2P.js";
import { f as assessMintQuoteClaimability, r as getMintQuoteAmount } from "./MintQuote-1rKBmFlH.js";
import { n as OperationIdLock, t as MintScopedLock } from "./MintScopedLock-aaq-Zge2.js";
import { Amount } from "@cashu/cashu-ts";

//#region operations/mint/MintOperation.ts
function hasPendingData(op) {
	return op.state !== "init";
}
function isTerminalOperation(op) {
	return op.state === "finalized" || op.state === "failed";
}
function getOutputProofSecrets(op) {
	const { keepSecrets, sendSecrets } = getSecretsFromSerializedOutputData(op.outputData);
	return [...keepSecrets, ...sendSecrets];
}
function createMintOperation(id, mintUrl, meta, intent, options) {
	const now = Date.now();
	return {
		...meta,
		...intent,
		amount: intent.amount,
		unit: normalizeUnit(intent.unit),
		quoteId: options.quoteId,
		id,
		state: "init",
		mintUrl,
		createdAt: now,
		updatedAt: now
	};
}

//#endregion
//#region operations/mint/MintOperationService.ts
/**
* MintOperationService orchestrates mint quote redemption as a crash-safe saga.
*/
var MintOperationService = class {
	handlerProvider;
	mintOperationRepository;
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
	constructor(handlerProvider, mintOperationRepository, quoteLifecycle, proofRepository, proofService, mintService, walletService, mintAdapter, eventBus, logger, mintScopedLock) {
		this.handlerProvider = handlerProvider;
		this.mintOperationRepository = mintOperationRepository;
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
	async acquireOperationLockAfterWait(operationId) {
		try {
			return await this.acquireOperationLock(operationId);
		} catch (error) {
			if (!(error instanceof OperationInProgressError)) throw error;
			await this.operationIdLock.waitForUnlock(operationId);
			return this.acquireOperationLock(operationId);
		}
	}
	isOperationLocked(operationId) {
		return this.operationIdLock.isLocked(operationId);
	}
	isRecoveryInProgress() {
		return this.recoveryLock !== null;
	}
	async createInitOperation(mintUrl, intent, method, methodData, options) {
		const parsed = normalizeUnitAmount(intent);
		if (!await this.mintService.isTrustedMint(mintUrl)) throw new UnknownMintError(`Mint ${mintUrl} is not trusted`);
		if (parsed.amount.isZero()) throw new ProofValidationError("Amount must be a positive number");
		const operationId = generateSubId();
		const releaseMintLock = await this.mintScopedLock.acquire(normalizeMintUrl(mintUrl));
		try {
			const quote = await this.resolveMintQuoteForOperationCreation(mintUrl, method, options.quoteId, parsed);
			const operation = createMintOperation(operationId, quote.mintUrl, {
				method,
				methodData
			}, parsed, { quoteId: quote.quoteId });
			await this.mintOperationRepository.create(operation);
			this.logger?.debug("Mint operation created", {
				operationId,
				mintUrl: operation.mintUrl,
				quoteId: operation.quoteId,
				method,
				amount: parsed.amount,
				unit: parsed.unit
			});
			return operation;
		} finally {
			releaseMintLock();
		}
	}
	async resolveMintQuoteForOperationCreation(mintUrl, method, quoteId, intent) {
		const quote = await this.quoteLifecycle.getMintQuote(mintUrl, method, quoteId);
		if (!quote) throw new Error(`Mint quote ${quoteId} for ${method} at ${mintUrl} was not found`);
		const fixedAmount = getMintQuoteAmount(quote);
		if (fixedAmount && !fixedAmount.equals(intent.amount)) throw new Error(`Mint quote ${quote.quoteId} amount ${fixedAmount} does not match requested amount ${intent.amount}`);
		if (quote.unit !== intent.unit) throw new Error(`Mint quote ${quote.quoteId} unit ${quote.unit} does not match requested unit ${intent.unit}`);
		if (fixedAmount) {
			const existing = await this.getOperationByQuote(quote.mintUrl, method, quote.quoteId);
			if (existing) throw new Error(`Mint quote ${quote.quoteId} is already tracked by operation ${existing.id} in state ${existing.state}`);
		}
		return quote;
	}
	async prepare(quoteRef, requestedAmount) {
		const quote = await this.quoteLifecycle.requireMintQuoteRefForPrepare(quoteRef);
		const amount = Amount.from(requestedAmount);
		const fixedAmount = getMintQuoteAmount(quote);
		if (fixedAmount && !fixedAmount.equals(amount)) throw new Error(`Mint quote ${quote.quoteId} amount ${fixedAmount} does not match requested amount ${amount}`);
		await this.handlerProvider.get(quote.method).validateQuoteForPrepare?.(quote);
		const initOperation = await this.createInitOperation(quote.mintUrl, {
			amount,
			unit: quote.unit
		}, quote.method, {}, { quoteId: quote.quoteId });
		return this.prepareInitOperation(initOperation.id);
	}
	async prepareInitOperation(operationId, options) {
		const releaseLock = await this.acquireOperationLock(operationId);
		let releaseMintLock = null;
		let initOp = null;
		let failure;
		try {
			const operation = await this.mintOperationRepository.getById(operationId);
			if (!operation || operation.state !== "init") throw new Error(`Cannot prepare operation ${operationId}: expected state 'init' but found '${operation?.state ?? "not found"}'`);
			initOp = operation;
			if (!options?.skipMintLock) releaseMintLock = await this.mintScopedLock.acquire(initOp.mintUrl);
			try {
				const importedQuote = await this.quoteLifecycle.loadMintQuoteSnapshotForOperation(initOp);
				const handler = this.handlerProvider.get(initOp.method);
				await this.mintService.assertMethodUnitSupported(initOp.mintUrl, 4, initOp.method, initOp.method === "onchain" ? initOp.unit : {
					amount: initOp.amount,
					unit: initOp.unit
				});
				const { wallet } = await this.walletService.getWalletWithActiveKeysetId(initOp.mintUrl, initOp.unit);
				const pendingOp = {
					...await handler.prepare({
						...this.buildDeps(),
						operation: initOp,
						wallet,
						importedQuote
					}),
					state: "pending",
					updatedAt: Date.now()
				};
				await this.mintOperationRepository.update(pendingOp);
				await this.eventBus.emit("mint-op:pending", {
					mintUrl: pendingOp.mintUrl,
					operationId: pendingOp.id,
					operation: pendingOp
				});
				this.logger?.info("Mint operation is pending", {
					operationId: pendingOp.id,
					mintUrl: pendingOp.mintUrl,
					quoteId: pendingOp.quoteId,
					method: pendingOp.method
				});
				return pendingOp;
			} catch (e) {
				failure = e;
			} finally {
				releaseMintLock?.();
			}
		} finally {
			releaseLock();
		}
		if (failure) {
			if (initOp) await this.tryRecoverInitOperation(initOp);
			throw failure;
		}
		throw new Error(`Failed to prepare operation ${operationId}`);
	}
	async execute(operationId) {
		while (true) {
			const operation = await this.mintOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			if (isTerminalOperation(operation)) return operation;
			if (operation.state === "executing") {
				if (this.isOperationLocked(operationId)) {
					await this.operationIdLock.waitForUnlock(operationId);
					continue;
				}
				try {
					await this.recoverExecutingOperation(operation);
				} catch (error) {
					if (!(error instanceof OperationInProgressError)) throw error;
					await this.operationIdLock.waitForUnlock(operationId);
				}
				if ((await this.mintOperationRepository.getById(operationId))?.state === "executing") throw new Error(`Operation ${operationId} remains executing after recovery`);
				continue;
			}
			if (operation.state !== "pending") throw new Error(`Cannot execute operation ${operationId}: expected state 'pending' but found '${operation.state}'`);
			const quote = await this.quoteLifecycle.getMintQuote(operation.mintUrl, operation.method, operation.quoteId);
			if (quote) return this.claimPendingQuoteOperation(operation, quote);
			return this.executeReadyOperation(operationId);
		}
	}
	async executeReadyOperation(operationId) {
		const releaseLock = await this.acquireOperationLockAfterWait(operationId);
		try {
			const operation = await this.mintOperationRepository.getById(operationId);
			if (operation && isTerminalOperation(operation)) return operation;
			if (!operation || operation.state !== "pending") throw new Error(`Cannot execute operation ${operationId}: expected state 'pending' but found '${operation?.state ?? "not found"}'`);
			if (!await this.mintService.isTrustedMint(operation.mintUrl)) throw new UnknownMintError(`Mint ${operation.mintUrl} is not trusted`);
			const executing = {
				...operation,
				state: "executing",
				updatedAt: Date.now(),
				error: void 0
			};
			await this.mintOperationRepository.update(executing);
			await this.eventBus.emit("mint-op:executing", {
				mintUrl: executing.mintUrl,
				operationId: executing.id,
				operation: executing
			});
			try {
				const handler = this.handlerProvider.get(executing.method);
				const { wallet } = await this.walletService.getWalletWithActiveKeysetId(executing.mintUrl, executing.unit);
				const result = await handler.execute({
					...this.buildDeps(),
					operation: executing,
					wallet
				});
				switch (result.status) {
					case "ISSUED":
						if (!await this.ensureOutputsSaved(executing, result.proofs)) throw new Error(`Failed to persist output proofs for operation ${executing.id}`);
						return await this.finalizeIssuedOperation(executing);
					case "ALREADY_ISSUED": {
						const error = await this.ensureOutputsSaved(executing) ? void 0 : `Recovered issued quote ${executing.quoteId} but no proofs could be restored`;
						if (error) this.logger?.warn("Mint quote was already issued but proofs could not be recovered", {
							operationId: executing.id,
							mintUrl: executing.mintUrl,
							quoteId: executing.quoteId
						});
						return await this.finalizeIssuedOperation(executing, error);
					}
					case "FAILED": throw new Error(result.error ?? "Mint execution failed");
				}
			} catch (e) {
				await this.tryRecoverExecutingOperation(executing);
				const current = await this.mintOperationRepository.getById(operationId);
				if (current && isTerminalOperation(current)) return current;
				throw e;
			}
		} finally {
			releaseLock();
		}
	}
	async finalize(operationId) {
		const operation = await this.mintOperationRepository.getById(operationId);
		if (!operation) throw new Error(`Operation ${operationId} not found`);
		if (isTerminalOperation(operation)) {
			this.logger?.debug("Operation already finalized", { operationId });
			return operation;
		}
		if (operation.state === "pending") return this.execute(operation.id);
		if (operation.state === "executing") {
			await this.recoverExecutingOperation(operation);
			const updated = await this.mintOperationRepository.getById(operationId);
			if (updated && isTerminalOperation(updated)) return updated;
			if (updated?.state === "pending") throw new Error(`Operation ${operationId} remains pending after recovery`);
			throw new Error(`Unable to finalize operation ${operationId} in state '${updated?.state ?? "missing"}'`);
		}
		throw new Error(`Cannot finalize operation ${operationId} in state '${operation.state}'. Expected 'pending' or 'executing'.`);
	}
	async recoverPendingOperations() {
		if (this.recoveryLock) throw new Error("Recovery is already in progress");
		let releaseRecoveryLock;
		this.recoveryLock = new Promise((resolve) => {
			releaseRecoveryLock = resolve;
		});
		try {
			let initCount = 0;
			let pendingCount = 0;
			let executingCount = 0;
			const initOps = await this.mintOperationRepository.getByState("init");
			for (const op of initOps) try {
				await this.recoverInitOperation(op);
				initCount++;
			} catch (e) {
				if (e instanceof OperationInProgressError) {
					this.logger?.debug("Mint init operation in progress, skipping recovery", { operationId: op.id });
					continue;
				}
				this.logger?.warn("Failed to recover mint init operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			const pendingOps = await this.mintOperationRepository.getByState("pending");
			for (const op of pendingOps) try {
				if (await this.mintService.isTrustedMint(op.mintUrl)) {
					await this.checkPendingOperation(op.id);
					pendingCount++;
				} else this.logger?.warn("Skipping recovery of pending operation for untrusted mint", {
					operationId: op.id,
					mintUrl: op.mintUrl
				});
			} catch (e) {
				this.logger?.warn("Failed to reconcile stale pending mint operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			const executingOps = await this.mintOperationRepository.getByState("executing");
			for (const op of executingOps) try {
				await this.recoverExecutingOperation(op);
				executingCount++;
			} catch (e) {
				if (e instanceof OperationInProgressError) {
					this.logger?.debug("Mint executing operation in progress, skipping recovery", { operationId: op.id });
					continue;
				}
				this.logger?.error("Error recovering executing mint operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			this.logger?.info("Mint operation recovery completed", {
				initOperations: initCount,
				pendingOperations: pendingCount,
				executingOperations: executingCount
			});
		} finally {
			this.recoveryLock = null;
			releaseRecoveryLock();
		}
	}
	async recoverExecutingOperation(op, options) {
		const releaseLock = options?.skipLock ? void 0 : await this.acquireOperationLock(op.id);
		try {
			const current = await this.mintOperationRepository.getById(op.id);
			if (!current) {
				this.logger?.warn("Mint operation missing during recovery", { operationId: op.id });
				return;
			}
			if (isTerminalOperation(current)) return;
			if (current.state !== "executing") {
				this.logger?.debug("Mint operation not executing during recovery", {
					operationId: current.id,
					state: current.state
				});
				return;
			}
			const executing = current;
			if (await this.hasSavedOutputs(executing)) {
				await this.finalizeIssuedOperation(executing);
				return;
			}
			if (!await this.mintService.isTrustedMint(executing.mintUrl)) {
				this.logger?.warn("Mint is not trusted, skipping recovery of executing mint operation", {
					operationId: executing.id,
					mintUrl: executing.mintUrl,
					quoteId: executing.quoteId
				});
				return;
			}
			const handler = this.handlerProvider.get(executing.method);
			const { wallet } = await this.walletService.getWalletWithActiveKeysetId(executing.mintUrl, executing.unit);
			const siblings = await this.mintOperationRepository.getByQuoteId(executing.mintUrl, executing.method, executing.quoteId);
			const result = await handler.recoverExecuting({
				...this.buildDeps(),
				operation: executing,
				wallet,
				localClaimabilityFacts: this.getLocalClaimabilityFacts(siblings, executing.id)
			});
			switch (result.status) {
				case "FINALIZED":
					if (await this.ensureOutputsSaved(executing)) await this.finalizeIssuedOperation(executing);
					else await this.transitionToPending(executing, `Recovered issued quote ${executing.quoteId} but no proofs could be restored`);
					break;
				case "PENDING":
					await this.transitionToPending(executing, result.error);
					this.logger?.warn("Mint operation returned to pending after recovery", {
						operationId: executing.id,
						mintUrl: executing.mintUrl,
						quoteId: executing.quoteId,
						error: result.error
					});
					break;
				case "TERMINAL":
					await this.failOperation(executing, result.error);
					this.logger?.warn("Mint operation moved to failed during recovery", {
						operationId: executing.id,
						mintUrl: executing.mintUrl,
						quoteId: executing.quoteId,
						error: result.error
					});
					break;
			}
		} finally {
			if (releaseLock) releaseLock();
		}
	}
	async getOperation(operationId) {
		return this.mintOperationRepository.getById(operationId);
	}
	async getOperationByQuote(mintUrl, method, quoteId) {
		const operations = await this.getOperationsForQuote(mintUrl, method, quoteId);
		if (operations.length === 0) return null;
		const sorted = operations.sort((a, b) => {
			if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
			if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
			return b.id.localeCompare(a.id);
		});
		const finalized = sorted.find((op) => op.state === "finalized");
		if (finalized) return finalized;
		const terminal = sorted.find((op) => isTerminalOperation(op));
		if (terminal) return terminal;
		return sorted[0] ?? null;
	}
	async getOperationsForQuote(mintUrl, method, quoteId) {
		return this.mintOperationRepository.getByQuoteId(mintUrl, method, quoteId);
	}
	async listOperationsByQuote(mintUrl, quoteId) {
		return (await this.mintOperationRepository.getByMintUrl(normalizeMintUrl(mintUrl))).filter((operation) => operation.quoteId === quoteId).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
	}
	async claimMintQuote(mintUrl, method, quoteId, options = {}) {
		const releaseQuoteLock = await this.mintScopedLock.acquire(this.quoteLockKey(mintUrl, method, quoteId));
		try {
			const quote = await this.quoteLifecycle.getMintQuote(mintUrl, method, quoteId);
			if (!quote) throw new Error(`Cannot claim mint quote ${quoteId}: quote for ${method} at ${mintUrl} was not found`);
			const siblings = await this.mintOperationRepository.getByQuoteId(mintUrl, method, quoteId);
			const assessment = this.assessQuoteClaimability(quote, siblings);
			const claimable = assessment.claimAmount ?? Amount.zero();
			if (assessment.status === "complete") {
				const completed = [];
				for (const operation of siblings) if (operation.state === "pending") completed.push(await this.executeReadyOperation(operation.id));
				return completed;
			}
			if (assessment.status !== "claimable" || claimable.isZero()) return [];
			let selectedAmount = Amount.zero();
			const selected = [];
			const autoClaimRemaining = options.autoClaimRemaining ?? true;
			for (const operation of siblings) {
				if (operation.state !== "pending") continue;
				const nextAmount = selectedAmount.add(operation.amount);
				if (nextAmount.greaterThan(claimable)) break;
				selected.push(operation);
				selectedAmount = nextAmount;
			}
			const claimed = [];
			for (const operation of selected) claimed.push(await this.executeReadyOperation(operation.id));
			const remaining = claimable.subtract(selectedAmount);
			if (autoClaimRemaining && !remaining.isZero()) {
				const refreshedQuote = await this.quoteLifecycle.getMintQuote(mintUrl, method, quoteId) ?? quote;
				const refreshedSiblings = await this.mintOperationRepository.getByQuoteId(mintUrl, method, quoteId);
				const currentAssessment = this.assessQuoteClaimability(refreshedQuote, refreshedSiblings);
				if (currentAssessment.status === "claimable" && currentAssessment.claimAmount) {
					const autoClaimAmount = remaining.lessThan(currentAssessment.claimAmount) ? remaining : currentAssessment.claimAmount;
					if (!autoClaimAmount.isZero()) {
						const autoClaim = await this.createAutoClaimOperation(refreshedQuote, autoClaimAmount);
						claimed.push(await this.executeReadyOperation(autoClaim.id));
					}
				}
			}
			return claimed;
		} finally {
			releaseQuoteLock();
		}
	}
	async claimPendingMintQuotes(options = {}) {
		const quotes = await this.quoteLifecycle.getPendingMintQuotes();
		const claimed = [];
		for (const quote of quotes) {
			if (!await this.mintService.isTrustedMint(quote.mintUrl)) {
				this.logger?.debug("Skipping pending mint quote for untrusted mint", {
					mintUrl: quote.mintUrl,
					method: quote.method
				});
				continue;
			}
			claimed.push(...await this.claimMintQuote(quote.mintUrl, quote.method, quote.quoteId, options));
		}
		return claimed;
	}
	/** @internal Used by background schedulers to assess a canonical quote with local operation facts. */
	async getMintQuoteClaimability(mintUrl, method, quoteId, options = {}) {
		const quote = await this.quoteLifecycle.getMintQuote(mintUrl, method, quoteId);
		if (!quote) return;
		const siblings = await this.mintOperationRepository.getByQuoteId(mintUrl, method, quoteId);
		return this.assessQuoteClaimability(quote, siblings, options);
	}
	async claimPendingQuoteOperation(operation, initialQuote) {
		const releaseQuoteLock = await this.mintScopedLock.acquire(this.quoteLockKey(operation.mintUrl, operation.method, operation.quoteId));
		try {
			const current = await this.mintOperationRepository.getById(operation.id);
			if (!current || current.state !== "pending") {
				if (current) return current;
				throw new Error(`Operation ${operation.id} not found`);
			}
			const pending = current;
			const quote = await this.quoteLifecycle.getMintQuote(pending.mintUrl, pending.method, pending.quoteId) ?? initialQuote;
			const siblings = await this.mintOperationRepository.getByQuoteId(pending.mintUrl, pending.method, pending.quoteId);
			const assessment = this.assessQuoteClaimability(quote, siblings, {
				requestedAmount: pending.amount,
				targetOperationId: pending.id
			});
			if (assessment.status === "invalid") throw new Error(`Mint quote ${pending.quoteId} has invalid claimability accounting`);
			if (assessment.status === "waiting") {
				this.logger?.info("Mint quote is not sufficiently funded for operation", {
					operationId: pending.id,
					mintUrl: pending.mintUrl,
					quoteId: pending.quoteId,
					requestedAmount: pending.amount.toString(),
					claimableAmount: assessment.claimAmount?.toString() ?? "0"
				});
				return pending;
			}
			return this.executeReadyOperation(pending.id);
		} finally {
			releaseQuoteLock();
		}
	}
	async createAutoClaimOperation(quote, amount) {
		const initOperation = await this.createInitOperation(quote.mintUrl, {
			amount,
			unit: quote.unit
		}, quote.method, {}, { quoteId: quote.quoteId });
		return this.prepareInitOperation(initOperation.id);
	}
	assessQuoteClaimability(quote, siblings, options = {}) {
		return assessMintQuoteClaimability(quote, {
			...this.getLocalClaimabilityFacts(siblings, options.targetOperationId),
			requestedAmount: options.requestedAmount
		});
	}
	getLocalClaimabilityFacts(siblings, targetOperationId) {
		return {
			finalizedAmount: siblings.reduce((total, operation) => operation.state === "finalized" ? total.add(operation.amount) : total, Amount.zero()),
			reservedAmount: siblings.reduce((total, operation) => {
				if (operation.state !== "executing" || operation.id === targetOperationId) return total;
				return total.add(operation.amount);
			}, Amount.zero())
		};
	}
	quoteLockKey(mintUrl, method, quoteId) {
		return `${mintUrl}::${method}::${quoteId}`;
	}
	async getInFlightOperations() {
		return this.mintOperationRepository.getPending();
	}
	async recoverInitOperation(op) {
		const releaseLock = await this.acquireOperationLock(op.id);
		try {
			const current = await this.mintOperationRepository.getById(op.id);
			if (!current || current.state !== "init") return;
			await this.mintOperationRepository.delete(op.id);
			this.logger?.info("Cleaned up failed mint init operation", { operationId: op.id });
		} finally {
			releaseLock();
		}
	}
	async getPendingOperations() {
		return (await this.mintOperationRepository.getByState("pending")).filter((op) => op.state === "pending");
	}
	async tryRecoverInitOperation(op) {
		try {
			await this.recoverInitOperation(op);
			this.logger?.info("Recovered mint init operation after failure", { operationId: op.id });
		} catch (recoveryError) {
			this.logger?.warn("Failed to recover mint init operation, will retry on startup", {
				operationId: op.id,
				error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
			});
		}
	}
	async tryRecoverExecutingOperation(op) {
		try {
			await this.recoverExecutingOperation(op, { skipLock: true });
			this.logger?.info("Recovered executing mint operation after failure", { operationId: op.id });
		} catch (recoveryError) {
			this.logger?.warn("Failed to recover executing mint operation, will retry on startup", {
				operationId: op.id,
				error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
			});
		}
	}
	async ensureOutputsSaved(op, proofsFromExecute) {
		if (await this.hasSavedOutputs(op)) return true;
		if (proofsFromExecute && proofsFromExecute.length > 0) await this.proofService.saveProofs(op.mintUrl, mapProofToCoreProof(op.mintUrl, "ready", proofsFromExecute, {
			unit: op.unit,
			createdByOperationId: op.id
		}));
		if (await this.hasSavedOutputs(op)) return true;
		await this.proofService.recoverProofsFromOutputData(op.mintUrl, op.outputData, {
			unit: op.unit,
			createdByOperationId: op.id
		});
		return this.hasSavedOutputs(op);
	}
	async finalizeIssuedOperation(op, error) {
		const current = await this.mintOperationRepository.getById(op.id);
		if (!current) throw new Error(`Operation ${op.id} not found`);
		if (current.state === "finalized") return current;
		if (current.state !== "executing") throw new Error(`Cannot finalize operation ${op.id} in state ${current.state}`);
		if (current.method === "bolt11") await this.quoteLifecycle.recordMintQuoteObservation(current, "ISSUED", Date.now());
		const finalized = {
			...current,
			state: "finalized",
			updatedAt: Date.now(),
			error
		};
		await this.mintOperationRepository.update(finalized);
		await this.eventBus.emit("mint-op:finalized", {
			mintUrl: finalized.mintUrl,
			operationId: finalized.id,
			operation: finalized
		});
		this.logger?.info("Mint operation finalized", {
			operationId: finalized.id,
			mintUrl: finalized.mintUrl,
			quoteId: finalized.quoteId
		});
		return finalized;
	}
	async failOperation(op, error) {
		const current = await this.mintOperationRepository.getById(op.id);
		if (!current) throw new Error(`Operation ${op.id} not found`);
		if (current.state === "failed") return current;
		if (current.state === "finalized") throw new Error(`Cannot fail operation ${op.id} in state ${current.state}`);
		if (current.state !== "executing") throw new Error(`Cannot fail operation ${op.id} in state ${current.state}`);
		const failed = {
			...current,
			state: "failed",
			updatedAt: Date.now(),
			error,
			terminalFailure: {
				reason: error,
				observedAt: Date.now()
			}
		};
		await this.mintOperationRepository.update(failed);
		await this.eventBus.emit("mint-op:failed", {
			mintUrl: failed.mintUrl,
			operationId: failed.id,
			operation: failed
		});
		this.logger?.info("Mint operation failed during recovery", {
			operationId: failed.id,
			mintUrl: failed.mintUrl,
			quoteId: failed.quoteId,
			error
		});
		return failed;
	}
	async transitionToPending(op, error) {
		const pending = {
			...op,
			state: "pending",
			updatedAt: Date.now(),
			error
		};
		await this.mintOperationRepository.update(pending);
		await this.eventBus.emit("mint-op:pending", {
			mintUrl: op.mintUrl,
			operationId: op.id,
			operation: pending
		});
		this.logger?.info("Mint operation moved to pending", {
			operationId: op.id,
			mintUrl: op.mintUrl,
			quoteId: op.quoteId,
			error
		});
		return pending;
	}
	async observePendingOperation(operationId) {
		const op = await this.getOperation(operationId);
		if (!op || op.state !== "pending") throw new Error(`Cannot check operation ${operationId}: expected state 'pending' but found '${op?.state ?? "not found"}'`);
		const observation = await this.handlerProvider.get(op.method).checkPending({
			operation: op,
			mintAdapter: this.mintAdapter,
			logger: this.logger
		});
		let canonicalQuote;
		if (observation.quoteSnapshot) canonicalQuote = await this.quoteLifecycle.recordMintQuoteSnapshot(op.mintUrl, op.method, observation.quoteSnapshot);
		let result;
		if (observation.validationFailure) result = {
			observedRemoteStateAt: observation.observedAt,
			quoteSnapshot: observation.quoteSnapshot,
			category: "terminal",
			terminalFailure: observation.validationFailure
		};
		else {
			if (!canonicalQuote) throw new Error(`Pending mint observation for operation ${op.id} has no quote snapshot`);
			const siblings = await this.mintOperationRepository.getByQuoteId(op.mintUrl, op.method, op.quoteId);
			const assessment = this.assessQuoteClaimability(canonicalQuote, siblings, {
				requestedAmount: op.amount,
				targetOperationId: op.id
			});
			result = {
				observedRemoteStateAt: observation.observedAt,
				quoteSnapshot: observation.quoteSnapshot,
				category: assessment.status === "claimable" ? "ready" : assessment.status === "complete" ? "completed" : assessment.status === "invalid" ? "terminal" : "waiting",
				terminalFailure: assessment.status === "invalid" ? {
					reason: `Mint quote ${op.quoteId} has invalid claimability accounting`,
					code: "invalid_quote",
					retryable: false,
					observedAt: observation.observedAt
				} : void 0
			};
		}
		if (result.category === "terminal" && result.terminalFailure) await this.failPendingOperation(op, result.terminalFailure);
		return result;
	}
	async checkPendingOperation(operationId) {
		const result = await this.observePendingOperation(operationId);
		if (result.category === "ready" || result.category === "completed") await this.finalize(operationId);
		return result;
	}
	async failPendingOperation(op, terminalFailure) {
		if (!terminalFailure) throw new Error(`Cannot fail pending operation ${op.id} without terminal failure details`);
		const current = await this.mintOperationRepository.getById(op.id);
		if (!current) throw new Error(`Operation ${op.id} not found`);
		if (current.state === "failed") return current;
		if (current.state === "finalized") throw new Error(`Cannot fail operation ${op.id} in state ${current.state}`);
		if (current.state !== "pending") throw new Error(`Cannot fail operation ${op.id} in state ${current.state}`);
		const failed = {
			...current,
			state: "failed",
			updatedAt: Date.now(),
			error: terminalFailure.reason,
			terminalFailure
		};
		await this.mintOperationRepository.update(failed);
		await this.eventBus.emit("mint-op:failed", {
			mintUrl: failed.mintUrl,
			operationId: failed.id,
			operation: failed
		});
		this.logger?.info("Mint operation failed while pending", {
			operationId: failed.id,
			mintUrl: failed.mintUrl,
			quoteId: failed.quoteId,
			error: terminalFailure.reason
		});
		return failed;
	}
	async hasSavedOutputs(op) {
		if (!hasPendingData(op)) return false;
		const outputSecrets = getOutputProofSecrets(op);
		if (outputSecrets.length === 0) return false;
		for (const secret of outputSecrets) if (!await this.proofRepository.getProofBySecret(op.mintUrl, secret)) return false;
		return true;
	}
};

//#endregion
export { isTerminalOperation as a, hasPendingData as i, createMintOperation as n, getOutputProofSecrets as r, MintOperationService as t };