import { Amount, Amount as Amount$1, AuthManager, JSONInt, Mint, OutputData, PaymentRequest, PaymentRequestTransportType, Wallet, getDecodedToken, getDecodedToken as getDecodedToken$1, getEncodedToken, getEncodedToken as getEncodedToken$1, getTokenMetadata, getTokenMetadata as getTokenMetadata$1, hashToCurve, splitAmount, sumProofs } from "@cashu/cashu-ts";
import { schnorr, secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex } from "@noble/curves/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { HDKey } from "@scure/bip32";
import { bytesToHex as bytesToHex$1 } from "@noble/hashes/utils.js";

//#region models/Error.ts
var UnknownMintError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "UnknownMintError";
	}
};
var MintFetchError = class extends Error {
	mintUrl;
	constructor(mintUrl, message, cause) {
		super(message ?? `Failed to fetch mint ${mintUrl}`);
		this.name = "MintFetchError";
		this.mintUrl = mintUrl;
		this.cause = cause;
	}
};
var KeysetSyncError = class extends Error {
	mintUrl;
	keysetId;
	constructor(mintUrl, keysetId, message, cause) {
		super(message ?? `Failed to sync keyset ${keysetId} for mint ${mintUrl}`);
		this.name = "KeysetSyncError";
		this.mintUrl = mintUrl;
		this.keysetId = keysetId;
		this.cause = cause;
	}
};
var ProofValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ProofValidationError";
	}
};
var UnitValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "UnitValidationError";
	}
};
var UnitMismatchError = class extends UnitValidationError {
	constructor(message) {
		super(message);
		this.name = "UnitMismatchError";
	}
};
var TokenValidationError = class extends Error {
	constructor(message, cause) {
		super(message);
		this.name = "TokenValidationError";
		this.cause = cause;
	}
};
var ProofOperationError = class extends Error {
	mintUrl;
	keysetId;
	constructor(mintUrl, message, keysetId, cause) {
		super(message ?? `Proof operation failed for mint ${mintUrl}${keysetId ? ` keyset ${keysetId}` : ""}`);
		this.name = "ProofOperationError";
		this.mintUrl = mintUrl;
		this.keysetId = keysetId;
		this.cause = cause;
	}
};
/**
* This error is thrown when a HTTP response is not 2XX nor a protocol error.
*/
var HttpResponseError = class HttpResponseError extends Error {
	status;
	constructor(message, status) {
		super(message);
		this.status = status;
		this.name = "HttpResponseError";
		Object.setPrototypeOf(this, HttpResponseError.prototype);
	}
};
/**
* This error is thrown when a network request fails.
*/
var NetworkError = class NetworkError extends Error {
	constructor(message) {
		super(message);
		this.name = "NetworkError";
		Object.setPrototypeOf(this, NetworkError.prototype);
	}
};
/**
* This error is thrown when a protocol error occurs per Cashu NUT-00 error codes.
*/
var MintOperationError = class MintOperationError extends HttpResponseError {
	code;
	constructor(code, detail) {
		super(detail || "Unknown mint operation error", 400);
		this.code = code;
		this.name = "MintOperationError";
		Object.setPrototypeOf(this, MintOperationError.prototype);
	}
};
/**
* This error is thrown when a payment request is invalid or cannot be processed.
*/
var PaymentRequestError = class extends Error {
	constructor(message, cause) {
		super(message);
		this.name = "PaymentRequestError";
		this.cause = cause;
	}
};
/**
* This error is thrown when attempting to modify an operation that is already in progress.
*/
var OperationInProgressError = class extends Error {
	operationId;
	constructor(operationId) {
		super(`Operation ${operationId} is already in progress`);
		this.name = "OperationInProgressError";
		this.operationId = operationId;
	}
};
var AuthSessionError = class extends Error {
	mintUrl;
	constructor(mintUrl, message, cause) {
		super(message ?? `Auth session error for mint ${mintUrl}`);
		this.name = "AuthSessionError";
		this.mintUrl = mintUrl;
		this.cause = cause;
	}
};
var AuthSessionExpiredError = class extends AuthSessionError {
	constructor(mintUrl) {
		super(mintUrl, `Auth session expired for mint ${mintUrl}`);
		this.name = `AuthSessionExpiredError`;
	}
};

//#endregion
//#region amounts.ts
const DEFAULT_UNIT = "sat";
function isUnitAmountLikeObject(input) {
	return typeof input === "object" && input !== null && "amount" in input && "unit" in input;
}
function normalizeUnit(unit, options) {
	const rawUnit = unit === void 0 ? options?.defaultUnit : unit;
	if (typeof rawUnit !== "string") throw new UnitValidationError("Unit is required");
	const normalized = rawUnit.trim().toLowerCase();
	if (!normalized) throw new UnitValidationError("Unit cannot be empty");
	return normalized;
}
function normalizeUnitList(units) {
	if (units === void 0) return void 0;
	return Array.from(new Set(units.map((unit) => normalizeUnit(unit))));
}
function assertSameUnit(actual, expected, context) {
	const normalizedActual = normalizeUnit(actual);
	const normalizedExpected = normalizeUnit(expected);
	if (normalizedActual !== normalizedExpected) throw new UnitMismatchError(`${context ? `${context}: ` : ""}Unit mismatch: expected ${normalizedExpected}, received ${normalizedActual}`);
}
/**
* Parse ergonomic public-boundary amount input into canonical `UnitAmount`.
*
* Use this at API and hook boundaries only. Internal services, operations, and
* handlers should accept `UnitAmount` directly so amount+unit cannot be split or
* accidentally defaulted.
*/
function parseUnitAmount(input, options) {
	const isObjectInput = isUnitAmountLikeObject(input);
	const amountInput = isObjectInput ? input.amount : input;
	const unit = normalizeUnit(isObjectInput ? input.unit : options?.explicitUnit ?? options?.defaultUnit ?? DEFAULT_UNIT);
	if (options?.explicitUnit !== void 0) assertSameUnit(unit, options.explicitUnit, "Amount input");
	return {
		amount: Amount$1.from(amountInput),
		unit
	};
}
/**
* Normalize an already-coupled amount/unit value for internal service use.
*
* `parseUnitAmount()` is the public-boundary parser for ergonomic inputs. Internal
* service and operation layers should accept `UnitAmount` and use this helper only
* to canonicalize the `Amount` instance and lower-case the unit.
*/
function normalizeUnitAmount(value) {
	return {
		amount: Amount$1.from(value.amount),
		unit: normalizeUnit(value.unit)
	};
}
function assertUnitAmount(value, context = "Unit amount") {
	if (!value || typeof value !== "object") throw new UnitValidationError(`${context} is required`);
	if (!("amount" in value)) throw new UnitValidationError(`${context} amount is required`);
	if (!("unit" in value)) throw new UnitValidationError(`${context} unit is required`);
	return normalizeUnitAmount(value);
}
function sameUnitAmount(amount, expectedUnit, context) {
	const normalized = assertUnitAmount(amount, context ?? "Unit amount");
	assertSameUnit(normalized.unit, expectedUnit, context);
	return normalized;
}

//#endregion
//#region utils.ts
/**
* Convert a Uint8Array to hex string
*/
function uint8ArrayToHex(arr) {
	return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
/**
* Convert a hex string to Uint8Array
*/
function hexToUint8Array(hex) {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	return bytes;
}
/**
* Serialize a single OutputData to JSON-safe format
*/
function serializeOutput(output) {
	return {
		blindedMessage: {
			amount: serializeAmount(output.blindedMessage.amount),
			id: output.blindedMessage.id,
			B_: output.blindedMessage.B_
		},
		blindingFactor: output.blindingFactor.toString(16),
		secret: uint8ArrayToHex(output.secret)
	};
}
/**
* Deserialize a single SerializedOutput back to OutputData
*/
function deserializeOutput(serialized) {
	return new OutputData({
		amount: deserializeAmount(serialized.blindedMessage.amount),
		id: serialized.blindedMessage.id,
		B_: serialized.blindedMessage.B_
	}, BigInt("0x" + serialized.blindingFactor), hexToUint8Array(serialized.secret));
}
/**
* Serialize OutputData arrays for keep and send to JSON-safe format
*/
function serializeOutputData(data) {
	return {
		keep: data.keep.map(serializeOutput),
		send: data.send.map(serializeOutput)
	};
}
/**
* Deserialize SerializedOutputData back to OutputData arrays
*/
function deserializeOutputData(serialized) {
	return {
		keep: serialized.keep.map(deserializeOutput),
		send: serialized.send.map(deserializeOutput)
	};
}
/**
* Decode a hex-encoded secret to its string representation (matching proof.secret)
*/
function decodeSecretHex(hexSecret) {
	const bytes = hexToUint8Array(hexSecret);
	return new TextDecoder().decode(bytes);
}
/**
* Extract secrets from serialized output data.
* Returns the string form of secrets (matching proof.secret in Proof objects).
*/
function getSecretsFromSerializedOutputData(serialized) {
	return {
		keepSecrets: serialized.keep.map((o) => decodeSecretHex(o.secret)),
		sendSecrets: serialized.send.map((o) => decodeSecretHex(o.secret))
	};
}
function mapProofToCoreProof(mintUrl, state, proofs, options) {
	const unit = normalizeUnit(options.unit);
	return proofs.map((p) => ({
		...p,
		mintUrl,
		unit,
		state,
		createdByOperationId: options?.createdByOperationId
	}));
}
function toAmount(value) {
	return Amount$1.from(value);
}
function sumAmounts(values) {
	return Amount$1.sum(values);
}
function serializeAmount(value) {
	return Amount$1.from(value).toString();
}
function stringifyJson(value) {
	const json = JSON.stringify(value, (_key, value) => typeof value === "bigint" ? value.toString() : value);
	if (json === void 0) throw new TypeError("Value cannot be serialized to JSON");
	return json;
}
function deserializeAmount(value) {
	return Amount$1.from(value);
}
function deserializeToken(value) {
	if (!value || typeof value !== "object") return void 0;
	const token = value;
	return {
		...token,
		proofs: Array.isArray(token.proofs) ? token.proofs.map((proof) => ({
			...proof,
			amount: deserializeAmount(proof.amount)
		})) : []
	};
}
function assertNonNegativeInteger(paramName, value, logger) {
	if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
		logger?.warn("Invalid numeric value", { [paramName]: value });
		throw new Error(`${paramName} must be a non-negative integer`);
	}
}
function toBase64Url(bytes) {
	let base64;
	const Buf = globalThis.Buffer;
	if (typeof Buf !== "undefined") base64 = Buf.from(bytes).toString("base64");
	else if (typeof btoa !== "undefined") {
		let bin = "";
		for (const b of bytes) bin += String.fromCharCode(b);
		base64 = btoa(bin);
	}
	if (!base64) return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function generateSubId() {
	const length = 16;
	const bytes = new Uint8Array(length);
	const cryptoObj = globalThis.crypto;
	if (cryptoObj && typeof cryptoObj.getRandomValues === "function") cryptoObj.getRandomValues(bytes);
	else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
	return toBase64Url(bytes);
}
/**
* Compute the Y point (hex, compressed) for a single secret using hash-to-curve.
*/
function computeYHexForSecrets(secrets) {
	const encoder = new TextEncoder();
	return secrets.map((secret) => hashToCurve(encoder.encode(secret)).toHex(true));
}
/**
* Build bidirectional maps between secrets and their Y points (hex) using hash-to-curve.
* - yHexBySecret: secret -> Y hex
* - secretByYHex: Y hex -> secret
*/
function buildYHexMapsForSecrets(secrets) {
	const yHexBySecret = /* @__PURE__ */ new Map();
	const secretByYHex = /* @__PURE__ */ new Map();
	const yHexes = computeYHexForSecrets(secrets);
	for (let i = 0; i < secrets.length; i++) {
		const secret = secrets[i];
		const yHex = yHexes[i];
		if (!secret || !yHex) continue;
		yHexBySecret.set(secret, yHex);
		secretByYHex.set(yHex, secret);
	}
	return {
		yHexBySecret,
		secretByYHex
	};
}
/**
* Normalize a mint URL to prevent duplicates from variations like:
* - Trailing slashes: https://mint.com/ -> https://mint.com
* - Case differences in hostname: https://MINT.com -> https://mint.com
* - Default ports: https://mint.com:443 -> https://mint.com
* - Redundant path segments: https://mint.com/./path -> https://mint.com/path
*/
function normalizeMintUrl(mintUrl) {
	const url = new URL(mintUrl);
	if (url.protocol === "https:" && url.port === "443" || url.protocol === "http:" && url.port === "80") url.port = "";
	let normalized = `${url.protocol}//${url.host}${url.pathname}`;
	if (normalized.endsWith("/") && url.pathname !== "/") normalized = normalized.slice(0, -1);
	else if (url.pathname === "/") normalized = `${url.protocol}//${url.host}`;
	return normalized;
}

//#endregion
//#region services/AuthService.ts
/**
* Core service for NUT-21/22 authentication.
*
* Orchestrates cashu-ts AuthManager (CAT/BAT lifecycle) and
* AuthSessionService (token persistence) so callers only need
* `mgr.auth.*` to authenticate with mints.
*/
var AuthService = class {
	/** Per-mint AuthManager (always present after login/restore). */
	managers = /* @__PURE__ */ new Map();
	/** Per-mint PersistingProvider wrapper (returned by getAuthProvider). */
	providers = /* @__PURE__ */ new Map();
	/** Per-mint OIDCAuth (present when refresh_token is available). */
	oidcClients = /* @__PURE__ */ new Map();
	constructor(authSessionService, mintAdapter, logger) {
		this.authSessionService = authSessionService;
		this.mintAdapter = mintAdapter;
		this.logger = logger;
	}
	/**
	* Start an OIDC Device Code authorization flow for a mint.
	*
	* Returns the device-code fields (verification_uri, user_code, etc.)
	* plus a `poll()` helper that resolves once the user authorizes.
	* After `poll()` succeeds the session is persisted and the
	* AuthProvider is wired into MintAdapter automatically.
	*/
	async startDeviceAuth(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		const auth = new AuthManager(mintUrl);
		const oidc = await this.attachOIDC(mintUrl, auth);
		const device = await oidc.startDeviceAuth();
		return {
			verification_uri: device.verification_uri,
			verification_uri_complete: device.verification_uri_complete,
			user_code: device.user_code,
			poll: async () => {
				const tokens = await device.poll();
				await this.saveSessionWithPool(mintUrl, auth, {
					access_token: tokens.access_token,
					refresh_token: tokens.refresh_token,
					expires_in: tokens.expires_in
				});
				this.managers.set(mintUrl, auth);
				this.oidcClients.set(mintUrl, oidc);
				const provider = this.createPersistingProvider(mintUrl, auth);
				this.providers.set(mintUrl, provider);
				this.mintAdapter.setAuthProvider(mintUrl, provider);
				this.logger?.info("Auth session established", { mintUrl });
				return tokens;
			},
			cancel: device.cancel
		};
	}
	/**
	* Save OIDC tokens as an auth session and wire the AuthProvider.
	*
	* Use this when the caller already obtained tokens externally
	* (e.g. via Authorization Code + PKCE or password grant).
	*/
	async login(mintUrl, tokens) {
		mintUrl = normalizeMintUrl(mintUrl);
		const auth = new AuthManager(mintUrl);
		auth.setCAT(tokens.access_token);
		if (tokens.refresh_token) await this.attachOIDC(mintUrl, auth);
		const session = await this.saveSessionWithPool(mintUrl, auth, tokens);
		this.managers.set(mintUrl, auth);
		const provider = this.createPersistingProvider(mintUrl, auth);
		this.providers.set(mintUrl, provider);
		this.mintAdapter.setAuthProvider(mintUrl, provider);
		this.logger?.info("Auth login completed", { mintUrl });
		return session;
	}
	/**
	* Restore a persisted auth session and wire the AuthProvider.
	*
	* Call this on app startup for each mint that has a stored session.
	* Returns true if a session was found and restored.
	*
	* If the CAT is expired but a refreshToken exists, OIDC is attached
	* so cashu-ts can automatically refresh the CAT on the next request.
	*/
	async restore(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		const session = await this.authSessionService.getSession(mintUrl);
		if (!session) return false;
		const now = Math.floor(Date.now() / 1e3);
		const expired = session.expiresAt <= now;
		if (expired && !session.refreshToken) {
			this.logger?.info("Auth session expired without refresh token, skipping restore", { mintUrl });
			return false;
		}
		const auth = new AuthManager(mintUrl);
		auth.setCAT(session.accessToken);
		if (session.batPool?.length) auth.importPool(session.batPool, "replace");
		if (session.refreshToken) try {
			await this.attachOIDC(mintUrl, auth);
		} catch (err) {
			this.logger?.warn("Failed to attach OIDC for refresh during restore", {
				mintUrl,
				cause: err instanceof Error ? err.message : String(err)
			});
			if (expired) return false;
		}
		this.managers.set(mintUrl, auth);
		const provider = this.createPersistingProvider(mintUrl, auth);
		this.providers.set(mintUrl, provider);
		this.mintAdapter.setAuthProvider(mintUrl, provider);
		this.logger?.info("Auth session restored", {
			mintUrl,
			expired
		});
		await this.authSessionService.emitUpdated(mintUrl);
		return true;
	}
	/** Delete the auth session and disconnect the AuthProvider. */
	async logout(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		await this.authSessionService.deleteSession(mintUrl);
		this.managers.delete(mintUrl);
		this.providers.delete(mintUrl);
		this.oidcClients.delete(mintUrl);
		this.mintAdapter.clearAuthProvider(mintUrl);
		this.logger?.info("Auth logout completed", { mintUrl });
	}
	/** Get a valid (non-expired) session; throws if missing or expired. */
	async getSession(mintUrl) {
		return this.authSessionService.getValidSession(mintUrl);
	}
	/** Check whether a session exists for the given mint. */
	async hasSession(mintUrl) {
		return this.authSessionService.hasSession(mintUrl);
	}
	/** Get the AuthProvider for a mint, or undefined if not authenticated. */
	getAuthProvider(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		return this.providers.get(mintUrl);
	}
	/** Get the current BAT pool size for a mint, or 0 if not authenticated. */
	getPoolSize(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		return this.managers.get(mintUrl)?.poolSize ?? 0;
	}
	/**
	* Create an OIDCAuth instance from the mint's NUT-21 metadata,
	* attach it to the AuthManager for automatic CAT refresh, and
	* register the onTokens callback for persistence.
	*/
	async attachOIDC(mintUrl, auth) {
		const oidc = await new Mint(mintUrl, { authProvider: auth }).oidcAuth({ onTokens: async (t) => {
			auth.setCAT(t.access_token);
			if (t.access_token) {
				let refreshToken = t.refresh_token;
				if (!refreshToken) refreshToken = (await this.authSessionService.getSession(mintUrl))?.refreshToken;
				this.saveSessionWithPool(mintUrl, auth, {
					access_token: t.access_token,
					refresh_token: refreshToken,
					expires_in: t.expires_in
				}).catch((err) => {
					this.logger?.error("Failed to persist session in onTokens", {
						mintUrl,
						cause: err instanceof Error ? err.message : String(err)
					});
				});
			}
		} });
		auth.attachOIDC(oidc);
		this.oidcClients.set(mintUrl, oidc);
		return oidc;
	}
	/**
	* Wrap an AuthManager so that every BAT consumption/topUp automatically
	* persists the updated pool to the session store.
	*/
	createPersistingProvider(mintUrl, auth) {
		return {
			getBlindAuthToken: async (input) => {
				const token = await auth.getBlindAuthToken(input);
				this.persistPool(mintUrl, auth);
				return token;
			},
			ensure: async (minTokens) => {
				await auth.ensure?.(minTokens);
				this.persistPool(mintUrl, auth);
			},
			getCAT: () => auth.getCAT(),
			setCAT: (cat) => auth.setCAT(cat),
			ensureCAT: (minValiditySec) => auth.ensureCAT?.(minValiditySec)
		};
	}
	persistPool(mintUrl, auth) {
		const pool = auth.exportPool();
		this.authSessionService.updateBatPool(mintUrl, pool.length > 0 ? pool : void 0).catch((err) => {
			this.logger?.error("Failed to persist BAT pool after change", {
				mintUrl,
				cause: err instanceof Error ? err.message : String(err)
			});
		});
	}
	async saveSessionWithPool(mintUrl, auth, tokens) {
		const batPool = auth.exportPool();
		return this.authSessionService.saveSession(mintUrl, tokens, batPool.length > 0 ? batPool : void 0);
	}
};

//#endregion
//#region models/History.ts
function isOperationHistoryEntry(entry) {
	return entry.source === "operation";
}
function isLegacyHistoryEntry(entry) {
	return entry.source === "legacy";
}
function operationHistoryId(type, operationId) {
	return `${type}:${operationId}`;
}
function legacyHistoryId(legacyId) {
	return `legacy:${legacyId}`;
}
function parseHistoryEntryId(id) {
	if (id.startsWith("legacy:")) {
		const legacyId = id.slice(7);
		return legacyId ? {
			source: "legacy",
			legacyHistoryId: legacyId
		} : null;
	}
	const separator = id.indexOf(":");
	if (separator === -1) return null;
	const type = id.slice(0, separator);
	const operationId = id.slice(separator + 1);
	if (!operationId || !isHistoryType(type)) return null;
	return {
		source: "operation",
		type,
		operationId
	};
}
function compareHistoryEntries(a, b) {
	if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
	return b.id.localeCompare(a.id);
}
function projectSendOperation(operation) {
	if (operation.state === "init") return null;
	const prepared = operation;
	const token = "token" in prepared ? prepared.token : void 0;
	return {
		id: operationHistoryId("send", prepared.id),
		source: "operation",
		type: "send",
		createdAt: prepared.createdAt,
		updatedAt: prepared.updatedAt,
		mintUrl: prepared.mintUrl,
		unit: prepared.unit,
		operationId: prepared.id,
		amount: prepared.amount,
		state: prepared.state,
		...prepared.error ? { error: prepared.error } : {},
		...token ? { token } : {}
	};
}
function projectMeltOperation(operation) {
	if (operation.state === "init" || operation.state === "failed") return null;
	const prepared = operation;
	return {
		id: operationHistoryId("melt", prepared.id),
		source: "operation",
		type: "melt",
		createdAt: prepared.createdAt,
		updatedAt: prepared.updatedAt,
		mintUrl: prepared.mintUrl,
		unit: prepared.unit || "sat",
		operationId: prepared.id,
		quoteId: prepared.quoteId,
		amount: prepared.amount,
		state: prepared.state,
		...prepared.error ? { error: prepared.error } : {}
	};
}
function projectMintOperation(operation) {
	if (operation.state === "init") return null;
	const pending = operation;
	return {
		id: operationHistoryId("mint", pending.id),
		source: "operation",
		type: "mint",
		createdAt: pending.createdAt,
		updatedAt: pending.updatedAt,
		mintUrl: pending.mintUrl,
		unit: pending.unit,
		operationId: pending.id,
		quoteId: pending.quoteId,
		paymentRequest: pending.request,
		amount: pending.amount,
		state: pending.state,
		...pending.error ? { error: pending.error } : {}
	};
}
function projectReceiveOperation(operation) {
	if (operation.state !== "finalized" && operation.state !== "rolled_back") return null;
	const metadata = getReceiveOperationMetadata(operation);
	const token = operation.state === "finalized" ? {
		mint: operation.mintUrl,
		proofs: operation.inputProofs,
		unit: operation.unit || "sat"
	} : void 0;
	return {
		id: operationHistoryId("receive", operation.id),
		source: "operation",
		type: "receive",
		createdAt: operation.createdAt,
		updatedAt: operation.updatedAt,
		mintUrl: operation.mintUrl,
		unit: operation.unit || "sat",
		operationId: operation.id,
		amount: operation.amount,
		state: operation.state,
		...metadata ? { metadata } : {},
		...operation.error ? { error: operation.error } : {},
		...token ? { token } : {}
	};
}
function getReceiveOperationMetadata(operation) {
	if (operation.source?.type !== "payment-request") return;
	return {
		source: "payment-request",
		requestOperationId: operation.source.requestOperationId,
		attemptId: operation.source.attemptId,
		...operation.source.requestId ? { requestId: operation.source.requestId } : {},
		transport: operation.source.transport,
		...operation.source.transportMessageId ? { transportMessageId: operation.source.transportMessageId } : {},
		...operation.source.senderPubkey ? { senderPubkey: operation.source.senderPubkey } : {},
		...operation.source.memo ? { memo: operation.source.memo } : {}
	};
}
function projectOperationToHistoryEntry(type, operation) {
	switch (type) {
		case "send": return projectSendOperation(operation);
		case "melt": return projectMeltOperation(operation);
		case "mint": return projectMintOperation(operation);
		case "receive": return projectReceiveOperation(operation);
	}
}
function projectLegacyHistoryRow(row) {
	const base = {
		id: legacyHistoryId(row.legacyHistoryId),
		source: "legacy",
		legacyHistoryId: String(row.legacyHistoryId),
		type: row.type,
		createdAt: row.createdAt,
		updatedAt: row.createdAt,
		mintUrl: row.mintUrl,
		unit: row.unit,
		amount: row.amount,
		...row.metadata ? { metadata: row.metadata } : {},
		...row.operationId ? { operationId: row.operationId } : {}
	};
	switch (row.type) {
		case "mint": return {
			...base,
			type: "mint",
			quoteId: row.quoteId ?? "",
			paymentRequest: row.paymentRequest ?? "",
			state: row.state ?? "UNPAID"
		};
		case "melt": return {
			...base,
			type: "melt",
			quoteId: row.quoteId ?? "",
			state: row.state ?? "UNPAID"
		};
		case "send": return {
			...base,
			type: "send",
			state: row.state ?? "pending",
			...row.token ? { token: row.token } : {}
		};
		case "receive": return {
			...base,
			type: "receive",
			state: row.state ?? "finalized",
			...row.token ? { token: row.token } : {}
		};
	}
}
function isHistoryType(value) {
	return value === "mint" || value === "melt" || value === "send" || value === "receive";
}

//#endregion
//#region models/MeltQuote.ts
function meltQuoteFromBoltResponse(mintUrl, method, quote, options) {
	const now = options?.now ?? Date.now();
	return {
		mintUrl,
		method,
		quoteId: quote.quote,
		quote: quote.quote,
		request: quote.request,
		amount: quote.amount,
		unit: quote.unit,
		fee_reserve: quote.fee_reserve,
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
		amount: quote.amount,
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
	const resolvedFeeIndex = feeIndex ?? (feeOptions.length === 1 ? feeOptions[0].fee_index : void 0);
	if (resolvedFeeIndex === void 0) throw new Error(`Melt quote ${quote.quoteId} requires an explicit feeIndex`);
	const feeOption = feeOptions.find((option) => option.fee_index === resolvedFeeIndex);
	if (!feeOption) throw new Error(`Melt quote ${quote.quoteId} does not include onchain fee option ${resolvedFeeIndex}`);
	return {
		feeIndex: resolvedFeeIndex,
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
			fee_reserve: Amount$1.from(option.fee_reserve),
			estimated_blocks: option.estimated_blocks
		};
	});
}

//#endregion
//#region models/MintQuote.ts
function isStatefulMintQuote(quote) {
	return quote.method === "bolt11";
}
function getMintQuoteRemoteState(quote) {
	return isStatefulMintQuote(quote) ? quote.state : void 0;
}
/**
* Returns the fixed mint operation amount for stateful quotes.
*
* Reusable quote metadata may include a payment amount, such as a fixed BOLT12
* offer amount, but that does not constrain the later mint operation amount.
*/
function getMintQuoteAmount(quote) {
	if (isStatefulMintQuote(quote)) return quote.amount;
}
function getMintQuoteAvailableAmount(quote) {
	if (quote.reusable) return quote.quoteData.amountPaid.subtract(quote.quoteData.amountIssued);
	return quote.state === "PAID" ? quote.amount : Amount$1.zero();
}
function isMintQuotePending(quote) {
	if (isStatefulMintQuote(quote)) return quote.state !== "ISSUED";
	return true;
}
function mintQuoteFromBolt11Response(mintUrl, quote, options) {
	const now = options?.now ?? Date.now();
	const amount = Amount$1.from(quote.amount);
	return {
		mintUrl,
		method: "bolt11",
		quoteId: quote.quote,
		quote: quote.quote,
		request: quote.request,
		unit: quote.unit,
		amount,
		expiry: quote.expiry,
		pubkey: quote.pubkey,
		state: quote.state,
		lastObservedRemoteState: quote.state,
		lastObservedRemoteStateAt: now,
		reusable: false,
		quoteData: { amount },
		createdAt: now,
		updatedAt: now
	};
}
function mintQuoteFromOnchainResponse(mintUrl, quote, options) {
	const now = options?.now ?? Date.now();
	return {
		mintUrl,
		method: "onchain",
		quoteId: quote.quote,
		quote: quote.quote,
		request: quote.request,
		unit: quote.unit,
		expiry: quote.expiry,
		pubkey: quote.pubkey,
		reusable: true,
		quoteData: {
			pubkey: quote.pubkey,
			amountPaid: Amount$1.from(quote.amount_paid),
			amountIssued: Amount$1.from(quote.amount_issued)
		},
		lastObservedRemoteStateAt: now,
		createdAt: now,
		updatedAt: now
	};
}
function mintQuoteFromBolt12Response(mintUrl, quote, options) {
	const now = options?.now ?? Date.now();
	const amount = quote.amount ? Amount$1.from(quote.amount) : void 0;
	return {
		mintUrl,
		method: "bolt12",
		quoteId: quote.quote,
		quote: quote.quote,
		request: quote.request,
		unit: quote.unit,
		amount,
		expiry: quote.expiry,
		pubkey: quote.pubkey,
		reusable: true,
		quoteData: {
			pubkey: quote.pubkey,
			amount,
			amountPaid: Amount$1.from(quote.amount_paid),
			amountIssued: Amount$1.from(quote.amount_issued)
		},
		lastObservedRemoteStateAt: now,
		createdAt: now,
		updatedAt: now
	};
}
function mintQuoteToMethodSnapshot(quote) {
	if (quote.method === "bolt11") return {
		quote: quote.quoteId,
		request: quote.request,
		amount: quote.amount,
		unit: quote.unit,
		expiry: quote.expiry,
		pubkey: quote.pubkey,
		state: quote.state
	};
	if (quote.method === "onchain") return {
		quote: quote.quoteId,
		request: quote.request,
		unit: quote.unit,
		expiry: quote.expiry,
		pubkey: quote.quoteData.pubkey,
		amount_paid: quote.quoteData.amountPaid,
		amount_issued: quote.quoteData.amountIssued
	};
	return {
		quote: quote.quoteId,
		request: quote.request,
		amount: quote.amount,
		unit: quote.unit,
		expiry: quote.expiry,
		pubkey: quote.quoteData.pubkey,
		amount_paid: quote.quoteData.amountPaid,
		amount_issued: quote.quoteData.amountIssued
	};
}

//#endregion
//#region services/AuthSessionService.ts
var AuthSessionService = class {
	repo;
	eventBus;
	logger;
	constructor(repo, eventBus, logger) {
		this.repo = repo;
		this.eventBus = eventBus;
		this.logger = logger;
	}
	/** Get a valid (non-expired) session; throws if missing or expired. */
	async getValidSession(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		const session = await this.repo.getSession(mintUrl);
		if (!session) throw new AuthSessionError(mintUrl, "No auth session found");
		const now = Math.floor(Date.now() / 1e3);
		if (session.expiresAt <= now) {
			await this.eventBus.emit("auth-session:expired", { mintUrl });
			throw new AuthSessionExpiredError(mintUrl);
		}
		return session;
	}
	/** Save OIDC tokens as a session. */
	async saveSession(mintUrl, tokens, batPool) {
		mintUrl = normalizeMintUrl(mintUrl);
		const now = Math.floor(Date.now() / 1e3);
		const session = {
			mintUrl,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: now + (tokens.expires_in ?? 3600),
			scope: tokens.scope,
			batPool
		};
		await this.repo.saveSession(session);
		await this.eventBus.emit("auth-session:updated", { mintUrl });
		this.logger?.info("Auth session saved", {
			mintUrl,
			expiresAt: session.expiresAt
		});
		return session;
	}
	/** Update only the BAT pool of an existing session (no expiry recalculation, no event). */
	async updateBatPool(mintUrl, batPool) {
		mintUrl = normalizeMintUrl(mintUrl);
		const session = await this.repo.getSession(mintUrl);
		if (!session) return;
		session.batPool = batPool;
		await this.repo.saveSession(session);
		this.logger?.debug("BAT pool updated", {
			mintUrl,
			poolSize: batPool?.length ?? 0
		});
	}
	/** Delete (logout) a session. */
	async deleteSession(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		await this.repo.deleteSession(mintUrl);
		await this.eventBus.emit("auth-session:deleted", { mintUrl });
		this.logger?.info("Auth session deleted", { mintUrl });
	}
	/** Notify listeners that auth state changed (e.g. after restore) */
	async emitUpdated(mintUrl) {
		await this.eventBus.emit("auth-session:updated", { mintUrl: normalizeMintUrl(mintUrl) });
	}
	/** Get session without expiry check; returns null if missing. */
	async getSession(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		return this.repo.getSession(mintUrl);
	}
	/** Check whether a valid (non-expired) session exists for the given mint. */
	async hasSession(mintUrl) {
		try {
			await this.getValidSession(mintUrl);
			return true;
		} catch {
			return false;
		}
	}
};

//#endregion
//#region events/EventBus.ts
var EventBus = class {
	listeners = /* @__PURE__ */ new Map();
	constructor(options = {}) {
		this.options = options;
	}
	on(event, handler) {
		let set = this.listeners.get(event);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.listeners.set(event, set);
		}
		set.add(handler);
		return () => this.off(event, handler);
	}
	once(event, handler) {
		const wrapped = async (payload) => {
			this.off(event, wrapped);
			await handler(payload);
		};
		return this.on(event, wrapped);
	}
	off(event, handler) {
		const set = this.listeners.get(event);
		if (!set) return;
		set.delete(handler);
		if (set.size === 0) this.listeners.delete(event);
	}
	async emit(event, payload, options) {
		const set = this.listeners.get(event);
		if (!set || set.size === 0) return;
		const handlers = Array.from(set);
		const effectiveThrow = options?.throwOnError ?? this.options.throwOnError ?? false;
		if ((this.options.concurrency ?? "sequential") === "parallel") {
			const results = await Promise.allSettled(handlers.map((h) => h(payload)));
			const errors = [];
			for (const r of results) if (r.status === "rejected") {
				errors.push(r.reason);
				if (this.options.onError) await this.options.onError({
					event,
					payload,
					error: r.reason
				});
			}
			if (errors.length && effectiveThrow) throw new AggregateError(errors, `Event "${String(event)}" had ${errors.length} handler error(s)`);
			return;
		}
		const collectedErrors = [];
		for (const handler of handlers) try {
			await handler(payload);
		} catch (error) {
			if (this.options.onError) await this.options.onError({
				event,
				payload,
				error
			});
			if (effectiveThrow && options?.failFast) throw error;
			if (effectiveThrow) collectedErrors.push(error);
		}
		if (collectedErrors.length && effectiveThrow) throw new AggregateError(collectedErrors, `Event "${String(event)}" had ${collectedErrors.length} handler error(s)`);
	}
};

//#endregion
//#region services/CounterService.ts
var CounterService = class {
	counterRepo;
	eventBus;
	logger;
	constructor(counterRepo, logger, eventBus) {
		this.counterRepo = counterRepo;
		this.logger = logger;
		this.eventBus = eventBus;
	}
	async getCounter(mintUrl, keysetId) {
		const counter = await this.counterRepo.getCounter(mintUrl, keysetId);
		if (!counter) {
			const newCounter = {
				mintUrl,
				keysetId,
				counter: 0
			};
			await this.counterRepo.setCounter(mintUrl, keysetId, 0);
			this.logger?.debug("Initialized counter", {
				mintUrl,
				keysetId
			});
			return newCounter;
		}
		return counter;
	}
	async incrementCounter(mintUrl, keysetId, n) {
		assertNonNegativeInteger("n", n, this.logger);
		const current = await this.getCounter(mintUrl, keysetId);
		const updatedValue = current.counter + n;
		await this.counterRepo.setCounter(mintUrl, keysetId, updatedValue);
		const updated = {
			...current,
			counter: updatedValue
		};
		await this.eventBus?.emit("counter:updated", updated);
		this.logger?.info("Counter incremented", {
			mintUrl,
			keysetId,
			counter: updatedValue
		});
		return updated;
	}
	async overwriteCounter(mintUrl, keysetId, counter) {
		assertNonNegativeInteger("counter", counter, this.logger);
		await this.counterRepo.setCounter(mintUrl, keysetId, counter);
		const updated = {
			mintUrl,
			keysetId,
			counter
		};
		await this.eventBus?.emit("counter:updated", updated);
		this.logger?.info("Counter overwritten", {
			mintUrl,
			keysetId,
			counter
		});
		return updated;
	}
};

//#endregion
//#region services/HistoryService.ts
var HistoryService = class {
	historyRepository;
	logger;
	eventBus;
	constructor(historyRepository, eventBus, logger) {
		this.historyRepository = historyRepository;
		this.logger = logger;
		this.eventBus = eventBus;
		this.eventBus.on("send:prepared", ({ mintUrl, operation }) => {
			return this.emitProjectedSend(mintUrl, operation);
		});
		this.eventBus.on("send:pending", ({ mintUrl, operation, token }) => {
			return this.emitProjectedSend(mintUrl, this.withSendToken(operation, token));
		});
		this.eventBus.on("send:finalized", ({ mintUrl, operation }) => {
			return this.emitProjectedSend(mintUrl, operation);
		});
		this.eventBus.on("send:rolled-back", ({ mintUrl, operation }) => {
			return this.emitProjectedSend(mintUrl, operation);
		});
		this.eventBus.on("melt-op:prepared", ({ mintUrl, operation }) => {
			return this.emitProjectedMelt(mintUrl, operation);
		});
		this.eventBus.on("melt-op:pending", ({ mintUrl, operation }) => {
			return this.emitProjectedMelt(mintUrl, operation);
		});
		this.eventBus.on("melt-op:finalized", ({ mintUrl, operation }) => {
			return this.emitProjectedMelt(mintUrl, operation);
		});
		this.eventBus.on("melt-op:rolled-back", ({ mintUrl, operation }) => {
			return this.emitProjectedMelt(mintUrl, operation);
		});
		this.eventBus.on("mint-op:pending", ({ mintUrl, operation }) => {
			return this.emitProjectedMint(mintUrl, operation);
		});
		this.eventBus.on("mint-op:executing", ({ mintUrl, operation }) => {
			return this.emitProjectedMint(mintUrl, operation);
		});
		this.eventBus.on("mint-op:finalized", ({ mintUrl, operation }) => {
			return this.emitProjectedMint(mintUrl, operation);
		});
		this.eventBus.on("receive-op:finalized", ({ mintUrl, operation }) => {
			return this.emitProjectedReceive(mintUrl, operation);
		});
		this.eventBus.on("receive-op:rolled-back", ({ mintUrl, operation }) => {
			return this.emitProjectedReceive(mintUrl, operation);
		});
	}
	async getPaginatedHistory(offset = 0, limit = 25) {
		return this.historyRepository.getPaginatedHistoryEntries(limit, offset);
	}
	async getHistoryEntryById(id) {
		return this.historyRepository.getHistoryEntryById(id);
	}
	/**
	* Get the operationId for a send history entry.
	* @throws Error if entry not found, is not a send entry, or has no operation id
	*/
	async getOperationIdFromHistoryEntry(historyId) {
		const entry = await this.historyRepository.getHistoryEntryById(historyId);
		if (!entry) throw new Error(`History entry ${historyId} not found`);
		if (entry.type !== "send") throw new Error(`History entry ${historyId} is not a send entry`);
		if (!entry.operationId) throw new Error(`History entry ${historyId} is not backed by an operation`);
		return entry.operationId;
	}
	async emitProjectedSend(mintUrl, operation) {
		await this.emitProjectedEntry(mintUrl, projectSendOperation(operation), "send", operation.id);
	}
	async emitProjectedMelt(mintUrl, operation) {
		await this.emitProjectedEntry(mintUrl, projectMeltOperation(operation), "melt", operation.id);
	}
	async emitProjectedMint(mintUrl, operation) {
		await this.emitProjectedEntry(mintUrl, projectMintOperation(operation), "mint", operation.id);
	}
	async emitProjectedReceive(mintUrl, operation) {
		await this.emitProjectedEntry(mintUrl, projectReceiveOperation(operation), "receive", operation.id);
	}
	async emitProjectedEntry(mintUrl, entry, type, operationId) {
		if (!entry) return;
		try {
			await this.eventBus.emit("history:updated", {
				mintUrl,
				entry: { ...entry }
			});
		} catch (err) {
			this.logger?.error("Failed to emit history projection", {
				mintUrl,
				type,
				operationId,
				err
			});
		}
	}
	withSendToken(operation, token) {
		if (operation.state === "pending" || operation.state === "finalized") return {
			...operation,
			token
		};
		return operation;
	}
};

//#endregion
//#region services/KeyRingService.ts
var KeyRingService = class KeyRingService {
	static DERIVATION_PURPOSES = {
		p2pk: 10,
		nut20_mint_quote: 20
	};
	logger;
	keyRingRepository;
	seedService;
	constructor(keyRingRepository, seedService, logger) {
		this.keyRingRepository = keyRingRepository;
		this.logger = logger;
		this.seedService = seedService;
	}
	async generateNewKeyPair(options) {
		return this.generateKeyPairForPurpose("p2pk", options);
	}
	async generateMintQuoteKeyPair() {
		return await this.generateKeyPairForPurpose("nut20_mint_quote", { dumpSecretKey: true });
	}
	async generateKeyPairForPurpose(purpose, options) {
		this.logger?.debug("Generating new key pair");
		const nextDerivationIndex = await this.keyRingRepository.getLastDerivationIndex(purpose) + 1;
		const seed = await this.seedService.getSeed();
		const hdKey = HDKey.fromMasterSeed(seed);
		const derivationPath = `m/129373'/${KeyRingService.DERIVATION_PURPOSES[purpose]}'/0'/0'/${nextDerivationIndex}`;
		const { privateKey: secretKey } = hdKey.derive(derivationPath);
		if (!secretKey) throw new Error("Failed to derive secret key");
		const publicKeyHex = purpose === "nut20_mint_quote" ? this.getCompressedPublicKeyHex(secretKey) : this.getPublicKeyHex(secretKey);
		await this.keyRingRepository.setPersistedKeyPair({
			publicKeyHex,
			secretKey,
			derivationIndex: nextDerivationIndex,
			purpose
		});
		this.logger?.debug("New key pair generated", { publicKeyHex });
		if (options?.dumpSecretKey) return {
			publicKeyHex,
			secretKey,
			derivationIndex: nextDerivationIndex,
			purpose
		};
		return { publicKeyHex };
	}
	async addKeyPair(secretKey) {
		this.logger?.debug("Adding key pair with secret key...");
		if (secretKey.length !== 32) throw new Error("Secret key must be exactly 32 bytes");
		const publicKeyHex = this.getPublicKeyHex(secretKey);
		await this.keyRingRepository.setPersistedKeyPair({
			publicKeyHex,
			secretKey,
			purpose: "p2pk"
		});
		this.logger?.debug("Key pair added", { publicKeyHex });
		return {
			publicKeyHex,
			secretKey,
			purpose: "p2pk"
		};
	}
	async removeKeyPair(publicKey) {
		this.logger?.debug("Removing key pair", { publicKey });
		await this.keyRingRepository.deletePersistedKeyPair(publicKey, "p2pk");
		this.logger?.debug("Key pair removed", { publicKey });
	}
	async getKeyPair(publicKey) {
		if (!publicKey || typeof publicKey !== "string") throw new Error("Public key is required and must be a string");
		return this.keyRingRepository.getPersistedKeyPair(publicKey, "p2pk");
	}
	async getMintQuoteKeyPair(publicKey) {
		if (!publicKey || typeof publicKey !== "string") throw new Error("Public key is required and must be a string");
		return this.keyRingRepository.getPersistedKeyPair(publicKey, "nut20_mint_quote");
	}
	async getLatestKeyPair() {
		return this.keyRingRepository.getLatestKeyPair("p2pk");
	}
	async getAllKeyPairs() {
		return this.keyRingRepository.getAllPersistedKeyPairs("p2pk");
	}
	async signProof(proof, publicKey) {
		this.logger?.debug("Signing proof", {
			proof,
			publicKey
		});
		if (!proof.secret || typeof proof.secret !== "string") throw new Error("Proof secret is required and must be a string");
		const keyPair = await this.keyRingRepository.getPersistedKeyPair(publicKey, "p2pk");
		if (!keyPair) {
			const publicKeyPreview = publicKey.substring(0, 8);
			this.logger?.error("Key pair not found", { publicKey });
			throw new Error(`Key pair not found for public key: ${publicKeyPreview}...`);
		}
		const message = new TextEncoder().encode(proof.secret);
		const signature = schnorr.sign(sha256(message), keyPair.secretKey);
		const signedProof = {
			...proof,
			witness: JSON.stringify({ signatures: [bytesToHex(signature)] })
		};
		this.logger?.debug("Proof signed successfully", { publicKey });
		return signedProof;
	}
	/**
	* Converts a secret key to its corresponding public key in SEC1 compressed format.
	* Note: schnorr.getPublicKey() returns a 32-byte x-only public key (BIP340).
	* We prepend '02' to create a 33-byte SEC1 compressed format as expected by Cashu.
	*/
	getPublicKeyHex(secretKey) {
		return "02" + bytesToHex(schnorr.getPublicKey(secretKey));
	}
	getCompressedPublicKeyHex(secretKey) {
		return bytesToHex(secp256k1.getPublicKey(secretKey, true));
	}
};

//#endregion
//#region services/MintService.ts
const MINT_REFRESH_TTL_S = 300;
var MintService = class {
	mintRepo;
	keysetRepo;
	mintAdapter;
	eventBus;
	logger;
	constructor(mintRepo, keysetRepo, mintAdapter, logger, eventBus) {
		this.mintRepo = mintRepo;
		this.keysetRepo = keysetRepo;
		this.mintAdapter = mintAdapter;
		this.logger = logger;
		this.eventBus = eventBus;
	}
	/**
	* Add a new mint by URL, running a single update cycle to fetch info & keysets.
	* If the mint already exists, it ensures it is updated.
	* New mints are added as untrusted by default unless explicitly specified.
	*
	* @param mintUrl - The URL of the mint to add
	* @param options - Optional configuration
	* @param options.trusted - Whether to add the mint as trusted (default: false)
	*/
	async addMintByUrl(mintUrl, options) {
		mintUrl = normalizeMintUrl(mintUrl);
		const trusted = options?.trusted ?? false;
		this.logger?.info("Adding mint by URL", {
			mintUrl,
			trusted
		});
		const exists = await this.mintRepo.getMintByUrl(mintUrl).catch(() => null);
		if (exists) {
			if (options?.trusted !== void 0 && exists.trusted !== options.trusted) {
				await this.mintRepo.setMintTrusted(mintUrl, options.trusted);
				this.logger?.info("Updated mint trust status", {
					mintUrl,
					trusted: options.trusted
				});
				if (options.trusted) await this.eventBus?.emit("mint:trusted", { mintUrl });
				else await this.eventBus?.emit("mint:untrusted", { mintUrl });
				const updated = await this.ensureUpdatedMint(mintUrl);
				await this.eventBus?.emit("mint:updated", updated);
				return updated;
			}
			return this.ensureUpdatedMint(mintUrl);
		}
		const now = Math.floor(Date.now() / 1e3);
		const newMint = {
			mintUrl,
			name: mintUrl,
			mintInfo: {},
			trusted,
			createdAt: now,
			updatedAt: 0
		};
		const added = await this.updateMint(newMint);
		await this.eventBus?.emit("mint:added", added);
		this.logger?.info("Mint added", {
			mintUrl,
			trusted
		});
		return added;
	}
	async updateMintData(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		const mint = await this.mintRepo.getMintByUrl(mintUrl).catch(() => null);
		if (!mint) {
			const now = Math.floor(Date.now() / 1e3);
			const newMint = {
				mintUrl,
				name: mintUrl,
				mintInfo: {},
				trusted: false,
				createdAt: now,
				updatedAt: 0
			};
			return this.updateMint(newMint);
		}
		return this.updateMint(mint);
	}
	async isTrustedMint(mintUrl) {
		return await this.mintRepo.isTrustedMint(normalizeMintUrl(mintUrl));
	}
	async ensureUpdatedMint(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		let mint = await this.mintRepo.getMintByUrl(mintUrl).catch(() => null);
		if (!mint) {
			const now = Math.floor(Date.now() / 1e3);
			mint = {
				mintUrl,
				name: mintUrl,
				mintInfo: {},
				trusted: false,
				createdAt: now,
				updatedAt: 0
			};
		}
		const now = Math.floor(Date.now() / 1e3);
		if (mint.updatedAt < now - MINT_REFRESH_TTL_S) {
			this.logger?.debug("Refreshing stale mint", { mintUrl });
			const updated = await this.updateMint(mint);
			await this.eventBus?.emit("mint:updated", updated);
			return updated;
		}
		const keysets = await this.keysetRepo.getKeysetsByMintUrl(mint.mintUrl);
		return {
			mint,
			keysets
		};
	}
	async deleteMint(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		if (!await this.mintRepo.getMintByUrl(mintUrl).catch(() => null)) return;
		const keysets = await this.keysetRepo.getKeysetsByMintUrl(mintUrl);
		await Promise.all(keysets.map((ks) => this.keysetRepo.deleteKeyset(mintUrl, ks.id)));
		await this.mintRepo.deleteMint(mintUrl);
	}
	async getMintInfo(mintUrl) {
		const { mint } = await this.ensureUpdatedMint(normalizeMintUrl(mintUrl));
		return mint.mintInfo;
	}
	async getMintMethodUnitCapability(mintUrl, nut, method, unit) {
		this.assertMethodCapabilityNut(nut);
		const normalizedMintUrl = normalizeMintUrl(mintUrl);
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		const mintInfo = await this.getMintInfo(normalizedMintUrl);
		const settings = this.getNutMethodSettings(mintInfo, nut);
		if (!settings || !settings.methods || !Array.isArray(settings.methods) || settings.disabled === true) return {
			supported: false,
			disabled: true,
			nut,
			method,
			unit: normalizedUnit,
			reason: `NUT-${nut} is disabled`
		};
		const matchingMethod = settings.methods.find((entry) => {
			try {
				return entry.method === method && normalizeUnit(entry.unit) === normalizedUnit;
			} catch {
				return false;
			}
		});
		if (!matchingMethod) return {
			supported: false,
			disabled: false,
			nut,
			method,
			unit: normalizedUnit,
			reason: `NUT-${nut} method ${method} does not support unit ${normalizedUnit}`
		};
		return {
			supported: true,
			disabled: false,
			nut,
			method,
			unit: normalizedUnit,
			minAmount: this.parseOptionalAmount(matchingMethod.min_amount),
			maxAmount: this.parseOptionalAmount(matchingMethod.max_amount),
			options: matchingMethod.options
		};
	}
	async assertMethodUnitSupported(mintUrl, nut, method, scope) {
		let unit;
		let requestedAmount;
		if (typeof scope === "string") unit = scope;
		else {
			const intent = normalizeUnitAmount(scope);
			unit = intent.unit;
			requestedAmount = intent.amount;
		}
		const capability = await this.getMintMethodUnitCapability(mintUrl, nut, method, unit);
		if (!capability.supported) throw new ProofValidationError(capability.reason ?? `NUT-${nut} method ${method} does not support unit ${capability.unit}`);
		if (requestedAmount === void 0) return;
		if (capability.minAmount && requestedAmount.lessThan(capability.minAmount)) throw new ProofValidationError(`NUT-${nut} method ${method} unit ${capability.unit} requires amount >= ${capability.minAmount}`);
		if (capability.maxAmount && requestedAmount.greaterThan(capability.maxAmount)) throw new ProofValidationError(`NUT-${nut} method ${method} unit ${capability.unit} requires amount <= ${capability.maxAmount}`);
	}
	async getAllMints() {
		return await this.mintRepo.getAllMints();
	}
	async getAllTrustedMints() {
		return await this.mintRepo.getAllTrustedMints();
	}
	async trustMint(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		this.logger?.info("Trusting mint", { mintUrl });
		await this.mintRepo.setMintTrusted(mintUrl, true);
		await this.eventBus?.emit("mint:trusted", { mintUrl });
		await this.eventBus?.emit("mint:updated", await this.ensureUpdatedMint(mintUrl));
	}
	async untrustMint(mintUrl) {
		mintUrl = normalizeMintUrl(mintUrl);
		this.logger?.info("Untrusting mint", { mintUrl });
		await this.mintRepo.setMintTrusted(mintUrl, false);
		await this.eventBus?.emit("mint:untrusted", { mintUrl });
		await this.eventBus?.emit("mint:updated", await this.ensureUpdatedMint(mintUrl));
	}
	getNutMethodSettings(mintInfo, nut) {
		return mintInfo.nuts?.[String(nut)];
	}
	assertMethodCapabilityNut(nut) {
		if (nut !== 4 && nut !== 5) throw new ProofValidationError(`NUT-${nut} does not define method-unit capabilities; use NUT-04 or NUT-05 method metadata`);
	}
	parseOptionalAmount(amount) {
		return amount === void 0 || amount === null ? null : Amount$1.from(amount);
	}
	async updateMint(mint) {
		let mintInfo;
		try {
			this.logger?.debug("Fetching mint info", { mintUrl: mint.mintUrl });
			mintInfo = await this.mintAdapter.fetchMintInfo(mint.mintUrl);
		} catch (err) {
			this.logger?.error("Failed to fetch mint info", {
				mintUrl: mint.mintUrl,
				err
			});
			throw new MintFetchError(mint.mintUrl, void 0, err);
		}
		let keysets;
		try {
			this.logger?.debug("Fetching keysets", { mintUrl: mint.mintUrl });
			({keysets} = await this.mintAdapter.fetchKeysets(mint.mintUrl));
		} catch (err) {
			this.logger?.error("Failed to fetch keysets", {
				mintUrl: mint.mintUrl,
				err
			});
			throw new MintFetchError(mint.mintUrl, "Failed to fetch keysets", err);
		}
		await Promise.all(keysets.map(async (ks) => {
			if (await this.keysetRepo.getKeysetById(mint.mintUrl, ks.id)) {
				const keysetModel = {
					mintUrl: mint.mintUrl,
					id: ks.id,
					unit: ks.unit,
					active: ks.active,
					feePpk: ks.input_fee_ppk || 0
				};
				return this.keysetRepo.updateKeyset(keysetModel);
			} else try {
				const keysRes = await this.mintAdapter.fetchKeysForId(mint.mintUrl, ks.id);
				return this.keysetRepo.addKeyset({
					mintUrl: mint.mintUrl,
					id: ks.id,
					unit: ks.unit,
					keypairs: keysRes,
					active: ks.active,
					feePpk: ks.input_fee_ppk || 0
				});
			} catch (err) {
				this.logger?.error("Failed to sync keyset", {
					mintUrl: mint.mintUrl,
					keysetId: ks.id,
					err
				});
				throw new KeysetSyncError(mint.mintUrl, ks.id, void 0, err);
			}
		}));
		mint.mintInfo = mintInfo;
		mint.updatedAt = Math.floor(Date.now() / 1e3);
		await this.mintRepo.addOrUpdateMint(mint);
		const repoKeysets = await this.keysetRepo.getKeysetsByMintUrl(mint.mintUrl);
		this.logger?.info("Mint updated", {
			mintUrl: mint.mintUrl,
			keysets: repoKeysets.length
		});
		return {
			mint,
			keysets: repoKeysets
		};
	}
};

//#endregion
//#region services/PaymentRequestService.ts
var PaymentRequestService = class {
	sendOperationService;
	proofService;
	logger;
	constructor(sendOperationService, proofService, logger) {
		this.sendOperationService = sendOperationService;
		this.proofService = proofService;
		this.logger = logger;
	}
	/**
	* Parse and validate a payment request.
	* @param paymentRequest - The payment request to process
	* @returns The resolved payment request
	*/
	async parse(paymentRequest) {
		const decodedPaymentRequest = await this.readPaymentRequest(paymentRequest);
		const transport = this.getPaymentRequestTransport(decodedPaymentRequest);
		const unit = normalizeUnit(decodedPaymentRequest.unit, { defaultUnit: DEFAULT_UNIT });
		return {
			paymentRequest: decodedPaymentRequest,
			payableMints: await this.findMatchingMints(decodedPaymentRequest, unit),
			allowedMints: decodedPaymentRequest.mints ?? [],
			amount: decodedPaymentRequest.amount,
			unit,
			transport
		};
	}
	/**
	* Prepare a payment request for execution.
	*/
	async prepare(request, options) {
		const { mintUrl, amount } = options;
		this.validateMint(mintUrl, request.allowedMints);
		const finalAmount = this.validateAmount(request, amount);
		const preparedRequest = await this.resolvePreparedRequest(request, finalAmount);
		this.logger?.debug("Preparing payment request transaction", {
			mintUrl,
			amount: finalAmount
		});
		const initSend = await this.sendOperationService.init(mintUrl, finalAmount);
		const preparedSend = await this.sendOperationService.prepare(initSend);
		this.logger?.debug("Payment request transaction prepared", {
			mintUrl,
			amount: finalAmount
		});
		return {
			sendOperation: preparedSend,
			request: preparedRequest
		};
	}
	/**
	* Execute a prepared payment request.
	*/
	async execute(transaction) {
		switch (transaction.request.transport.type) {
			case "inband": {
				this.logger?.debug("Creating inband payment request token", {
					mintUrl: transaction.sendOperation.mintUrl,
					amount: transaction.request.amount
				});
				const { operation, token } = await this.sendOperationService.execute(transaction.sendOperation);
				return {
					type: "inband",
					token,
					operation,
					request: transaction.request
				};
			}
			case "http": {
				this.logger?.debug("Handling HTTP payment request", {
					mintUrl: transaction.sendOperation.mintUrl,
					amount: transaction.request.amount,
					url: transaction.request.transport.url
				});
				const { operation, token } = await this.sendOperationService.execute(transaction.sendOperation);
				const response = await fetch(transaction.request.transport.url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSONInt.stringify(token)
				});
				this.logger?.debug("HTTP payment request completed", {
					mintUrl: transaction.sendOperation.mintUrl,
					amount: transaction.request.amount,
					url: transaction.request.transport.url,
					status: response.status
				});
				return {
					type: "http",
					response,
					operation,
					request: transaction.request
				};
			}
			case "nostr": {
				const error = new PaymentRequestError("Nostr payment request execution requires a transport plugin");
				try {
					await this.sendOperationService.rollback(transaction.sendOperation.id, "Nostr payment request execution requires a transport plugin");
				} catch (cause) {
					this.logger?.error("Failed to roll back Nostr payment request send operation", {
						operationId: transaction.sendOperation.id,
						cause
					});
					throw new PaymentRequestError("Nostr payment request execution requires a transport plugin; rollback failed", cause);
				}
				throw error;
			}
		}
	}
	async readPaymentRequest(paymentRequest) {
		this.logger?.debug("Reading payment request", { paymentRequest });
		const decodedPaymentRequest = PaymentRequest.fromEncodedRequest(paymentRequest);
		this.logger?.info("Payment request decoded", { decodedPaymentRequest });
		return decodedPaymentRequest;
	}
	validateMint(mintUrl, mints) {
		if (mints && mints.length > 0 && !mints.includes(mintUrl)) throw new PaymentRequestError(`Mint ${mintUrl} is not in the allowed mints list: ${mints.join(", ")}`);
	}
	getPaymentRequestTransport(pr) {
		if (!pr.transport || Array.isArray(pr.transport) && pr.transport.length === 0) return { type: "inband" };
		if (!Array.isArray(pr.transport)) throw new PaymentRequestError("Malformed payment request: Invalid transport");
		const httpTransport = pr.transport.find((t) => t.type === PaymentRequestTransportType.POST);
		if (httpTransport) return {
			type: "http",
			url: httpTransport.target
		};
		const nostrTransport = pr.transport.find((t) => t.type === PaymentRequestTransportType.NOSTR);
		if (nostrTransport) return {
			type: "nostr",
			target: nostrTransport.target,
			tags: nostrTransport.tags
		};
		throw new PaymentRequestError("Unsupported transport type. Only HTTP POST and Nostr are supported, found: " + pr.transport.map((t) => t.type).join(", "));
	}
	async findMatchingMints(paymentRequest, unit) {
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		const balances = await this.proofService.getBalancesByMint({
			trustedOnly: true,
			units: [normalizedUnit]
		});
		const amount = paymentRequest.amount ?? Amount$1.zero();
		const mintRequirement = paymentRequest.mints;
		const matchingMints = [];
		for (const [mintUrl, balance] of Object.entries(balances)) if (balance.spendable.greaterThanOrEqual(amount) && (!mintRequirement || mintRequirement.includes(mintUrl))) matchingMints.push(mintUrl);
		return matchingMints;
	}
	validateAmount(request, amount) {
		const providedAmount = amount?.amount;
		if (amount) {
			if (normalizeUnit(amount.unit) !== request.unit) throw new PaymentRequestError(`Unit mismatch: request specifies ${request.unit} but ${amount.unit} was provided`);
		}
		if (request.amount && providedAmount && !request.amount.equals(providedAmount)) throw new PaymentRequestError(`Amount mismatch: request specifies ${request.amount} but ${providedAmount} was provided`);
		const finalAmount = request.amount ?? providedAmount;
		if (!finalAmount) throw new PaymentRequestError("Amount is required but was not provided");
		return {
			amount: finalAmount,
			unit: request.unit
		};
	}
	async resolvePreparedRequest(request, intent) {
		const amount = intent.amount;
		if (request.amount?.equals(amount)) return request;
		const paymentRequest = new PaymentRequest(request.paymentRequest.transport, request.paymentRequest.id, amount, request.unit, request.paymentRequest.mints, request.paymentRequest.description, request.paymentRequest.singleUse, request.paymentRequest.nut10);
		const payableMints = await this.findMatchingMints(paymentRequest, request.unit);
		return {
			...request,
			amount,
			unit: request.unit,
			payableMints,
			paymentRequest
		};
	}
};

//#endregion
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
//#region services/PaymentRequestReceiveService.ts
var PaymentRequestReceiveService = class {
	lock = new OperationIdLock();
	constructor(operationRepository, attemptRepository, receiveOperationService, receiveOperationRepository, mintService, transportHandlerProvider, logger) {
		this.operationRepository = operationRepository;
		this.attemptRepository = attemptRepository;
		this.receiveOperationService = receiveOperationService;
		this.receiveOperationRepository = receiveOperationRepository;
		this.mintService = mintService;
		this.transportHandlerProvider = transportHandlerProvider;
		this.logger = logger;
	}
	isOperationLocked(operationId) {
		return this.lock.isLocked(operationId);
	}
	registerTransportHandler(handler) {
		return this.transportHandlerProvider.register(handler);
	}
	async acquireLockWhenAvailable(lockId) {
		while (this.lock.isLocked(lockId)) await this.lock.waitForUnlock(lockId);
		return this.lock.acquire(lockId);
	}
	async create(input) {
		const { amount, unit } = parseUnitAmount(input.amount, { explicitUnit: input.unit });
		if (input.nut10) throw new PaymentRequestError("NUT-10 receive requirements are not supported yet");
		if (amount.isZero()) throw new PaymentRequestError("Payment request amount must be positive");
		const mints = input.mints?.map((mintUrl) => normalizeMintUrl(mintUrl)) ?? [];
		for (const mintUrl of mints) if (!await this.mintService.isTrustedMint(mintUrl)) throw new PaymentRequestError(`Mint ${mintUrl} is not trusted`);
		if (input.requestId !== void 0 && input.requestId.trim() === "") throw new PaymentRequestError("Payment request id must not be blank");
		const requestId = input.requestId ?? generateSubId();
		const releaseCreateLock = await this.acquireLockWhenAvailable(`payment-request-receive:create:${requestId}`);
		try {
			if ((await this.operationRepository.getActiveByRequestId(requestId)).length > 0) throw new PaymentRequestError(`An active payment request already exists for request id ${requestId}`);
			const singleUse = input.singleUse ?? true;
			const { transport, paymentRequestTransports } = await this.resolveTransportInput(input.transport, {
				requestId,
				amount,
				unit,
				mints,
				description: input.description,
				singleUse
			});
			const paymentRequest = new PaymentRequest(paymentRequestTransports, requestId, amount, unit, mints.length > 0 ? mints : void 0, input.description, singleUse);
			const encodedRequest = input.encoding === "creqA" ? paymentRequest.toEncodedCreqA() : paymentRequest.toEncodedCreqB();
			const now = Date.now();
			const operation = {
				id: generateSubId(),
				requestId,
				encodedRequest,
				state: "active",
				transport,
				amount,
				unit,
				mints,
				singleUse,
				description: input.description,
				createdAt: now,
				updatedAt: now
			};
			await this.operationRepository.create(operation);
			try {
				await this.activateTransport(operation);
				return await this.operationRepository.getById(operation.id) ?? operation;
			} catch (error) {
				const current = await this.operationRepository.getById(operation.id);
				const hasClaimToPreserve = (await this.attemptRepository.getByRequestOperationId(operation.id)).some((attempt) => this.isInFlightAttempt(attempt) || attempt.state === "finalized");
				if (!current || current.state !== "active" || hasClaimToPreserve) throw error;
				const cancelled = {
					...current,
					state: "cancelled",
					error: error instanceof Error ? error.message : String(error),
					updatedAt: Date.now()
				};
				await this.operationRepository.update(cancelled);
				try {
					await this.deactivateTransport(cancelled, { ignoreMissingHandler: true });
				} catch (deactivationError) {
					this.logger?.warn("Payment request receive transport cleanup failed after activation", {
						operationId: cancelled.id,
						requestId: cancelled.requestId,
						transport: cancelled.transport,
						error: deactivationError
					});
				}
				throw error;
			}
		} finally {
			releaseCreateLock();
		}
	}
	async cancel(operationId, reason) {
		const releaseLock = await this.lock.acquire(operationId);
		try {
			const operation = await this.requireOperation(operationId);
			if (operation.state !== "active") throw new PaymentRequestError(`Cannot cancel payment request receive operation in state '${operation.state}'`);
			const cancelled = {
				...operation,
				state: "cancelled",
				error: reason,
				updatedAt: Date.now()
			};
			await this.operationRepository.update(cancelled);
			try {
				await this.deactivateTransport(cancelled, { ignoreMissingHandler: true });
			} catch (error) {
				this.logger?.warn("Payment request receive transport deactivation failed after cancel", {
					operationId: cancelled.id,
					requestId: cancelled.requestId,
					transport: cancelled.transport,
					error
				});
			}
			return cancelled;
		} finally {
			releaseLock();
		}
	}
	async get(operationId) {
		return this.operationRepository.getById(operationId);
	}
	async list(filter) {
		return this.operationRepository.list(filter);
	}
	async claimPayload(operationOrId, payloadInput, source) {
		const operation = await this.requireOperation(operationOrId);
		const releaseLock = await this.lock.acquire(operation.id);
		try {
			return await this.claimPayloadLocked(operation.id, payloadInput, source);
		} finally {
			releaseLock();
		}
	}
	async ingestPayload(payloadInput, source) {
		const payload = this.parsePayload(payloadInput);
		if (!payload.id) throw new PaymentRequestError("Payment request payload id is required for ingestion");
		const payloadHash = this.hashPayload(payload);
		if (source?.transportMessageId) {
			const existingByMessage = await this.attemptRepository.getByTransportMessageId(source.transportMessageId);
			if (existingByMessage) {
				if (existingByMessage.payloadHash !== payloadHash) throw new PaymentRequestError(`Transport message ${source.transportMessageId} belongs to a different payload`);
				return this.resultForStoredAttempt(existingByMessage);
			}
		}
		const existingByRequestPayload = await this.attemptRepository.getByRequestIdAndPayloadHash(payload.id, payloadHash);
		if (existingByRequestPayload?.state === "finalized") return this.resultForStoredAttempt(existingByRequestPayload);
		const candidates = await this.operationRepository.getActiveByRequestId(payload.id);
		if (candidates.length === 0) {
			if (existingByRequestPayload) return this.resultForStoredAttempt(existingByRequestPayload);
			throw new PaymentRequestError(`No active payment request found for id ${payload.id}`);
		}
		if (candidates.length > 1) throw new PaymentRequestError(`Multiple active payment requests found for id ${payload.id}`);
		const operation = candidates[0];
		const existingByPayload = await this.attemptRepository.getByPayloadHash(operation.id, payloadHash);
		if (existingByPayload) return this.resultForAttempt(operation, existingByPayload);
		return this.claimPayload(operation, payload, source);
	}
	async recoverPendingAttempts() {
		const interruptedBeforeReceive = [...await this.attemptRepository.getByState("received"), ...await this.attemptRepository.getByState("validating")];
		for (const attempt of interruptedBeforeReceive) {
			let releaseLock;
			try {
				releaseLock = await this.lock.acquire(attempt.requestOperationId);
			} catch (error) {
				if (error instanceof OperationInProgressError) {
					this.logger?.debug("Payment request receive operation is in progress, skipping pre-child recovery", {
						operationId: attempt.requestOperationId,
						attemptId: attempt.id
					});
					continue;
				}
				throw error;
			}
			try {
				const currentAttempt = await this.attemptRepository.getById(attempt.id);
				if (!currentAttempt || currentAttempt.state !== "received" && currentAttempt.state !== "validating") continue;
				const childReceive = currentAttempt.state === "validating" ? await this.receiveOperationRepository.getByPaymentRequestAttemptId(currentAttempt.id) : null;
				if (childReceive) {
					const linkedAttempt = await this.updateAttempt({
						...currentAttempt,
						state: "receiving",
						receiveOperationId: childReceive.id
					});
					await this.recoverReceivingAttemptLocked(linkedAttempt);
					continue;
				}
				await this.recoverPreChildAttemptLocked(currentAttempt);
			} finally {
				releaseLock();
			}
		}
		await this.recoverReceivingAttempts();
		await this.receiveOperationService.recoverPendingOperations();
		await this.recoverReceivingAttempts();
		await this.recoverFinalizedAttempts();
		await this.recoverActiveTransports();
	}
	async recoverActiveTransports() {
		const activeOperations = await this.operationRepository.getByState("active");
		for (const operation of activeOperations) try {
			await this.activateTransport(operation);
		} catch (error) {
			this.logger?.warn("Payment request receive transport recovery failed", {
				operationId: operation.id,
				requestId: operation.requestId,
				transport: operation.transport,
				error
			});
		}
	}
	async activateTransport(operation) {
		if (operation.transport === "inband") return;
		await this.transportHandlerProvider.get(operation.transport).activate(operation);
	}
	async deactivateTransport(operation, options) {
		if (operation.transport === "inband") return;
		const handler = this.transportHandlerProvider.getOptional(operation.transport);
		if (!handler) {
			if (options?.ignoreMissingHandler) {
				this.logger?.warn("Payment request receive transport deactivation skipped", {
					operationId: operation.id,
					requestId: operation.requestId,
					transport: operation.transport
				});
				return;
			}
			throw new PaymentRequestError(`No payment request receive transport handler registered for '${operation.transport}'`);
		}
		await handler.deactivate(operation);
	}
	async recoverFinalizedAttempts() {
		const attempts = await this.attemptRepository.getByState("finalized");
		for (const attempt of attempts) {
			const operation = await this.operationRepository.getById(attempt.requestOperationId);
			if (!operation || !operation.singleUse || operation.state !== "active") continue;
			let releaseLock;
			try {
				releaseLock = await this.lock.acquire(operation.id);
			} catch (error) {
				if (error instanceof OperationInProgressError) {
					this.logger?.debug("Payment request receive operation is in progress, skipping finalized recovery", {
						operationId: operation.id,
						attemptId: attempt.id
					});
					continue;
				}
				throw error;
			}
			try {
				const currentOperation = await this.operationRepository.getById(operation.id);
				if (currentOperation?.singleUse && currentOperation.state === "active") await this.completeIfSingleUse(currentOperation, { ignoreMissingTransportHandler: true });
			} finally {
				releaseLock();
			}
		}
	}
	async recoverReceivingAttempts() {
		const attempts = await this.attemptRepository.getByState("receiving");
		for (const attempt of attempts) {
			let releaseLock;
			try {
				releaseLock = await this.lock.acquire(attempt.requestOperationId);
			} catch (error) {
				if (error instanceof OperationInProgressError) {
					this.logger?.debug("Payment request receive operation is in progress, skipping recovery", {
						operationId: attempt.requestOperationId,
						attemptId: attempt.id
					});
					continue;
				}
				throw error;
			}
			try {
				const currentAttempt = await this.attemptRepository.getById(attempt.id);
				if (!currentAttempt || currentAttempt.state !== "receiving") continue;
				await this.recoverReceivingAttemptLocked(currentAttempt);
			} finally {
				releaseLock();
			}
		}
	}
	async recoverReceivingAttemptLocked(attempt) {
		if (!attempt.receiveOperationId) {
			await this.dropAttemptForRetryOrReject(attempt, "Missing child receive operation id");
			return;
		}
		const receiveOperation = await this.receiveOperationService.getOperation(attempt.receiveOperationId);
		if (!receiveOperation) {
			await this.dropAttemptForRetryOrReject(attempt, "Child receive operation was not found");
			return;
		}
		if (receiveOperation.state === "finalized") await this.finalizeAttemptFromReceive(attempt, receiveOperation, { ignoreMissingTransportHandler: true });
		else if (receiveOperation.state === "rolled_back") await this.rejectAttempt(attempt, receiveOperation.error ?? "Child receive operation rolled back");
		else if (receiveOperation.state === "prepared") await this.resumePreparedChildReceive(attempt, receiveOperation, { ignoreMissingTransportHandler: true });
		else if (receiveOperation.state === "init") await this.resumeInitChildReceive(attempt, receiveOperation, { ignoreMissingTransportHandler: true });
	}
	async recoverPreChildAttemptLocked(attempt) {
		const operation = await this.operationRepository.getById(attempt.requestOperationId);
		if (!operation) {
			await this.rejectAttempt(attempt, "Payment request receive operation was not found");
			return;
		}
		if (operation.state !== "active") {
			await this.rejectAttempt(attempt, `Cannot recover payload for payment request receive operation in state '${operation.state}'`);
			return;
		}
		if (!attempt.payload) {
			await this.attemptRepository.delete(attempt.id);
			this.logger?.warn("Incomplete payment request receive attempt removed for redelivery retry", {
				operationId: attempt.requestOperationId,
				attemptId: attempt.id
			});
			return;
		}
		const storedPayload = attempt.payload;
		let currentAttempt = attempt.state === "received" ? await this.updateAttempt({
			...attempt,
			state: "validating"
		}) : attempt;
		try {
			const payload = this.parsePayload(storedPayload);
			if (this.hashPayload(payload) !== currentAttempt.payloadHash) {
				await this.rejectAttempt(currentAttempt, "Stored payment request payload hash mismatch");
				return;
			}
			const grossAmount = sumProofs(payload.proofs);
			await this.validatePayload(operation, payload, grossAmount);
			await this.assertSingleUseAvailable(operation, currentAttempt.id);
			const sourceMetadata = {
				type: "payment-request",
				requestOperationId: operation.id,
				requestId: operation.requestId,
				attemptId: currentAttempt.id,
				transport: currentAttempt.transport,
				transportMessageId: currentAttempt.transportMessageId,
				senderPubkey: currentAttempt.senderPubkey,
				memo: currentAttempt.memo
			};
			const initReceive = await this.receiveOperationService.init({
				mint: payload.mint,
				unit: payload.unit,
				proofs: payload.proofs
			}, sourceMetadata);
			currentAttempt = await this.updateAttempt({
				...currentAttempt,
				state: "receiving",
				receiveOperationId: initReceive.id
			});
			await this.resumeInitChildReceive(currentAttempt, initReceive, { ignoreMissingTransportHandler: true });
		} catch (error) {
			const receiveOperation = currentAttempt.receiveOperationId ? await this.receiveOperationService.getOperation(currentAttempt.receiveOperationId) : await this.receiveOperationRepository.getByPaymentRequestAttemptId(currentAttempt.id);
			if (receiveOperation?.state === "finalized") {
				await this.finalizeAttemptFromReceive(currentAttempt, receiveOperation, { ignoreMissingTransportHandler: true });
				return;
			}
			if (receiveOperation?.state === "rolled_back") {
				await this.rejectAttempt(currentAttempt, receiveOperation.error ?? "Child receive operation rolled back");
				return;
			}
			if (receiveOperation?.state === "prepared") {
				await this.resumePreparedChildReceive(currentAttempt, receiveOperation, { ignoreMissingTransportHandler: true });
				return;
			}
			if (receiveOperation?.state === "init") {
				await this.resumeInitChildReceive(currentAttempt, receiveOperation, { ignoreMissingTransportHandler: true });
				return;
			}
			if (error instanceof PaymentRequestError || error instanceof ProofValidationError) {
				await this.rejectAttempt(currentAttempt, error instanceof Error ? error.message : String(error));
				return;
			}
			this.logger?.warn("Payment request pre-child attempt left for recovery retry", {
				attemptId: currentAttempt.id,
				operationId: currentAttempt.requestOperationId,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	async claimPayloadLocked(operationId, payloadInput, source) {
		const operation = await this.requireOperation(operationId);
		const payload = this.parsePayload(payloadInput);
		const payloadHash = this.hashPayload(payload);
		if (source?.transportMessageId) {
			const existingByMessage = await this.attemptRepository.getByTransportMessageId(source.transportMessageId);
			if (existingByMessage) {
				if (existingByMessage.requestOperationId !== operation.id) throw new PaymentRequestError(`Transport message ${source.transportMessageId} belongs to another payment request receive operation`);
				if (existingByMessage.payloadHash !== payloadHash) throw new PaymentRequestError(`Transport message ${source.transportMessageId} belongs to a different payload`);
				return this.resultForAttempt(operation, existingByMessage);
			}
		}
		const existingByPayload = await this.attemptRepository.getByPayloadHash(operation.id, payloadHash);
		if (existingByPayload) return this.resultForAttempt(operation, existingByPayload);
		if (operation.state !== "active") throw new PaymentRequestError(`Cannot claim payload for payment request receive operation in state '${operation.state}'`);
		const grossAmount = sumProofs(payload.proofs);
		const now = Date.now();
		let attempt = {
			id: generateSubId(),
			requestOperationId: operation.id,
			requestId: payload.id,
			transport: source?.transport ?? operation.transport,
			transportMessageId: source?.transportMessageId,
			payloadHash,
			senderPubkey: source?.senderPubkey,
			memo: payload.memo,
			mintUrl: payload.mint,
			unit: payload.unit,
			grossAmount,
			state: "received",
			payload,
			createdAt: now,
			updatedAt: now
		};
		await this.attemptRepository.create(attempt);
		let validationCompleted = false;
		try {
			attempt = await this.updateAttempt({
				...attempt,
				state: "validating"
			});
			await this.validatePayload(operation, payload, grossAmount);
			await this.assertSingleUseAvailable(operation, attempt.id);
			validationCompleted = true;
			const sourceMetadata = {
				type: "payment-request",
				requestOperationId: operation.id,
				requestId: operation.requestId,
				attemptId: attempt.id,
				transport: attempt.transport,
				transportMessageId: attempt.transportMessageId,
				senderPubkey: attempt.senderPubkey,
				memo: attempt.memo
			};
			const initReceive = await this.receiveOperationService.init({
				mint: payload.mint,
				unit: payload.unit,
				proofs: payload.proofs
			}, sourceMetadata);
			attempt = await this.updateAttempt({
				...attempt,
				state: "receiving",
				receiveOperationId: initReceive.id
			});
			const preparedReceive = await this.receiveOperationService.prepare(initReceive);
			const netAmount = preparedReceive.amount.subtract(preparedReceive.fee);
			attempt = await this.updateAttempt({
				...attempt,
				fee: preparedReceive.fee,
				netAmount
			});
			const finalizedReceive = await this.receiveOperationService.execute(preparedReceive);
			attempt = await this.updateAttempt({
				...attempt,
				state: "finalized",
				fee: finalizedReceive.fee,
				netAmount: finalizedReceive.amount.subtract(finalizedReceive.fee),
				payload: void 0
			});
			return {
				operation: await this.completeIfSingleUse(operation),
				attempt,
				receiveOperation: finalizedReceive
			};
		} catch (error) {
			const receiveOperation = attempt.receiveOperationId ? await this.receiveOperationService.getOperation(attempt.receiveOperationId) : void 0;
			if (receiveOperation?.state === "finalized") {
				attempt = await this.finalizeAttemptFromReceive(attempt, receiveOperation);
				return {
					operation: await this.operationRepository.getById(operation.id) ?? operation,
					attempt,
					receiveOperation
				};
			}
			if (receiveOperation?.state === "prepared" || receiveOperation?.state === "executing") {
				this.logger?.warn("Payment request receive attempt left for recovery", {
					attemptId: attempt.id,
					receiveOperationId: receiveOperation.id,
					childState: receiveOperation.state
				});
				throw error;
			}
			if (attempt.state === "finalized") throw error;
			if (validationCompleted && (!receiveOperation || receiveOperation.state === "init") && attempt.payload) {
				if (this.shouldDropAttemptForRetry(error)) {
					await this.attemptRepository.delete(attempt.id);
					this.logger?.warn("Payment request receive attempt removed for retry", {
						attemptId: attempt.id,
						receiveOperationId: attempt.receiveOperationId,
						error: error instanceof Error ? error.message : String(error)
					});
					throw error;
				}
				attempt = await this.rejectAttempt(attempt, error instanceof Error ? error.message : String(error));
				return {
					operation,
					attempt,
					receiveOperation: receiveOperation ?? void 0
				};
			}
			if (!validationCompleted && attempt.payload && this.shouldDropAttemptForRetry(error)) {
				await this.attemptRepository.delete(attempt.id);
				this.logger?.warn("Payment request receive attempt removed for retry", {
					attemptId: attempt.id,
					error: error instanceof Error ? error.message : String(error)
				});
				throw error;
			}
			attempt = await this.rejectAttempt(attempt, error instanceof Error ? error.message : String(error));
			return {
				operation,
				attempt,
				receiveOperation: receiveOperation ?? void 0
			};
		}
	}
	async resolveTransportInput(input, createInput) {
		if (!input || input === "inband" || typeof input === "object" && input.type === "inband") return {
			transport: "inband",
			paymentRequestTransports: []
		};
		if (typeof input === "string") {
			const handler = this.transportHandlerProvider.getOptional(input);
			if (!handler?.createRequestTransport) throw new PaymentRequestError(`Transport '${input}' is not supported yet`);
			const paymentRequestTransport = await handler.createRequestTransport(createInput);
			return {
				transport: input,
				paymentRequestTransports: [this.normalizePaymentRequestTransport(paymentRequestTransport)]
			};
		}
		const paymentRequestTransport = this.normalizePaymentRequestTransport(input);
		return {
			transport: this.toReceiveTransport(paymentRequestTransport.type),
			paymentRequestTransports: [paymentRequestTransport]
		};
	}
	toReceiveTransport(type) {
		switch (type) {
			case PaymentRequestTransportType.NOSTR: return "nostr";
			case PaymentRequestTransportType.POST: return "post";
			default: throw new PaymentRequestError(`Unsupported payment request transport '${type}'`);
		}
	}
	normalizePaymentRequestTransport(transport) {
		if (!transport.target || transport.target.trim().length === 0) throw new PaymentRequestError(`Transport '${transport.type}' target is required`);
		switch (transport.type) {
			case "nostr":
			case PaymentRequestTransportType.NOSTR: return {
				type: PaymentRequestTransportType.NOSTR,
				target: transport.target,
				tags: transport.tags
			};
			case "post":
			case PaymentRequestTransportType.POST: return {
				type: PaymentRequestTransportType.POST,
				target: transport.target,
				tags: transport.tags
			};
			default: throw new PaymentRequestError("Unsupported payment request transport");
		}
	}
	parsePayload(payloadInput) {
		const raw = typeof payloadInput === "string" ? JSONInt.parse(payloadInput) : payloadInput;
		if (!raw || typeof raw !== "object") throw new PaymentRequestError("Payment request payload must be an object");
		if (!raw.mint || typeof raw.mint !== "string") throw new PaymentRequestError("Payment request payload mint is required");
		if (!raw.unit || typeof raw.unit !== "string") throw new PaymentRequestError("Payment request payload unit is required");
		if (!Array.isArray(raw.proofs) || raw.proofs.length === 0) throw new PaymentRequestError("Payment request payload proofs are required");
		const proofs = raw.proofs.map((proof) => ({
			...proof,
			amount: Amount$1.from(proof.amount)
		}));
		return {
			id: raw.id,
			memo: raw.memo,
			mint: normalizeMintUrl(raw.mint),
			unit: normalizeUnit(raw.unit, { defaultUnit: DEFAULT_UNIT }),
			proofs
		};
	}
	async validatePayload(operation, payload, grossAmount) {
		if (operation.requestId !== void 0 && payload.id !== operation.requestId) throw new PaymentRequestError("Payment request payload id does not match request id");
		if (!operation.requestId && !payload.id) this.logger?.debug("Claiming id-less payment request payload by explicit operation id", { operationId: operation.id });
		if (!await this.mintService.isTrustedMint(payload.mint)) throw new PaymentRequestError(`Mint ${payload.mint} is not trusted`);
		if (operation.mints.length > 0 && !operation.mints.includes(payload.mint)) throw new PaymentRequestError(`Mint ${payload.mint} is not allowed for this request`);
		if (payload.unit !== operation.unit) throw new PaymentRequestError(`Payment request payload unit '${payload.unit}' does not match request unit '${operation.unit}'`);
		if (grossAmount.lessThan(operation.amount)) throw new PaymentRequestError("Payment request payload amount is below requested amount");
	}
	async assertSingleUseAvailable(operation, currentAttemptId) {
		if (!operation.singleUse) return;
		const blockingAttempt = (await this.attemptRepository.getByRequestOperationId(operation.id)).find((attempt) => attempt.id !== currentAttemptId && (attempt.state === "received" || attempt.state === "validating" || attempt.state === "receiving" || attempt.state === "finalized"));
		if (!blockingAttempt) return;
		if (blockingAttempt.state === "finalized") throw new PaymentRequestError("Single-use payment request has already been paid");
		throw new PaymentRequestError("Single-use payment request has an in-flight claim");
	}
	hashPayload(payload) {
		const proofYHexes = computeYHexForSecrets(payload.proofs.map((proof) => proof.secret));
		const proofSummaries = payload.proofs.map((proof, index) => {
			const { id, amount, C, secret: _secret, ...proofMetadata } = proof;
			return {
				y: proofYHexes[index] ?? "",
				id,
				amount: Amount$1.from(amount).toString(),
				C,
				metadata: this.canonicalizePayloadHashValue(proofMetadata)
			};
		}).sort((a, b) => a.y.localeCompare(b.y));
		const canonical = JSON.stringify({
			id: payload.id,
			memo: payload.memo,
			mint: payload.mint,
			unit: payload.unit,
			proofs: proofSummaries
		});
		return bytesToHex$1(sha256(new TextEncoder().encode(canonical)));
	}
	canonicalizePayloadHashValue(value) {
		if (value === void 0) return;
		if (typeof value === "bigint") return value.toString();
		if (Array.isArray(value)) return value.map((item) => this.canonicalizePayloadHashValue(item));
		if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== void 0).sort(([left], [right]) => left.localeCompare(right)).map(([key, entryValue]) => [key, this.canonicalizePayloadHashValue(entryValue)]));
		return value;
	}
	async updateAttempt(attempt) {
		const updated = {
			...attempt,
			updatedAt: Date.now()
		};
		await this.attemptRepository.update(updated);
		return updated;
	}
	async rejectAttempt(attempt, error) {
		return this.updateAttempt({
			...attempt,
			state: "rejected",
			error,
			payload: void 0
		});
	}
	async dropAttemptForRetryOrReject(attempt, error) {
		if (attempt.payload) {
			await this.attemptRepository.delete(attempt.id);
			this.logger?.warn("Payment request receive attempt removed for redelivery retry", {
				attemptId: attempt.id,
				receiveOperationId: attempt.receiveOperationId,
				error
			});
			return;
		}
		await this.rejectAttempt(attempt, error);
	}
	shouldDropAttemptForRetry(error) {
		return !(error instanceof PaymentRequestError || error instanceof ProofValidationError);
	}
	async finalizeAttemptFromReceive(attempt, receiveOperation, options) {
		const finalized = await this.updateAttempt({
			...attempt,
			state: "finalized",
			fee: receiveOperation.fee,
			netAmount: receiveOperation.amount.subtract(receiveOperation.fee),
			payload: void 0
		});
		const operation = await this.operationRepository.getById(finalized.requestOperationId);
		if (operation) await this.completeIfSingleUse(operation, { ignoreMissingTransportHandler: options?.ignoreMissingTransportHandler });
		return finalized;
	}
	async resumePreparedChildReceive(attempt, receiveOperation, options) {
		try {
			const finalizedReceive = await this.receiveOperationService.execute(receiveOperation);
			await this.finalizeAttemptFromReceive(attempt, finalizedReceive, { ignoreMissingTransportHandler: options?.ignoreMissingTransportHandler });
		} catch (error) {
			const latestReceive = await this.receiveOperationService.getOperation(receiveOperation.id);
			if (!latestReceive) {
				await this.rejectAttempt(attempt, "Child receive operation was not found after resume");
				return;
			}
			if (latestReceive.state === "finalized") {
				await this.finalizeAttemptFromReceive(attempt, latestReceive, { ignoreMissingTransportHandler: options?.ignoreMissingTransportHandler });
				return;
			}
			if (latestReceive.state === "rolled_back") {
				await this.rejectAttempt(attempt, latestReceive.error ?? "Child receive operation rolled back");
				return;
			}
			this.logger?.warn("Payment request prepared child receive left for recovery retry", {
				attemptId: attempt.id,
				receiveOperationId: receiveOperation.id,
				childState: latestReceive.state,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	async resumeInitChildReceive(attempt, receiveOperation, options) {
		try {
			const preparedReceive = await this.receiveOperationService.prepare(receiveOperation);
			const netAmount = preparedReceive.amount.subtract(preparedReceive.fee);
			const updatedAttempt = await this.updateAttempt({
				...attempt,
				fee: preparedReceive.fee,
				netAmount
			});
			await this.resumePreparedChildReceive(updatedAttempt, preparedReceive, { ignoreMissingTransportHandler: options?.ignoreMissingTransportHandler });
		} catch (error) {
			const latestReceive = await this.receiveOperationService.getOperation(receiveOperation.id);
			if (!latestReceive || latestReceive.state === "init") {
				const message = error instanceof Error ? error.message : String(error);
				if (this.shouldDropAttemptForRetry(error)) await this.dropAttemptForRetryOrReject(attempt, message);
				else await this.rejectAttempt(attempt, message);
				return;
			}
			if (latestReceive.state === "finalized") {
				await this.finalizeAttemptFromReceive(attempt, latestReceive, { ignoreMissingTransportHandler: options?.ignoreMissingTransportHandler });
				return;
			}
			if (latestReceive.state === "rolled_back") {
				await this.rejectAttempt(attempt, latestReceive.error ?? "Child receive operation rolled back");
				return;
			}
			if (latestReceive.state === "prepared") {
				await this.resumePreparedChildReceive(attempt, latestReceive, { ignoreMissingTransportHandler: options?.ignoreMissingTransportHandler });
				return;
			}
			this.logger?.warn("Payment request init child receive left for recovery retry", {
				attemptId: attempt.id,
				receiveOperationId: receiveOperation.id,
				childState: latestReceive.state,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	async completeIfSingleUse(operation, options) {
		if (!operation.singleUse) return operation;
		const completed = {
			...operation,
			state: "completed",
			completedAt: Date.now(),
			updatedAt: Date.now()
		};
		await this.operationRepository.update(completed);
		try {
			await this.deactivateTransport(completed, { ignoreMissingHandler: options?.ignoreMissingTransportHandler });
		} catch (error) {
			this.logger?.warn("Payment request receive transport deactivation failed after completion", {
				operationId: completed.id,
				requestId: completed.requestId,
				transport: completed.transport,
				error
			});
		}
		return completed;
	}
	async resultForAttempt(operation, attempt) {
		if (this.isInFlightAttempt(attempt)) throw new OperationInProgressError(operation.id);
		const receiveOperation = attempt.receiveOperationId ? await this.receiveOperationService.getOperation(attempt.receiveOperationId) : void 0;
		return {
			operation: await this.operationRepository.getById(operation.id) ?? operation,
			attempt,
			receiveOperation: receiveOperation ?? void 0
		};
	}
	async resultForStoredAttempt(attempt) {
		const operation = await this.operationRepository.getById(attempt.requestOperationId);
		if (!operation) throw new PaymentRequestError(`Payment request receive operation ${attempt.requestOperationId} not found`);
		return this.resultForAttempt(operation, attempt);
	}
	isInFlightAttempt(attempt) {
		return attempt.state === "received" || attempt.state === "validating" || attempt.state === "receiving";
	}
	async requireOperation(operationOrId) {
		if (typeof operationOrId !== "string") return operationOrId;
		const operation = await this.operationRepository.getById(operationOrId);
		if (!operation) throw new PaymentRequestError(`Payment request receive operation ${operationOrId} not found`);
		return operation;
	}
};

//#endregion
//#region services/WalletService.ts
var WalletService = class {
	walletCache = /* @__PURE__ */ new Map();
	CACHE_TTL = 300 * 1e3;
	mintService;
	seedService;
	inFlight = /* @__PURE__ */ new Map();
	logger;
	requestProvider;
	authProviderGetter;
	constructor(mintService, seedService, requestProvider, logger, authProviderGetter) {
		this.mintService = mintService;
		this.seedService = seedService;
		this.requestProvider = requestProvider;
		this.logger = logger;
		this.authProviderGetter = authProviderGetter;
	}
	async getWallet(mintUrl, unit) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new Error("mintUrl is required");
		const normalizedMintUrl = normalizeMintUrl(mintUrl);
		const normalizedUnit = normalizeUnit(unit);
		const cacheKey = this.getWalletCacheKey(normalizedMintUrl, normalizedUnit);
		const cached = this.walletCache.get(cacheKey);
		if (cached && Date.now() - cached.lastCheck < this.CACHE_TTL) {
			this.logger?.debug("Wallet served from cache", {
				mintUrl: normalizedMintUrl,
				unit: normalizedUnit
			});
			return cached.wallet;
		}
		const existing = this.inFlight.get(cacheKey);
		if (existing) return existing;
		const promise = this.buildWallet(normalizedMintUrl, normalizedUnit).finally(() => {
			this.inFlight.delete(cacheKey);
		});
		this.inFlight.set(cacheKey, promise);
		return promise;
	}
	async getWalletWithActiveKeysetId(mintUrl, unit) {
		const normalizedUnit = normalizeUnit(unit);
		const wallet = await this.getWallet(mintUrl, normalizedUnit);
		const keyset = wallet.keyChain.getCheapestKeyset();
		const mintKeys = keyset.toMintKeys();
		const mintKeyset = keyset.toMintKeyset();
		if (mintKeys === null) throw new Error("MintKeys is null. Cannot return a valid response.");
		const keysetUnit = this.normalizeKeysetUnit(mintKeyset.unit);
		if (keysetUnit !== normalizedUnit) throw new Error(`Active keyset ${keyset.id} unit ${keysetUnit} does not match requested unit ${normalizedUnit}`);
		return {
			wallet,
			keysetId: keyset.id,
			keyset: mintKeyset,
			keys: mintKeys,
			unit: normalizedUnit
		};
	}
	/**
	* Clear cached wallet for a specific mint URL
	*/
	clearCache(mintUrl, unit) {
		const normalizedMintUrl = normalizeMintUrl(mintUrl);
		if (unit !== void 0) {
			const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
			const cacheKey = this.getWalletCacheKey(normalizedMintUrl, normalizedUnit);
			this.walletCache.delete(cacheKey);
			this.inFlight.delete(cacheKey);
			this.logger?.debug("Wallet cache cleared", {
				mintUrl: normalizedMintUrl,
				unit: normalizedUnit
			});
			return;
		}
		const prefix = `${normalizedMintUrl}::`;
		for (const key of this.walletCache.keys()) if (key.startsWith(prefix)) this.walletCache.delete(key);
		for (const key of this.inFlight.keys()) if (key.startsWith(prefix)) this.inFlight.delete(key);
		this.logger?.debug("Wallet cache cleared", { mintUrl: normalizedMintUrl });
	}
	/**
	* Clear all cached wallets
	*/
	clearAllCaches() {
		this.walletCache.clear();
		this.inFlight.clear();
		this.logger?.debug("All wallet caches cleared");
	}
	/**
	* Force refresh mint data and get fresh wallet
	*/
	async refreshWallet(mintUrl, unit) {
		const normalizedMintUrl = normalizeMintUrl(mintUrl);
		const normalizedUnit = normalizeUnit(unit);
		this.clearCache(normalizedMintUrl, normalizedUnit);
		await this.mintService.updateMintData(normalizedMintUrl);
		return this.getWallet(normalizedMintUrl, normalizedUnit);
	}
	getWalletCacheKey(mintUrl, unit) {
		return `${normalizeMintUrl(mintUrl)}::${normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT })}`;
	}
	normalizeKeysetUnit(unit) {
		return normalizeUnit(unit || DEFAULT_UNIT, { defaultUnit: DEFAULT_UNIT });
	}
	async buildWallet(mintUrl, unit) {
		const normalizedMintUrl = normalizeMintUrl(mintUrl);
		const normalizedUnit = normalizeUnit(unit);
		const { mint, keysets } = await this.mintService.ensureUpdatedMint(normalizedMintUrl);
		const validKeysets = keysets.filter((keyset) => keyset.keypairs && Object.keys(keyset.keypairs).length > 0 && this.normalizeKeysetUnit(keyset.unit) === normalizedUnit);
		if (validKeysets.length === 0) throw new Error(`No valid keysets found for mint ${normalizedMintUrl} and unit ${normalizedUnit}`);
		const keysetCache = validKeysets.map((keyset) => ({
			id: keyset.id,
			unit: this.normalizeKeysetUnit(keyset.unit),
			active: keyset.active,
			input_fee_ppk: keyset.feePpk,
			keys: keyset.keypairs
		}));
		const cache = {
			mintUrl: mint.mintUrl,
			keysets: keysetCache
		};
		const seed = await this.seedService.getSeed();
		const requestFn = this.requestProvider.getRequestFn(normalizedMintUrl);
		const authProvider = this.authProviderGetter?.(normalizedMintUrl);
		const wallet = new Wallet(new Mint(normalizedMintUrl, {
			customRequest: requestFn,
			authProvider
		}), {
			unit: normalizedUnit,
			logger: this.logger && this.logger.child ? this.logger.child({ module: "Wallet" }) : void 0,
			bip39seed: seed
		});
		wallet.loadMintFromCache(mint.mintInfo, cache);
		this.walletCache.set(this.getWalletCacheKey(normalizedMintUrl, normalizedUnit), {
			wallet,
			lastCheck: Date.now()
		});
		this.logger?.info("Wallet built", {
			mintUrl: normalizedMintUrl,
			unit: normalizedUnit,
			keysetCount: validKeysets.length
		});
		return wallet;
	}
};

//#endregion
//#region services/ProofService.ts
function countBlankOutputsForAmount(amount) {
	const value = amount.toBigInt();
	if (value === 0n) return 0;
	return Math.max((value - 1n).toString(2).length, 1);
}
var ProofService = class {
	counterService;
	proofRepository;
	eventBus;
	walletService;
	mintService;
	keyRingService;
	seedService;
	logger;
	constructor(counterService, proofRepository, walletService, mintService, keyRingService, seedService, logger, eventBus) {
		this.counterService = counterService;
		this.walletService = walletService;
		this.mintService = mintService;
		this.keyRingService = keyRingService;
		this.proofRepository = proofRepository;
		this.seedService = seedService;
		this.logger = logger;
		this.eventBus = eventBus;
	}
	/**
	* Calculates the send amount including receiver fees.
	* This is used when the sender pays fees for the receiver.
	*/
	async calculateSendAmountWithFees(mintUrl, intent) {
		const { amount: requestedSendAmount, unit } = normalizeUnitAmount(intent);
		const { wallet, keys, keysetId } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, unit);
		let denominations = splitAmount(requestedSendAmount, keys.keys);
		let receiveFee = wallet.getFeesForKeyset(denominations.length, keysetId);
		let receiveFeeAmounts = splitAmount(receiveFee, keys.keys);
		while (wallet.getFeesForKeyset(denominations.length + receiveFeeAmounts.length, keysetId).greaterThan(receiveFee)) {
			receiveFee = receiveFee.add(1);
			receiveFeeAmounts = splitAmount(receiveFee, keys.keys);
		}
		return requestedSendAmount.add(receiveFee);
	}
	async checkInflightProofs() {
		const inflightProofs = await this.proofRepository.getInflightProofs();
		this.logger?.debug("Checking inflight proofs", { count: inflightProofs.length });
		if (inflightProofs.length === 0) return;
		const batchedByMintAndUnit = /* @__PURE__ */ new Map();
		for (const proof of inflightProofs) {
			const mintUrl = proof.mintUrl;
			if (!mintUrl) continue;
			const unit = normalizeUnit(proof.unit, { defaultUnit: DEFAULT_UNIT });
			const batchKey = `${mintUrl}::${unit}`;
			(batchedByMintAndUnit.get(batchKey) ?? (() => {
				const next = {
					mintUrl,
					unit,
					proofs: []
				};
				batchedByMintAndUnit.set(batchKey, next);
				return next;
			})()).proofs.push(proof);
		}
		for (const { mintUrl, unit, proofs } of batchedByMintAndUnit.values()) {
			if (!proofs || proofs.length === 0) continue;
			this.logger?.debug("Checking inflight proofs for mint", {
				mintUrl,
				unit,
				count: proofs.length
			});
			try {
				const { wallet } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, unit);
				const proofStates = await wallet.checkProofsStates(proofs);
				if (!Array.isArray(proofStates) || proofStates.length !== proofs.length) {
					this.logger?.warn("Malformed proof state check response", {
						mintUrl,
						expected: proofs.length,
						received: proofStates?.length ?? 0
					});
					continue;
				}
				const spentSecrets = proofStates.reduce((acc, state, index) => {
					if (state?.state === "SPENT" && proofs[index]?.secret) acc.push(proofs[index].secret);
					return acc;
				}, []);
				if (spentSecrets.length > 0) {
					await this.setProofState(mintUrl, spentSecrets, "spent");
					this.logger?.info("Marked inflight proofs as spent after check", {
						mintUrl,
						unit,
						count: spentSecrets.length
					});
				}
			} catch (error) {
				this.logger?.warn("Failed to check inflight proofs for mint", {
					mintUrl,
					unit,
					error
				});
			}
		}
	}
	async createOutputsAndIncrementCounters(mintUrl, amount, options) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		const keep = normalizeUnitAmount(amount.keep);
		const send = normalizeUnitAmount(amount.send);
		assertSameUnit(keep.unit, send.unit, "Output amount");
		const requestedKeep = keep.amount;
		const requestedSend = send.amount;
		const unit = keep.unit;
		const { wallet, keys, keysetId } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, unit);
		const seed = await this.seedService.getSeed();
		const currentCounter = await this.counterService.getCounter(mintUrl, keys.id);
		const data = {
			keep: [],
			send: []
		};
		let sendAmount = requestedSend;
		let keepAmount = requestedKeep;
		if (options?.includeFees && !requestedSend.isZero()) {
			sendAmount = await this.calculateSendAmountWithFees(mintUrl, {
				amount: requestedSend,
				unit
			});
			const feeAmount = sendAmount.subtract(requestedSend);
			keepAmount = requestedKeep.greaterThanOrEqual(feeAmount) ? requestedKeep.subtract(feeAmount) : Amount$1.zero();
			this.logger?.debug("Fee calculation for send amount", {
				mintUrl,
				unit,
				originalSendAmount: requestedSend.toString(),
				originalKeepAmount: requestedKeep.toString(),
				feeAmount: feeAmount.toString(),
				finalSendAmount: sendAmount.toString(),
				adjustedKeepAmount: keepAmount.toString()
			});
		}
		if (!keepAmount.isZero()) {
			data.keep = OutputData.createDeterministicData(keepAmount, seed, currentCounter.counter, keys);
			if (data.keep.length > 0) await this.counterService.incrementCounter(mintUrl, keys.id, data.keep.length);
		}
		if (!sendAmount.isZero()) {
			data.send = OutputData.createDeterministicData(sendAmount, seed, currentCounter.counter + data.keep.length, keys);
			if (data.send.length > 0) await this.counterService.incrementCounter(mintUrl, keys.id, data.send.length);
		}
		this.logger?.debug("Deterministic outputs created", {
			mintUrl,
			unit,
			keysetId: keys.id,
			amount,
			outputs: data.keep.length + data.send.length
		});
		return {
			keep: data.keep,
			send: data.send,
			sendAmount,
			keepAmount
		};
	}
	async saveProofs(mintUrl, proofs) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!Array.isArray(proofs) || proofs.length === 0) return;
		const normalizedProofs = proofs.map((proof) => ({
			...proof,
			unit: normalizeUnit(proof.unit)
		}));
		const groupedByKeyset = this.groupProofsByKeysetId(normalizedProofs);
		const tasks = Array.from(groupedByKeyset.entries()).map(([keysetId, group]) => (async () => {
			await this.proofRepository.saveProofs(mintUrl, group);
			await this.eventBus?.emit("proofs:saved", {
				mintUrl,
				keysetId,
				proofs: group
			});
			this.logger?.info("Proofs saved", {
				mintUrl,
				keysetId,
				count: group.length
			});
		})().catch((error) => {
			throw {
				keysetId,
				error
			};
		}));
		const failed = (await Promise.allSettled(tasks)).filter((r) => r.status === "rejected");
		if (failed.length > 0) {
			for (const fr of failed) {
				const { keysetId, error } = fr.reason;
				this.logger?.error("Failed to persist proofs for keyset", {
					mintUrl,
					keysetId,
					error
				});
			}
			const details = failed.map((fr) => fr.reason);
			const failedKeysets = details.map((d) => d.keysetId).filter((id) => Boolean(id));
			const aggregate = new AggregateError(details.map((d) => d?.error instanceof Error ? d.error : new Error(String(d?.error))), `Failed to persist proofs for ${failed.length} keyset group(s)`);
			throw new ProofOperationError(mintUrl, failedKeysets.length > 0 ? `Failed to persist proofs for ${failed.length} keyset group(s) [${failedKeysets.join(", ")}]` : `Failed to persist proofs for ${failed.length} keyset group(s)`, void 0, aggregate);
		}
	}
	async getReadyProofs(mintUrl, filter) {
		return this.proofRepository.getReadyProofs(mintUrl, filter);
	}
	async getAllReadyProofs(filter) {
		return this.proofRepository.getAllReadyProofs(filter);
	}
	/**
	* Gets the total balance for a single mint.
	* @param mintUrl - The URL of the mint
	* @returns The total balance for the mint
	*/
	async getBalance(mintUrl) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		return (await this.getBalancesByMint({ mintUrls: [mintUrl] }))[mintUrl]?.total ?? Amount$1.zero();
	}
	/**
	* Gets the spendable balance for a single mint.
	* @param mintUrl - The URL of the mint
	* @returns The spendable balance for the mint
	*/
	async getSpendableBalance(mintUrl) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		return (await this.getBalancesByMint({ mintUrls: [mintUrl] }))[mintUrl]?.spendable ?? Amount$1.zero();
	}
	/**
	* Gets the full balance breakdown for a single mint.
	* @param mintUrl - The URL of the mint
	* @returns Balance breakdown with ready, reserved, and total amounts
	*/
	async getBalanceBreakdown(mintUrl) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		const balance = await this.getBalancesByMint({ mintUrls: [mintUrl] });
		return this.snapshotToBreakdown(balance[mintUrl] ?? this.emptyBalanceSnapshot());
	}
	/**
	* Gets balances for all mints.
	* @returns An object mapping mint URLs to their total balances
	*/
	async getBalances() {
		const balances = await this.getBalancesByMint();
		return Object.fromEntries(Object.entries(balances).map(([mintUrl, balance]) => [mintUrl, balance.total]));
	}
	/**
	* Gets spendable balances for all mints.
	* @returns An object mapping mint URLs to their spendable balances
	*/
	async getSpendableBalances() {
		const balances = await this.getBalancesByMint();
		return Object.fromEntries(Object.entries(balances).map(([mintUrl, balance]) => [mintUrl, balance.spendable]));
	}
	/**
	* Gets canonical balances for all mints with spendable, reserved, and total amounts.
	* @returns An object mapping mint URLs to their balances
	*/
	async getBalancesByMint(scope) {
		const unit = this.getSingleBalanceUnit(scope, "getBalancesByMint");
		if (unit === void 0) return {};
		const balancesByMintAndUnit = await this.getBalancesByMintAndUnit({
			...scope,
			units: [unit]
		});
		return Object.fromEntries(Object.entries(balancesByMintAndUnit).map(([mintUrl, balancesByUnit]) => [mintUrl, balancesByUnit[unit] ?? this.emptyBalanceSnapshot(unit)]));
	}
	async getBalancesByMintAndUnit(scope) {
		const requestedMintUrls = scope?.mintUrls ? Array.from(new Set(scope.mintUrls)) : void 0;
		const requestedUnits = normalizeUnitList(scope?.units);
		if (requestedUnits && requestedUnits.length === 0) return {};
		const trustedMintUrls = scope?.trustedOnly ? new Set((await this.mintService.getAllTrustedMints()).map((mint) => mint.mintUrl)) : void 0;
		const balances = {};
		const scopedMintUrls = requestedMintUrls?.filter((mintUrl) => !trustedMintUrls || trustedMintUrls.has(mintUrl));
		const proofFilter = requestedUnits ? { units: requestedUnits } : void 0;
		const proofs = scopedMintUrls ? (await Promise.all(scopedMintUrls.map((mintUrl) => this.proofRepository.getReadyProofs(mintUrl, proofFilter)))).flat() : trustedMintUrls ? (await Promise.all(Array.from(trustedMintUrls).map((mintUrl) => this.proofRepository.getReadyProofs(mintUrl, proofFilter)))).flat() : await this.getAllReadyProofs(proofFilter);
		for (const proof of proofs) {
			const mintUrl = proof.mintUrl;
			if (trustedMintUrls && !trustedMintUrls.has(mintUrl)) continue;
			const unit = normalizeUnit(proof.unit, { defaultUnit: DEFAULT_UNIT });
			const balancesForMint = balances[mintUrl] ?? (balances[mintUrl] = {});
			const balance = balancesForMint[unit] || this.emptyBalanceSnapshot(unit);
			if (proof.usedByOperationId) balance.reserved = balance.reserved.add(proof.amount);
			else balance.spendable = balance.spendable.add(proof.amount);
			balance.total = balance.spendable.add(balance.reserved);
			balancesForMint[unit] = balance;
		}
		if (scopedMintUrls && requestedUnits) for (const mintUrl of scopedMintUrls) {
			const balancesForMint = balances[mintUrl] ?? (balances[mintUrl] = {});
			for (const unit of requestedUnits) balancesForMint[unit] ??= this.emptyBalanceSnapshot(unit);
		}
		return balances;
	}
	/**
	* Gets the aggregated balance for the selected mint scope.
	* @returns A single balance snapshot with spendable, reserved, and total amounts
	*/
	async getBalanceTotal(scope) {
		const unit = this.getSingleBalanceUnit(scope, "getBalanceTotal");
		if (unit === void 0) return this.emptyBalanceSnapshot();
		const balances = await this.getBalancesByMint(scope);
		return Object.values(balances).reduce((total, balance) => ({
			spendable: total.spendable.add(balance.spendable),
			reserved: total.reserved.add(balance.reserved),
			total: total.total.add(balance.total),
			unit
		}), this.emptyBalanceSnapshot(unit));
	}
	async getBalancesByUnit(scope) {
		return this.getBalanceTotalByUnit(scope);
	}
	async getBalanceTotalByUnit(scope) {
		const requestedUnits = normalizeUnitList(scope?.units);
		if (requestedUnits && requestedUnits.length === 0) return {};
		const balancesByMintAndUnit = await this.getBalancesByMintAndUnit(scope);
		const totals = {};
		for (const balancesByUnit of Object.values(balancesByMintAndUnit)) for (const [unit, balance] of Object.entries(balancesByUnit)) {
			const total = totals[unit] ?? this.emptyBalanceSnapshot(unit);
			total.spendable = total.spendable.add(balance.spendable);
			total.reserved = total.reserved.add(balance.reserved);
			total.total = total.total.add(balance.total);
			totals[unit] = total;
		}
		if (requestedUnits) for (const unit of requestedUnits) totals[unit] ??= this.emptyBalanceSnapshot(unit);
		return totals;
	}
	/**
	* Gets balance breakdowns for all mints.
	* @returns An object mapping mint URLs to their balance breakdowns
	*/
	async getBalancesBreakdown() {
		const balances = await this.getBalancesByMint();
		return Object.fromEntries(Object.entries(balances).map(([mintUrl, balance]) => [mintUrl, this.snapshotToBreakdown(balance)]));
	}
	/**
	* Gets balances for trusted mints only.
	* @returns An object mapping trusted mint URLs to their total balances
	*/
	async getTrustedBalances() {
		const balances = await this.getBalancesByMint({ trustedOnly: true });
		return Object.fromEntries(Object.entries(balances).map(([mintUrl, balance]) => [mintUrl, balance.total]));
	}
	/**
	* Gets spendable balances for trusted mints only.
	* @returns An object mapping trusted mint URLs to their spendable balances
	*/
	async getTrustedSpendableBalances() {
		const balances = await this.getBalancesByMint({ trustedOnly: true });
		return Object.fromEntries(Object.entries(balances).map(([mintUrl, balance]) => [mintUrl, balance.spendable]));
	}
	/**
	* Gets balance breakdowns for trusted mints only.
	* @returns An object mapping trusted mint URLs to their balance breakdowns
	*/
	async getTrustedBalancesBreakdown() {
		const balances = await this.getBalancesByMint({ trustedOnly: true });
		return Object.fromEntries(Object.entries(balances).map(([mintUrl, balance]) => [mintUrl, this.snapshotToBreakdown(balance)]));
	}
	getSingleBalanceUnit(scope, caller) {
		const units = normalizeUnitList(scope?.units);
		if (!units) return DEFAULT_UNIT;
		if (units.length === 0) return;
		if (units.length > 1) throw new ProofValidationError(`${caller} cannot aggregate multiple units; use getBalanceTotalByUnit or getBalancesByMintAndUnit`);
		return units[0];
	}
	emptyBalanceSnapshot(unit = DEFAULT_UNIT) {
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		return {
			spendable: Amount$1.zero(),
			reserved: Amount$1.zero(),
			total: Amount$1.zero(),
			unit: normalizedUnit
		};
	}
	snapshotToBreakdown(balance) {
		return {
			ready: balance.spendable,
			reserved: balance.reserved,
			total: balance.total
		};
	}
	async setProofState(mintUrl, secrets, state) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!secrets || secrets.length === 0) return;
		await this.proofRepository.setProofState(mintUrl, secrets, state);
		await this.eventBus?.emit("proofs:state-changed", {
			mintUrl,
			secrets,
			state
		});
		this.logger?.debug("Proof state updated", {
			mintUrl,
			count: secrets.length,
			state
		});
	}
	/**
	* Reserve proofs for an operation.
	* Validates that proofs are available (ready and not already reserved) before reserving.
	* Emits 'proofs:reserved' event on success.
	*
	* @throws ProofOperationError if any proof is not available for reservation
	*/
	async reserveProofs(mintUrl, secrets, operationId, options) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!operationId || operationId.trim().length === 0) throw new ProofValidationError("operationId is required");
		if (!secrets || secrets.length === 0) return {
			amount: Amount$1.zero(),
			unit: normalizeUnit(options?.unit, { defaultUnit: DEFAULT_UNIT })
		};
		const proofsToReserve = await this.proofRepository.getProofsBySecrets(mintUrl, secrets);
		const proofUnits = Array.from(new Set(proofsToReserve.map((proof) => normalizeUnit(proof.unit, { defaultUnit: DEFAULT_UNIT }))));
		if (proofUnits.length > 1) throw new ProofValidationError("Cannot reserve proofs across multiple units");
		const unit = normalizeUnit(options?.unit ?? proofUnits[0], { defaultUnit: DEFAULT_UNIT });
		for (const proofUnit of proofUnits) assertSameUnit(proofUnit, unit, "Proof reservation");
		await this.proofRepository.reserveProofs(mintUrl, secrets, operationId);
		const amount = sumProofs(await this.proofRepository.getProofsBySecrets(mintUrl, secrets));
		await this.eventBus?.emit("proofs:reserved", {
			mintUrl,
			operationId,
			secrets,
			amount: {
				amount,
				unit
			}
		});
		this.logger?.debug("Proofs reserved", {
			mintUrl,
			unit,
			operationId,
			count: secrets.length,
			amount
		});
		return {
			amount,
			unit
		};
	}
	/**
	* Release proofs from an operation.
	* Clears the reservation so proofs become available again.
	* Emits 'proofs:released' event on success.
	*/
	async releaseProofs(mintUrl, secrets) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!secrets || secrets.length === 0) return;
		await this.proofRepository.releaseProofs(mintUrl, secrets);
		await this.eventBus?.emit("proofs:released", {
			mintUrl,
			secrets
		});
		this.logger?.debug("Proofs released", {
			mintUrl,
			count: secrets.length
		});
	}
	/**
	* Restore proofs to ready state and clear their operation reservation.
	* Used during rollback when inflight proofs need to be made available again.
	* This sets state to 'ready' and clears usedByOperationId.
	*/
	async restoreProofsToReady(mintUrl, secrets) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!secrets || secrets.length === 0) return;
		await this.proofRepository.setProofState(mintUrl, secrets, "ready");
		await this.proofRepository.releaseProofs(mintUrl, secrets);
		await this.eventBus?.emit("proofs:state-changed", {
			mintUrl,
			secrets,
			state: "ready"
		});
		await this.eventBus?.emit("proofs:released", {
			mintUrl,
			secrets
		});
		this.logger?.debug("Proofs restored to ready", {
			mintUrl,
			count: secrets.length
		});
	}
	/**
	* Reclaim proofs that are still unspent on the mint.
	* Checks proof states via mint API, then swaps unspent ones back to new proofs.
	* This is the CDK-inspired recovery primitive for deterministic crash recovery.
	*
	* Returns the number of proofs successfully reclaimed.
	*/
	async reclaimUnspent(mintUrl, secrets, unit) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!secrets || secrets.length === 0) return {
			reclaimed: 0,
			spent: 0,
			unreachable: false
		};
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		let wallet;
		try {
			wallet = await this.walletService.getWalletWithActiveKeysetId(mintUrl, normalizedUnit);
		} catch {
			this.logger?.warn("Could not reach mint for reclaimUnspent", { mintUrl });
			return {
				reclaimed: 0,
				spent: 0,
				unreachable: true
			};
		}
		let proofStates;
		try {
			proofStates = await wallet.wallet.checkProofsStates(secrets.map((s) => ({ secret: s })));
		} catch {
			this.logger?.warn("Could not check proof states for reclaimUnspent", { mintUrl });
			return {
				reclaimed: 0,
				spent: 0,
				unreachable: true
			};
		}
		const unspentSecrets = [];
		let spentCount = 0;
		for (let i = 0; i < proofStates.length; i++) if (proofStates[i]?.state === "SPENT") spentCount++;
		else if (proofStates[i]?.state === "UNSPENT") unspentSecrets.push(secrets[i]);
		if (unspentSecrets.length === 0) {
			this.logger?.debug("No unspent proofs to reclaim", {
				mintUrl,
				spentCount
			});
			return {
				reclaimed: 0,
				spent: spentCount,
				unreachable: false
			};
		}
		const unspentProofs = await this.proofRepository.getProofsBySecrets(mintUrl, unspentSecrets);
		const totalAmount = sumProofs(unspentProofs);
		if (totalAmount.isZero()) {
			this.logger?.debug("Unspent proofs have zero total amount", {
				mintUrl,
				count: unspentSecrets.length
			});
			return {
				reclaimed: 0,
				spent: spentCount,
				unreachable: false
			};
		}
		const { send: newSendOutputs } = await this.createOutputsAndIncrementCounters(mintUrl, {
			keep: {
				amount: Amount$1.zero(),
				unit: normalizedUnit
			},
			send: {
				amount: totalAmount,
				unit: normalizedUnit
			}
		});
		const outputConfig = {
			send: {
				type: "custom",
				data: newSendOutputs
			},
			keep: {
				type: "custom",
				data: []
			}
		};
		try {
			const newCoreProofs = mapProofToCoreProof(mintUrl, "ready", (await wallet.wallet.send(totalAmount, unspentProofs, void 0, outputConfig)).send, { unit: normalizedUnit });
			await this.saveProofs(mintUrl, newCoreProofs);
			await this.deleteProofs(mintUrl, unspentSecrets);
			this.logger?.info("Reclaimed unspent proofs", {
				mintUrl,
				unit: normalizedUnit,
				reclaimedCount: unspentSecrets.length,
				spentCount,
				totalAmount: totalAmount.toString()
			});
			return {
				reclaimed: unspentSecrets.length,
				spent: spentCount,
				unreachable: false
			};
		} catch (swapError) {
			this.logger?.warn("Swap failed during reclaimUnspent, restoring proofs to ready", {
				mintUrl,
				error: swapError instanceof Error ? swapError.message : String(swapError)
			});
			await this.restoreProofsToReady(mintUrl, unspentSecrets);
			throw swapError;
		}
	}
	async deleteProofs(mintUrl, secrets) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!secrets || secrets.length === 0) return;
		await this.proofRepository.deleteProofs(mintUrl, secrets);
		await this.eventBus?.emit("proofs:deleted", {
			mintUrl,
			secrets
		});
		this.logger?.info("Proofs deleted", {
			mintUrl,
			count: secrets.length
		});
	}
	async wipeProofsByKeysetId(mintUrl, keysetId) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!keysetId || keysetId.trim().length === 0) throw new ProofValidationError("keysetId is required");
		await this.proofRepository.wipeProofsByKeysetId(mintUrl, keysetId);
		await this.eventBus?.emit("proofs:wiped", {
			mintUrl,
			keysetId
		});
		this.logger?.info("Proofs wiped by keyset", {
			mintUrl,
			keysetId
		});
	}
	/**
	* Select proofs to send for a given amount.
	* Uses the wallet's proof selection algorithm to choose optimal denominations.
	* Only available proofs are considered (ready and not reserved by another operation).
	*
	* @param mintUrl - The mint URL to select proofs from
	* @param amount - The amount to send
	* @param includeFees - Whether to include fees in the selection (default: true)
	* @returns The selected proofs
	* @throws ProofValidationError if insufficient balance to cover the amount
	*/
	async selectProofsToSend(mintUrl, intent, includeFees = true) {
		const { amount: requestedAmount, unit } = normalizeUnitAmount(intent);
		const proofs = await this.proofRepository.getAvailableProofs(mintUrl, { unit });
		if (sumProofs(proofs).lessThan(requestedAmount)) throw new ProofValidationError("Not enough proofs to send");
		const selectedProofs = (await this.walletService.getWallet(mintUrl, unit)).selectProofsToSend(proofs, requestedAmount, includeFees);
		this.logger?.debug("Selected proofs to send", {
			mintUrl,
			unit,
			amount: requestedAmount.toString(),
			selectedProofs,
			count: selectedProofs.send.length
		});
		return selectedProofs.send;
	}
	groupProofsByKeysetId(proofs) {
		const map = /* @__PURE__ */ new Map();
		for (const proof of proofs) {
			if (!proof.secret) throw new ProofValidationError("Proof missing secret");
			normalizeUnit(proof.unit);
			const keysetId = proof.id;
			if (!keysetId || keysetId.trim().length === 0) throw new ProofValidationError("Proof missing keyset id");
			const existing = map.get(keysetId);
			if (existing) existing.push(proof);
			else map.set(keysetId, [proof]);
		}
		return map;
	}
	async getProofsByKeysetId(mintUrl, keysetId, filter) {
		return this.proofRepository.getProofsByKeysetId(mintUrl, keysetId, filter);
	}
	async hasProofsForKeyset(mintUrl, keysetId) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!keysetId || keysetId.trim().length === 0) throw new ProofValidationError("keysetId is required");
		const proofs = await this.proofRepository.getProofsByKeysetId(mintUrl, keysetId);
		const hasProofs = proofs.length > 0;
		this.logger?.debug("Checked proofs for keyset", {
			mintUrl,
			keysetId,
			hasProofs,
			totalProofs: proofs.length
		});
		return hasProofs;
	}
	async prepareProofsForReceiving(proofs) {
		this.logger?.debug("Preparing proofs for receiving", { totalProofs: proofs.length });
		const preparedProofs = [...proofs];
		let regularProofCount = 0;
		let p2pkProofCount = 0;
		for (let i = 0; i < preparedProofs.length; i++) {
			const proof = preparedProofs[i];
			if (!proof) continue;
			let parsedSecret;
			try {
				parsedSecret = JSON.parse(proof.secret);
			} catch (parseError) {
				this.logger?.debug("Regular proof detected, skipping P2PK processing", { proofIndex: i });
				regularProofCount++;
				continue;
			}
			if (parsedSecret[0] !== "P2PK") {
				this.logger?.error("Unsupported locking script type", {
					proofIndex: i,
					scriptType: parsedSecret[0]
				});
				throw new ProofValidationError("Only P2PK locking scripts are supported");
			}
			const additionalKeysTag = parsedSecret[1].tags?.find((tag) => tag[0] === "pubkeys");
			if (additionalKeysTag && additionalKeysTag[1] && additionalKeysTag[1].length > 0) {
				this.logger?.error("Multisig P2PK proof detected", { proofIndex: i });
				throw new ProofValidationError("Multisig is not supported");
			}
			try {
				preparedProofs[i] = await this.keyRingService.signProof(proof, parsedSecret[1].data);
				this.logger?.debug("P2PK proof signed successfully", {
					proofIndex: i,
					recipient: parsedSecret[1].data
				});
				p2pkProofCount++;
			} catch (error) {
				this.logger?.error("Failed to sign P2PK proof for receiving", {
					proofIndex: i,
					recipient: parsedSecret[1].data,
					error
				});
				throw error;
			}
		}
		this.logger?.info("Proofs prepared for receiving", {
			totalProofs: proofs.length,
			regularProofs: regularProofCount,
			p2pkProofs: p2pkProofCount
		});
		return preparedProofs;
	}
	async createBlankOutputs(mintUrl, intent) {
		const { amount: requestedAmount, unit } = normalizeUnitAmount(intent);
		const { keys } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, unit);
		if (requestedAmount.isZero()) return [];
		const outputNumber = countBlankOutputsForAmount(requestedAmount);
		const currentCounter = await this.counterService.getCounter(mintUrl, keys.id);
		const seed = await this.seedService.getSeed();
		const outputData = Array(outputNumber).fill(0).map((_, index) => {
			return OutputData.createSingleDeterministicData(0, seed, currentCounter.counter + index, keys.id);
		});
		if (outputData.length > 0) await this.counterService.incrementCounter(mintUrl, keys.id, outputData.length);
		return outputData;
	}
	/**
	* Unblind change signatures and save the resulting proofs.
	* Used after melt operations to process change returned by the mint.
	*
	* @param mintUrl - The mint URL
	* @param outputData - The output data used to create blank outputs for change
	* @param changeSignatures - The blinded signatures returned by the mint
	* @param keys - The mint keys for unblinding
	* @param options - Optional settings including createdByOperationId
	* @returns The saved change proofs
	*/
	async unblindAndSaveChangeProofs(mintUrl, outputData, changeSignatures, options) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		const unit = normalizeUnit(options.unit);
		if (!outputData || outputData.length === 0 || !changeSignatures || changeSignatures.length === 0) return [];
		const { keysets } = await this.mintService.ensureUpdatedMint(mintUrl);
		const keysetMap = {};
		keysets.forEach((ks) => {
			keysetMap[ks.id] = ks;
		});
		const proofs = outputData.slice(0, changeSignatures.length).flatMap((output, i) => {
			const sig = changeSignatures[i];
			const keyset = keysetMap[output.blindedMessage.id];
			if (!sig || !keyset) {
				const reason = !sig ? "missing signature" : "missing keyset";
				this.logger?.warn("Failed to create change proof", {
					reason,
					index: i
				});
				return [];
			}
			assertSameUnit(normalizeUnit(keyset.unit, { defaultUnit: DEFAULT_UNIT }), unit, "Change proof keyset");
			return [output.toProof(sig, {
				id: keyset.id,
				keys: keyset.keypairs
			})];
		});
		if (proofs.length === 0) return [];
		const coreProofs = mapProofToCoreProof(mintUrl, "ready", proofs, {
			unit,
			createdByOperationId: options?.createdByOperationId
		});
		await this.saveProofs(mintUrl, coreProofs);
		this.logger?.info("Change proofs unblinded and saved", {
			mintUrl,
			unit,
			count: coreProofs.length,
			operationId: options?.createdByOperationId
		});
		return coreProofs;
	}
	/**
	* Recover proofs from a completed swap using the mint's restore endpoint.
	* This is used when a swap succeeded but proofs were not saved (e.g., crash recovery).
	*
	* First checks if the proofs are still unspent before attempting recovery.
	* Only unspent proofs will be recovered and saved.
	*
	* @param mintUrl - The mint URL
	* @param serializedOutputData - The serialized output data containing secrets and blinding factors
	* @param options - Optional metadata to attach to recovered proofs
	* @returns The recovered proofs (only unspent ones)
	*/
	async recoverProofsFromOutputData(mintUrl, serializedOutputData, options) {
		if (!mintUrl || mintUrl.trim().length === 0) throw new ProofValidationError("mintUrl is required");
		if (!serializedOutputData) throw new ProofValidationError("serializedOutputData is required");
		const unit = normalizeUnit(options.unit);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, unit);
		const outputData = deserializeOutputData(serializedOutputData);
		const allOutputs = [...outputData.keep, ...outputData.send];
		if (allOutputs.length === 0) return [];
		const blindedMessages = allOutputs.map((o) => o.blindedMessage);
		const { keysets } = await this.mintService.ensureUpdatedMint(mintUrl);
		const keysetMap = {};
		keysets.forEach((ks) => {
			keysetMap[ks.id] = ks;
		});
		const restoreResult = await wallet.mint.restore({ outputs: blindedMessages });
		const restoredProofs = [];
		for (let i = 0; i < restoreResult.outputs.length; i++) {
			const output = allOutputs.find((o) => o.blindedMessage.B_ === restoreResult.outputs[i]?.B_);
			const signature = restoreResult.signatures[i];
			if (output && signature) {
				const keyset = keysetMap[signature.id];
				if (!keyset) {
					this.logger?.warn("Missing keyset for restored signature", { id: signature.id });
					continue;
				}
				assertSameUnit(normalizeUnit(keyset.unit, { defaultUnit: DEFAULT_UNIT }), unit, "Restored proof keyset");
				restoredProofs.push(output.toProof(signature, {
					id: keyset.id,
					keys: keyset.keypairs
				}));
			}
		}
		if (restoredProofs.length === 0) {
			this.logger?.debug("No proofs found to restore", { mintUrl });
			return [];
		}
		const proofStates = await wallet.checkProofsStates(restoredProofs);
		const unspentProofs = restoredProofs.filter((_, index) => {
			const state = proofStates[index];
			return state && state.state === "UNSPENT";
		});
		if (unspentProofs.length === 0) {
			this.logger?.debug("All restored proofs are already spent", {
				mintUrl,
				totalRestored: restoredProofs.length
			});
			return [];
		}
		if (options?.persistRecoveredProofs !== false) await this.saveProofs(mintUrl, mapProofToCoreProof(mintUrl, "ready", unspentProofs, {
			unit,
			createdByOperationId: options?.createdByOperationId
		}));
		this.logger?.info("Recovered proofs from output data", {
			mintUrl,
			unit,
			totalRestored: restoredProofs.length,
			unspentCount: unspentProofs.length,
			spentCount: restoredProofs.length - unspentProofs.length,
			persisted: options?.persistRecoveredProofs !== false
		});
		return unspentProofs;
	}
};

//#endregion
//#region services/SeedService.ts
var SeedService = class {
	seedGetter;
	seedTtlMs;
	cachedSeed = null;
	cachedUntil = 0;
	inFlight = null;
	constructor(seedGetter, options) {
		this.seedGetter = seedGetter;
		this.seedTtlMs = Math.max(0, options?.seedTtlMs ?? 0);
	}
	async getSeed() {
		const now = Date.now();
		if (this.cachedSeed && now < this.cachedUntil) return new Uint8Array(this.cachedSeed);
		if (this.inFlight) {
			const seed = await this.inFlight;
			return new Uint8Array(seed);
		}
		this.inFlight = (async () => {
			const seed = await this.seedGetter();
			if (!(seed instanceof Uint8Array) || seed.length !== 64) throw new Error("SeedService: seedGetter must return a 64-byte Uint8Array");
			if (this.seedTtlMs > 0) {
				this.cachedSeed = new Uint8Array(seed);
				this.cachedUntil = Date.now() + this.seedTtlMs;
			} else {
				this.cachedSeed = null;
				this.cachedUntil = 0;
			}
			return seed;
		})();
		try {
			const seed = await this.inFlight;
			return new Uint8Array(seed);
		} finally {
			this.inFlight = null;
		}
	}
	clear() {
		this.cachedSeed = null;
		this.cachedUntil = 0;
	}
};

//#endregion
//#region services/WalletRestoreService.ts
var WalletRestoreService = class {
	proofService;
	counterService;
	walletService;
	requestProvider;
	logger;
	restoreBatchSize = 300;
	restoreGapLimit = 100;
	restoreStartCounter = 0;
	constructor(proofService, counterService, walletService, requestProvider, logger) {
		this.proofService = proofService;
		this.counterService = counterService;
		this.walletService = walletService;
		this.requestProvider = requestProvider;
		this.logger = logger;
	}
	async sweepKeyset(mintUrl, keysetId, bip39seed, unit = DEFAULT_UNIT) {
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		this.logger?.debug("Sweeping keyset", {
			mintUrl,
			keysetId
		});
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, normalizedUnit);
		const sweepWallet = new Wallet(new Mint(mintUrl, { customRequest: this.requestProvider.getRequestFn(mintUrl) }), {
			bip39seed,
			unit: normalizedUnit
		});
		await sweepWallet.loadMint();
		const { proofs } = await sweepWallet.batchRestore(this.restoreBatchSize, this.restoreGapLimit, this.restoreStartCounter, keysetId);
		if (proofs.length === 0) {
			this.logger?.warn("No proofs to sweep", {
				mintUrl,
				keysetId
			});
			return;
		}
		this.logger?.debug("Proofs found for sweep", {
			mintUrl,
			keysetId,
			count: proofs.length
		});
		const states = await sweepWallet.checkProofsStates(proofs);
		if (!Array.isArray(states) || states.length !== proofs.length) {
			this.logger?.error("Malformed state check", {
				mintUrl,
				keysetId,
				statesLength: states?.length,
				proofsLength: proofs.length
			});
			throw new Error("Malformed state check");
		}
		const checkedProofs = {
			spent: [],
			ready: []
		};
		for (const [index, state] of states.entries()) {
			if (!proofs[index]) {
				this.logger?.error("Proof not found", {
					mintUrl,
					keysetId,
					index
				});
				throw new Error("Proof not found");
			}
			if (state.state === "SPENT") checkedProofs.spent.push(proofs[index]);
			else checkedProofs.ready.push(proofs[index]);
		}
		this.logger?.debug("Checked proof states", {
			mintUrl,
			keysetId,
			ready: checkedProofs.ready.length,
			spent: checkedProofs.spent.length
		});
		if (checkedProofs.ready.length === 0) {
			this.logger?.warn("No ready proofs to sweep, all spent", {
				mintUrl,
				keysetId,
				spentCount: checkedProofs.spent.length
			});
			return;
		}
		const sweepFee = sweepWallet.getFeesForProofs(checkedProofs.ready);
		const sweepAmount = sumProofs(checkedProofs.ready);
		if (sweepAmount.lessThanOrEqual(sweepFee)) {
			this.logger?.warn("Sweep amount is less than fee", {
				mintUrl,
				keysetId,
				amount: sweepAmount,
				fee: sweepFee
			});
			return;
		}
		const sweepTotalAmount = sweepAmount.subtract(sweepFee);
		this.logger?.debug("Sweep calculation", {
			mintUrl,
			keysetId,
			amount: sweepAmount,
			fee: sweepFee,
			total: sweepTotalAmount
		});
		const outputAmounts = {
			keep: {
				amount: sweepTotalAmount.subtract(sweepTotalAmount),
				unit: normalizedUnit
			},
			send: {
				amount: sweepTotalAmount,
				unit: normalizedUnit
			}
		};
		const outputResults = await this.proofService.createOutputsAndIncrementCounters(mintUrl, outputAmounts);
		const outputConfig = {
			send: {
				type: "custom",
				data: outputResults.send
			},
			keep: {
				type: "custom",
				data: outputResults.keep
			}
		};
		const { send, keep } = await wallet.send(sweepTotalAmount, checkedProofs.ready, void 0, outputConfig);
		await this.proofService.saveProofs(mintUrl, mapProofToCoreProof(mintUrl, "ready", [...keep, ...send], { unit: normalizedUnit }));
		this.logger?.info("Keyset sweep completed", {
			mintUrl,
			keysetId,
			readyProofs: checkedProofs.ready.length,
			spentProofs: checkedProofs.spent.length,
			sweptAmount: sweepAmount,
			fee: sweepFee
		});
	}
	/**
	* Restore and persist proofs for a single keyset.
	* Enforces the invariant: restored proofs must be >= previously stored proofs.
	* Throws on any validation or persistence error. No transactions are used here.
	*/
	async restoreKeyset(mintUrl, wallet, keysetId, unit = DEFAULT_UNIT) {
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		this.logger?.debug("Restoring keyset", {
			mintUrl,
			keysetId
		});
		const oldProofs = await this.proofService.getProofsByKeysetId(mintUrl, keysetId);
		this.logger?.debug("Existing proofs before restore", {
			mintUrl,
			keysetId,
			count: oldProofs.length
		});
		const { proofs, lastCounterWithSignature } = await wallet.batchRestore(this.restoreBatchSize, this.restoreGapLimit, this.restoreStartCounter, keysetId);
		if (proofs.length === 0) {
			this.logger?.warn("No proofs to restore", {
				mintUrl,
				keysetId
			});
			return;
		}
		this.logger?.info("Batch restore result", {
			mintUrl,
			keysetId,
			restored: proofs.length,
			lastCounterWithSignature
		});
		if (oldProofs.length > proofs.length) {
			this.logger?.warn("Restored fewer proofs than previously stored", {
				mintUrl,
				keysetId,
				previous: oldProofs.length,
				restored: proofs.length
			});
			throw new Error("Restored less proofs than expected.");
		}
		const states = await wallet.checkProofsStates(proofs);
		if (!Array.isArray(states) || states.length !== proofs.length) {
			this.logger?.error("Malformed state check", {
				mintUrl,
				keysetId,
				statesLength: states?.length,
				proofsLength: proofs.length
			});
			throw new Error("Malformed state check");
		}
		const checkedProofs = {
			spent: [],
			ready: []
		};
		for (const [index, state] of states.entries()) {
			if (!proofs[index]) {
				this.logger?.error("Proof not found", {
					mintUrl,
					keysetId,
					index
				});
				throw new Error("Proof not found");
			}
			if (state.state === "SPENT") checkedProofs.spent.push(proofs[index]);
			else checkedProofs.ready.push(proofs[index]);
		}
		this.logger?.debug("Checked proof states", {
			mintUrl,
			keysetId,
			ready: checkedProofs.ready.length,
			spent: checkedProofs.spent.length
		});
		const newCounter = lastCounterWithSignature ? lastCounterWithSignature + 1 : 0;
		await this.counterService.overwriteCounter(mintUrl, keysetId, newCounter);
		this.logger?.debug("Requested counter overwrite for keyset", {
			mintUrl,
			keysetId,
			counter: newCounter
		});
		await this.proofService.saveProofs(mintUrl, mapProofToCoreProof(mintUrl, "ready", checkedProofs.ready, { unit: normalizedUnit }));
		this.logger?.info("Saved restored proofs for keyset", {
			mintUrl,
			keysetId,
			total: checkedProofs.ready.length + checkedProofs.spent.length
		});
	}
};

//#endregion
//#region services/watchers/MintOperationWatcherService.ts
function toKey$1(mintUrl, method, quoteId) {
	return `${mintUrl}::${method}::${quoteId}`;
}
function isExpiredMintQuoteSnapshot(snapshot) {
	return snapshot.expiry !== null && snapshot.expiry !== void 0 && snapshot.expiry * 1e3 <= Date.now();
}
const mintQuoteWatchPolicies = {
	bolt11: {
		subscriptionKind: "bolt11_mint_quote",
		getPayloadQuoteId: (payload) => payload.quote,
		shouldRecordPayload: (payload) => payload.state === "PAID" || payload.state === "ISSUED",
		shouldStopWatching: (payload) => payload.state === "ISSUED" || isExpiredMintQuoteSnapshot(payload)
	},
	onchain: {
		subscriptionKind: "onchain_mint_quote",
		getPayloadQuoteId: (payload) => payload.quote,
		shouldRecordPayload: (payload) => payload.amount_paid !== void 0 && payload.amount_issued !== void 0,
		shouldStopWatching: (payload) => isExpiredMintQuoteSnapshot(payload),
		keepWatchingWithoutOperationInterest: true
	},
	bolt12: {
		subscriptionKind: "bolt12_mint_quote",
		getPayloadQuoteId: (payload) => payload.quote,
		shouldRecordPayload: (payload) => payload.amount_paid !== void 0 && payload.amount_issued !== void 0,
		shouldStopWatching: (payload) => isExpiredMintQuoteSnapshot(payload),
		keepWatchingWithoutOperationInterest: true
	}
};
var MintOperationWatcherService = class {
	subs;
	mintService;
	mintOperations;
	quoteLifecycle;
	bus;
	logger;
	options;
	running = false;
	watchRecordByKey = /* @__PURE__ */ new Map();
	keyByOperationId = /* @__PURE__ */ new Map();
	offQuoteUpdated;
	offPending;
	offExecuting;
	offFinalized;
	offUntrusted;
	constructor(subs, mintService, mintOperations, quoteLifecycle, bus, logger, options) {
		this.subs = subs;
		this.mintService = mintService;
		this.mintOperations = mintOperations;
		this.quoteLifecycle = quoteLifecycle;
		this.bus = bus;
		this.logger = logger;
		this.options = {
			watchExistingPendingOnStart: options?.watchExistingPendingOnStart ?? true,
			watchExistingPendingQuotesOnStart: options?.watchExistingPendingQuotesOnStart ?? true
		};
	}
	isRunning() {
		return this.running;
	}
	async start() {
		if (this.running) return;
		this.running = true;
		this.logger?.info("MintOperationWatcherService started");
		this.offPending = this.bus.on("mint-op:pending", async ({ operation }) => {
			if (operation.state !== "pending") return;
			if (!operation.quoteId) return;
			try {
				await this.watchOperations([operation]);
			} catch (err) {
				this.logger?.error("Failed to start watching pending mint operation", {
					operationId: operation.id,
					mintUrl: operation.mintUrl,
					quoteId: operation.quoteId,
					err
				});
			}
		});
		this.offQuoteUpdated = this.bus.on("mint-quote:updated", async ({ quote }) => {
			const policy = this.getPolicy(quote.method);
			if (!policy) return;
			const snapshot = mintQuoteToMethodSnapshot(quote);
			const key = toKey$1(quote.mintUrl, quote.method, quote.quoteId);
			if (policy.shouldStopWatching(snapshot)) {
				await this.stopWatching(key);
				return;
			}
			try {
				await this.watchMintQuotes([{
					...quote,
					snapshot
				}], { canonical: true });
			} catch (err) {
				this.logger?.error("Failed to start watching canonical mint quote", {
					mintUrl: quote.mintUrl,
					quoteId: quote.quoteId,
					err
				});
			}
		});
		this.offExecuting = this.bus.on("mint-op:executing", async ({ operationId }) => {
			try {
				await this.stopWatchingOperation(operationId);
			} catch (err) {
				this.logger?.error("Failed to stop watching executing mint operation", {
					operationId,
					err
				});
			}
		});
		this.offFinalized = this.bus.on("mint-op:finalized", async ({ operationId }) => {
			try {
				await this.stopWatchingOperation(operationId);
			} catch (err) {
				this.logger?.error("Failed to stop watching finalized mint operation", {
					operationId,
					err
				});
			}
		});
		this.offUntrusted = this.bus.on("mint:untrusted", async ({ mintUrl }) => {
			try {
				await this.stopWatchingMint(mintUrl);
			} catch (err) {
				this.logger?.error("Failed to stop watching mint operations on untrust", {
					mintUrl,
					err
				});
			}
		});
		if (this.options.watchExistingPendingOnStart) try {
			const pending = await this.mintOperations.getPendingOperations();
			const byMint = /* @__PURE__ */ new Map();
			for (const operation of pending) {
				if (!operation.quoteId) continue;
				let arr = byMint.get(operation.mintUrl);
				if (!arr) {
					arr = [];
					byMint.set(operation.mintUrl, arr);
				}
				arr.push(operation);
			}
			for (const [mintUrl, operations] of byMint.entries()) {
				if (!await this.mintService.isTrustedMint(mintUrl)) {
					this.logger?.debug("Skipping pending mint operations for untrusted mint", {
						mintUrl,
						count: operations.length
					});
					continue;
				}
				try {
					await this.watchOperations(operations);
				} catch (err) {
					this.logger?.warn("Failed to watch pending mint operation batch", {
						mintUrl,
						count: operations.length,
						err
					});
				}
			}
		} catch (err) {
			this.logger?.error("Failed to load pending mint operations to watch", { err });
		}
		if (this.options.watchExistingPendingQuotesOnStart) try {
			const quotes = await this.quoteLifecycle.getPendingMintQuotes();
			await this.watchMintQuotes(quotes.map((quote) => ({
				mintUrl: quote.mintUrl,
				method: quote.method,
				quoteId: quote.quoteId,
				snapshot: mintQuoteToMethodSnapshot(quote)
			})), { canonical: true });
		} catch (err) {
			this.logger?.error("Failed to load pending mint quotes to watch", { err });
		}
	}
	async stop() {
		if (!this.running) return;
		this.running = false;
		if (this.offQuoteUpdated) try {
			this.offQuoteUpdated();
		} catch {} finally {
			this.offQuoteUpdated = void 0;
		}
		if (this.offPending) try {
			this.offPending();
		} catch {} finally {
			this.offPending = void 0;
		}
		if (this.offExecuting) try {
			this.offExecuting();
		} catch {} finally {
			this.offExecuting = void 0;
		}
		if (this.offFinalized) try {
			this.offFinalized();
		} catch {} finally {
			this.offFinalized = void 0;
		}
		if (this.offUntrusted) try {
			this.offUntrusted();
		} catch {} finally {
			this.offUntrusted = void 0;
		}
		const keys = Array.from(this.watchRecordByKey.keys());
		for (const key of keys) await this.stopWatching(key);
		this.logger?.info("MintOperationWatcherService stopped");
	}
	async watchOperations(operations) {
		if (!this.running) return;
		if (operations.length === 0) return;
		const uniqueByQuote = /* @__PURE__ */ new Map();
		const operationIdsByKey = /* @__PURE__ */ new Map();
		for (const operation of operations) {
			if (!operation.quoteId || !this.getPolicy(operation.method)) continue;
			const key = toKey$1(operation.mintUrl, operation.method, operation.quoteId);
			uniqueByQuote.set(key, {
				mintUrl: operation.mintUrl,
				method: operation.method,
				quoteId: operation.quoteId
			});
			const operationIds = operationIdsByKey.get(key) ?? [];
			operationIds.push(operation.id);
			operationIdsByKey.set(key, operationIds);
		}
		await this.watchMintQuotes(Array.from(uniqueByQuote.values()), { operationIdsByKey });
	}
	async watchMintQuotes(quotes, interest) {
		if (!this.running) return;
		if (quotes.length === 0) return;
		const byGroup = /* @__PURE__ */ new Map();
		for (const quote of quotes) {
			const policy = this.getPolicy(quote.method);
			if (!policy) continue;
			const key = toKey$1(quote.mintUrl, quote.method, quote.quoteId);
			if (quote.snapshot && policy.shouldStopWatching(quote.snapshot)) {
				await this.stopWatching(key);
				continue;
			}
			const existing = this.watchRecordByKey.get(key);
			if (existing?.stop) {
				this.addInterest(existing, key, interest);
				continue;
			}
			const groupKey = `${quote.mintUrl}::${policy.subscriptionKind}`;
			let group = byGroup.get(groupKey);
			if (!group) {
				group = [];
				byGroup.set(groupKey, group);
			}
			group.push(quote);
		}
		for (const mintQuotes of byGroup.values()) {
			const first = mintQuotes[0];
			if (!first) continue;
			const mintUrl = first.mintUrl;
			const policy = this.getPolicy(first.method);
			if (!policy) continue;
			if (!await this.mintService.isTrustedMint(mintUrl)) {
				this.logger?.debug("Skipping watch for untrusted mint", { mintUrl });
				continue;
			}
			const chunks = [];
			for (let i = 0; i < mintQuotes.length; i += 100) chunks.push(mintQuotes.slice(i, i + 100));
			for (const batch of chunks) {
				const quoteIds = batch.map((quote) => quote.quoteId);
				const records = [];
				for (const quote of batch) {
					const record = this.ensureWatchRecord(quote);
					this.addInterest(record, toKey$1(quote.mintUrl, quote.method, quote.quoteId), interest);
					records.push(record);
				}
				let unsubscribe;
				let subId;
				try {
					const subscription = await this.subs.subscribe(mintUrl, policy.subscriptionKind, quoteIds, async (payload) => {
						await this.handleSubscriptionPayload(mintUrl, policy.subscriptionKind, payload);
					});
					subId = subscription.subId;
					unsubscribe = subscription.unsubscribe;
				} catch (err) {
					for (const record of records) this.removeWatchRecord(toKey$1(record.mintUrl, record.method, record.quoteId));
					throw err;
				}
				let didUnsubscribe = false;
				const remaining = new Set(quoteIds);
				const groupUnsubscribeOnce = async () => {
					if (didUnsubscribe) return;
					didUnsubscribe = true;
					await unsubscribe?.();
				};
				for (const record of records) {
					toKey$1(record.mintUrl, record.method, record.quoteId);
					const perKeyStop = async () => {
						if (remaining.has(record.quoteId)) remaining.delete(record.quoteId);
						if (remaining.size === 0) await groupUnsubscribeOnce();
					};
					record.stop = perKeyStop;
				}
				this.logger?.debug("Watching mint quote batch", {
					mintUrl,
					subId,
					count: batch.length
				});
			}
		}
	}
	getPolicy(method) {
		return mintQuoteWatchPolicies[method];
	}
	ensureWatchRecord(quote) {
		const policy = this.getPolicy(quote.method);
		if (!policy) throw new Error(`No mint quote watch policy for method ${quote.method}`);
		const key = toKey$1(quote.mintUrl, quote.method, quote.quoteId);
		let record = this.watchRecordByKey.get(key);
		if (!record) {
			record = {
				mintUrl: quote.mintUrl,
				method: quote.method,
				quoteId: quote.quoteId,
				subscriptionKind: policy.subscriptionKind,
				canonical: false,
				operationIds: /* @__PURE__ */ new Set()
			};
			this.watchRecordByKey.set(key, record);
		}
		return record;
	}
	addInterest(record, key, interest) {
		if (interest.canonical) record.canonical = true;
		const operationIds = interest.operationIdsByKey?.get(key) ?? [];
		for (const operationId of operationIds) {
			record.operationIds.add(operationId);
			this.keyByOperationId.set(operationId, key);
		}
	}
	async handleSubscriptionPayload(mintUrl, subscriptionKind, payload) {
		const record = this.findRecordForPayload(mintUrl, subscriptionKind, payload);
		if (!record) return;
		const policy = this.getPolicy(record.method);
		if (!policy) return;
		const methodPayload = payload;
		const quoteId = policy.getPayloadQuoteId(methodPayload);
		if (!quoteId) return;
		const key = toKey$1(mintUrl, record.method, quoteId);
		if (policy.shouldRecordPayload(methodPayload)) try {
			await this.quoteLifecycle.recordMintQuoteSnapshot(mintUrl, record.method, methodPayload);
		} catch (err) {
			this.logger?.error("Failed to persist mint quote update from remote update", {
				mintUrl,
				quoteId,
				method: record.method,
				err
			});
		}
		if (policy.shouldStopWatching(methodPayload)) await this.stopWatching(key);
	}
	findRecordForPayload(mintUrl, subscriptionKind, payload) {
		for (const record of this.watchRecordByKey.values()) {
			if (record.mintUrl !== mintUrl || record.subscriptionKind !== subscriptionKind) continue;
			if (this.getPolicy(record.method)?.getPayloadQuoteId(payload) === record.quoteId) return record;
		}
	}
	async stopWatching(key) {
		const record = this.watchRecordByKey.get(key);
		if (!record) return;
		try {
			await record.stop?.();
		} catch (err) {
			this.logger?.warn("Unsubscribe watcher failed", {
				key,
				err
			});
		} finally {
			this.removeWatchRecord(key);
		}
	}
	async stopWatchingOperation(operationId) {
		const key = this.keyByOperationId.get(operationId);
		if (!key) return;
		const record = this.watchRecordByKey.get(key);
		this.keyByOperationId.delete(operationId);
		if (!record) return;
		record.operationIds.delete(operationId);
		if (this.shouldStopWatchingWithoutInterest(record)) await this.stopWatching(key);
	}
	shouldStopWatchingWithoutInterest(record) {
		if (record.canonical || record.operationIds.size > 0) return false;
		return this.getPolicy(record.method)?.keepWatchingWithoutOperationInterest !== true;
	}
	removeWatchRecord(key) {
		const record = this.watchRecordByKey.get(key);
		if (!record) return;
		for (const operationId of record.operationIds) if (this.keyByOperationId.get(operationId) === key) this.keyByOperationId.delete(operationId);
		this.watchRecordByKey.delete(key);
	}
	async stopWatchingMint(mintUrl) {
		this.logger?.info("Stopping all quote watchers for mint", { mintUrl });
		const prefix = `${mintUrl}::`;
		const keysToStop = [];
		for (const key of this.watchRecordByKey.keys()) if (key.startsWith(prefix)) keysToStop.push(key);
		for (const key of keysToStop) await this.stopWatching(key);
		this.logger?.info("Stopped quote watchers for mint", {
			mintUrl,
			count: keysToStop.length
		});
	}
};

//#endregion
//#region services/watchers/MintOperationProcessor.ts
var Bolt11MintOperationHandler = class {
	constructor(mintOperations, logger) {
		this.mintOperations = mintOperations;
		this.logger = logger;
	}
	async process(_mintUrl, operationId) {
		await this.mintOperations.finalize(operationId);
	}
};
var MintOperationProcessor = class {
	mintOperations;
	quoteLifecycle;
	bus;
	logger;
	running = false;
	queue = [];
	processing = false;
	processingTimer;
	offQuoteUpdated;
	offPending;
	offRequeue;
	offUntrusted;
	claimingQuotes = /* @__PURE__ */ new Set();
	claimTasks = /* @__PURE__ */ new Set();
	handlers = /* @__PURE__ */ new Map();
	processIntervalMs;
	maxRetries;
	baseRetryDelayMs;
	initialEnqueueDelayMs;
	autoClaimMintQuotes;
	constructor(mintOperations, quoteLifecycle, bus, logger, options) {
		this.mintOperations = mintOperations;
		this.quoteLifecycle = quoteLifecycle;
		this.bus = bus;
		this.logger = logger;
		this.processIntervalMs = options?.processIntervalMs ?? 3e3;
		this.maxRetries = options?.maxRetries ?? 3;
		this.baseRetryDelayMs = options?.baseRetryDelayMs ?? 5e3;
		this.initialEnqueueDelayMs = options?.initialEnqueueDelayMs ?? 500;
		this.autoClaimMintQuotes = options?.autoClaimMintQuotes ?? true;
		this.registerHandler("bolt11", new Bolt11MintOperationHandler(mintOperations, this.logger));
	}
	registerHandler(method, handler) {
		this.handlers.set(method, handler);
		this.logger?.debug("Registered mint operation handler", { method });
	}
	isRunning() {
		return this.running;
	}
	async start() {
		if (this.running) return;
		this.running = true;
		this.logger?.info("MintOperationProcessor started");
		this.offQuoteUpdated = this.bus.on("mint-quote:updated", async ({ mintUrl, method, quoteId, quote }) => {
			if (quote.reusable) {
				this.scheduleQuoteClaim(mintUrl, method, quoteId);
				return;
			}
			if (getMintQuoteRemoteState(quote) !== "PAID") return;
			const operations = await this.mintOperations.getOperationsForQuote(mintUrl, method, quoteId);
			for (const operation of operations) if (operation.state === "pending") this.enqueue(mintUrl, operation.id, operation.method);
		});
		this.offPending = this.bus.on("mint-op:pending", async ({ mintUrl, operation }) => {
			if (operation.state !== "pending") return;
			const quote = await this.quoteLifecycle.getMintQuote(operation.mintUrl, operation.method, operation.quoteId);
			if (quote?.reusable) {
				this.scheduleQuoteClaim(operation.mintUrl, operation.method, operation.quoteId);
				return;
			}
			if (quote && getMintQuoteRemoteState(quote) === "PAID") this.enqueue(mintUrl, operation.id, operation.method);
		});
		this.offRequeue = this.bus.on("mint-op:requeue", ({ mintUrl, operationId, operation }) => {
			this.enqueue(mintUrl, operationId, operation.method);
		});
		this.offUntrusted = this.bus.on("mint:untrusted", ({ mintUrl }) => {
			this.clearMintFromQueue(mintUrl);
		});
		if (this.autoClaimMintQuotes) this.schedulePendingQuoteClaims();
		this.scheduleNextProcess();
	}
	async stop() {
		if (!this.running) return;
		this.running = false;
		if (this.offQuoteUpdated) try {
			this.offQuoteUpdated();
		} catch {} finally {
			this.offQuoteUpdated = void 0;
		}
		if (this.offPending) try {
			this.offPending();
		} catch {} finally {
			this.offPending = void 0;
		}
		if (this.offRequeue) try {
			this.offRequeue();
		} catch {} finally {
			this.offRequeue = void 0;
		}
		if (this.offUntrusted) try {
			this.offUntrusted();
		} catch {} finally {
			this.offUntrusted = void 0;
		}
		if (this.processingTimer) {
			clearTimeout(this.processingTimer);
			this.processingTimer = void 0;
		}
		while (this.processing || this.claimTasks.size > 0) await new Promise((resolve) => setTimeout(resolve, 100));
		this.logger?.info("MintOperationProcessor stopped", { pendingItems: this.queue.length });
	}
	/**
	* Wait for the queue to be empty and all processing to complete.
	* Useful for CLI applications that want to ensure all queued operations are processed before exiting.
	*/
	async waitForCompletion() {
		while (this.queue.length > 0 || this.processing || this.claimTasks.size > 0) await new Promise((resolve) => setTimeout(resolve, 100));
	}
	/**
	* Remove all queued items for a specific mint.
	* Called when a mint is untrusted to stop processing its operations.
	*/
	clearMintFromQueue(mintUrl) {
		const before = this.queue.length;
		this.queue = this.queue.filter((item) => item.mintUrl !== mintUrl);
		const removed = before - this.queue.length;
		if (removed > 0) this.logger?.info("Cleared mint operations from processor queue", {
			mintUrl,
			removed
		});
	}
	enqueue(mintUrl, operationId, method) {
		if (this.queue.find((item) => item.mintUrl === mintUrl && item.operationId === operationId)) {
			this.logger?.debug("Mint operation already in queue", {
				mintUrl,
				operationId
			});
			return;
		}
		const wasEmpty = this.queue.length === 0;
		this.queue.push({
			mintUrl,
			operationId,
			method,
			retryCount: 0,
			nextRetryAt: 0
		});
		this.logger?.debug("Mint operation enqueued for processing", {
			mintUrl,
			operationId,
			method,
			queueLength: this.queue.length
		});
		if (wasEmpty && this.running && !this.processing) {
			if (this.processingTimer) {
				clearTimeout(this.processingTimer);
				this.processingTimer = void 0;
			}
			this.processingTimer = setTimeout(() => {
				this.processingTimer = void 0;
				this.processNext();
			}, this.initialEnqueueDelayMs);
		}
	}
	scheduleNextProcess() {
		if (!this.running || this.processingTimer) return;
		this.processingTimer = setTimeout(() => {
			this.processingTimer = void 0;
			this.processNext();
		}, this.processIntervalMs);
	}
	scheduleQuoteClaim(mintUrl, method, quoteId) {
		if (!this.autoClaimMintQuotes) return;
		const key = `${mintUrl}::${method}::${quoteId}`;
		if (this.claimingQuotes.has(key)) {
			this.logger?.debug("Reusable mint quote claim already in progress", {
				mintUrl,
				method,
				quoteId
			});
			return;
		}
		this.claimingQuotes.add(key);
		const task = (async () => {
			try {
				if (!await this.mintOperations.hasLocallyClaimableMintQuoteBalance(mintUrl, method, quoteId)) {
					this.logger?.debug("Reusable mint quote has no locally claimable balance", {
						mintUrl,
						method,
						quoteId
					});
					return;
				}
				await this.mintOperations.claimMintQuote(mintUrl, method, quoteId, { autoClaimRemaining: true });
			} catch (error) {
				this.logger?.warn("Failed to check or claim reusable mint quote", {
					mintUrl,
					method,
					quoteId,
					error: error instanceof Error ? error.message : String(error)
				});
			} finally {
				this.claimingQuotes.delete(key);
			}
		})();
		this.claimTasks.add(task);
		task.finally(() => {
			this.claimTasks.delete(task);
		});
	}
	schedulePendingQuoteClaims() {
		const task = (async () => {
			try {
				await this.mintOperations.claimPendingMintQuotes({ autoClaimRemaining: true });
			} catch (error) {
				this.logger?.warn("Failed to claim pending reusable mint quotes on startup", { error: error instanceof Error ? error.message : String(error) });
			}
		})();
		this.claimTasks.add(task);
		task.finally(() => {
			this.claimTasks.delete(task);
		});
	}
	async processNext() {
		if (!this.running || this.processing || this.queue.length === 0) {
			if (this.running) this.scheduleNextProcess();
			return;
		}
		const now = Date.now();
		const readyIndex = this.queue.findIndex((item) => item.nextRetryAt <= now);
		if (readyIndex === -1) {
			const nextReady = Math.min(...this.queue.map((item) => item.nextRetryAt));
			const delay = Math.max(this.processIntervalMs, nextReady - now);
			this.processingTimer = setTimeout(() => {
				this.processingTimer = void 0;
				this.processNext();
			}, delay);
			return;
		}
		const [item] = this.queue.splice(readyIndex, 1);
		if (!item) return;
		this.processing = true;
		try {
			await this.processItem(item);
		} catch (err) {
			this.handleProcessingError(item, err);
		} finally {
			this.processing = false;
			if (this.running) this.scheduleNextProcess();
		}
	}
	async processItem(item) {
		const { mintUrl, operationId, method } = item;
		const handler = this.handlers.get(method);
		if (!handler) {
			this.logger?.warn("No handler registered for mint method", {
				method,
				mintUrl,
				operationId
			});
			return;
		}
		this.logger?.info("Processing mint operation", {
			mintUrl,
			operationId,
			method,
			attempt: item.retryCount + 1
		});
		await handler.process(mintUrl, operationId);
		this.logger?.info("Successfully processed mint operation", {
			mintUrl,
			operationId,
			method
		});
	}
	handleProcessingError(item, err) {
		const { mintUrl, operationId } = item;
		if (err instanceof MintOperationError) {
			if (err.code === 20007) {
				this.logger?.warn("Mint operation quote expired", {
					mintUrl,
					operationId
				});
				return;
			}
			if (err.code === 20002) {
				this.logger?.info("Mint operation quote already issued", {
					mintUrl,
					operationId
				});
				return;
			}
			this.logger?.error("Mint operation error, not retrying", {
				mintUrl,
				operationId,
				code: err.code,
				detail: err.message
			});
			return;
		}
		if (err instanceof NetworkError || err instanceof Error && err.message.includes("network")) {
			item.retryCount++;
			if (item.retryCount <= this.maxRetries) {
				const delay = this.baseRetryDelayMs * Math.pow(2, item.retryCount - 1);
				item.nextRetryAt = Date.now() + delay;
				this.logger?.warn("Network error, will retry", {
					mintUrl,
					operationId,
					attempt: item.retryCount,
					maxRetries: this.maxRetries,
					retryInMs: delay
				});
				this.queue.push(item);
				return;
			}
			this.logger?.error("Max retries exceeded for network error", {
				mintUrl,
				operationId,
				maxRetries: this.maxRetries
			});
			return;
		}
		this.logger?.error("Failed to process mint operation", {
			mintUrl,
			operationId,
			err
		});
	}
};

//#endregion
//#region operations/send/SendOperation.ts
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
	return op.state === "finalized" || op.state === "rolled_back";
}
/**
* Get the secrets of proofs that will be sent (for finalization tracking).
* - If needsSwap: secrets come from outputData.send
* - If !needsSwap: secrets are the inputProofSecrets (exact match)
*/
function getSendProofSecrets(op) {
	if (!op.needsSwap) return op.inputProofSecrets;
	if (!op.outputData) return [];
	const { sendSecrets } = getSecretsFromSerializedOutputData(op.outputData);
	return sendSecrets;
}
/**
* Get the secrets of proofs we keep (change from swap).
* - If needsSwap: secrets come from outputData.keep
* - If !needsSwap: empty (no change proofs)
*/
function getKeepProofSecrets(op) {
	if (!op.needsSwap) return [];
	if (!op.outputData) return [];
	const { keepSecrets } = getSecretsFromSerializedOutputData(op.outputData);
	return keepSecrets;
}
/**
* Creates a new SendOperation in init state
*/
function createSendOperation(id, mintUrl, amount, options) {
	const now = Date.now();
	return {
		id,
		state: "init",
		mintUrl,
		amount: amount.amount,
		unit: normalizeUnit(amount.unit),
		method: options.method,
		methodData: options.methodData,
		createdAt: now,
		updatedAt: now
	};
}

//#endregion
//#region services/watchers/ProofStateWatcherService.ts
function toKey(mintUrl, secret) {
	return `${mintUrl}::${secret}`;
}
var ProofStateWatcherService = class {
	subs;
	mintService;
	proofs;
	proofRepository;
	bus;
	logger;
	options;
	sendOperationService;
	running = false;
	unsubscribeByKey = /* @__PURE__ */ new Map();
	inflightByKey = /* @__PURE__ */ new Set();
	offProofsStateChanged;
	offProofsSaved;
	offUntrusted;
	constructor(subs, mintService, proofs, proofRepository, bus, logger, options = { watchExistingInflightOnStart: true }) {
		this.subs = subs;
		this.mintService = mintService;
		this.proofs = proofs;
		this.proofRepository = proofRepository;
		this.bus = bus;
		this.logger = logger;
		this.options = options;
	}
	/**
	* Set the SendOperationService for auto-finalizing send operations.
	* This is set after construction to avoid circular dependencies.
	*/
	setSendOperationService(service) {
		this.sendOperationService = service;
	}
	isRunning() {
		return this.running;
	}
	async start() {
		if (this.running) return;
		this.running = true;
		this.logger?.info("ProofStateWatcherService started");
		this.offProofsStateChanged = this.bus.on("proofs:state-changed", async ({ mintUrl, secrets, state }) => {
			try {
				if (!this.running) return;
				if (state === "inflight") try {
					await this.watchProof(mintUrl, secrets);
				} catch (err) {
					this.logger?.warn("Failed to watch inflight proofs", {
						mintUrl,
						count: secrets.length,
						err
					});
				}
				else if (state === "spent") for (const secret of secrets) {
					const key = toKey(mintUrl, secret);
					try {
						await this.stopWatching(key);
					} catch (err) {
						this.logger?.warn("Failed to stop watcher on spent proof", {
							mintUrl,
							secret,
							err
						});
					}
					try {
						await this.tryFinalizeSendOperation(mintUrl, secret);
					} catch (err) {
						this.logger?.warn("Failed to finalize send operation from spent proof event", {
							mintUrl,
							secret,
							err
						});
					}
				}
			} catch (err) {
				this.logger?.error("Error handling proofs:state-changed", { err });
			}
		});
		this.offProofsSaved = this.bus.on("proofs:saved", async ({ mintUrl, proofs }) => {
			try {
				if (!this.running) return;
				const inflightSecrets = proofs.filter((p) => p.state === "inflight").map((p) => p.secret);
				if (inflightSecrets.length > 0) try {
					await this.watchProof(mintUrl, inflightSecrets);
				} catch (err) {
					this.logger?.warn("Failed to watch inflight proofs from saved event", {
						mintUrl,
						count: inflightSecrets.length,
						err
					});
				}
			} catch (err) {
				this.logger?.error("Error handling proofs:saved", { err });
			}
		});
		this.offUntrusted = this.bus.on("mint:untrusted", async ({ mintUrl }) => {
			try {
				await this.stopWatchingMint(mintUrl);
			} catch (err) {
				this.logger?.error("Failed to stop watching mint proofs on untrust", {
					mintUrl,
					err
				});
			}
		});
		if (this.options.watchExistingInflightOnStart) this.bootstrapInflightProofs().catch((err) => {
			this.logger?.warn("Failed to bootstrap inflight proof watchers", { err });
		});
	}
	async stop() {
		if (!this.running) return;
		this.running = false;
		if (this.offProofsStateChanged) try {
			this.offProofsStateChanged();
		} catch {} finally {
			this.offProofsStateChanged = void 0;
		}
		if (this.offProofsSaved) try {
			this.offProofsSaved();
		} catch {} finally {
			this.offProofsSaved = void 0;
		}
		if (this.offUntrusted) try {
			this.offUntrusted();
		} catch {} finally {
			this.offUntrusted = void 0;
		}
		const entries = Array.from(this.unsubscribeByKey.entries());
		this.unsubscribeByKey.clear();
		for (const [key, unsub] of entries) try {
			await unsub();
			this.logger?.debug("Stopped watching proof", { key });
		} catch (err) {
			this.logger?.warn("Failed to unsubscribe proof watcher", {
				key,
				err
			});
		}
		this.inflightByKey.clear();
		this.logger?.info("ProofStateWatcherService stopped");
	}
	async watchProof(mintUrl, secrets) {
		if (!this.running) return;
		if (!await this.mintService.isTrustedMint(mintUrl)) {
			this.logger?.debug("Skipping watch for untrusted mint", { mintUrl });
			return;
		}
		const toWatch = Array.from(new Set(secrets)).filter((secret) => !this.unsubscribeByKey.has(toKey(mintUrl, secret)));
		if (toWatch.length === 0) return;
		const { secretByYHex, yHexBySecret } = buildYHexMapsForSecrets(toWatch);
		const filters = Array.from(secretByYHex.keys());
		const { subId, unsubscribe } = await this.subs.subscribe(mintUrl, "proof_state", filters, async (payload) => {
			if (payload.state !== "SPENT") return;
			const secret = secretByYHex.get(payload.Y);
			if (!secret) return;
			const key = toKey(mintUrl, secret);
			if (this.inflightByKey.has(key)) return;
			this.inflightByKey.add(key);
			try {
				await this.proofs.setProofState(mintUrl, [secret], "spent");
				this.logger?.info("Marked inflight proof as spent from mint notification", {
					mintUrl,
					subId
				});
				await this.stopWatching(key);
				await this.tryFinalizeSendOperation(mintUrl, secret);
			} catch (err) {
				this.logger?.error("Failed to mark inflight proof as spent", {
					mintUrl,
					subId,
					err
				});
			} finally {
				this.inflightByKey.delete(key);
			}
		});
		let didUnsubscribe = false;
		const remaining = new Set(filters);
		const groupUnsubscribeOnce = async () => {
			if (didUnsubscribe) return;
			didUnsubscribe = true;
			await unsubscribe();
			this.logger?.debug("Unsubscribed watcher for inflight proof group", {
				mintUrl,
				subId
			});
		};
		for (const secret of toWatch) {
			const key = toKey(mintUrl, secret);
			const yHex = yHexBySecret.get(secret);
			const perKeyStop = async () => {
				if (remaining.has(yHex)) remaining.delete(yHex);
				if (remaining.size === 0) await groupUnsubscribeOnce();
			};
			this.unsubscribeByKey.set(key, perKeyStop);
		}
		this.logger?.debug("Watching inflight proof states", {
			mintUrl,
			subId,
			filterCount: filters.length
		});
	}
	async bootstrapInflightProofs() {
		if (!this.running) return;
		this.logger?.info("Bootstrapping inflight proof watchers");
		await this.proofs.checkInflightProofs();
		if (!this.running) return;
		const inflightProofs = await this.proofRepository.getInflightProofs();
		if (!this.running || inflightProofs.length === 0) return;
		const byMint = /* @__PURE__ */ new Map();
		for (const proof of inflightProofs) {
			if (!proof.mintUrl || !proof.secret) continue;
			const secrets = byMint.get(proof.mintUrl) ?? [];
			secrets.push(proof.secret);
			byMint.set(proof.mintUrl, secrets);
		}
		for (const [mintUrl, secrets] of byMint.entries()) {
			if (!this.running) return;
			if (secrets.length === 0) continue;
			try {
				await this.watchProof(mintUrl, secrets);
			} catch (err) {
				this.logger?.warn("Failed to watch existing inflight proofs", {
					mintUrl,
					count: secrets.length,
					err
				});
			}
		}
	}
	async stopWatching(key) {
		const unsubscribe = this.unsubscribeByKey.get(key);
		if (!unsubscribe) return;
		try {
			await unsubscribe();
		} catch (err) {
			this.logger?.warn("Unsubscribe proof watcher failed", {
				key,
				err
			});
		} finally {
			this.unsubscribeByKey.delete(key);
		}
	}
	async stopWatchingMint(mintUrl) {
		this.logger?.info("Stopping all proof watchers for mint", { mintUrl });
		const prefix = `${mintUrl}::`;
		const keysToStop = [];
		for (const key of this.unsubscribeByKey.keys()) if (key.startsWith(prefix)) keysToStop.push(key);
		for (const key of this.inflightByKey) if (key.startsWith(prefix)) this.inflightByKey.delete(key);
		for (const key of keysToStop) await this.stopWatching(key);
		this.logger?.info("Stopped proof watchers for mint", {
			mintUrl,
			count: keysToStop.length
		});
	}
	/**
	* Check if a spent proof is part of a send operation and finalize it if all send proofs are spent.
	*/
	async tryFinalizeSendOperation(mintUrl, secret) {
		if (!this.sendOperationService) return;
		try {
			const spentProof = await this.proofRepository.getProofBySecret(mintUrl, secret);
			const operationId = spentProof?.usedByOperationId || spentProof?.createdByOperationId;
			if (!operationId) return;
			const operation = await this.sendOperationService.getOperation(operationId);
			if (!operation || operation.state !== "pending") return;
			if (!hasPreparedData(operation)) return;
			const sendProofSecrets = getSendProofSecrets(operation);
			if (sendProofSecrets.length === 0) return;
			const sendProofs = await this.proofRepository.getProofsBySecrets(mintUrl, sendProofSecrets);
			const expectedProofCount = new Set(sendProofSecrets).size;
			if (sendProofs.length === expectedProofCount && sendProofs.every((proof) => proof.state === "spent")) {
				this.logger?.info("All send proofs spent, finalizing operation", { operationId });
				await this.sendOperationService.finalize(operationId);
			}
		} catch (err) {
			this.logger?.error("Failed to check/finalize send operation", {
				mintUrl,
				secret,
				err
			});
		}
	}
};

//#endregion
//#region services/TokenService.ts
var TokenService = class {
	mintService;
	logger;
	constructor(mintService, logger) {
		this.mintService = mintService;
		this.logger = logger;
	}
	/** Decode a token into a Token object using the mint's keysets for decoding.
	* @param token - The token to decode (can be a string or already decoded Token object)
	* @param mintUrl - The URL of the mint to use for fetching keysets for decoding
	* @returns The decoded Token object with proofs decoded using the mint's keysets
	*/
	async decodeToken(token, mintUrl, expectedUnit) {
		if (!token) {
			this.logger?.warn("No token provided for decoding", { token });
			throw new TokenValidationError("Token is required");
		}
		if (!mintUrl) {
			this.logger?.warn("No mint URL provided for token decoding", { token });
			throw new TokenValidationError("Mint URL is required for token decoding");
		}
		let mintKeysets;
		try {
			const { keysets } = await this.mintService.ensureUpdatedMint(mintUrl);
			mintKeysets = keysets;
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : "Unable to retrieve mint keysets";
			this.logger?.warn("Failed to get updated keysets for mint", {
				token,
				mintUrl,
				err: errMsg
			});
			throw new TokenValidationError(errMsg);
		}
		try {
			const keysetIds = mintKeysets.map((keyset) => keyset.id);
			const decoded = typeof token === "string" ? getDecodedToken$1(token, keysetIds) : token;
			const decodedForUnitResolution = typeof token === "string" && !encodedTokenMetadataHasExplicitUnit(token) ? {
				...decoded,
				unit: void 0
			} : decoded;
			const unit = this.resolveTokenUnit(decodedForUnitResolution, mintKeysets, expectedUnit);
			return {
				...decoded,
				unit
			};
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : "Unknown error during token decoding";
			this.logger?.warn("Failed to decode token", {
				token,
				mintUrl,
				err: errMsg
			});
			throw new ProofValidationError(errMsg);
		}
	}
	resolveTokenUnit(token, keysets, expectedUnit) {
		const keysetUnits = new Map(keysets.map((keyset) => [keyset.id, normalizeUnit(keyset.unit || DEFAULT_UNIT, { defaultUnit: DEFAULT_UNIT })]));
		const resolvedProofUnits = token.proofs.map((proof) => keysetUnits.get(proof.id)).filter((unit) => unit !== void 0);
		const uniqueProofUnits = Array.from(new Set(resolvedProofUnits));
		if (uniqueProofUnits.length > 1) throw new TokenValidationError(`Token contains proofs from multiple units: ${uniqueProofUnits.join(", ")}`);
		const tokenUnit = token.unit === void 0 || token.unit === null ? void 0 : normalizeUnit(token.unit, { defaultUnit: DEFAULT_UNIT });
		const resolvedUnit = tokenUnit ?? uniqueProofUnits[0] ?? DEFAULT_UNIT;
		if (tokenUnit && uniqueProofUnits[0]) assertSameUnit(uniqueProofUnits[0], tokenUnit, "Token proof keysets");
		if (expectedUnit !== void 0) assertSameUnit(resolvedUnit, expectedUnit, "Token");
		return resolvedUnit;
	}
};
function encodedTokenMetadataHasExplicitUnit(token) {
	try {
		const metadata = getTokenMetadata$1(token);
		if (metadata.unit === void 0 || metadata.unit === null) return false;
		if (isLegacyTokenWithoutUnit(token)) return false;
		return true;
	} catch {
		return true;
	}
}
function stripCashuTokenPrefix(token) {
	for (const prefix of [
		"web+cashu://",
		"cashu://",
		"cashu:"
	]) if (token.startsWith(prefix)) return stripCashuTokenPrefix(token.slice(prefix.length));
	return token.startsWith("cashu") ? token.slice(5) : token;
}
function decodeBase64Url(input) {
	const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
	let buffer = 0;
	let bits = 0;
	const bytes = [];
	for (const char of normalized) {
		if (char === "=") break;
		const value = BASE64_ALPHABET.indexOf(char);
		if (value < 0) throw new Error("Invalid base64url character");
		buffer = buffer << 6 | value;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			bytes.push(buffer >> bits & 255);
		}
	}
	return Uint8Array.from(bytes);
}
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function isLegacyTokenWithoutUnit(token) {
	const payload = stripCashuTokenPrefix(token);
	if (payload.slice(0, 1) !== "A") return false;
	const body = payload.slice(1);
	const json = new TextDecoder().decode(decodeBase64Url(body));
	const decoded = JSON.parse(json);
	return !Object.prototype.hasOwnProperty.call(decoded, "unit");
}

//#endregion
//#region infra/handlers/send/SendHandlerProvider.ts
/**
* Runtime registry for send method handlers.
* Keeps wiring concerns out of the core send domain.
*/
var SendHandlerProvider = class {
	registry = {};
	constructor(initialHandlers) {
		if (initialHandlers) this.registerMany(initialHandlers);
	}
	register(method, handler) {
		this.registry[method] = handler;
	}
	registerMany(handlers) {
		for (const [method, handler] of Object.entries(handlers)) if (handler) this.registry[method] = handler;
	}
	get(method) {
		const handler = this.registry[method];
		if (!handler) throw new Error(`No send handler registered for method ${method}`);
		return handler;
	}
	getAll() {
		return this.registry;
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
//#region operations/send/SendOperationService.ts
/**
* Service that manages send operations as sagas.
*
* This service provides crash recovery and rollback capabilities for send operations
* by breaking them into discrete steps: init → prepare → execute → finalize/rollback.
*/
var SendOperationService = class {
	sendOperationRepository;
	proofRepository;
	proofService;
	mintService;
	walletService;
	eventBus;
	handlerProvider;
	logger;
	/** In-memory lock to prevent concurrent operations on the same operation ID */
	operationIdLock = new OperationIdLock();
	/** Lock for the global recovery process */
	recoveryLock = null;
	/** In-memory lock to serialize proof selection/reservation per mint */
	mintScopedLock;
	constructor(sendOperationRepository, proofRepository, proofService, mintService, walletService, eventBus, handlerProvider, logger, mintScopedLock) {
		this.sendOperationRepository = sendOperationRepository;
		this.proofRepository = proofRepository;
		this.proofService = proofService;
		this.mintService = mintService;
		this.walletService = walletService;
		this.eventBus = eventBus;
		this.handlerProvider = handlerProvider;
		this.logger = logger;
		this.mintScopedLock = mintScopedLock ?? new MintScopedLock();
	}
	buildDeps() {
		return {
			proofRepository: this.proofRepository,
			proofService: this.proofService,
			walletService: this.walletService,
			mintService: this.mintService,
			eventBus: this.eventBus,
			logger: this.logger
		};
	}
	/**
	* Acquire a lock for an operation.
	* Returns a release function that must be called when the operation completes.
	* Throws if the operation is already locked.
	*/
	async acquireOperationLock(operationId) {
		return this.operationIdLock.acquire(operationId);
	}
	/**
	* Check if an operation is currently locked.
	*/
	isOperationLocked(operationId) {
		return this.operationIdLock.isLocked(operationId);
	}
	/**
	* Check if recovery is currently in progress.
	*/
	isRecoveryInProgress() {
		return this.recoveryLock !== null;
	}
	/**
	* Create a new send operation.
	* This is the entry point for the saga.
	*/
	async init(mintUrl, amount, options = {
		method: "default",
		methodData: {}
	}) {
		const parsed = normalizeUnitAmount(amount);
		if (!await this.mintService.isTrustedMint(mintUrl)) throw new UnknownMintError(`Mint ${mintUrl} is not trusted`);
		if (parsed.amount.isZero()) throw new ProofValidationError("Amount must be a positive number");
		const id = generateSubId();
		const operation = createSendOperation(id, mintUrl, parsed, options);
		await this.sendOperationRepository.create(operation);
		this.logger?.debug("Send operation created", {
			operationId: id,
			mintUrl,
			amount: parsed.amount,
			unit: parsed.unit,
			method: options.method
		});
		return operation;
	}
	/**
	* Prepare the operation by reserving proofs and creating outputs.
	* After this step, the operation can be executed or rolled back.
	*
	* If preparation fails, automatically attempts to recover the init operation.
	* Throws if the operation is already in progress.
	*
	* Delegates to the appropriate handler based on the operation method.
	*/
	async prepare(operation) {
		if (!this.handlerProvider) throw new Error("SendHandlerProvider is required");
		const releaseLock = await this.acquireOperationLock(operation.id);
		try {
			const releaseMintLock = await this.mintScopedLock.acquire(operation.mintUrl);
			let prepared;
			try {
				const handler = this.handlerProvider.get(operation.method);
				if (!handler) throw new Error(`No handler registered for method: ${operation.method}`);
				const { wallet } = await this.walletService.getWalletWithActiveKeysetId(operation.mintUrl, operation.unit);
				const ctx = {
					operation,
					wallet,
					proofRepository: this.proofRepository,
					proofService: this.proofService,
					walletService: this.walletService,
					mintService: this.mintService,
					eventBus: this.eventBus,
					logger: this.logger
				};
				prepared = await handler.prepare(ctx);
				await this.sendOperationRepository.update(prepared);
			} catch (e) {
				await this.tryRecoverInitOperation(operation);
				throw e;
			} finally {
				releaseMintLock();
			}
			await this.eventBus.emit("send:prepared", {
				mintUrl: prepared.mintUrl,
				operationId: prepared.id,
				operation: prepared
			});
			return prepared;
		} finally {
			releaseLock();
		}
	}
	/**
	* Execute the prepared operation.
	* Performs the swap (if needed) and creates the token.
	*
	* If execution fails after transitioning to 'executing' state,
	* automatically attempts to recover the operation.
	* Throws if the operation is already in progress.
	*
	* Delegates to the appropriate handler based on the operation method.
	*/
	async execute(operation) {
		if (!this.handlerProvider) throw new Error("SendHandlerProvider is required");
		const releaseLock = await this.acquireOperationLock(operation.id);
		try {
			const executing = {
				...operation,
				state: "executing",
				updatedAt: Date.now()
			};
			await this.sendOperationRepository.update(executing);
			let pending = null;
			let token = null;
			let failed = null;
			try {
				const handler = this.handlerProvider.get(operation.method);
				if (!handler) throw new Error(`No handler registered for method: ${operation.method}`);
				const { wallet } = await this.walletService.getWalletWithActiveKeysetId(operation.mintUrl, operation.unit);
				const ctx = {
					operation: executing,
					wallet,
					reservedProofs: await this.proofRepository.getProofsByOperationId(operation.mintUrl, operation.id),
					proofRepository: this.proofRepository,
					proofService: this.proofService,
					walletService: this.walletService,
					mintService: this.mintService,
					eventBus: this.eventBus,
					logger: this.logger
				};
				const result = await handler.execute(ctx);
				if (result.status === "PENDING") {
					await this.sendOperationRepository.update(result.pending);
					pending = result.pending;
					token = result.token ?? null;
				} else {
					await this.sendOperationRepository.update(result.failed);
					await this.eventBus.emit("send:rolled-back", {
						mintUrl: result.failed.mintUrl,
						operationId: result.failed.id,
						operation: result.failed
					});
					failed = result.failed;
				}
			} catch (e) {
				await this.tryRecoverExecutingOperation(executing);
				throw e;
			}
			if (failed) {
				this.logger?.info("Send operation execution failed", {
					operationId: failed.id,
					error: failed.error
				});
				throw new Error(failed.error || "Handler execution failed");
			}
			if (!pending || !token) throw new Error(`Send operation ${operation.id} did not produce a pending result`);
			await this.eventBus.emit("send:pending", {
				mintUrl: pending.mintUrl,
				operationId: pending.id,
				operation: pending,
				token
			});
			return {
				operation: pending,
				token
			};
		} finally {
			releaseLock();
		}
	}
	/**
	* High-level send method that orchestrates init → prepare → execute.
	* This is the main entry point for consumers.
	*/
	async send(mintUrl, amount) {
		const initOp = await this.init(mintUrl, amount);
		const preparedOp = await this.prepare(initOp);
		const { token } = await this.execute(preparedOp);
		return token;
	}
	/**
	* Finalize a pending operation after its proofs have been spent.
	* This method is idempotent - calling it on an already finalized operation is a no-op.
	* If the operation was rolled back, finalization is skipped (rollback takes precedence).
	* Throws if the operation is already in progress.
	*/
	async finalize(operationId) {
		const preCheck = await this.sendOperationRepository.getById(operationId);
		if (!preCheck) throw new Error(`Operation ${operationId} not found`);
		if (preCheck.state === "finalized") {
			this.logger?.debug("Operation already finalized", { operationId });
			return;
		}
		if (preCheck.state === "rolled_back" || preCheck.state === "rolling_back") {
			this.logger?.debug("Operation was rolled back or is rolling back, skipping finalization", { operationId });
			return;
		}
		let releaseLock;
		try {
			try {
				releaseLock = await this.acquireOperationLock(operationId);
			} catch (error) {
				if (!(error instanceof OperationInProgressError)) throw error;
				await this.operationIdLock.waitForUnlock(operationId);
				const latest = await this.sendOperationRepository.getById(operationId);
				if (!latest) throw new Error(`Operation ${operationId} not found`);
				if (latest.state === "finalized") {
					this.logger?.debug("Operation finalized while waiting for lock", { operationId });
					return;
				}
				if (latest.state === "rolled_back" || latest.state === "rolling_back") {
					this.logger?.debug("Operation rolled back while waiting for lock", {
						operationId,
						state: latest.state
					});
					return;
				}
				releaseLock = await this.acquireOperationLock(operationId);
			}
			const operation = await this.sendOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			if (operation.state === "finalized") {
				this.logger?.debug("Operation already finalized", { operationId });
				return;
			}
			if (operation.state === "rolled_back" || operation.state === "rolling_back") {
				this.logger?.debug("Operation was rolled back or is rolling back, skipping finalization", { operationId });
				return;
			}
			if (operation.state !== "pending") throw new Error(`Cannot finalize operation in state ${operation.state}`);
			const pendingOp = operation;
			await this.handlerProvider.get(pendingOp.method).finalize?.({
				...this.buildDeps(),
				operation: pendingOp
			});
			const finalized = {
				...pendingOp,
				state: "finalized",
				updatedAt: Date.now()
			};
			await this.sendOperationRepository.update(finalized);
			await this.eventBus.emit("send:finalized", {
				mintUrl: pendingOp.mintUrl,
				operationId,
				operation: finalized
			});
			this.logger?.info("Send operation finalized", { operationId });
		} finally {
			releaseLock?.();
		}
	}
	/**
	* Rollback an operation by reclaiming the proofs.
	* Only works for operations in 'prepared' or 'pending' state.
	* Throws if the operation is already in progress.
	*/
	async rollback(operationId, reason = "Rolled back by user action") {
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.sendOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			if (operation.state === "finalized" || operation.state === "rolled_back" || operation.state === "rolling_back" || operation.state === "init" || operation.state === "executing") throw new Error(`Cannot rollback operation in state ${operation.state}`);
			if (!hasPreparedData(operation)) throw new Error(`Operation ${operationId} is not in a rollbackable state`);
			const handler = this.handlerProvider.get(operation.method);
			if (!handler.rollback) throw new Error(`Send operations of method ${operation.method} can not be rolled back`);
			if (operation.state === "pending" && operation.method === "p2pk") throw new Error("Cannot rollback pending P2PK send operation");
			const { wallet } = await this.walletService.getWalletWithActiveKeysetId(operation.mintUrl, operation.unit);
			let opForRollback = operation;
			if (operation.state === "pending") {
				const rollingBack = {
					...operation,
					state: "rolling_back",
					updatedAt: Date.now()
				};
				await this.sendOperationRepository.update(rollingBack);
				opForRollback = rollingBack;
			}
			await handler.rollback({
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
			const initOps = await this.sendOperationRepository.getByState("init");
			for (const op of initOps) {
				await this.recoverInitOperation(op);
				initCount++;
			}
			const preparedOps = await this.sendOperationRepository.getByState("prepared");
			for (const op of preparedOps) this.logger?.warn("Found stale prepared operation, user can rollback manually", { operationId: op.id });
			const executingOps = await this.sendOperationRepository.getByState("executing");
			for (const op of executingOps) try {
				await this.recoverExecutingOperation(op);
				executingCount++;
			} catch (e) {
				this.logger?.error("Error recovering executing operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			const pendingOps = await this.sendOperationRepository.getByState("pending");
			for (const op of pendingOps) try {
				await this.checkPendingOperation(op);
				pendingCount++;
			} catch (e) {
				this.logger?.error("Error checking pending operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			const rollingBackOps = await this.sendOperationRepository.getByState("rolling_back");
			for (const op of rollingBackOps) try {
				await this.recoverRollingBackOperation(op);
				rollingBackCount++;
			} catch (e) {
				this.logger?.error("Error recovering rolling_back operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
			}
			orphanCount = await this.cleanupOrphanedReservations();
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
	/**
	* Clean up a failed init operation.
	* Releases any orphaned proof reservations and deletes the operation.
	*/
	async recoverInitOperation(op) {
		const orphanedForOp = (await this.proofRepository.getReservedProofs()).filter((p) => p.usedByOperationId === op.id);
		if (orphanedForOp.length > 0) await this.proofService.releaseProofs(op.mintUrl, orphanedForOp.map((p) => p.secret));
		await this.sendOperationRepository.delete(op.id);
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
	* Delegates to the handler for recovery logic.
	*/
	async recoverExecutingOperation(op) {
		const handler = this.handlerProvider.get(op.method);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(op.mintUrl, op.unit);
		const result = await handler.recoverExecuting({
			...this.buildDeps(),
			operation: op,
			wallet
		});
		if (result.status === "PENDING") {
			await this.sendOperationRepository.update(result.pending);
			if (result.token) await this.eventBus.emit("send:pending", {
				mintUrl: result.pending.mintUrl,
				operationId: result.pending.id,
				operation: result.pending,
				token: result.token
			});
			this.logger?.info("Recovered executing operation as pending", { operationId: op.id });
			return;
		}
		await this.markAsRolledBack(op, result.failed.error ?? "Recovered: operation failed");
	}
	/**
	* Attempts to recover an executing operation, swallowing recovery errors.
	* If recovery fails (e.g., mint unreachable), logs warning and leaves
	* for startup recovery.
	*/
	async tryRecoverExecutingOperation(op) {
		try {
			const latest = await this.sendOperationRepository.getById(op.id);
			if (!latest || latest.state !== "executing") {
				this.logger?.debug("Skipping executing operation recovery because state changed", {
					operationId: op.id,
					state: latest?.state
				});
				return;
			}
			await this.recoverExecutingOperation(latest);
			this.logger?.info("Recovered executing operation after failure", { operationId: op.id });
		} catch (recoveryError) {
			this.logger?.warn("Failed to recover executing operation, will retry on next startup", {
				operationId: op.id,
				error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
			});
		}
	}
	async recoverRollingBackOperation(op) {
		const handler = this.handlerProvider.get(op.method);
		if (!handler.rollback) {
			await this.forceFailRollingBack(op, "No rollback handler available");
			return;
		}
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(op.mintUrl, op.unit);
		const sendSecrets = getSendProofSecrets(op);
		if (!op.needsSwap || sendSecrets.length === 0) {
			await this.retryRollback(op, handler, wallet);
			return;
		}
		const existingProofs = await this.proofRepository.getProofsByOperationId(op.mintUrl, op.id);
		if (existingProofs.some((p) => p.state === "ready" && sendSecrets.includes(p.secret) === false && p.createdByOperationId === op.id)) {
			const sendProofs = existingProofs.filter((p) => sendSecrets.includes(p.secret));
			if (sendProofs.length > 0) await this.proofService.setProofState(op.mintUrl, sendProofs.map((p) => p.secret), "spent");
			await this.proofService.releaseProofs(op.mintUrl, op.inputProofSecrets);
			const keepSecrets = getKeepProofSecrets(op);
			if (keepSecrets.length > 0) await this.proofService.releaseProofs(op.mintUrl, keepSecrets);
			await this.markAsRolledBack(op, "Recovered: rollback completed before crash");
			return;
		}
		try {
			if ((await wallet.checkProofsStates(sendSecrets.map((s) => ({ secret: s })))).every((s) => s.state === "SPENT")) {
				if (op.outputData) {
					await this.proofService.recoverProofsFromOutputData(op.mintUrl, op.outputData, {
						unit: op.unit,
						createdByOperationId: op.id
					});
					await this.proofService.setProofState(op.mintUrl, op.inputProofSecrets, "spent");
					await this.proofService.releaseProofs(op.mintUrl, op.inputProofSecrets);
					const keepSecrets = getKeepProofSecrets(op);
					if (keepSecrets.length > 0) await this.proofService.releaseProofs(op.mintUrl, keepSecrets);
					await this.markAsRolledBack(op, "Recovered: proofs restored from mint after crash");
					return;
				}
				await this.forceFailRollingBack(op, "Rollback crashed after mint swap, no outputData for recovery");
				return;
			}
		} catch {
			this.logger?.warn("Could not reach mint for rolling_back recovery, will retry later", {
				operationId: op.id,
				mintUrl: op.mintUrl
			});
			throw new Error("Mint unreachable during rolling_back recovery");
		}
		if ((await this.proofService.reclaimUnspent(op.mintUrl, sendSecrets, op.unit)).unreachable) {
			this.logger?.warn("Could not reach mint for rolling_back recovery, will retry later", {
				operationId: op.id,
				mintUrl: op.mintUrl
			});
			throw new Error("Mint unreachable during rolling_back recovery");
		}
		await this.proofService.releaseProofs(op.mintUrl, op.inputProofSecrets);
		const keepSecrets = getKeepProofSecrets(op);
		if (keepSecrets.length > 0) await this.proofService.releaseProofs(op.mintUrl, keepSecrets);
		await this.markAsRolledBack(op, "Recovered: proofs reclaimed after crash");
	}
	async retryRollback(op, handler, wallet) {
		await handler.rollback({
			...this.buildDeps(),
			operation: op,
			wallet
		});
		await this.markAsRolledBack(op, "Recovered: rollback retried after crash");
	}
	async forceFailRollingBack(op, reason) {
		await this.proofService.releaseProofs(op.mintUrl, op.inputProofSecrets);
		const keepSecrets = getKeepProofSecrets(op);
		if (keepSecrets.length > 0) await this.proofService.releaseProofs(op.mintUrl, keepSecrets);
		const sendSecrets = getSendProofSecrets(op);
		if (sendSecrets.length > 0) await this.proofService.releaseProofs(op.mintUrl, sendSecrets);
		await this.markAsRolledBack(op, reason);
	}
	/**
	* Check a pending operation to see if it should be finalized.
	*/
	async checkPendingOperation(op) {
		const handler = this.handlerProvider.get(op.method);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(op.mintUrl, op.unit);
		const decision = await handler.checkPending?.({
			...this.buildDeps(),
			operation: op,
			wallet
		}) ?? await this.defaultCheckPendingDecision(op);
		if (decision === "finalize") {
			await this.finalize(op.id);
			this.logger?.info("Send operation finalized during recovery", { operationId: op.id });
		} else if (decision === "rollback") await this.rollback(op.id, "Rollback requested by handler");
		else this.logger?.debug("Pending operation token not yet claimed, leaving as pending", { operationId: op.id });
	}
	async defaultCheckPendingDecision(op) {
		const sendSecrets = getSendProofSecrets(op);
		let sendStates;
		try {
			sendStates = await this.checkProofStatesWithMint(op.mintUrl, sendSecrets, op.unit);
		} catch (_e) {
			this.logger?.warn("Could not reach mint for recovery, will retry later", {
				operationId: op.id,
				mintUrl: op.mintUrl
			});
			return "stay_pending";
		}
		return sendStates.every((s) => s.state === "SPENT") ? "finalize" : "stay_pending";
	}
	/**
	* Check proof states with the mint.
	*/
	async checkProofStatesWithMint(mintUrl, secrets, unit) {
		const wallet = await this.walletService.getWallet(mintUrl, unit);
		const proofInputs = secrets.map((secret) => ({ secret }));
		return wallet.checkProofsStates(proofInputs);
	}
	/**
	* Mark an operation as rolled back with an error message.
	*/
	async markAsRolledBack(op, error) {
		const rolledBack = {
			...op,
			state: "rolled_back",
			updatedAt: Date.now(),
			error
		};
		await this.sendOperationRepository.update(rolledBack);
		await this.eventBus.emit("send:rolled-back", {
			mintUrl: op.mintUrl,
			operationId: op.id,
			operation: rolledBack
		});
		this.logger?.info("Operation rolled back during recovery", {
			operationId: op.id,
			error
		});
		return rolledBack;
	}
	/**
	* Clean up orphaned proof reservations.
	* Finds proofs that are reserved but point to non-existent or terminal operations.
	*/
	async cleanupOrphanedReservations() {
		const reservedProofs = await this.proofRepository.getReservedProofs();
		const orphanedProofs = [];
		for (const proof of reservedProofs) {
			if (!proof.usedByOperationId) continue;
			const operation = await this.sendOperationRepository.getById(proof.usedByOperationId);
			if (!operation || isTerminalOperation(operation)) orphanedProofs.push(proof);
		}
		const byMint = /* @__PURE__ */ new Map();
		for (const proof of orphanedProofs) {
			const secrets = byMint.get(proof.mintUrl) || [];
			secrets.push(proof.secret);
			byMint.set(proof.mintUrl, secrets);
		}
		for (const [mintUrl, secrets] of byMint) await this.proofService.releaseProofs(mintUrl, secrets);
		if (orphanedProofs.length > 0) this.logger?.info("Released orphaned proof reservations", { count: orphanedProofs.length });
		return orphanedProofs.length;
	}
	/**
	* Get an operation by ID.
	*/
	async getOperation(operationId) {
		return this.sendOperationRepository.getById(operationId);
	}
	/**
	* Get all pending operations.
	*/
	async getPendingOperations() {
		return this.sendOperationRepository.getPending();
	}
	/**
	* Get all prepared operations.
	*/
	async getPreparedOperations() {
		return (await this.sendOperationRepository.getByState("prepared")).filter((op) => op.state === "prepared");
	}
};

//#endregion
//#region operations/melt/MeltOperation.ts
/**
* Check if operation has PreparedData (any state after init)
*/
function hasPreparedData$1(op) {
	return op.state !== "init";
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
//#region operations/melt/MeltMethodHandler.ts
function normalizeMeltMethodData(methodData) {
	if (typeof methodData !== "object" || methodData === null || !("amountSats" in methodData) || methodData.amountSats === void 0) return methodData;
	return {
		...methodData,
		amountSats: Amount$1.from(methodData.amountSats)
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
	async prepareExistingQuote(mintUrl, method, quoteId, options = {}) {
		const quote = await this.quoteLifecycle.requireMeltQuoteForPrepare(mintUrl, method, quoteId, options.expectedUnit);
		const methodData = this.methodDataFromMeltQuote(quote, options);
		const initOperation = await this.init(quote.mintUrl, method, methodData, quote.unit, { quoteId: quote.quoteId });
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
	async finalize(operationId) {
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
			const finalizeResult = await this.handlerProvider.get(pendingOp.method).finalize?.({
				...this.buildDeps(),
				operation: pendingOp
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
	async rollback(operationId, reason = "Rolled back") {
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.meltOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			if (operation.state === "finalized" || operation.state === "rolled_back" || operation.state === "rolling_back" || operation.state === "init" || operation.state === "executing") throw new Error(`Cannot rollback operation in state ${operation.state}`);
			if (!hasPreparedData$1(operation)) throw new Error(`Operation ${operationId} is not in a rollbackable state`);
			const handler = this.handlerProvider.get(operation.method);
			const { wallet } = await this.walletService.getWalletWithActiveKeysetId(operation.mintUrl, operation.unit);
			if (operation.state === "pending") {
				const pendingOp = operation;
				const decision = await handler.checkPending?.({
					...this.buildDeps(),
					operation: pendingOp,
					wallet
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
			for (const op of rollingBackOps) try {
				await this.recoverRollingBackOperation(op);
				rollingBackCount++;
			} catch (e) {
				this.logger?.error("Error recovering rolling_back melt operation", {
					operationId: op.id,
					error: e instanceof Error ? e.message : String(e)
				});
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
	async recoverRollingBackOperation(op) {
		const handler = this.handlerProvider.get(op.method);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(op.mintUrl, op.unit);
		if (handler.rollback) {
			await handler.rollback({
				...this.buildDeps(),
				operation: op,
				wallet
			});
			await this.markAsRolledBack(op, "Recovered: melt rollback retried after crash");
		} else {
			await this.proofService.releaseProofs(op.mintUrl, op.inputProofSecrets);
			await this.markAsRolledBack(op, "Recovered: no rollback handler, reservations released");
		}
	}
	async checkPendingOperation(operationId) {
		const op = await this.getOperation(operationId);
		if (!op || op.state !== "pending") throw new Error(`Cannot check operation ${operationId}: expected state 'pending' but found '${op?.state ?? "not found"}'`);
		const handler = this.handlerProvider.get(op.method);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(op.mintUrl, op.unit);
		const decision = await handler.checkPending?.({
			...this.buildDeps(),
			operation: op,
			wallet
		}) ?? "stay_pending";
		if (decision === "finalize") {
			await this.finalize(op.id);
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
		const matching = (await this.meltOperationRepository.getByQuoteId(mintUrl, quoteId)).filter((operation) => operation.method === method && hasPreparedData$1(operation));
		if (matching.length === 0) return null;
		if (matching.length > 1) throw new Error(`Found ${matching.length} melt operations for mint ${mintUrl}, method ${method}, and quote ${quoteId}`);
		return matching[0];
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
//#region operations/mint/MintOperation.ts
function hasPendingData(op) {
	return op.state !== "init";
}
function isTerminalOperation$1(op) {
	return op.state === "finalized" || op.state === "failed";
}
function getOutputProofSecrets$1(op) {
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
function isExpiredMintQuote(quote) {
	return quote.expiry !== null && quote.expiry * 1e3 <= Date.now();
}
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
		if (!fixedAmount && !quote.reusable) throw new Error(`Mint quote ${quote.quoteId} for ${method} at ${mintUrl} does not have a fixed amount`);
		if (quote.unit !== intent.unit) throw new Error(`Mint quote ${quote.quoteId} unit ${quote.unit} does not match requested unit ${intent.unit}`);
		if (!quote.reusable) {
			const existing = await this.getOperationByQuote(quote.mintUrl, method, quote.quoteId);
			if (existing) throw new Error(`Mint quote ${quote.quoteId} is already tracked by operation ${existing.id} in state ${existing.state}`);
		}
		return quote;
	}
	async prepare(mintUrl, method, quoteId, methodData = {}, expectedUnit, explicitAmount) {
		const quote = await this.quoteLifecycle.requireMintQuoteForPrepare(mintUrl, method, quoteId, expectedUnit);
		const amount = getMintQuoteAmount(quote) ?? explicitAmount?.amount;
		if (!amount) throw new Error(`Mint quote ${quoteId} for ${method} at ${mintUrl} does not have a fixed amount; pass an explicit amount for reusable quote preparation`);
		if (explicitAmount && explicitAmount.unit !== quote.unit) throw new ProofValidationError(`Mint quote ${quoteId} unit ${quote.unit} does not match requested unit ${explicitAmount.unit}`);
		await this.handlerProvider.get(method).validateQuoteForPrepare?.(quote);
		const initOperation = await this.createInitOperation(quote.mintUrl, {
			amount,
			unit: quote.unit
		}, method, methodData, { quoteId: quote.quoteId });
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
		const operation = await this.mintOperationRepository.getById(operationId);
		if (operation?.state === "pending") {
			if ((await this.quoteLifecycle.getMintQuote(operation.mintUrl, operation.method, operation.quoteId))?.reusable) return this.claimReusableQuoteOperation(operation);
		}
		return this.executeReadyOperation(operationId);
	}
	async executeReadyOperation(operationId) {
		const releaseLock = await this.acquireOperationLockAfterWait(operationId);
		try {
			const operation = await this.mintOperationRepository.getById(operationId);
			if (!operation || operation.state !== "pending") throw new Error(`Cannot execute operation ${operationId}: expected state 'pending' but found '${operation?.state ?? "not found"}'`);
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
				if (current && isTerminalOperation$1(current)) return current;
				throw e;
			}
		} finally {
			releaseLock();
		}
	}
	async finalize(operationId) {
		const operation = await this.mintOperationRepository.getById(operationId);
		if (!operation) throw new Error(`Operation ${operationId} not found`);
		if (isTerminalOperation$1(operation)) {
			this.logger?.debug("Operation already finalized", { operationId });
			return operation;
		}
		if (operation.state === "pending") return this.execute(operation.id);
		if (operation.state === "executing") {
			await this.recoverExecutingOperation(operation);
			const updated = await this.mintOperationRepository.getById(operationId);
			if (updated && isTerminalOperation$1(updated)) return updated;
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
			if (isTerminalOperation$1(current)) return;
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
			const result = await handler.recoverExecuting({
				...this.buildDeps(),
				operation: executing,
				wallet
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
		const terminal = sorted.find((op) => isTerminalOperation$1(op));
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
			if (!quote.reusable) return [];
			const claimable = await this.getLocallyClaimableQuoteAmount(quote);
			const siblings = await this.mintOperationRepository.getByQuoteId(mintUrl, method, quoteId);
			let selectedAmount = Amount$1.zero();
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
				if (refreshedQuote.reusable) {
					const currentClaimable = await this.getLocallyClaimableQuoteAmount(refreshedQuote);
					const autoClaimAmount = remaining.lessThan(currentClaimable) ? remaining : currentClaimable;
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
			if (!quote.reusable) continue;
			if (getMintQuoteAvailableAmount(quote).isZero()) continue;
			claimed.push(...await this.claimMintQuote(quote.mintUrl, quote.method, quote.quoteId, options));
		}
		return claimed;
	}
	/** @internal Used by the mint operation processor to suppress no-op reusable quote claims. */
	async hasLocallyClaimableMintQuoteBalance(mintUrl, method, quoteId) {
		const quote = await this.quoteLifecycle.getMintQuote(mintUrl, method, quoteId);
		if (!quote || !quote.reusable) return false;
		return !(await this.getLocallyClaimableQuoteAmount(quote)).isZero();
	}
	async claimReusableQuoteOperation(operation) {
		const releaseQuoteLock = await this.mintScopedLock.acquire(this.quoteLockKey(operation.mintUrl, operation.method, operation.quoteId));
		try {
			const current = await this.mintOperationRepository.getById(operation.id);
			if (!current || current.state !== "pending") {
				if (current) return current;
				throw new Error(`Operation ${operation.id} not found`);
			}
			const pending = current;
			const quote = await this.quoteLifecycle.getMintQuote(pending.mintUrl, pending.method, pending.quoteId);
			if (!quote) throw new Error(`Cannot claim operation ${pending.id}: mint quote ${pending.quoteId} for ${pending.method} at ${pending.mintUrl} was not found`);
			const claimable = await this.getLocallyClaimableQuoteAmount(quote, pending.id);
			if (pending.amount.greaterThan(claimable)) {
				this.logger?.info("Reusable mint quote is not sufficiently funded for operation", {
					operationId: pending.id,
					mintUrl: pending.mintUrl,
					quoteId: pending.quoteId,
					requestedAmount: pending.amount.toString(),
					claimableAmount: claimable.toString()
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
	async getLocallyClaimableQuoteAmount(quote, targetOperationId) {
		if (isExpiredMintQuote(quote)) return Amount$1.zero();
		let remoteAvailable = getMintQuoteAvailableAmount(quote);
		const siblings = await this.mintOperationRepository.getByQuoteId(quote.mintUrl, quote.method, quote.quoteId);
		if (quote.reusable) {
			const locallyIssued = siblings.reduce((total, operation) => {
				if (operation.state !== "finalized") return total;
				return total.add(operation.amount);
			}, Amount$1.zero());
			const effectiveIssued = locallyIssued.greaterThan(quote.quoteData.amountIssued) ? locallyIssued : quote.quoteData.amountIssued;
			remoteAvailable = quote.quoteData.amountPaid.lessThan(effectiveIssued) ? Amount$1.zero() : quote.quoteData.amountPaid.subtract(effectiveIssued);
		}
		const locallyReserved = siblings.reduce((total, operation) => {
			if (operation.state !== "executing" || operation.id === targetOperationId) return total;
			return total.add(operation.amount);
		}, Amount$1.zero());
		if (remoteAvailable.lessThan(locallyReserved)) return Amount$1.zero();
		return remoteAvailable.subtract(locallyReserved);
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
		await this.eventBus.emit("mint-op:finalized", {
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
		const handler = this.handlerProvider.get(op.method);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(op.mintUrl, op.unit);
		const result = await handler.checkPending({
			...this.buildDeps(),
			operation: op,
			wallet
		});
		if (result.quoteSnapshot) await this.quoteLifecycle.recordMintQuoteSnapshot(op.mintUrl, op.method, result.quoteSnapshot);
		if (result.observedRemoteState !== void 0) await this.quoteLifecycle.recordMintQuoteObservation(op, result.observedRemoteState, result.observedRemoteStateAt);
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
		await this.eventBus.emit("mint-op:finalized", {
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
		const outputSecrets = getOutputProofSecrets$1(op);
		if (outputSecrets.length === 0) return false;
		for (const secret of outputSecrets) if (!await this.proofRepository.getProofBySecret(op.mintUrl, secret)) return false;
		return true;
	}
};

//#endregion
//#region operations/receive/ReceiveOperation.ts
function getOutputProofSecrets(op) {
	const { keepSecrets, sendSecrets } = getSecretsFromSerializedOutputData(op.outputData);
	return [...keepSecrets, ...sendSecrets];
}
/**
* Creates a new ReceiveOperation in init state
*/
function createReceiveOperation(id, mintUrl, intent, inputProofs, source) {
	const now = Date.now();
	const amount = normalizeUnitAmount(intent);
	return {
		id,
		state: "init",
		mintUrl,
		unit: amount.unit,
		amount: amount.amount,
		inputProofs,
		source,
		createdAt: now,
		updatedAt: now
	};
}

//#endregion
//#region operations/receive/ReceiveOperationService.ts
const NON_TERMINAL_RECEIVE_MINT_ERROR_CODES = new Set([11003]);
/**
* Service that manages receive operations as sagas.
*
* This service provides crash recovery and rollback capabilities for receive operations
* By breaking them into discrete step:  init → prepare → execute → finalized
* rolledback for failure state
*/
var ReceiveOperationService = class {
	receiveOperationRepository;
	proofRepository;
	proofService;
	mintService;
	walletService;
	mintAdapter;
	tokenService;
	eventBus;
	logger;
	/** In-memory lock to prevent concurrent operations on the same operation ID */
	operationIdLock = new OperationIdLock();
	/** Lock for the global recovery process */
	recoveryLock = null;
	constructor(receiveOperationRepository, proofRepository, proofService, mintService, walletService, mintAdapter, tokenService, eventBus, logger) {
		this.receiveOperationRepository = receiveOperationRepository;
		this.proofRepository = proofRepository;
		this.proofService = proofService;
		this.mintService = mintService;
		this.walletService = walletService;
		this.mintAdapter = mintAdapter;
		this.tokenService = tokenService;
		this.eventBus = eventBus;
		this.logger = logger;
	}
	/**
	* Acquire an in-memory lock for a specific operation to prevent concurrency races.
	* Returns a release function that must be called in a finally block.
	* Throws if the operation is already locked.
	*/
	async acquireOperationLock(operationId) {
		return this.operationIdLock.acquire(operationId);
	}
	/** Check if an operation is currently locked (for concurrency control). */
	isOperationLocked(operationId) {
		return this.operationIdLock.isLocked(operationId);
	}
	/** Check if a recovery sweep is in progress. */
	isRecoveryInProgress() {
		return this.recoveryLock !== null;
	}
	/**
	* Create a new receive operation by decoding and validating the token.
	* Persists the init state so recovery can reason about this operation.
	*/
	async init(token, source) {
		const mintUrl = this.extractMintUrl(token);
		if (!await this.mintService.isTrustedMint(mintUrl)) throw new UnknownMintError(`Mint ${mintUrl} is not trusted`);
		const decodedToken = await this.tokenService.decodeToken(token, mintUrl);
		const unit = normalizeUnit(decodedToken.unit, { defaultUnit: DEFAULT_UNIT });
		const proofs = decodedToken.proofs;
		const preparedProofs = await this.proofService.prepareProofsForReceiving(proofs);
		if (!Array.isArray(preparedProofs) || preparedProofs.length === 0) {
			this.logger?.warn("Token contains no proofs", { mintUrl });
			throw new ProofValidationError("Token contains no proofs");
		}
		const amount = sumProofs(preparedProofs);
		if (amount.isZero()) {
			this.logger?.warn("Token has invalid or non-positive amount", {
				mintUrl,
				amount
			});
			throw new ProofValidationError("Token amount must be a positive integer");
		}
		const id = generateSubId();
		const operation = createReceiveOperation(id, mintUrl, {
			amount,
			unit
		}, preparedProofs, source);
		await this.receiveOperationRepository.create(operation);
		this.logger?.debug("Receive operation created", {
			operationId: id,
			mintUrl,
			amount,
			proofCount: preparedProofs.length
		});
		return operation;
	}
	/**
	* Prepare the operation by calculating fees and creating deterministic outputs.
	* Transitions init -> prepared and stores outputData for crash recovery.
	*/
	async prepare(operation) {
		const releaseLock = await this.acquireOperationLock(operation.id);
		try {
			const current = await this.receiveOperationRepository.getById(operation.id);
			if (!current) throw new Error(`Operation ${operation.id} not found`);
			if (current.state !== "init") throw new Error(`Cannot prepare operation in state '${current.state}'. Expected 'init'.`);
			try {
				return await this.prepareInternal(current);
			} catch (e) {
				if (current.state === "init") await this.tryRecoverInitOperation(current);
				throw e;
			}
		} finally {
			releaseLock();
		}
	}
	/** Internal prepare logic used by prepare(), separated for error handling. */
	async prepareInternal(operation) {
		if (!operation.inputProofs || operation.inputProofs.length === 0) throw new ProofValidationError("Receive operation has no input proofs");
		const { mintUrl } = operation;
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, operation.unit);
		const fee = wallet.getFeesForProofs(operation.inputProofs);
		if (operation.amount.lessThanOrEqual(fee)) throw new ProofValidationError("Receive amount is not sufficient after fees");
		const keepAmount = operation.amount.subtract(fee);
		const outputResult = await this.proofService.createOutputsAndIncrementCounters(mintUrl, {
			keep: {
				amount: keepAmount,
				unit: operation.unit
			},
			send: {
				amount: Amount$1.zero(),
				unit: operation.unit
			}
		}, {});
		if (!outputResult.keep || outputResult.keep.length === 0) throw new Error("Failed to create deterministic outputs for receive");
		const outputData = serializeOutputData({
			keep: outputResult.keep,
			send: []
		});
		const prepared = {
			...operation,
			state: "prepared",
			updatedAt: Date.now(),
			fee,
			outputData
		};
		await this.receiveOperationRepository.update(prepared);
		await this.eventBus.emit("receive-op:prepared", {
			mintUrl,
			operationId: prepared.id,
			operation: prepared
		});
		this.logger?.info("Receive operation prepared", {
			operationId: operation.id,
			mintUrl,
			fee,
			proofCount: operation.inputProofs.length
		});
		return prepared;
	}
	/**
	* Execute the prepared operation.
	* Marks executing before mint interaction to ensure crash-safe recovery.
	*/
	async execute(operation) {
		const releaseLock = await this.acquireOperationLock(operation.id);
		try {
			const current = await this.receiveOperationRepository.getById(operation.id);
			if (!current) throw new Error(`Operation ${operation.id} not found`);
			if (current.state !== "prepared") throw new Error(`Cannot execute operation in state '${current.state}'. Expected 'prepared'.`);
			const executing = {
				...current,
				state: "executing",
				updatedAt: Date.now()
			};
			await this.receiveOperationRepository.update(executing);
			try {
				return await this.executeInternal(executing);
			} catch (e) {
				const rollbackReason = this.getRollbackReasonForReceiveFailure(e);
				if (rollbackReason) {
					await this.markAsRolledBack(executing, rollbackReason);
					throw e;
				}
				await this.tryRecoverExecutingOperation(executing);
				throw e;
			}
		} finally {
			releaseLock();
		}
	}
	/** Internal execute logic used by execute(), separated for error handling. */
	async executeInternal(executing) {
		if (!executing.outputData) throw new Error("Missing output data for receive operation");
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(executing.mintUrl, executing.unit);
		const outputData = deserializeOutputData(executing.outputData);
		this.logger?.info("Receiving token", {
			operationId: executing.id,
			mintUrl: executing.mintUrl,
			proofs: executing.inputProofs.length,
			amount: executing.amount
		});
		const newProofs = await wallet.receive({
			mint: executing.mintUrl,
			proofs: executing.inputProofs,
			unit: executing.unit
		}, void 0, {
			type: "custom",
			data: outputData.keep
		});
		await this.proofService.saveProofs(executing.mintUrl, mapProofToCoreProof(executing.mintUrl, "ready", newProofs, {
			unit: executing.unit,
			createdByOperationId: executing.id
		}));
		return await this.markAsFinalized(executing);
	}
	/**
	* High-level receive method that orchestrates init → prepare → execute.
	* This is the primary entry point used by WalletApi.
	*/
	async receive(token) {
		const initOp = await this.init(token);
		const preparedOp = await this.prepare(initOp);
		await this.execute(preparedOp);
	}
	/**
	* Finalize an executing operation (idempotent).
	* Used by recovery when outputs are already saved.
	*/
	async finalize(operationId) {
		const preCheck = await this.receiveOperationRepository.getById(operationId);
		if (!preCheck) throw new Error(`Operation ${operationId} not found`);
		if (preCheck.state === "finalized") {
			this.logger?.debug("Receive operation already finalized", { operationId });
			return;
		}
		if (preCheck.state === "rolled_back") {
			this.logger?.debug("Receive operation rolled back, skipping finalization", { operationId });
			return;
		}
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.receiveOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			if (operation.state === "finalized") return;
			if (operation.state === "rolled_back") return;
			if (operation.state !== "executing") throw new Error(`Cannot finalize operation in state ${operation.state}`);
			const executing = operation;
			if (!await this.hasSavedOutputs(executing)) throw new Error("Cannot finalize receive operation: outputs not persisted");
			await this.markAsFinalized(executing);
		} finally {
			releaseLock();
		}
	}
	/**
	* Recover pending operations on startup.
	* Handles init cleanup, logs stale prepared operations, and recovers executing operations.
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
			const initOps = await this.receiveOperationRepository.getByState("init");
			for (const op of initOps) {
				let didRecover = false;
				try {
					const releaseLock = await this.acquireOperationLock(op.id);
					try {
						const current = await this.receiveOperationRepository.getById(op.id);
						if (current && current.state === "init") {
							await this.recoverInitOperation(current);
							didRecover = true;
						}
					} finally {
						releaseLock();
					}
				} catch (e) {
					if (e instanceof OperationInProgressError) {
						this.logger?.debug("Init receive operation is in progress, skipping recovery", { operationId: op.id });
						continue;
					}
					throw e;
				}
				if (didRecover) initCount++;
			}
			const preparedOps = await this.receiveOperationRepository.getByState("prepared");
			for (const op of preparedOps) this.logger?.warn("Found stale prepared receive operation, user can rollback manually", { operationId: op.id });
			const executingOps = await this.receiveOperationRepository.getByState("executing");
			for (const op of executingOps) {
				let didRecover = false;
				try {
					const current = await this.receiveOperationRepository.getById(op.id);
					if (current && current.state === "executing") {
						await this.recoverExecutingOperation(current);
						didRecover = true;
					}
				} catch (e) {
					if (e instanceof OperationInProgressError) {
						this.logger?.debug("Executing receive operation is in progress, skipping recovery", { operationId: op.id });
						continue;
					}
					this.logger?.error("Error recovering executing receive operation", {
						operationId: op.id,
						error: e instanceof Error ? e.message : String(e)
					});
				}
				if (didRecover) executingCount++;
			}
			this.logger?.info("Receive recovery completed", {
				initOperations: initCount,
				executingOperations: executingCount
			});
		} finally {
			this.recoveryLock = null;
			releaseRecoveryLock();
		}
	}
	/** Cleanup for failed init operations with no external side effects. */
	async recoverInitOperation(op) {
		await this.receiveOperationRepository.delete(op.id);
		this.logger?.info("Cleaned up failed receive init operation", { operationId: op.id });
	}
	/** Init recovery when prepare fails. */
	async tryRecoverInitOperation(op) {
		try {
			await this.recoverInitOperation(op);
			this.logger?.info("Recovered init receive operation after failure", { operationId: op.id });
		} catch (recoveryError) {
			this.logger?.warn("Failed to recover init receive operation, will retry on next startup", {
				operationId: op.id,
				error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
			});
		}
	}
	/**
	* Recover an executing operation by checking mint state and restoring outputs.
	* Uses outputData to recover proofs if inputs were spent at the mint.
	*/
	async recoverExecutingOperation(op, options) {
		const releaseLock = options?.skipLock ? void 0 : await this.acquireOperationLock(op.id);
		try {
			const current = await this.receiveOperationRepository.getById(op.id);
			if (!current) {
				this.logger?.warn("Receive operation missing during recovery", { operationId: op.id });
				return;
			}
			if (current.state === "finalized" || current.state === "rolled_back") return;
			if (current.state !== "executing") {
				this.logger?.debug("Receive operation not executing during recovery", {
					operationId: current.id,
					state: current.state
				});
				return;
			}
			const executing = current;
			if (await this.hasSavedOutputs(executing)) {
				await this.markAsFinalized(executing);
				this.logger?.info("Receive operation finalized during recovery (outputs already saved)", { operationId: executing.id });
				return;
			}
			let inputStates;
			try {
				inputStates = await this.checkProofStatesWithMint(executing.mintUrl, executing.inputProofs);
			} catch (e) {
				this.logger?.warn("Could not reach mint for receive recovery, will retry later", {
					operationId: executing.id,
					mintUrl: executing.mintUrl
				});
				return;
			}
			const allUnspent = inputStates.every((s) => s.state === "UNSPENT");
			const allSpent = inputStates.every((s) => s.state === "SPENT");
			if (allUnspent) {
				if (!executing.outputData) {
					await this.markAsRolledBack(executing, "Recovered: missing output data for receive");
					return;
				}
				try {
					await this.executeInternal(executing);
				} catch (e) {
					const rollbackReason = this.getRollbackReasonForReceiveFailure(e);
					if (rollbackReason) {
						await this.markAsRolledBack(executing, rollbackReason);
						return;
					}
					this.logger?.warn("Receive re-execution failed, will retry later", {
						operationId: executing.id,
						mintUrl: executing.mintUrl,
						error: e instanceof Error ? e.message : String(e)
					});
				}
				return;
			}
			if (!allSpent) {
				this.logger?.warn("Receive operation inputs not conclusively spent, retry later", { operationId: executing.id });
				return;
			}
			if (!executing.outputData) {
				await this.markAsRolledBack(executing, "Recovered: missing output data for receive");
				return;
			}
			try {
				const recovered = await this.proofService.recoverProofsFromOutputData(executing.mintUrl, executing.outputData, {
					unit: executing.unit,
					createdByOperationId: executing.id
				});
				if (await this.hasSavedOutputs(executing)) {
					await this.markAsFinalized(executing);
					return;
				}
				this.logger?.warn("Receive outputs not persisted after recovery attempt", {
					operationId: executing.id,
					mintUrl: executing.mintUrl,
					recoveredCount: recovered.length
				});
			} catch (e) {
				const rollbackReason = this.getRollbackReasonForReceiveFailure(e);
				if (rollbackReason) {
					await this.markAsRolledBack(executing, rollbackReason);
					return;
				}
				this.logger?.warn("Recovering receive outputs failed, will retry later", {
					operationId: executing.id,
					mintUrl: executing.mintUrl,
					error: e instanceof Error ? e.message : String(e)
				});
			}
		} finally {
			if (releaseLock) releaseLock();
		}
	}
	/** Best-effort executing recovery used when execute fails. */
	async tryRecoverExecutingOperation(op) {
		try {
			await this.recoverExecutingOperation(op, { skipLock: true });
			this.logger?.info("Recovered executing receive operation after failure", { operationId: op.id });
		} catch (recoveryError) {
			this.logger?.warn("Failed to recover executing receive operation, will retry on startup", {
				operationId: op.id,
				error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
			});
		}
	}
	getRollbackReasonForReceiveFailure(error) {
		if (error instanceof MintOperationError) return NON_TERMINAL_RECEIVE_MINT_ERROR_CODES.has(error.code) ? null : error.message;
		return null;
	}
	async checkProofStatesWithMint(mintUrl, proofs) {
		const batches = [];
		let batchResults = [];
		const yHexes = computeYHexForSecrets(proofs.map((p) => p.secret));
		for (let i = 0; i < yHexes.length; i += 100) batches.push(yHexes.slice(i, i + 100));
		batchResults = await Promise.all(batches.map((batch) => this.mintAdapter.checkProofStates(mintUrl, batch)));
		return batchResults.flat();
	}
	/**
	* Persist finalized state and emit the operation finalized event.
	*/
	async markAsFinalized(op) {
		const current = await this.receiveOperationRepository.getById(op.id);
		if (!current) throw new Error(`Operation ${op.id} not found`);
		if (current.state === "finalized") return current;
		if (current.state === "rolled_back") throw new Error(`Cannot finalize operation in state ${current.state}`);
		if (current.state !== "executing") throw new Error(`Cannot finalize operation in state ${current.state}`);
		const finalized = {
			...current,
			state: "finalized",
			updatedAt: Date.now()
		};
		await this.receiveOperationRepository.update(finalized);
		await this.eventBus.emit("receive-op:finalized", {
			mintUrl: finalized.mintUrl,
			operationId: finalized.id,
			operation: finalized
		});
		this.logger?.info("Receive operation finalized", {
			operationId: finalized.id,
			mintUrl: finalized.mintUrl,
			proofCount: finalized.inputProofs.length
		});
		return finalized;
	}
	/**
	* Persist rolled back state with error context.
	*/
	async markAsRolledBack(op, error) {
		const rolledBack = {
			...op,
			state: "rolled_back",
			updatedAt: Date.now(),
			error
		};
		await this.receiveOperationRepository.update(rolledBack);
		await this.eventBus.emit("receive-op:rolled-back", {
			mintUrl: rolledBack.mintUrl,
			operationId: rolledBack.id,
			operation: rolledBack
		});
		this.logger?.info("Receive operation rolled back", {
			operationId: op.id,
			error
		});
		return rolledBack;
	}
	/**
	* Check if any output proofs already exist locally.
	* Used to avoid unnecessary recovery work.
	*/
	async hasSavedOutputs(op) {
		const outputSecrets = getOutputProofSecrets(op);
		if (outputSecrets.length === 0) return false;
		return (await this.proofRepository.getProofsBySecrets(op.mintUrl, outputSecrets)).length === new Set(outputSecrets).size;
	}
	/** Extract and normalize mint URL from token, with validation. */
	extractMintUrl(token) {
		try {
			return normalizeMintUrl(typeof token === "string" ? getTokenMetadata$1(token).mint : token.mint);
		} catch (err) {
			this.logger?.warn("Failed to decode token for receive", { err });
			throw new ProofValidationError("Invalid token");
		}
	}
	/**
	* Get an operation by ID.
	*/
	async getOperation(operationId) {
		return this.receiveOperationRepository.getById(operationId);
	}
	/**
	* Get all pending operations.
	*/
	async getPendingOperations() {
		return this.receiveOperationRepository.getPending();
	}
	/**
	* Get all prepared operations.
	*/
	async getPreparedOperations() {
		return (await this.receiveOperationRepository.getByState("prepared")).filter((op) => op.state === "prepared");
	}
	/**
	* Rollback a receive operation.
	* Only allowed for operations in 'init' or 'prepared' state.
	*/
	async rollback(operationId, reason) {
		const releaseLock = await this.acquireOperationLock(operationId);
		try {
			const operation = await this.receiveOperationRepository.getById(operationId);
			if (!operation) throw new Error(`Operation ${operationId} not found`);
			switch (operation.state) {
				case "executing": throw new Error(`Cannot rollback operation in state ${operation.state}`);
				case "finalized": throw new Error(`Cannot rollback operation in state ${operation.state}`);
				case "rolled_back": throw new Error(`Cannot rollback operation in state ${operation.state}`);
				case "init":
					await this.receiveOperationRepository.delete(operation.id);
					this.logger?.info("Receive operation cancelled", {
						operationId,
						reason: reason ?? "User cancelled receive operation"
					});
					return;
				case "prepared":
					await this.markAsRolledBack(operation, reason ?? "User cancelled receive operation");
					return;
				default: throw new Error(`Cannot rollback operation in unknown state`);
			}
		} finally {
			releaseLock();
		}
	}
};

//#endregion
//#region infra/MintAdapter.ts
/**
* Adapter for making HTTP requests to Cashu mints.
*
* All requests are rate-limited through the MintRequestProvider,
* sharing the same rate limits with other components (e.g., WalletService).
*/
var MintAdapter = class {
	cashuMints = {};
	requestProvider;
	authProviders = /* @__PURE__ */ new Map();
	constructor(requestProvider) {
		this.requestProvider = requestProvider;
	}
	/** Register an AuthProvider for a mint (NUT-21/22). Invalidates the cached Mint instance. */
	setAuthProvider(mintUrl, provider) {
		this.authProviders.set(mintUrl, provider);
		delete this.cashuMints[mintUrl];
	}
	/** Get the AuthProvider for a mint (if registered). */
	getAuthProvider(mintUrl) {
		return this.authProviders.get(mintUrl);
	}
	/** Remove the AuthProvider for a mint. Invalidates the cached Mint instance. */
	clearAuthProvider(mintUrl) {
		this.authProviders.delete(mintUrl);
		delete this.cashuMints[mintUrl];
	}
	async fetchMintInfo(mintUrl) {
		return await this.getCashuMint(mintUrl).getInfo();
	}
	async fetchKeysets(mintUrl) {
		return await this.getCashuMint(mintUrl).getKeySets();
	}
	async fetchKeysForId(mintUrl, id) {
		const { keysets } = await this.getCashuMint(mintUrl).getKeys(id);
		if (keysets.length !== 1 || !keysets[0]) throw new Error(`Expected 1 keyset for ${id}, got ${keysets.length}`);
		return keysets[0].keys;
	}
	getCashuMint(mintUrl) {
		if (!this.cashuMints[mintUrl]) {
			const requestFn = this.requestProvider.getRequestFn(mintUrl);
			const authProvider = this.authProviders.get(mintUrl);
			this.cashuMints[mintUrl] = new Mint(mintUrl, {
				customRequest: requestFn,
				authProvider
			});
		}
		return this.cashuMints[mintUrl];
	}
	async checkMintQuote(mintUrl, method, quoteId) {
		return await this.getCashuMint(mintUrl).checkMintQuote(method, quoteId);
	}
	async checkMeltQuote(mintUrl, quoteId) {
		return await this.getCashuMint(mintUrl).checkMeltQuoteBolt11(quoteId);
	}
	async checkMeltQuoteBolt12(mintUrl, quoteId) {
		return await this.getCashuMint(mintUrl).checkMeltQuoteBolt12(quoteId);
	}
	async checkMeltQuoteOnchain(mintUrl, quoteId) {
		return await this.getCashuMint(mintUrl).checkMeltQuoteOnchain(quoteId);
	}
	async checkMeltQuoteState(mintUrl, quoteId) {
		return (await this.checkMeltQuote(mintUrl, quoteId)).state;
	}
	async checkMeltQuoteBolt12State(mintUrl, quoteId) {
		return (await this.checkMeltQuoteBolt12(mintUrl, quoteId)).state;
	}
	async checkMeltQuoteOnchainState(mintUrl, quoteId) {
		return (await this.checkMeltQuoteOnchain(mintUrl, quoteId)).state;
	}
	async checkProofStates(mintUrl, Ys) {
		const cashuMint = this.getCashuMint(mintUrl);
		const payload = { Ys };
		return (await cashuMint.check(payload)).states;
	}
	async customMeltBolt11(mintUrl, proofsToSend, changeOutputs, quoteId) {
		const cashuMint = this.getCashuMint(mintUrl);
		const blindedMessages = changeOutputs.map((output) => output.blindedMessage);
		return cashuMint.meltBolt11({
			quote: quoteId,
			inputs: proofsToSend,
			outputs: blindedMessages
		});
	}
	async customMeltBolt12(mintUrl, proofsToSend, changeOutputs, quoteId) {
		const cashuMint = this.getCashuMint(mintUrl);
		const blindedMessages = changeOutputs.map((output) => output.blindedMessage);
		return cashuMint.meltBolt12({
			quote: quoteId,
			inputs: proofsToSend,
			outputs: blindedMessages
		});
	}
	async customMeltOnchain(mintUrl, proofsToSend, changeOutputs, quoteId, feeIndex) {
		const cashuMint = this.getCashuMint(mintUrl);
		const blindedMessages = changeOutputs.map((output) => output.blindedMessage);
		return cashuMint.meltOnchain({
			quote: quoteId,
			inputs: proofsToSend,
			outputs: blindedMessages,
			fee_index: feeIndex,
			prefer_async: true
		});
	}
};

//#endregion
//#region infra/RequestRateLimiter.ts
function stringifyJson$1(value, space) {
	const body = JSONInt.stringify(value, void 0, space);
	if (body === void 0) throw new TypeError("Failed to serialize JSON body");
	return body;
}
async function parseJsonResponse(response) {
	return JSONInt.parse(await response.text());
}
/**
* Token-bucket based request rate limiter that exposes a request-compatible API
* for the cashu-ts `_customRequest` parameter.
*
* - Token capacity determines max burst size.
* - Tokens refill continuously based on `refillPerMinute`.
* - Paths starting with any configured prefix are not throttled.
* - Requests are queued FIFO when tokens are exhausted.
*/
var RequestRateLimiter = class {
	capacity;
	refillPerMinute;
	tokens;
	lastRefillAt;
	bypassPathPrefixes;
	logger;
	queue = [];
	processingTimer = null;
	constructor(options) {
		this.capacity = Math.max(1, options?.capacity ?? 25);
		this.refillPerMinute = Math.max(1, options?.refillPerMinute ?? 25);
		this.tokens = this.capacity;
		this.lastRefillAt = Date.now();
		this.bypassPathPrefixes = options?.bypassPathPrefixes ?? [];
		this.logger = options?.logger;
	}
	/**
	* The request function compatible with cashu-ts's `request(options)` signature.
	* It uses the global fetch under the hood.
	*/
	request = async (options) => {
		const url = new URL(options.endpoint);
		if (this.shouldBypass(url.pathname)) return this.performFetch(options);
		await this.acquireToken();
		try {
			return await this.performFetch(options);
		} finally {
			this.scheduleProcessingIfNeeded();
		}
	};
	shouldBypass(pathname) {
		if (!this.bypassPathPrefixes.length) return false;
		return this.bypassPathPrefixes.some((p) => pathname.startsWith(p));
	}
	performFetch = async (options) => {
		const { endpoint, requestBody, headers, ...init } = options;
		const finalHeaders = new Headers({
			Accept: "application/json, text/plain, */*",
			...headers || {}
		});
		let body = void 0;
		if (requestBody !== void 0) {
			finalHeaders.set("Content-Type", "application/json");
			body = stringifyJson$1(requestBody);
		}
		this.logger?.debug("Mint request", {
			method: init.method || "GET",
			endpoint,
			requestBody: requestBody ? stringifyJson$1(requestBody, 2) : void 0
		});
		let response;
		try {
			response = await fetch(endpoint, {
				...init,
				headers: finalHeaders,
				body
			});
		} catch (err) {
			this.logger?.debug("Mint request network error", {
				endpoint,
				error: err instanceof Error ? err.message : String(err)
			});
			throw new NetworkError(err instanceof Error ? err.message : "Network request failed");
		}
		if (!response.ok) {
			let errorData = { error: "bad response" };
			try {
				errorData = await parseJsonResponse(response.clone());
			} catch {}
			this.logger?.debug("Mint response error", {
				endpoint,
				status: response.status,
				errorData: stringifyJson$1(errorData, 2)
			});
			if (response.status === 400 && errorData && typeof errorData.code === "number" && typeof errorData.detail === "string") {
				const { code, detail } = errorData;
				throw new MintOperationError(code, detail);
			}
			let errorMessage = "HTTP request failed";
			const anyErr = errorData;
			if (typeof anyErr?.error === "string") errorMessage = anyErr.error;
			else if (typeof anyErr?.detail === "string") errorMessage = anyErr.detail;
			throw new HttpResponseError(errorMessage, response.status);
		}
		try {
			const responseData = await parseJsonResponse(response);
			this.logger?.debug("Mint response success", {
				endpoint,
				status: response.status,
				responseData: stringifyJson$1(responseData, 2)
			});
			return responseData;
		} catch (err) {
			this.logger?.error("Failed to parse HTTP response", err);
			throw new HttpResponseError("bad response", response.status);
		}
	};
	acquireToken() {
		this.refillTokens();
		if (this.tokens >= 1) {
			this.tokens -= 1;
			this.logger?.debug("RateLimiter token granted immediately", {
				tokens: this.tokens,
				capacity: this.capacity
			});
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			this.queue.push(() => {
				resolve();
			});
			this.logger?.debug("Queued request due to empty bucket", { queueLength: this.queue.length });
			this.scheduleProcessingIfNeeded();
		});
	}
	scheduleProcessingIfNeeded() {
		if (this.processingTimer) return;
		const delayMs = this.msUntilNextToken();
		this.processingTimer = setTimeout(() => {
			this.processingTimer = null;
			this.processQueue();
		}, delayMs);
	}
	processQueue() {
		this.refillTokens();
		while (this.tokens >= 1 && this.queue.length > 0) {
			const next = this.queue.shift();
			if (!next) continue;
			this.tokens -= 1;
			try {
				next();
			} catch (err) {
				this.logger?.error("RateLimiter queue task error", err);
			}
		}
		if (this.queue.length > 0) this.scheduleProcessingIfNeeded();
	}
	refillTokens() {
		const now = Date.now();
		const elapsedMs = now - this.lastRefillAt;
		if (elapsedMs <= 0) return;
		const refill = elapsedMs * (this.refillPerMinute / 6e4);
		const newTokens = Math.min(this.capacity, this.tokens + refill);
		if (newTokens !== this.tokens) {
			this.tokens = newTokens;
			this.lastRefillAt = now;
		} else this.lastRefillAt = now;
	}
	msUntilNextToken() {
		this.refillTokens();
		if (this.tokens >= 1) return 0;
		const tokensPerMs = this.refillPerMinute / 6e4;
		const deficit = 1 - this.tokens;
		return Math.max(1, Math.ceil(deficit / tokensPerMs));
	}
};

//#endregion
//#region infra/MintRequestProvider.ts
/**
* Manages per-mint request rate limiters.
*
* This class provides a centralized way to share rate limiters across
* all components that need to make HTTP requests to mints (WalletService,
* MintAdapter, etc.).
*/
var MintRequestProvider = class {
	limiters = /* @__PURE__ */ new Map();
	options;
	constructor(options) {
		this.options = {
			capacity: options?.capacity ?? 20,
			refillPerMinute: options?.refillPerMinute ?? 20,
			bypassPathPrefixes: options?.bypassPathPrefixes ?? [],
			configForMint: options?.configForMint,
			logger: options?.logger
		};
	}
	/**
	* Get the request function for a specific mint.
	* Creates a new rate limiter if one doesn't exist for this mint.
	*/
	getRequestFn(mintUrl) {
		return this.getOrCreateLimiter(mintUrl).request;
	}
	/**
	* Get or create a rate limiter for a specific mint.
	*/
	getOrCreateLimiter(mintUrl) {
		const existing = this.limiters.get(mintUrl);
		if (existing) return existing;
		const perMintConfig = this.options.configForMint?.(mintUrl) ?? {};
		const limiter = new RequestRateLimiter({
			capacity: perMintConfig.capacity ?? this.options.capacity,
			refillPerMinute: perMintConfig.refillPerMinute ?? this.options.refillPerMinute,
			bypassPathPrefixes: perMintConfig.bypassPathPrefixes ?? this.options.bypassPathPrefixes,
			logger: this.options.logger?.child ? this.options.logger.child({
				module: "RequestRateLimiter",
				mintUrl
			}) : this.options.logger
		});
		this.limiters.set(mintUrl, limiter);
		return limiter;
	}
	/**
	* Clear the rate limiter for a specific mint.
	*/
	clearMint(mintUrl) {
		this.limiters.delete(mintUrl);
	}
	/**
	* Clear all rate limiters.
	*/
	clearAll() {
		this.limiters.clear();
	}
};

//#endregion
//#region infra/PollingTransport.ts
const SUPPORTED_POLLING_KINDS = new Set([
	"bolt11_mint_quote",
	"onchain_mint_quote",
	"bolt12_mint_quote",
	"bolt11_melt_quote",
	"bolt12_melt_quote",
	"onchain_melt_quote",
	"proof_state"
]);
var PollingTransport = class {
	logger;
	mintAdapter;
	options;
	listenersByMint = /* @__PURE__ */ new Map();
	schedByMint = /* @__PURE__ */ new Map();
	proofQueueByMint = /* @__PURE__ */ new Map();
	proofSetByMint = /* @__PURE__ */ new Map();
	yToSubsByMint = /* @__PURE__ */ new Map();
	subToYsByMint = /* @__PURE__ */ new Map();
	intervalByMint = /* @__PURE__ */ new Map();
	unsubscribedByMint = /* @__PURE__ */ new Map();
	paused = false;
	constructor(mintAdapter, options, logger) {
		this.logger = logger;
		this.mintAdapter = mintAdapter;
		this.options = { intervalMs: options?.intervalMs ?? 5e3 };
	}
	on(mintUrl, event, handler) {
		let map = this.listenersByMint.get(mintUrl);
		if (!map) {
			map = /* @__PURE__ */ new Map();
			this.listenersByMint.set(mintUrl, map);
		}
		let set = map.get(event);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			map.set(event, set);
		}
		if (!set.has(handler)) set.add(handler);
		if (event === "open") {
			if (!((map.get("open")?.size ?? 0) > 0)) queueMicrotask(() => {
				try {
					handler({ type: "open" });
				} catch {}
			});
		}
		this.ensureScheduler(mintUrl);
	}
	send(mintUrl, req) {
		if (req.method === "subscribe") {
			const params = req.params;
			const subId = params.subId;
			if (!this.isSupportedPollingKind(params.kind)) {
				this.logger?.error("PollingTransport: unsupported subscription kind", {
					mintUrl,
					kind: params.kind,
					req
				});
				const resp = {
					jsonrpc: "2.0",
					error: {
						code: -32602,
						message: `Unsupported subscription kind: ${String(params.kind)}`
					},
					id: req.id
				};
				this.emit(mintUrl, "message", { data: JSON.stringify(resp) });
				return;
			}
			const scheduler = this.ensureScheduler(mintUrl);
			if (params.kind === "proof_state") {
				const ys = params.filters || [];
				if (!ys.length) this.logger?.error("PollingTransport: subscribe proof_state with no filters", {
					mintUrl,
					req
				});
				let yToSubs = this.yToSubsByMint.get(mintUrl);
				if (!yToSubs) {
					yToSubs = /* @__PURE__ */ new Map();
					this.yToSubsByMint.set(mintUrl, yToSubs);
				}
				let subToYs = this.subToYsByMint.get(mintUrl);
				if (!subToYs) {
					subToYs = /* @__PURE__ */ new Map();
					this.subToYsByMint.set(mintUrl, subToYs);
				}
				let q = this.proofQueueByMint.get(mintUrl);
				if (!q) {
					q = [];
					this.proofQueueByMint.set(mintUrl, q);
				}
				let set = this.proofSetByMint.get(mintUrl);
				if (!set) {
					set = /* @__PURE__ */ new Set();
					this.proofSetByMint.set(mintUrl, set);
				}
				let subYs = subToYs.get(subId);
				if (!subYs) {
					subYs = /* @__PURE__ */ new Set();
					subToYs.set(subId, subYs);
				}
				for (const y of ys) {
					subYs.add(y);
					let subs = yToSubs.get(y);
					if (!subs) {
						subs = /* @__PURE__ */ new Set();
						yToSubs.set(y, subs);
					}
					subs.add(subId);
					if (!set.has(y)) {
						set.add(y);
						q.push(y);
					}
				}
				if (!scheduler.hasProofBatchTask) {
					scheduler.queue.push({
						kind: "proof_state",
						batch: true
					});
					scheduler.hasProofBatchTask = true;
				}
			} else {
				const filter = params.filters[0];
				if (!filter) {
					this.logger?.error("PollingTransport: subscribe with no filter", {
						mintUrl,
						req
					});
					return;
				}
				scheduler.queue.push({
					subId,
					kind: params.kind,
					filter
				});
			}
			const resp = {
				jsonrpc: "2.0",
				result: {
					status: "OK",
					subId
				},
				id: req.id
			};
			this.emit(mintUrl, "message", { data: JSON.stringify(resp) });
			this.maybeRun(mintUrl);
			return;
		}
		if (req.method === "unsubscribe") {
			const subId = req.params.subId;
			const scheduler = this.ensureScheduler(mintUrl);
			scheduler.queue = scheduler.queue.filter((t) => t.subId !== subId);
			let unsubscribed = this.unsubscribedByMint.get(mintUrl);
			if (!unsubscribed) {
				unsubscribed = /* @__PURE__ */ new Set();
				this.unsubscribedByMint.set(mintUrl, unsubscribed);
			}
			unsubscribed.add(subId);
			const subToYs = this.subToYsByMint.get(mintUrl);
			const yToSubs = this.yToSubsByMint.get(mintUrl);
			const q = this.proofQueueByMint.get(mintUrl);
			const set = this.proofSetByMint.get(mintUrl);
			if (subToYs && yToSubs) {
				const ys = subToYs.get(subId);
				if (ys) {
					for (const y of ys) {
						const subs = yToSubs.get(y);
						if (subs) {
							subs.delete(subId);
							if (subs.size === 0) {
								yToSubs.delete(y);
								if (set) set.delete(y);
								if (q) {
									const idx = q.indexOf(y);
									if (idx >= 0) q.splice(idx, 1);
								}
							}
						}
					}
					subToYs.delete(subId);
				}
				if (yToSubs.size === 0 && scheduler.hasProofBatchTask) {
					scheduler.queue = scheduler.queue.filter((t) => !(t.kind === "proof_state" && t.batch));
					scheduler.hasProofBatchTask = false;
				}
			}
			return;
		}
	}
	closeAll() {
		this.schedByMint.clear();
		this.listenersByMint.clear();
		this.proofQueueByMint.clear();
		this.proofSetByMint.clear();
		this.yToSubsByMint.clear();
		this.subToYsByMint.clear();
		this.intervalByMint.clear();
		this.unsubscribedByMint.clear();
	}
	closeMint(mintUrl) {
		this.schedByMint.delete(mintUrl);
		this.listenersByMint.delete(mintUrl);
		this.proofQueueByMint.delete(mintUrl);
		this.proofSetByMint.delete(mintUrl);
		this.yToSubsByMint.delete(mintUrl);
		this.subToYsByMint.delete(mintUrl);
		this.intervalByMint.delete(mintUrl);
		this.unsubscribedByMint.delete(mintUrl);
	}
	pause() {
		this.paused = true;
	}
	resume() {
		this.paused = false;
		for (const mintUrl of this.schedByMint.keys()) this.maybeRun(mintUrl);
	}
	/**
	* Set a custom polling interval for a specific mint.
	* If not set, the default interval from constructor options is used.
	*/
	setIntervalForMint(mintUrl, intervalMs) {
		this.intervalByMint.set(mintUrl, intervalMs);
	}
	/**
	* Get the polling interval for a mint (per-mint or default).
	*/
	getIntervalForMint(mintUrl) {
		return this.intervalByMint.get(mintUrl) ?? this.options.intervalMs;
	}
	isSupportedPollingKind(kind) {
		return typeof kind === "string" && SUPPORTED_POLLING_KINDS.has(kind);
	}
	ensureScheduler(mintUrl) {
		let s = this.schedByMint.get(mintUrl);
		if (!s) {
			s = {
				nextAllowedAt: 0,
				queue: [],
				running: false,
				hasProofBatchTask: false
			};
			this.schedByMint.set(mintUrl, s);
			if (!this.proofQueueByMint.get(mintUrl)) this.proofQueueByMint.set(mintUrl, []);
			if (!this.proofSetByMint.get(mintUrl)) this.proofSetByMint.set(mintUrl, /* @__PURE__ */ new Set());
			if (!this.yToSubsByMint.get(mintUrl)) this.yToSubsByMint.set(mintUrl, /* @__PURE__ */ new Map());
			if (!this.subToYsByMint.get(mintUrl)) this.subToYsByMint.set(mintUrl, /* @__PURE__ */ new Map());
		}
		return s;
	}
	async maybeRun(mintUrl) {
		if (this.paused) return;
		const s = this.ensureScheduler(mintUrl);
		if (s.running) return;
		if (Date.now() < s.nextAllowedAt) return;
		if (s.queue.length === 0) return;
		s.running = true;
		const task = s.queue.shift();
		try {
			await this.performTask(mintUrl, task);
			const unsubscribed = this.unsubscribedByMint.get(mintUrl);
			if (task.subId && unsubscribed?.has(task.subId)) unsubscribed.delete(task.subId);
			else s.queue.push(task);
		} catch (err) {
			this.logger?.error("Polling task error", {
				mintUrl,
				err
			});
		} finally {
			s.nextAllowedAt = Date.now() + this.getIntervalForMint(mintUrl);
			s.running = false;
			const delay = Math.max(0, s.nextAllowedAt - Date.now());
			setTimeout(() => {
				this.maybeRun(mintUrl);
			}, delay);
		}
	}
	async performTask(mintUrl, task) {
		if (task.kind === "proof_state" && task.batch) {
			const yToSubs = this.yToSubsByMint.get(mintUrl) ?? /* @__PURE__ */ new Map();
			const queue = this.proofQueueByMint.get(mintUrl) ?? [];
			if (queue.length === 0 || yToSubs.size === 0) return;
			const selected = [];
			const selectedSet = /* @__PURE__ */ new Set();
			let remaining = queue.length;
			while (selected.length < 100 && remaining > 0 && queue.length > 0) {
				remaining--;
				const y = queue.shift();
				const subs = yToSubs.get(y);
				if (subs && subs.size > 0 && !selectedSet.has(y)) {
					selected.push(y);
					selectedSet.add(y);
					queue.push(y);
				} else if (subs && subs.size > 0) continue;
				else {
					const set = this.proofSetByMint.get(mintUrl);
					if (set) set.delete(y);
				}
			}
			if (selected.length === 0) return;
			const results = await this.mintAdapter.checkProofStates(mintUrl, selected);
			for (let i = 0; i < results.length; i++) {
				const payload = results[i];
				const y = (payload && typeof payload.Y === "string" ? payload.Y : void 0) ?? selected[i] ?? "";
				if (!y) continue;
				const subs = yToSubs.get(y);
				if (!subs) continue;
				for (const subId of subs.values()) {
					const notification = {
						jsonrpc: "2.0",
						method: "subscribe",
						params: {
							subId,
							payload
						}
					};
					this.emit(mintUrl, "message", { data: JSON.stringify(notification) });
				}
			}
			return;
		}
		let payload;
		switch (task.kind) {
			case "bolt11_mint_quote":
				payload = await this.mintAdapter.checkMintQuote(mintUrl, "bolt11", task.filter);
				break;
			case "onchain_mint_quote":
				payload = await this.mintAdapter.checkMintQuote(mintUrl, "onchain", task.filter);
				break;
			case "bolt12_mint_quote":
				payload = await this.mintAdapter.checkMintQuote(mintUrl, "bolt12", task.filter);
				break;
			case "bolt11_melt_quote":
				payload = await this.mintAdapter.checkMeltQuoteState(mintUrl, task.filter);
				break;
			case "bolt12_melt_quote":
				payload = await this.mintAdapter.checkMeltQuoteBolt12State(mintUrl, task.filter);
				break;
			case "onchain_melt_quote":
				payload = await this.mintAdapter.checkMeltQuoteOnchain(mintUrl, task.filter);
				break;
			default: throw new Error(`Unsupported polling task kind: ${String(task.kind)}`);
		}
		const notification = {
			jsonrpc: "2.0",
			method: "subscribe",
			params: {
				subId: task.subId,
				payload
			}
		};
		this.emit(mintUrl, "message", { data: JSON.stringify(notification) });
	}
	emit(mintUrl, event, evt) {
		const set = this.listenersByMint.get(mintUrl)?.get(event);
		if (!set) return;
		for (const handler of set.values()) try {
			handler(evt);
		} catch {}
	}
};

//#endregion
//#region infra/WsConnectionManager.ts
var WsConnectionManager = class {
	sockets = /* @__PURE__ */ new Map();
	isOpenByMint = /* @__PURE__ */ new Map();
	sendQueueByMint = /* @__PURE__ */ new Map();
	logger;
	listenersByMint = /* @__PURE__ */ new Map();
	reconnectAttemptsByMint = /* @__PURE__ */ new Map();
	reconnectTimeoutByMint = /* @__PURE__ */ new Map();
	options;
	paused = false;
	constructor(wsFactory, logger, options) {
		this.wsFactory = wsFactory;
		this.logger = logger;
		this.options = { disableReconnect: options?.disableReconnect ?? false };
	}
	buildWsUrl(baseMintUrl) {
		const url = new URL(baseMintUrl);
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
		url.pathname = `${url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname}/v1/ws`;
		return url.toString();
	}
	ensureSocket(mintUrl) {
		const existing = this.sockets.get(mintUrl);
		if (existing) return existing;
		const wsUrl = this.buildWsUrl(mintUrl);
		const socket = this.wsFactory(wsUrl);
		this.sockets.set(mintUrl, socket);
		this.isOpenByMint.set(mintUrl, false);
		const onOpen = () => {
			this.isOpenByMint.set(mintUrl, true);
			const pending = this.reconnectTimeoutByMint.get(mintUrl);
			if (pending) {
				clearTimeout(pending);
				this.reconnectTimeoutByMint.delete(mintUrl);
			}
			this.reconnectAttemptsByMint.delete(mintUrl);
			const queue = this.sendQueueByMint.get(mintUrl);
			if (queue && queue.length > 0) {
				this.logger?.debug("Flushing queued messages", {
					mintUrl,
					count: queue.length
				});
				for (const payload of queue) try {
					socket.send(payload);
					this.logger?.debug("Sent queued message", {
						mintUrl,
						payloadLength: payload.length
					});
				} catch (err) {
					this.logger?.error("WS send error while flushing queue", {
						mintUrl,
						err
					});
				}
				this.sendQueueByMint.set(mintUrl, []);
			}
			this.logger?.info("WS opened", { mintUrl });
		};
		const onError = (err) => {
			this.logger?.error("WS error", {
				mintUrl,
				err
			});
		};
		const onClose = () => {
			this.logger?.info("WS closed", { mintUrl });
			this.sockets.delete(mintUrl);
			this.isOpenByMint.set(mintUrl, false);
			this.sendQueueByMint.delete(mintUrl);
			if (!this.paused && !this.options.disableReconnect) {
				const hasListeners = this.listenersByMint.get(mintUrl);
				if (hasListeners && Array.from(hasListeners.values()).some((s) => s.size > 0)) this.scheduleReconnect(mintUrl);
			}
		};
		socket.addEventListener("open", onOpen);
		socket.addEventListener("error", onError);
		socket.addEventListener("close", onClose);
		const map = this.listenersByMint.get(mintUrl);
		if (map) for (const [type, set] of map.entries()) for (const listener of set.values()) socket.addEventListener(type, listener);
		return socket;
	}
	scheduleReconnect(mintUrl) {
		if (this.reconnectTimeoutByMint.get(mintUrl)) return;
		const attempt = (this.reconnectAttemptsByMint.get(mintUrl) ?? 0) + 1;
		this.reconnectAttemptsByMint.set(mintUrl, attempt);
		const delayMs = Math.min(3e4, 1e3 * 2 ** Math.min(6, attempt - 1));
		this.logger?.info("Scheduling WS reconnect", {
			mintUrl,
			attempt,
			delayMs
		});
		const timeoutId = setTimeout(() => {
			this.reconnectTimeoutByMint.delete(mintUrl);
			try {
				this.ensureSocket(mintUrl);
			} catch (err) {
				this.logger?.error("WS reconnect attempt failed to create socket", {
					mintUrl,
					err
				});
			}
		}, delayMs);
		this.reconnectTimeoutByMint.set(mintUrl, timeoutId);
	}
	on(mintUrl, type, listener) {
		const socketExists = this.sockets.has(mintUrl);
		let map = this.listenersByMint.get(mintUrl);
		if (!map) {
			map = /* @__PURE__ */ new Map();
			this.listenersByMint.set(mintUrl, map);
		}
		let set = map.get(type);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			map.set(type, set);
		}
		if (set.has(listener)) return;
		set.add(listener);
		const socket = this.ensureSocket(mintUrl);
		if (socketExists) socket.addEventListener(type, listener);
	}
	off(mintUrl, type, listener) {
		this.ensureSocket(mintUrl).removeEventListener(type, listener);
		(this.listenersByMint.get(mintUrl)?.get(type))?.delete(listener);
	}
	send(mintUrl, message) {
		const socket = this.ensureSocket(mintUrl);
		const payload = typeof message === "string" ? message : JSON.stringify(message);
		if (this.isOpenByMint.get(mintUrl)) {
			try {
				socket.send(payload);
				this.logger?.debug("Sent message immediately (socket open)", {
					mintUrl,
					payloadLength: payload.length
				});
			} catch (err) {
				this.logger?.error("WS send error", {
					mintUrl,
					err
				});
			}
			return;
		}
		let queue = this.sendQueueByMint.get(mintUrl);
		if (!queue) {
			queue = [];
			this.sendQueueByMint.set(mintUrl, queue);
		}
		queue.push(payload);
		this.logger?.debug("Queued message (socket not open)", {
			mintUrl,
			queueLength: queue.length,
			payloadLength: payload.length
		});
	}
	closeAll() {
		for (const [mintUrl, socket] of this.sockets.entries()) try {
			socket.close(1e3, "Normal Closure");
		} catch (err) {
			this.logger?.warn("Error while closing WS", {
				mintUrl,
				err
			});
		}
		this.sockets.clear();
		this.isOpenByMint.clear();
		this.sendQueueByMint.clear();
		for (const timeout of this.reconnectTimeoutByMint.values()) clearTimeout(timeout);
		this.reconnectTimeoutByMint.clear();
		this.reconnectAttemptsByMint.clear();
	}
	closeMint(mintUrl) {
		const socket = this.sockets.get(mintUrl);
		if (socket) {
			try {
				socket.close(1e3, "Mint closed");
				this.logger?.debug("WS closed for mint", { mintUrl });
			} catch (err) {
				this.logger?.warn("Error while closing WS for mint", {
					mintUrl,
					err
				});
			}
			this.sockets.delete(mintUrl);
		}
		this.isOpenByMint.delete(mintUrl);
		this.sendQueueByMint.delete(mintUrl);
		this.listenersByMint.delete(mintUrl);
		const timeout = this.reconnectTimeoutByMint.get(mintUrl);
		if (timeout) {
			clearTimeout(timeout);
			this.reconnectTimeoutByMint.delete(mintUrl);
		}
		this.reconnectAttemptsByMint.delete(mintUrl);
		this.logger?.info("WsConnectionManager closed mint", { mintUrl });
	}
	pause() {
		this.paused = true;
		for (const timeout of this.reconnectTimeoutByMint.values()) clearTimeout(timeout);
		this.reconnectTimeoutByMint.clear();
		this.reconnectAttemptsByMint.clear();
		for (const [mintUrl, socket] of this.sockets.entries()) try {
			socket.close(1e3, "Paused");
			this.logger?.debug("WS closed for pause", { mintUrl });
		} catch (err) {
			this.logger?.warn("Error while closing WS for pause", {
				mintUrl,
				err
			});
		}
		this.sockets.clear();
		this.isOpenByMint.clear();
		this.sendQueueByMint.clear();
		this.logger?.info("WsConnectionManager paused");
	}
	resume() {
		this.paused = false;
		for (const [mintUrl, listenerMap] of this.listenersByMint.entries()) if (Array.from(listenerMap.values()).some((s) => s.size > 0)) try {
			this.ensureSocket(mintUrl);
			this.logger?.debug("WS reconnecting after resume", { mintUrl });
		} catch (err) {
			this.logger?.error("Failed to reconnect WS after resume", {
				mintUrl,
				err
			});
		}
		this.logger?.info("WsConnectionManager resumed");
	}
};

//#endregion
//#region infra/WsTransport.ts
var WsTransport = class {
	ws;
	constructor(wsFactoryOrManager, logger, options) {
		this.ws = typeof wsFactoryOrManager === "function" ? new WsConnectionManager(wsFactoryOrManager, logger, options) : wsFactoryOrManager;
	}
	on(mintUrl, event, handler) {
		this.ws.on(mintUrl, event, handler);
	}
	send(mintUrl, req) {
		this.ws.send(mintUrl, req);
	}
	closeAll() {
		this.ws.closeAll();
	}
	closeMint(mintUrl) {
		this.ws.closeMint(mintUrl);
	}
	pause() {
		this.ws.pause();
	}
	resume() {
		this.ws.resume();
	}
};

//#endregion
//#region infra/HybridTransport.ts
/**
* HybridTransport runs both WebSocket and polling transports in parallel.
*
* - WebSocket: Primary transport for real-time updates. One-shot per mint—no reconnection on failure.
* - Polling: Backup transport always running. Starts slow (20s), speeds up (5s) if WS fails.
* - Deduplication: Both transports emit the same notifications, so we deduplicate at this layer.
*/
var HybridTransport = class {
	wsTransport;
	pollingTransport;
	logger;
	options;
	wsFailedByMint = /* @__PURE__ */ new Set();
	wsConnectedByMint = /* @__PURE__ */ new Set();
	hasInternalHandlersByMint = /* @__PURE__ */ new Set();
	lastNotificationSignatureByKey = /* @__PURE__ */ new Map();
	hasEmittedOpenByMint = /* @__PURE__ */ new Set();
	paused = false;
	constructor(wsFactory, mintAdapter, options, logger) {
		this.logger = logger;
		this.options = {
			slowPollingIntervalMs: options?.slowPollingIntervalMs ?? 2e4,
			fastPollingIntervalMs: options?.fastPollingIntervalMs ?? 5e3
		};
		this.wsTransport = new WsTransport(wsFactory, logger, { disableReconnect: true });
		this.pollingTransport = new PollingTransport(mintAdapter, { intervalMs: this.options.slowPollingIntervalMs }, logger);
	}
	on(mintUrl, event, handler) {
		const wrappedHandler = this.createDedupeHandler(mintUrl, event, handler);
		this.wsTransport.on(mintUrl, event, wrappedHandler);
		this.pollingTransport.on(mintUrl, event, wrappedHandler);
		this.ensureInternalHandlers(mintUrl);
	}
	send(mintUrl, req) {
		this.wsTransport.send(mintUrl, req);
		this.pollingTransport.send(mintUrl, req);
	}
	closeAll() {
		this.wsTransport.closeAll();
		this.pollingTransport.closeAll();
		this.wsFailedByMint.clear();
		this.wsConnectedByMint.clear();
		this.hasInternalHandlersByMint.clear();
		this.lastNotificationSignatureByKey.clear();
		this.hasEmittedOpenByMint.clear();
	}
	closeMint(mintUrl) {
		this.wsTransport.closeMint(mintUrl);
		this.pollingTransport.closeMint(mintUrl);
		this.wsFailedByMint.delete(mintUrl);
		this.wsConnectedByMint.delete(mintUrl);
		this.hasInternalHandlersByMint.delete(mintUrl);
		this.hasEmittedOpenByMint.delete(mintUrl);
		for (const key of this.lastNotificationSignatureByKey.keys()) if (key.startsWith(`${mintUrl}::`)) this.lastNotificationSignatureByKey.delete(key);
	}
	pause() {
		this.paused = true;
		this.wsTransport.pause();
		this.pollingTransport.pause();
		this.wsFailedByMint.clear();
		this.wsConnectedByMint.clear();
		this.hasEmittedOpenByMint.clear();
	}
	resume() {
		this.paused = false;
		this.wsTransport.resume();
		this.pollingTransport.resume();
	}
	/**
	* Register internal handlers on WsTransport to track connection state.
	* Only registers once per mint.
	*/
	ensureInternalHandlers(mintUrl) {
		if (this.hasInternalHandlersByMint.has(mintUrl)) return;
		this.hasInternalHandlersByMint.add(mintUrl);
		this.wsTransport.on(mintUrl, "open", () => {
			this.wsConnectedByMint.add(mintUrl);
		});
		this.wsTransport.on(mintUrl, "close", () => {
			this.handleWsFailure(mintUrl);
		});
	}
	/**
	* Handle WS failure - mark as failed and speed up polling.
	*/
	handleWsFailure(mintUrl) {
		if (this.paused) return;
		if (this.wsFailedByMint.has(mintUrl)) return;
		this.wsFailedByMint.add(mintUrl);
		this.updatePollingInterval(mintUrl);
		this.logger?.info("HybridTransport: WS failed, polling will compensate", { mintUrl });
	}
	/**
	* Speed up polling for a mint after WS failure.
	*/
	updatePollingInterval(mintUrl) {
		this.pollingTransport.setIntervalForMint(mintUrl, this.options.fastPollingIntervalMs);
	}
	/**
	* Create a handler wrapper that deduplicates events.
	*/
	createDedupeHandler(mintUrl, event, originalHandler) {
		return (evt) => {
			if (event === "open") {
				if (this.hasEmittedOpenByMint.has(mintUrl)) return;
				this.hasEmittedOpenByMint.add(mintUrl);
				originalHandler(evt);
				return;
			}
			if (event === "close" || event === "error") {
				originalHandler(evt);
				return;
			}
			try {
				const data = typeof evt.data === "string" ? evt.data : evt.data?.toString?.();
				if (!data) {
					originalHandler(evt);
					return;
				}
				const parsed = JSON.parse(data);
				if (parsed.method !== "subscribe") {
					originalHandler(evt);
					return;
				}
				const signature = this.getNotificationSignature(parsed.params?.payload);
				if (signature === void 0) {
					originalHandler(evt);
					return;
				}
				const key = this.getStateKey(mintUrl, parsed);
				if (this.lastNotificationSignatureByKey.get(key) === signature) return;
				this.lastNotificationSignatureByKey.set(key, signature);
				originalHandler(evt);
			} catch {
				originalHandler(evt);
			}
		};
	}
	/**
	* Generate a deduplication key for a notification.
	* Includes mintUrl, subId, and identifier (Y for proofs, quote for quotes).
	*/
	getStateKey(mintUrl, notification) {
		const subId = notification.params?.subId ?? "";
		const payload = notification.params?.payload;
		return `${mintUrl}::${subId}::${payload?.Y ?? payload?.quote ?? ""}`;
	}
	getNotificationSignature(payload) {
		if (!payload) return void 0;
		const expirySignature = this.getExpirySignature(payload);
		if (payload.amount_paid !== void 0 && payload.amount_issued !== void 0) try {
			return `${Amount$1.from(payload.amount_paid).toString()}:${Amount$1.from(payload.amount_issued).toString()}:${expirySignature}`;
		} catch {
			return;
		}
		if (payload.state !== void 0) return `${JSON.stringify(payload.state)}:${expirySignature}`;
	}
	getExpirySignature(payload) {
		if (typeof payload.expiry !== "number") return "no-expiry";
		const status = payload.expiry * 1e3 <= Date.now() ? "expired" : "active";
		return `${payload.expiry}:${status}`;
	}
};

//#endregion
//#region infra/SubscriptionManager.ts
var SubscriptionManager = class {
	nextIdByMint = /* @__PURE__ */ new Map();
	subscriptions = /* @__PURE__ */ new Map();
	activeByMint = /* @__PURE__ */ new Map();
	pendingSubscribeByMint = /* @__PURE__ */ new Map();
	transportByMint = /* @__PURE__ */ new Map();
	logger;
	messageHandlerByMint = /* @__PURE__ */ new Map();
	openHandlerByMint = /* @__PURE__ */ new Map();
	hasOpenedByMint = /* @__PURE__ */ new Map();
	wsFactory;
	mintAdapter;
	options;
	paused = false;
	constructor(wsFactoryOrManager, mintAdapter, logger, options) {
		this.logger = logger;
		this.mintAdapter = mintAdapter;
		this.options = {
			slowPollingIntervalMs: options?.slowPollingIntervalMs ?? 2e4,
			fastPollingIntervalMs: options?.fastPollingIntervalMs ?? 5e3
		};
		if (typeof wsFactoryOrManager === "function") this.wsFactory = wsFactoryOrManager;
		else {
			const injected = wsFactoryOrManager;
			this.transportByMint.set("*", injected);
		}
	}
	/**
	* Get or create a transport for a mint.
	*
	* Uses HybridTransport (WS + polling in parallel) when a wsFactory is available.
	* HybridTransport handles WS failures gracefully by speeding up polling, so we
	* don't need to check mint capabilities or WebSocket availability upfront.
	*
	* Falls back to pure PollingTransport only when no wsFactory is provided.
	*/
	getTransport(mintUrl) {
		const injected = this.transportByMint.get("*");
		if (injected) return injected;
		let t = this.transportByMint.get(mintUrl);
		if (t) return t;
		if (this.wsFactory) t = new HybridTransport(this.wsFactory, this.mintAdapter, {
			slowPollingIntervalMs: this.options.slowPollingIntervalMs,
			fastPollingIntervalMs: this.options.fastPollingIntervalMs
		}, this.logger);
		else t = new PollingTransport(this.mintAdapter, { intervalMs: this.options.fastPollingIntervalMs }, this.logger);
		this.transportByMint.set(mintUrl, t);
		return t;
	}
	getNextId(mintUrl) {
		const next = (this.nextIdByMint.get(mintUrl) ?? 0) + 1;
		this.nextIdByMint.set(mintUrl, next);
		return next;
	}
	ensureMessageListener(mintUrl) {
		if (this.messageHandlerByMint.has(mintUrl)) return;
		const handler = (evt) => {
			try {
				const data = typeof evt.data === "string" ? evt.data : evt.data?.toString?.();
				if (!data) return;
				const parsed = JSON.parse(data);
				this.logger?.debug("Received WS message", {
					mintUrl,
					hasMethod: "method" in parsed,
					method: "method" in parsed ? parsed.method : void 0,
					hasId: "id" in parsed,
					id: "id" in parsed ? parsed.id : void 0,
					hasResult: "result" in parsed,
					hasError: "error" in parsed
				});
				if ("method" in parsed && parsed.method === "subscribe") {
					const subId = parsed.params?.subId;
					const active = subId ? this.subscriptions.get(subId) : void 0;
					if (active) for (const cb of active.callbacks) Promise.resolve(cb(parsed.params.payload)).catch((err) => this.logger?.error("Subscription callback error", {
						mintUrl,
						subId,
						err
					}));
				} else if ("error" in parsed && parsed.error) {
					const resp = parsed;
					const respId = Number(resp.id);
					const err = resp.error;
					const pendingMap = this.pendingSubscribeByMint.get(mintUrl);
					const maybeSubId = Number.isFinite(respId) && pendingMap ? pendingMap.get(respId) : void 0;
					if (maybeSubId) {
						pendingMap?.delete(respId);
						this.logger?.error("Subscribe request rejected", {
							mintUrl,
							id: resp.id,
							subId: maybeSubId,
							code: err.code,
							message: err.message
						});
					} else this.logger?.error("WS request error", {
						mintUrl,
						id: resp.id,
						code: err.code,
						message: err.message
					});
				} else if ("result" in parsed && parsed.result) {
					const resp = parsed;
					const respId = Number(resp.id);
					const pendingMap = this.pendingSubscribeByMint.get(mintUrl);
					if (Number.isFinite(respId) && pendingMap && pendingMap.has(respId)) {
						const subId = pendingMap.get(respId);
						pendingMap.delete(respId);
						this.logger?.info("Subscribe request accepted", {
							mintUrl,
							id: resp.id,
							subId: subId || resp.result?.subId
						});
					} else this.logger?.debug("Unmatched subscribe response", {
						mintUrl,
						id: resp.id,
						respId,
						hasPendingMap: !!pendingMap,
						pendingMapSize: pendingMap?.size ?? 0
					});
				}
			} catch (err) {
				this.logger?.error("WS message handling error", {
					mintUrl,
					err
				});
			}
		};
		this.getTransport(mintUrl).on(mintUrl, "message", handler);
		this.messageHandlerByMint.set(mintUrl, handler);
		const onOpen = (_evt) => {
			try {
				if (this.hasOpenedByMint.get(mintUrl) === true) {
					this.logger?.info("WS open detected, re-subscribing active subscriptions", { mintUrl });
					this.reSubscribeMint(mintUrl);
				} else {
					this.hasOpenedByMint.set(mintUrl, true);
					this.logger?.info("WS open detected, initial open - skipping re-subscribe", { mintUrl });
				}
			} catch (err) {
				this.logger?.error("Failed to handle open event", {
					mintUrl,
					err
				});
			}
		};
		this.getTransport(mintUrl).on(mintUrl, "open", onOpen);
		this.openHandlerByMint.set(mintUrl, onOpen);
	}
	async subscribe(mintUrl, kind, filters, onNotification) {
		if (!filters || filters.length === 0) throw new Error("filters must be a non-empty array");
		this.ensureMessageListener(mintUrl);
		const filtersKey = JSON.stringify([...filters].sort());
		for (const [existingSubId, existingSub] of this.subscriptions.entries()) if (existingSub.mintUrl === mintUrl && existingSub.kind === kind && JSON.stringify([...existingSub.filters].sort()) === filtersKey) {
			if (onNotification) {
				existingSub.callbacks.add(onNotification);
				this.logger?.debug("Reusing existing subscription", {
					mintUrl,
					kind,
					subId: existingSubId,
					filterCount: filters.length
				});
			}
			return {
				subId: existingSubId,
				unsubscribe: async () => {
					if (onNotification) this.removeCallback(existingSubId, onNotification);
					if (existingSub.callbacks.size === 0) await this.unsubscribe(mintUrl, existingSubId);
				}
			};
		}
		const id = this.getNextId(mintUrl);
		const subId = generateSubId();
		const req = {
			jsonrpc: "2.0",
			method: "subscribe",
			params: {
				kind,
				subId,
				filters
			},
			id
		};
		const active = {
			subId,
			mintUrl,
			kind,
			filters,
			callbacks: /* @__PURE__ */ new Set()
		};
		if (onNotification) active.callbacks.add(onNotification);
		this.subscriptions.set(subId, active);
		let set = this.activeByMint.get(mintUrl);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.activeByMint.set(mintUrl, set);
		}
		set.add(subId);
		let pendingById = this.pendingSubscribeByMint.get(mintUrl);
		if (!pendingById) {
			pendingById = /* @__PURE__ */ new Map();
			this.pendingSubscribeByMint.set(mintUrl, pendingById);
		}
		pendingById.set(id, subId);
		if (this.paused) {
			this.logger?.info("Subscription created while paused, will activate on resume", {
				mintUrl,
				kind,
				subId
			});
			return {
				subId,
				unsubscribe: async () => {
					await this.unsubscribe(mintUrl, subId);
				}
			};
		}
		const t = this.getTransport(mintUrl);
		this.logger?.debug("Sending subscribe request", {
			mintUrl,
			kind,
			subId,
			id,
			filterCount: filters.length
		});
		t.send(mintUrl, req);
		this.logger?.info("Subscribed to NUT-17", {
			mintUrl,
			kind,
			subId,
			filterCount: filters.length
		});
		return {
			subId,
			unsubscribe: async () => {
				await this.unsubscribe(mintUrl, subId);
			}
		};
	}
	addCallback(subId, cb) {
		const active = this.subscriptions.get(subId);
		if (!active) throw new Error("Subscription not found");
		active.callbacks.add(cb);
	}
	removeCallback(subId, cb) {
		const active = this.subscriptions.get(subId);
		if (!active) return;
		active.callbacks.delete(cb);
	}
	async unsubscribe(mintUrl, subId) {
		this.logger?.debug("SubscriptionManager: unsubscribe called", {
			mintUrl,
			subId,
			hasSubscription: this.subscriptions.has(subId),
			activeForMint: this.activeByMint.get(mintUrl)?.size ?? 0
		});
		const id = this.getNextId(mintUrl);
		const req = {
			jsonrpc: "2.0",
			method: "unsubscribe",
			params: { subId },
			id
		};
		const t = this.getTransport(mintUrl);
		this.logger?.debug("SubscriptionManager: sending unsubscribe to transport", {
			mintUrl,
			subId,
			requestId: id
		});
		t.send(mintUrl, req);
		this.subscriptions.delete(subId);
		const set = this.activeByMint.get(mintUrl);
		set?.delete(subId);
		this.logger?.info("Unsubscribed from NUT-17", {
			mintUrl,
			subId,
			remainingSubscriptions: this.subscriptions.size,
			remainingActiveForMint: set?.size ?? 0
		});
	}
	closeAll() {
		const seen = /* @__PURE__ */ new Set();
		for (const t of this.transportByMint.values()) {
			if (seen.has(t)) continue;
			seen.add(t);
			t.closeAll();
		}
		this.subscriptions.clear();
		this.activeByMint.clear();
		this.pendingSubscribeByMint.clear();
		this.hasOpenedByMint.clear();
	}
	closeMint(mintUrl) {
		this.logger?.info("Closing all subscriptions for mint", { mintUrl });
		const subIds = this.activeByMint.get(mintUrl);
		if (subIds) for (const subId of subIds) this.subscriptions.delete(subId);
		this.activeByMint.delete(mintUrl);
		this.pendingSubscribeByMint.delete(mintUrl);
		this.nextIdByMint.delete(mintUrl);
		this.messageHandlerByMint.delete(mintUrl);
		this.openHandlerByMint.delete(mintUrl);
		this.hasOpenedByMint.delete(mintUrl);
		const transport = this.transportByMint.get(mintUrl);
		if (transport) {
			transport.closeMint(mintUrl);
			this.transportByMint.delete(mintUrl);
		}
		this.logger?.info("SubscriptionManager closed mint", { mintUrl });
	}
	reSubscribeMint(mintUrl) {
		const set = this.activeByMint.get(mintUrl);
		if (!set || set.size === 0) return;
		for (const subId of set) {
			const active = this.subscriptions.get(subId);
			if (!active) continue;
			const id = this.getNextId(mintUrl);
			const req = {
				jsonrpc: "2.0",
				method: "subscribe",
				params: {
					kind: active.kind,
					subId: active.subId,
					filters: active.filters
				},
				id
			};
			let pendingById = this.pendingSubscribeByMint.get(mintUrl);
			if (!pendingById) {
				pendingById = /* @__PURE__ */ new Map();
				this.pendingSubscribeByMint.set(mintUrl, pendingById);
			}
			pendingById.set(id, subId);
			this.getTransport(mintUrl).send(mintUrl, req);
			this.logger?.info("Re-subscribed to NUT-17 after reconnect", {
				mintUrl,
				kind: active.kind,
				subId: active.subId,
				filterCount: active.filters.length
			});
		}
	}
	pause() {
		this.paused = true;
		const seen = /* @__PURE__ */ new Set();
		for (const t of this.transportByMint.values()) {
			if (seen.has(t)) continue;
			seen.add(t);
			t.pause();
		}
		this.logger?.info("SubscriptionManager paused");
	}
	resume() {
		this.paused = false;
		const seen = /* @__PURE__ */ new Set();
		for (const t of this.transportByMint.values()) {
			if (seen.has(t)) continue;
			seen.add(t);
			t.resume();
		}
		this.logger?.info("SubscriptionManager resumed");
	}
};

//#endregion
//#region infra/handlers/melt/MeltHandlerProvider.ts
/**
* Runtime registry for melt method handlers.
* Keeps wiring concerns out of the core melt domain.
*/
var MeltHandlerProvider = class {
	registry = {};
	constructor(initialHandlers) {
		if (initialHandlers) this.registerMany(initialHandlers);
	}
	register(method, handler) {
		this.set(method, handler);
	}
	registerMany(handlers) {
		for (const method of Object.keys(handlers)) {
			const handler = handlers[method];
			if (handler) this.set(method, handler);
		}
	}
	get(method) {
		const handler = this.registry[method];
		if (!handler) throw new Error(`No melt handler registered for method ${method}`);
		return handler;
	}
	getAll() {
		return this.registry;
	}
	set(method, handler) {
		this.registry[method] = handler;
	}
};

//#endregion
//#region infra/handlers/melt/QuoteMeltHandler.utils.ts
/**
* If the selected proof amount exceeds the required amount by this ratio (10%),
* we perform a swap first to get exact-amount proofs. This avoids sending
* significantly more value to the mint than needed, which could result in
* larger change amounts and potential privacy/fee implications.
*
* Example: If we need 100 sats but selected proofs total 115 sats,
* that's 1.15x (15% over) which exceeds 11/10, so we swap first.
*/
const SWAP_THRESHOLD_NUMERATOR = 11;
const SWAP_THRESHOLD_DENOMINATOR = 10;
/**
* Extract the send proof secrets from serialized swap output data.
* These are the secrets of proofs that were created during the swap
* and will be used as melt inputs.
*/
function getSwapSendSecrets(swapOutputData) {
	return deserializeOutputData(swapOutputData).send.map((o) => new TextDecoder().decode(o.secret));
}
/**
* Build a PAID execution result.
* Used when the melt completed successfully.
*/
function buildPaidResult(operation, finalizeResult) {
	return {
		status: "PAID",
		finalized: {
			...operation,
			state: "finalized",
			updatedAt: Date.now(),
			...finalizeResult
		}
	};
}
/**
* Build a PENDING execution result.
* Used when the melt is in-flight and awaiting confirmation.
*/
function buildPendingResult(operation) {
	return {
		status: "PENDING",
		pending: {
			...operation,
			state: "pending",
			updatedAt: Date.now()
		}
	};
}
/**
* Build a FAILED execution result with optional error message.
* Used when the melt failed and proofs need recovery.
*/
function buildFailedResult(operation, error) {
	return {
		status: "FAILED",
		failed: {
			...operation,
			state: "failed",
			updatedAt: Date.now(),
			error
		}
	};
}

//#endregion
//#region infra/handlers/melt/BaseQuoteMeltHandler.ts
var BaseQuoteMeltHandler = class {
	async createQuote(ctx) {
		return this.toCanonicalQuote(ctx.mintUrl, await this.createRemoteQuote(ctx));
	}
	async fetchRemoteQuote(ctx) {
		return this.toCanonicalQuote(ctx.quote.mintUrl, await this.fetchRemoteMeltQuote(ctx));
	}
	toCanonicalQuote(mintUrl, quote) {
		switch (this.method) {
			case "bolt11": return meltQuoteFromBolt11Response(mintUrl, quote);
			case "bolt12": return meltQuoteFromBolt12Response(mintUrl, quote);
			case "onchain": return meltQuoteFromOnchainResponse(mintUrl, quote);
			default: throw new Error(`Unsupported melt method ${String(this.method)}`);
		}
	}
	/**
	* Calculate change amount and effective fee from melt operation results.
	* These values are derived from the actual melt settlement, not from the quote.
	*
	* changeAmount: Sum of amounts from change proofs returned by the mint
	* effectiveFee: Actual fee paid = meltInputAmount - amount - changeAmount
	*/
	calculateSettlementAmounts(meltInputAmount, meltAmount, changeProofs) {
		const changeAmount = Amount$1.sum(changeProofs?.map((p) => p.amount) ?? []);
		return {
			changeAmount,
			effectiveFee: meltInputAmount.subtract(meltAmount).subtract(changeAmount)
		};
	}
	/**
	* Returns the amount of proofs that were actually sent to the melt call.
	* For swap melts this excludes proofs kept locally after the pre-swap.
	*/
	getMeltInputAmount(operation) {
		if (!operation.needsSwap) return operation.inputAmount;
		if (!operation.swapOutputData) throw new Error("Swap was required but swapOutputData is missing");
		return OutputData.sumOutputAmounts(deserializeOutputData(operation.swapOutputData).send);
	}
	/**
	* Prepare a bolt-backed melt operation.
	*
	* This method:
	* 1. Uses the canonical melt quote supplied by the quote lifecycle
	* 2. Selects proofs to cover the quote amount + fee reserve with input fees
	* 3. Determines if a pre-swap is needed (when selected amount >> required)
	* 4. Reserves the input proofs for this operation
	* 5. Creates blank outputs for receiving change
	*
	* @returns Prepared operation ready for execution
	*/
	async prepare(ctx) {
		const { mintUrl, id: operationId } = ctx.operation;
		ctx.logger?.debug(`Preparing ${this.method} melt operation`, {
			operationId,
			mintUrl
		});
		const quote = ctx.quote;
		assertSameUnit(quote.unit, ctx.operation.unit, `Melt quote ${quote.quote}`);
		const { amount } = quote;
		const fee_reserve = this.getFeeReserveForQuote(quote, ctx.operation);
		const quoteData = {
			quote: quote.quote,
			amount,
			fee_reserve,
			unit: quote.unit
		};
		const totalAmount = amount.add(fee_reserve);
		ctx.logger?.debug("Melt quote created", {
			operationId,
			quoteId: quote.quote,
			amount,
			fee_reserve,
			totalAmount
		});
		const selectedProofs = await ctx.proofService.selectProofsToSend(mintUrl, {
			amount: totalAmount,
			unit: ctx.operation.unit
		}, true);
		const selectedAmount = sumProofs(selectedProofs);
		if (selectedAmount.lessThan(totalAmount)) throw new ProofValidationError("Melt amount is not sufficient after fees");
		const swapThreshold = totalAmount.scaledBy(SWAP_THRESHOLD_NUMERATOR, SWAP_THRESHOLD_DENOMINATOR);
		const needsSwap = selectedAmount.greaterThanOrEqual(swapThreshold);
		ctx.logger?.debug("Proofs selected for melt", {
			operationId,
			selectedAmount,
			swapThreshold,
			proofCount: selectedProofs.length,
			needsSwap
		});
		if (!needsSwap) return this.prepareDirectMelt(ctx, quoteData, selectedProofs);
		return this.prepareSwapThenMelt(ctx, quoteData, totalAmount);
	}
	/**
	* Prepare a direct melt (no swap needed).
	* Used when selected proofs are close to the required amount.
	*/
	async prepareDirectMelt(ctx, quote, selectedProofs) {
		const { mintUrl, id: operationId } = ctx.operation;
		const { amount, fee_reserve } = quote;
		const inputSecrets = selectedProofs.map((p) => p.secret);
		const selectedAmount = sumProofs(selectedProofs);
		ctx.logger?.debug("Preparing direct melt (no swap)", {
			operationId,
			selectedAmount
		});
		await ctx.proofService.reserveProofs(mintUrl, inputSecrets, operationId, { unit: ctx.operation.unit });
		const blankOutputs = await this.createChangeOutputs(amount, selectedAmount, ctx);
		ctx.logger?.info("Direct melt prepared", {
			operationId,
			quoteId: quote.quote,
			amount,
			fee_reserve,
			inputAmount: selectedAmount
		});
		return {
			...ctx.operation,
			...ctx.operation.methodData,
			quoteId: quote.quote,
			unit: ctx.operation.unit,
			changeOutputData: serializeOutputData({
				keep: blankOutputs,
				send: []
			}),
			needsSwap: false,
			amount,
			fee_reserve,
			inputAmount: selectedAmount,
			inputProofSecrets: inputSecrets,
			swap_fee: Amount$1.zero(),
			state: "prepared"
		};
	}
	/**
	* Prepare a swap-then-melt operation.
	* Used when selected proofs significantly exceed the required amount.
	*/
	async prepareSwapThenMelt(ctx, quote, totalAmount) {
		const { mintUrl, id: operationId } = ctx.operation;
		const { amount, fee_reserve } = quote;
		ctx.logger?.debug("Preparing swap-then-melt", {
			operationId,
			totalAmount
		});
		const selectedProofs = await ctx.proofService.selectProofsToSend(mintUrl, {
			amount: totalAmount,
			unit: ctx.operation.unit
		}, true);
		const selectedAmount = sumProofs(selectedProofs);
		const inputSecrets = selectedProofs.map((p) => p.secret);
		const swapFee = ctx.wallet.getFeesForProofs(selectedProofs);
		const sendAmount = totalAmount;
		const requiredAmount = sendAmount.add(swapFee);
		if (selectedAmount.lessThan(requiredAmount)) throw new ProofValidationError("Melt amount is not sufficient after fees");
		const keepAmount = selectedAmount.subtract(requiredAmount);
		ctx.logger?.debug("Swap amounts calculated", {
			operationId,
			selectedAmount,
			sendAmount,
			keepAmount,
			swapFee
		});
		await ctx.proofService.reserveProofs(mintUrl, inputSecrets, operationId, { unit: ctx.operation.unit });
		const blankOutputs = await this.createChangeOutputs(amount, sendAmount, ctx);
		const swapOutputData = await ctx.proofService.createOutputsAndIncrementCounters(mintUrl, {
			keep: {
				amount: keepAmount,
				unit: ctx.operation.unit
			},
			send: {
				amount: sendAmount,
				unit: ctx.operation.unit
			}
		}, { includeFees: true });
		ctx.logger?.info("Swap-then-melt prepared", {
			operationId,
			quoteId: quote.quote,
			amount,
			fee_reserve,
			inputAmount: selectedAmount,
			swapFee
		});
		return {
			...ctx.operation,
			...ctx.operation.methodData,
			quoteId: quote.quote,
			unit: ctx.operation.unit,
			swapOutputData: serializeOutputData(swapOutputData),
			changeOutputData: serializeOutputData({
				keep: blankOutputs,
				send: []
			}),
			needsSwap: true,
			swap_fee: swapFee,
			amount,
			fee_reserve,
			inputAmount: selectedAmount,
			inputProofSecrets: inputSecrets,
			state: "prepared"
		};
	}
	/**
	* Create blank outputs to receive change from the melt operation.
	* The change is the difference between what we send and the quote amount.
	*/
	async createChangeOutputs(quoteAmount, sendAmount, ctx) {
		const changeDelta = sendAmount.subtract(quoteAmount);
		return ctx.proofService.createBlankOutputs(ctx.operation.mintUrl, {
			amount: changeDelta,
			unit: ctx.operation.unit
		});
	}
	/**
	* Execute the bolt11 melt operation.
	*
	* This method:
	* 1. Retrieves the reserved input proofs
	* 2. If swap is needed, performs the swap first to get exact-amount proofs
	* 3. Sends the melt request to the mint
	* 4. Handles the response (PAID → finalize, PENDING → wait, UNPAID → restore proofs)
	*/
	async execute(ctx) {
		const { quoteId, mintUrl, changeOutputData: serializedChangeOutputData, id: operationId } = ctx.operation;
		ctx.logger?.debug(`Executing ${this.method} melt`, {
			operationId,
			quoteId,
			needsSwap: ctx.operation.needsSwap
		});
		const inputProofs = await this.getInputProofs(ctx);
		const proofsToMelt = ctx.operation.needsSwap ? await this.executeSwap(ctx, inputProofs) : inputProofs;
		if (!ctx.operation.needsSwap) await ctx.proofService.setProofState(mintUrl, ctx.operation.inputProofSecrets, "inflight");
		ctx.logger?.debug("Sending melt request to mint", {
			operationId,
			quoteId,
			proofCount: proofsToMelt.length
		});
		const changeOutputData = deserializeOutputData(serializedChangeOutputData);
		const res = await this.executeMelt(ctx, proofsToMelt, changeOutputData.keep, quoteId);
		ctx.logger?.info("Melt execution completed", {
			operationId,
			quoteId,
			state: res.state
		});
		return this.handleMeltResponse(ctx, res, proofsToMelt);
	}
	/**
	* Handle the melt response and return the appropriate execution result.
	*/
	async handleMeltResponse(ctx, response, proofsToMelt) {
		const { mintUrl } = ctx.operation;
		const { state, change } = response;
		switch (state) {
			case "PAID": {
				const { amount: meltAmount } = ctx.operation;
				const meltInputAmount = this.getMeltInputAmount(ctx.operation);
				const { changeAmount, effectiveFee } = this.calculateSettlementAmounts(meltInputAmount, meltAmount, change);
				await this.finalizeOperation(ctx, change);
				return buildPaidResult(ctx.operation, {
					changeAmount,
					effectiveFee,
					finalizedData: this.buildFinalizedData(response)
				});
			}
			case "PENDING": return buildPendingResult(ctx.operation);
			case "UNPAID":
				await ctx.proofService.restoreProofsToReady(mintUrl, proofsToMelt.map((p) => p.secret));
				return buildFailedResult(ctx.operation);
			default: throw new Error(`Unexpected melt response state: ${state} for quote ${ctx.operation.quoteId}`);
		}
	}
	/**
	* Retrieve the input proofs reserved for this operation.
	*/
	async getInputProofs(ctx) {
		const { mintUrl, id: operationId } = ctx.operation;
		const proofs = await ctx.proofRepository.getProofsByOperationId(mintUrl, operationId);
		if (proofs.length !== ctx.operation.inputProofSecrets.length) throw new Error("Could not find all input proofs");
		return proofs;
	}
	/**
	* Execute the pre-melt swap to get exact-amount proofs.
	* Returns the "send" proofs from the swap which will be used for the melt.
	*/
	async executeSwap(ctx, inputProofs) {
		const { swapOutputData, inputProofSecrets, id: operationId, mintUrl } = ctx.operation;
		if (!swapOutputData) throw new Error("Swap is required, but swap output data is missing");
		const swapData = deserializeOutputData(swapOutputData);
		const sendAmount = OutputData.sumOutputAmounts(swapData.send);
		const { wallet } = await ctx.walletService.getWalletWithActiveKeysetId(mintUrl, ctx.operation.unit);
		ctx.logger?.debug("Executing pre-melt swap", {
			operationId,
			sendAmount,
			inputProofCount: inputProofs.length
		});
		await ctx.proofService.setProofState(mintUrl, inputProofSecrets, "inflight");
		const outputConfig = {
			send: {
				type: "custom",
				data: swapData.send
			},
			keep: {
				type: "custom",
				data: swapData.keep
			}
		};
		const { send, keep } = await wallet.send(sendAmount, inputProofs, void 0, outputConfig);
		await ctx.proofService.setProofState(mintUrl, inputProofSecrets, "spent");
		const newProofs = [...mapProofToCoreProof(mintUrl, "ready", keep, {
			unit: ctx.operation.unit,
			createdByOperationId: operationId
		}), ...mapProofToCoreProof(mintUrl, "inflight", send, {
			unit: ctx.operation.unit,
			createdByOperationId: operationId
		})];
		await ctx.proofService.saveProofs(mintUrl, newProofs);
		ctx.logger?.debug("Pre-melt swap completed", {
			operationId,
			keepCount: keep.length,
			sendCount: send.length
		});
		return send;
	}
	/**
	* Finalize a pending melt operation that has succeeded.
	* Called by MeltOperationService when checkPending returns 'finalize'.
	* Returns settlement amounts for accurate accounting.
	*/
	async finalize(ctx) {
		const { quoteId, id: operationId, amount: meltAmount } = ctx.operation;
		ctx.logger?.debug("Finalizing pending melt operation", {
			operationId,
			quoteId
		});
		const res = await this.checkMeltQuote(ctx);
		if (res.state !== "PAID") throw new Error(`Cannot finalize: melt quote ${quoteId} is ${res.state}, expected PAID`);
		const meltInputAmount = this.getMeltInputAmount(ctx.operation);
		const { changeAmount, effectiveFee } = this.calculateSettlementAmounts(meltInputAmount, meltAmount, res.change);
		await this.finalizeOperation(ctx, res.change);
		ctx.logger?.info("Pending melt operation finalized with settlement amounts", {
			operationId,
			quoteId,
			changeAmount,
			effectiveFee
		});
		return {
			changeAmount,
			effectiveFee,
			finalizedData: this.buildFinalizedData(res)
		};
	}
	/**
	* Finalize a melt operation by marking input proofs as spent and saving change proofs.
	* Called immediately when melt returns PAID, or later when a pending melt succeeds.
	*/
	async finalizeOperation(ctx, change) {
		const { mintUrl, id: operationId, changeOutputData: serializedChangeOutputData } = ctx.operation;
		const meltInputSecrets = this.getMeltInputSecrets(ctx.operation);
		await ctx.proofService.setProofState(mintUrl, meltInputSecrets, "spent");
		if (change && change.length > 0) {
			const changeOutputData = deserializeOutputData(serializedChangeOutputData).keep;
			await ctx.proofService.unblindAndSaveChangeProofs(mintUrl, changeOutputData, change, {
				unit: ctx.operation.unit,
				createdByOperationId: operationId
			});
		}
		ctx.logger?.info("Melt operation finalized", {
			operationId,
			spentProofCount: meltInputSecrets.length,
			changeProofCount: change?.length ?? 0
		});
	}
	/**
	* Check the state of a pending melt operation.
	* Returns 'finalize' if paid, 'stay_pending' if still pending, 'rollback' if unpaid/failed.
	*/
	async checkPending(ctx) {
		const { quoteId, id: operationId } = ctx.operation;
		ctx.logger?.debug("Checking pending melt operation", {
			operationId,
			quoteId
		});
		const state = await this.checkMeltQuoteState(ctx);
		ctx.logger?.debug("Pending melt quote state", {
			operationId,
			quoteId,
			state
		});
		switch (state) {
			case "PAID": return "finalize";
			case "PENDING": return "stay_pending";
			case "UNPAID": return "rollback";
			default: throw new Error(`Unexpected melt quote state: ${state} for quote ${quoteId}`);
		}
	}
	/**
	* Rollback a melt operation by restoring input proofs to ready state.
	*/
	async rollback(ctx) {
		const { id: operationId, mintUrl, needsSwap } = ctx.operation;
		ctx.logger?.debug(`Rolling back ${this.method} melt operation`, {
			operationId,
			needsSwap
		});
		if (needsSwap) {
			const swapSendSecrets = getSwapSendSecrets(ctx.operation.swapOutputData);
			await ctx.proofService.restoreProofsToReady(mintUrl, swapSendSecrets);
			await ctx.proofService.releaseProofs(mintUrl, ctx.operation.inputProofSecrets);
		} else await ctx.proofService.restoreProofsToReady(mintUrl, ctx.operation.inputProofSecrets);
		ctx.logger?.info("Melt operation rolled back, proofs restored", {
			operationId,
			needsSwap,
			proofCount: ctx.operation.inputProofSecrets.length
		});
	}
	/**
	* Recover an executing operation after a crash/restart.
	*
	* Recovery logic:
	* - PAID: Finalize the operation (mark proofs spent, save change)
	* - PENDING: Transition to pending state for continued monitoring
	* - UNPAID: Determine what happened and restore/recover proofs appropriately
	*   - If no swap was needed or swap never happened: release original proofs
	*   - If swap happened and proofs exist locally: restore them to ready
	*   - If swap happened but proofs missing: recover from mint
	*/
	async recoverExecuting(ctx) {
		const { operation } = ctx;
		const { quoteId, needsSwap, id: operationId } = operation;
		ctx.logger?.debug(`Recovering executing ${this.method} melt operation`, {
			operationId,
			quoteId,
			needsSwap
		});
		let state;
		try {
			state = await this.checkMeltQuoteState(ctx);
		} catch (err) {
			if (err instanceof MintOperationError && err.code === 20007) {
				ctx.logger?.info("Melt quote expired during recovery, treating as UNPAID", {
					operationId,
					quoteId
				});
				return this.recoverExecutingUnpaidOperation(ctx);
			}
			throw err;
		}
		ctx.logger?.debug("Melt quote state checked during recovery", {
			operationId,
			quoteId,
			state
		});
		switch (state) {
			case "PAID": return this.recoverExecutingPaidOperation(ctx);
			case "PENDING": return this.recoverExecutingPendingOperation(ctx);
			case "UNPAID": return this.recoverExecutingUnpaidOperation(ctx);
			default: throw new Error(`Unexpected melt response state: ${state} for quote ${quoteId}`);
		}
	}
	/**
	* Recover an executing operation that was actually paid.
	* Fetches change signatures and finalizes the operation.
	* Returns execution result with actual settlement amounts.
	*/
	async recoverExecutingPaidOperation(ctx) {
		const { quoteId, id: operationId, amount: meltAmount } = ctx.operation;
		ctx.logger?.debug("Recovering executing operation as paid, fetching change", {
			operationId,
			quoteId
		});
		const res = await this.checkMeltQuote(ctx);
		const meltInputAmount = this.getMeltInputAmount(ctx.operation);
		const { changeAmount, effectiveFee } = this.calculateSettlementAmounts(meltInputAmount, meltAmount, res.change);
		await this.finalizeOperation(ctx, res.change);
		ctx.logger?.info("Recovered and finalized paid melt operation", {
			operationId,
			quoteId,
			changeAmount,
			effectiveFee
		});
		return buildPaidResult(ctx.operation, {
			changeAmount,
			effectiveFee,
			finalizedData: this.buildFinalizedData(res)
		});
	}
	/**
	* Recover an executing operation that is now pending.
	* Transitions to pending state for continued monitoring.
	*/
	async recoverExecutingPendingOperation(ctx) {
		ctx.logger?.info("Recovered executing operation as pending", {
			operationId: ctx.operation.id,
			quoteId: ctx.operation.quoteId
		});
		return buildPendingResult(ctx.operation);
	}
	/**
	* Recover an executing operation that is unpaid.
	* Determines the appropriate recovery path based on whether a swap occurred.
	*/
	async recoverExecutingUnpaidOperation(ctx) {
		const { needsSwap, id: operationId } = ctx.operation;
		if (!needsSwap || !await this.checkSwapHappened(ctx)) {
			ctx.logger?.debug("Unpaid quote recovery: no swap occurred", { operationId });
			return this.recoverExecutingWithoutSwap(ctx);
		}
		ctx.logger?.debug("Unpaid quote recovery: swap occurred, checking local proofs", { operationId });
		const localSwapProofs = await this.findLocalSwapSendProofs(ctx);
		if (localSwapProofs.length > 0) return this.recoverExecutingWithLocalSwapProofs(ctx, localSwapProofs);
		return this.recoverExecutingSwapProofsFromMint(ctx);
	}
	/**
	* Recover when swap happened and proofs exist locally.
	* Restores the swap send proofs to ready state.
	*/
	async recoverExecutingWithLocalSwapProofs(ctx, swapSendProofs) {
		const { operation } = ctx;
		const { mintUrl, id: operationId } = operation;
		const swappedSecrets = swapSendProofs.map((p) => p.secret);
		await ctx.proofService.restoreProofsToReady(mintUrl, swappedSecrets);
		ctx.logger?.info("Recovered swap proofs, melt failed", {
			operationId,
			recoveredProofCount: swapSendProofs.length
		});
		return buildFailedResult(operation, "Recovered: Swap happened but melt failed / never executed");
	}
	/**
	* Recover when swap happened but proofs weren't saved locally.
	* This can happen if the app crashed after the swap but before saving proofs.
	* Recovers proofs from the mint using the swap output data.
	*/
	async recoverExecutingSwapProofsFromMint(ctx) {
		const { operation } = ctx;
		const { swapOutputData, id: operationId, mintUrl } = operation;
		if (!swapOutputData) throw new Error("Swap was required but swapOutputData is missing");
		ctx.logger?.debug("Swap proofs not found locally, recovering from mint", { operationId });
		await ctx.proofService.recoverProofsFromOutputData(mintUrl, swapOutputData, {
			unit: operation.unit,
			createdByOperationId: operationId
		});
		try {
			await ctx.proofService.setProofState(mintUrl, operation.inputProofSecrets, "spent");
		} catch {
			ctx.logger?.warn("Failed to mark input proofs as spent", { operationId });
		}
		ctx.logger?.info("Recovered proofs from mint after swap", { operationId });
		return buildFailedResult(operation, "Recovered: Swap happened, proofs restored from mint");
	}
	/**
	* Recover when no swap occurred - restore original proofs to ready.
	*/
	async recoverExecutingWithoutSwap(ctx) {
		const { operation } = ctx;
		const { mintUrl, inputProofSecrets, id: operationId } = operation;
		await ctx.proofService.restoreProofsToReady(mintUrl, inputProofSecrets);
		ctx.logger?.info("Restored proofs after failed melt (no swap occurred)", {
			operationId,
			proofCount: inputProofSecrets.length
		});
		return buildFailedResult(operation, "Recovered: Swap never executed, released original proofs");
	}
	/**
	* Check if the swap was executed by verifying if input proofs are spent.
	*/
	async checkSwapHappened(ctx) {
		const { operation, mintAdapter } = ctx;
		const { inputProofSecrets, mintUrl } = operation;
		const Ys = computeYHexForSecrets(inputProofSecrets);
		return (await mintAdapter.checkProofStates(mintUrl, Ys)).some((proofState) => proofState.state === "SPENT");
	}
	/**
	* Find swap send proofs that were saved locally during the swap.
	* Returns empty array if proofs don't exist (crash before save).
	*/
	async findLocalSwapSendProofs(ctx) {
		const { swapOutputData, id: operationId, mintUrl } = ctx.operation;
		if (!swapOutputData) return [];
		const swapSendSecrets = getSwapSendSecrets(swapOutputData);
		return (await ctx.proofRepository.getProofsByOperationId(mintUrl, operationId)).filter((p) => swapSendSecrets.includes(p.secret));
	}
	/**
	* Get the secrets of proofs that were sent to the melt operation.
	* For direct melt: these are the original input proofs.
	* For swap-then-melt: these are the swap send proofs (derived from swapOutputData).
	*/
	getMeltInputSecrets(operation) {
		if (!operation.needsSwap) return operation.inputProofSecrets;
		if (!operation.swapOutputData) throw new Error("Swap was required but swapOutputData is missing");
		return getSwapSendSecrets(operation.swapOutputData);
	}
};

//#endregion
//#region infra/handlers/melt/MeltBolt11Handler.ts
var MeltBolt11Handler = class extends BaseQuoteMeltHandler {
	method = "bolt11";
	createRemoteQuote(ctx) {
		const amountMsat = ctx.methodData.amountSats === void 0 ? void 0 : ctx.methodData.amountSats.multiplyBy(1e3);
		return ctx.wallet.createMeltQuoteBolt11(ctx.methodData.invoice, amountMsat);
	}
	fetchRemoteMeltQuote(ctx) {
		return ctx.mintAdapter.checkMeltQuote(ctx.quote.mintUrl, ctx.quote.quoteId);
	}
	executeMelt(ctx, proofsToMelt, changeOutputs, quoteId) {
		return ctx.mintAdapter.customMeltBolt11(ctx.operation.mintUrl, proofsToMelt, changeOutputs, quoteId);
	}
	checkMeltQuote(ctx) {
		return ctx.mintAdapter.checkMeltQuote(ctx.operation.mintUrl, ctx.operation.quoteId);
	}
	checkMeltQuoteState(ctx) {
		return ctx.mintAdapter.checkMeltQuoteState(ctx.operation.mintUrl, ctx.operation.quoteId);
	}
	getFeeReserveForQuote(quote, _operation) {
		return quote.fee_reserve;
	}
	buildFinalizedData(response) {
		return response.payment_preimage == null ? void 0 : { preimage: response.payment_preimage };
	}
};

//#endregion
//#region infra/handlers/melt/MeltBolt12Handler.ts
var MeltBolt12Handler = class extends BaseQuoteMeltHandler {
	method = "bolt12";
	createRemoteQuote(ctx) {
		const amountMsat = ctx.methodData.amountSats === void 0 ? void 0 : ctx.methodData.amountSats.multiplyBy(1e3);
		return ctx.wallet.createMeltQuoteBolt12(ctx.methodData.offer, amountMsat);
	}
	fetchRemoteMeltQuote(ctx) {
		return ctx.mintAdapter.checkMeltQuoteBolt12(ctx.quote.mintUrl, ctx.quote.quoteId);
	}
	executeMelt(ctx, proofsToMelt, changeOutputs, quoteId) {
		return ctx.mintAdapter.customMeltBolt12(ctx.operation.mintUrl, proofsToMelt, changeOutputs, quoteId);
	}
	checkMeltQuote(ctx) {
		return ctx.mintAdapter.checkMeltQuoteBolt12(ctx.operation.mintUrl, ctx.operation.quoteId);
	}
	checkMeltQuoteState(ctx) {
		return ctx.mintAdapter.checkMeltQuoteBolt12State(ctx.operation.mintUrl, ctx.operation.quoteId);
	}
	getFeeReserveForQuote(quote, _operation) {
		return quote.fee_reserve;
	}
	buildFinalizedData(response) {
		return response.payment_preimage == null ? void 0 : { preimage: response.payment_preimage };
	}
};

//#endregion
//#region infra/handlers/melt/MeltOnchainHandler.ts
var MeltOnchainHandler = class extends BaseQuoteMeltHandler {
	method = "onchain";
	createRemoteQuote(ctx) {
		return ctx.wallet.createMeltQuoteOnchain(ctx.methodData.address, ctx.methodData.amountSats);
	}
	fetchRemoteMeltQuote(ctx) {
		return ctx.mintAdapter.checkMeltQuoteOnchain(ctx.quote.mintUrl, ctx.quote.quoteId);
	}
	executeMelt(ctx, proofsToMelt, changeOutputs, quoteId) {
		const feeIndex = ctx.operation.methodData.feeIndex;
		if (feeIndex === void 0) throw new Error(`Cannot execute onchain melt operation ${ctx.operation.id}: feeIndex missing`);
		return ctx.mintAdapter.customMeltOnchain(ctx.operation.mintUrl, proofsToMelt, changeOutputs, quoteId, feeIndex);
	}
	checkMeltQuote(ctx) {
		return ctx.mintAdapter.checkMeltQuoteOnchain(ctx.operation.mintUrl, ctx.operation.quoteId);
	}
	checkMeltQuoteState(ctx) {
		return ctx.mintAdapter.checkMeltQuoteOnchainState(ctx.operation.mintUrl, ctx.operation.quoteId);
	}
	getFeeReserveForQuote(quote, operation) {
		const feeIndex = operation.methodData.feeIndex;
		if (feeIndex === void 0) throw new Error(`Onchain melt operation ${operation.id} does not include feeIndex`);
		const feeOption = quote.fee_options.find((option) => option.fee_index === feeIndex);
		if (!feeOption) throw new Error(`Onchain melt quote ${quote.quote} does not include fee option ${feeIndex}`);
		return feeOption.fee_reserve;
	}
	buildFinalizedData(response) {
		return response.outpoint == null ? void 0 : { outpoint: response.outpoint };
	}
};

//#endregion
//#region infra/handlers/send/DefaultSendHandler.ts
/**
* Default send handler for standard (unlocked) token sends.
* Handles the prepare and execute phases for sending cashu tokens.
*/
var DefaultSendHandler = class {
	/**
	* Prepare the send operation by selecting proofs and creating outputs.
	*/
	async prepare(ctx) {
		const { operation, wallet, proofService, logger } = ctx;
		const { mintUrl, amount, unit } = operation;
		const exactProofs = await proofService.selectProofsToSend(mintUrl, {
			amount,
			unit
		}, false);
		const needsSwap = !sumProofs(exactProofs).equals(amount);
		let selectedProofs;
		let fee = Amount$1.zero();
		let serializedOutputData;
		if (!needsSwap && exactProofs.length > 0) {
			selectedProofs = exactProofs;
			logger?.debug("Exact match found for send", {
				operationId: operation.id,
				amount,
				proofCount: selectedProofs.length
			});
		} else {
			selectedProofs = await proofService.selectProofsToSend(mintUrl, {
				amount,
				unit
			}, true);
			const selectedAmount = sumProofs(selectedProofs);
			fee = wallet.getFeesForProofs(selectedProofs);
			const requiredAmount = amount.add(fee);
			if (selectedAmount.lessThan(requiredAmount)) throw new ProofValidationError("Send amount is not sufficient after fees");
			const keepAmount = selectedAmount.subtract(requiredAmount);
			const outputResult = await proofService.createOutputsAndIncrementCounters(mintUrl, {
				keep: {
					amount: keepAmount,
					unit
				},
				send: {
					amount,
					unit
				}
			}, {});
			serializedOutputData = serializeOutputData({
				keep: outputResult.keep,
				send: outputResult.send
			});
			logger?.debug("Swap required for send", {
				operationId: operation.id,
				amount,
				fee,
				keepAmount,
				selectedAmount,
				proofCount: selectedProofs.length,
				keepOutputs: outputResult.keep.length,
				sendOutputs: outputResult.send.length
			});
		}
		const inputSecrets = selectedProofs.map((p) => p.secret);
		await proofService.reserveProofs(mintUrl, inputSecrets, operation.id, { unit });
		const prepared = {
			id: operation.id,
			state: "prepared",
			mintUrl: operation.mintUrl,
			amount: operation.amount,
			unit: operation.unit,
			createdAt: operation.createdAt,
			updatedAt: Date.now(),
			error: operation.error,
			needsSwap,
			fee,
			inputAmount: sumProofs(selectedProofs),
			inputProofSecrets: inputSecrets,
			outputData: serializedOutputData,
			method: operation.method,
			methodData: operation.methodData
		};
		logger?.info("Send operation prepared", {
			operationId: operation.id,
			needsSwap,
			fee,
			inputProofCount: inputSecrets.length
		});
		return prepared;
	}
	/**
	* Execute the send operation by performing the swap and creating the token.
	*/
	async execute(ctx) {
		const { operation, wallet, reservedProofs, proofService, logger } = ctx;
		const { mintUrl, amount, needsSwap, inputProofSecrets } = operation;
		const inputProofs = reservedProofs.filter((p) => inputProofSecrets.includes(p.secret));
		if (inputProofs.length !== inputProofSecrets.length) throw new Error("Could not find all reserved proofs");
		let sendProofs;
		let keepProofs = [];
		if (!needsSwap) {
			sendProofs = inputProofs;
			logger?.debug("Executing exact match send", {
				operationId: operation.id,
				proofCount: sendProofs.length
			});
			const sendSecrets = sendProofs.map((p) => p.secret);
			await proofService.setProofState(mintUrl, sendSecrets, "inflight");
		} else {
			if (!operation.outputData) throw new Error("Missing output data for swap operation");
			const outputData = deserializeOutputData(operation.outputData);
			logger?.debug("Executing swap", {
				operationId: operation.id,
				keepOutputs: outputData.keep.length,
				sendOutputs: outputData.send.length
			});
			const outputConfig = {
				send: {
					type: "custom",
					data: outputData.send
				},
				keep: {
					type: "custom",
					data: outputData.keep
				}
			};
			const result = await wallet.send(amount, inputProofs, void 0, outputConfig);
			sendProofs = result.send;
			keepProofs = result.keep;
			const keepCoreProofs = mapProofToCoreProof(mintUrl, "ready", keepProofs, {
				unit: operation.unit,
				createdByOperationId: operation.id
			});
			const sendCoreProofs = mapProofToCoreProof(mintUrl, "inflight", sendProofs, {
				unit: operation.unit,
				createdByOperationId: operation.id
			});
			await proofService.saveProofs(mintUrl, [...keepCoreProofs, ...sendCoreProofs]);
			await proofService.setProofState(mintUrl, inputProofSecrets, "spent");
		}
		const token = {
			mint: mintUrl,
			proofs: sendProofs,
			unit: operation.unit
		};
		const pending = {
			...operation,
			state: "pending",
			updatedAt: Date.now(),
			token
		};
		logger?.info("Send operation executed", {
			operationId: operation.id,
			sendProofCount: sendProofs.length,
			keepProofCount: keepProofs.length
		});
		return {
			status: "PENDING",
			pending,
			token
		};
	}
	/**
	* Finalize the send operation after proofs are confirmed spent.
	*/
	async finalize(ctx) {
		const { operation, proofService } = ctx;
		const sendSecrets = getSendProofSecrets(operation);
		const keepSecrets = getKeepProofSecrets(operation);
		await proofService.releaseProofs(operation.mintUrl, operation.inputProofSecrets);
		if (sendSecrets.length > 0) await proofService.releaseProofs(operation.mintUrl, sendSecrets);
		if (keepSecrets.length > 0) await proofService.releaseProofs(operation.mintUrl, keepSecrets);
	}
	/**
	* Rollback the send operation by reclaiming proofs.
	*/
	async rollback(ctx) {
		const { operation, wallet, proofRepository, proofService, logger } = ctx;
		const { mintUrl, inputProofSecrets } = operation;
		if (operation.state === "prepared") {
			await proofService.releaseProofs(mintUrl, inputProofSecrets);
			logger?.info("Rolling back prepared operation - released reserved proofs", { operationId: operation.id });
		} else if (operation.state === "pending" || operation.state === "rolling_back") {
			const sendSecrets = getSendProofSecrets(operation);
			if (sendSecrets.length > 0) {
				const sendProofs = (await proofRepository.getProofsByOperationId(mintUrl, operation.id)).filter((p) => sendSecrets.includes(p.secret) && p.state === "inflight");
				if (sendProofs.length > 0) {
					const totalAmount = sumProofs(sendProofs);
					const fee = wallet.getFeesForProofs(sendProofs);
					if (totalAmount.lessThanOrEqual(fee)) logger?.warn("Cannot reclaim send proofs because fees consume the amount", {
						operationId: operation.id,
						amount: totalAmount,
						fee
					});
					else {
						const reclaimAmount = totalAmount.subtract(fee);
						if (!reclaimAmount.isZero()) {
							const outputResult = await proofService.createOutputsAndIncrementCounters(mintUrl, {
								keep: {
									amount: reclaimAmount,
									unit: operation.unit
								},
								send: {
									amount: Amount$1.zero(),
									unit: operation.unit
								}
							}, {});
							const keep = await wallet.receive({
								mint: mintUrl,
								proofs: sendProofs,
								unit: operation.unit
							}, void 0, {
								type: "custom",
								data: outputResult.keep
							});
							await proofService.saveProofs(mintUrl, mapProofToCoreProof(mintUrl, "ready", keep, { unit: operation.unit }));
							await proofService.setProofState(mintUrl, sendProofs.map((p) => p.secret), "spent");
							logger?.info("Reclaimed proofs from pending operation", {
								operationId: operation.id,
								reclaimedAmount: reclaimAmount,
								proofCount: keep.length
							});
						}
					}
				}
			}
			await proofService.releaseProofs(mintUrl, inputProofSecrets);
			const keepSecrets = getKeepProofSecrets(operation);
			if (keepSecrets.length > 0) await proofService.releaseProofs(mintUrl, keepSecrets);
		}
	}
	/**
	* Recover an executing operation that failed mid-execution.
	*/
	async recoverExecuting(ctx) {
		const { operation, wallet, proofRepository, proofService, logger } = ctx;
		if (!operation.needsSwap) {
			await proofService.releaseProofs(operation.mintUrl, operation.inputProofSecrets);
			return {
				status: "FAILED",
				failed: {
					...operation,
					state: "rolled_back",
					updatedAt: Date.now(),
					error: "Recovered: no swap needed, operation never finalized"
				}
			};
		}
		const proofInputs = operation.inputProofSecrets.map((secret) => ({ secret }));
		let inputStates;
		try {
			inputStates = await wallet.checkProofsStates(proofInputs);
		} catch (error) {
			logger?.warn("Could not reach mint for recovery, will retry later", {
				operationId: operation.id,
				mintUrl: operation.mintUrl
			});
			throw error;
		}
		if (!inputStates.every((s) => s.state === "SPENT")) {
			await proofService.releaseProofs(operation.mintUrl, operation.inputProofSecrets);
			return {
				status: "FAILED",
				failed: {
					...operation,
					state: "rolled_back",
					updatedAt: Date.now(),
					error: "Recovered: swap never executed"
				}
			};
		}
		if (operation.outputData) {
			const existingProofs = await proofRepository.getProofsByOperationId(operation.mintUrl, operation.id);
			const outputSecrets = getSecretsFromSerializedOutputData(operation.outputData);
			const allOutputSecrets = [...outputSecrets.keepSecrets, ...outputSecrets.sendSecrets];
			if (!existingProofs.some((p) => allOutputSecrets.includes(p.secret))) await proofService.recoverProofsFromOutputData(operation.mintUrl, operation.outputData, {
				unit: operation.unit,
				createdByOperationId: operation.id
			});
		}
		await proofService.setProofState(operation.mintUrl, operation.inputProofSecrets, "spent");
		const failed = {
			...operation,
			state: "rolled_back",
			updatedAt: Date.now(),
			error: "Recovered: swap succeeded but token never returned"
		};
		logger?.info("Recovered executing operation", { operationId: operation.id });
		return {
			status: "FAILED",
			failed
		};
	}
};

//#endregion
//#region infra/handlers/send/P2pkSendHandler.ts
/**
* P2PK send handler for sending tokens locked to a recipient's public key.
* The recipient must have the corresponding private key to spend the tokens.
*/
var P2pkSendHandler = class {
	/**
	* Prepare the send operation by selecting proofs and creating outputs.
	* P2PK sends always require a swap to lock the proofs to the pubkey.
	*/
	async prepare(ctx) {
		const { operation, wallet, proofService, logger } = ctx;
		const { mintUrl, amount, unit } = operation;
		const pubkey = operation.methodData?.pubkey;
		if (!pubkey) throw new ProofValidationError("P2PK send requires a pubkey in methodData");
		const selected = await proofService.selectProofsToSend(mintUrl, {
			amount,
			unit
		}, true);
		const selectedAmount = sumProofs(selected);
		const fee = wallet.getFeesForProofs(selected);
		const requiredAmount = amount.add(fee);
		if (selectedAmount.lessThan(requiredAmount)) throw new ProofValidationError("Send amount is not sufficient after fees");
		const keepAmount = selectedAmount.subtract(requiredAmount);
		const outputResult = await proofService.createOutputsAndIncrementCounters(mintUrl, {
			keep: {
				amount: keepAmount,
				unit
			},
			send: {
				amount: keepAmount.subtract(keepAmount),
				unit
			}
		}, {});
		const keyset = wallet.getKeyset();
		const sendOT = OutputData.createP2PKData({ pubkey }, amount, keyset);
		const serializedOutputData = serializeOutputData({
			keep: outputResult.keep,
			send: sendOT
		});
		logger?.debug("P2PK send prepared", {
			operationId: operation.id,
			amount,
			fee,
			keepAmount,
			selectedAmount,
			proofCount: selected.length,
			keepOutputs: outputResult.keep.length,
			sendOutputs: sendOT.length,
			pubkey
		});
		const inputSecrets = selected.map((p) => p.secret);
		await proofService.reserveProofs(mintUrl, inputSecrets, operation.id, { unit });
		const prepared = {
			id: operation.id,
			state: "prepared",
			mintUrl: operation.mintUrl,
			amount: operation.amount,
			unit: operation.unit,
			createdAt: operation.createdAt,
			updatedAt: Date.now(),
			error: operation.error,
			needsSwap: true,
			fee,
			inputAmount: selectedAmount,
			inputProofSecrets: inputSecrets,
			outputData: serializedOutputData,
			method: operation.method,
			methodData: operation.methodData
		};
		logger?.info("P2PK send operation prepared", {
			operationId: operation.id,
			fee,
			inputProofCount: inputSecrets.length,
			pubkey
		});
		return prepared;
	}
	/**
	* Execute the send operation by performing the swap with P2PK locking.
	*/
	async execute(ctx) {
		const { operation, wallet, reservedProofs, proofService, logger } = ctx;
		const { mintUrl, amount, inputProofSecrets } = operation;
		const pubkey = operation.methodData?.pubkey;
		if (!pubkey) throw new Error("P2PK send requires a pubkey in methodData");
		const inputProofs = reservedProofs.filter((p) => inputProofSecrets.includes(p.secret));
		if (inputProofs.length !== inputProofSecrets.length) throw new Error("Could not find all reserved proofs");
		if (!operation.outputData) throw new Error("Missing output data for P2PK swap operation");
		const outputData = deserializeOutputData(operation.outputData);
		logger?.debug("Executing P2PK swap", {
			operationId: operation.id,
			keepOutputs: outputData.keep.length,
			sendOutputs: outputData.send.length,
			pubkey
		});
		const outputConfig = {
			send: {
				type: "custom",
				data: outputData.send
			},
			keep: {
				type: "custom",
				data: outputData.keep
			}
		};
		const result = await wallet.send(amount, inputProofs, void 0, outputConfig);
		const sendProofs = result.send;
		const keepProofs = result.keep;
		const keepCoreProofs = mapProofToCoreProof(mintUrl, "ready", keepProofs, {
			unit: operation.unit,
			createdByOperationId: operation.id
		});
		const sendCoreProofs = mapProofToCoreProof(mintUrl, "inflight", sendProofs, {
			unit: operation.unit,
			createdByOperationId: operation.id
		});
		if (keepCoreProofs.length > 0 || sendCoreProofs.length > 0) await proofService.saveProofs(mintUrl, [...keepCoreProofs, ...sendCoreProofs]);
		await proofService.setProofState(mintUrl, inputProofSecrets, "spent");
		const token = {
			mint: mintUrl,
			proofs: sendProofs,
			unit: operation.unit
		};
		const pending = {
			...operation,
			state: "pending",
			updatedAt: Date.now(),
			token
		};
		logger?.info("P2PK send operation executed", {
			operationId: operation.id,
			sendProofCount: sendProofs.length,
			keepProofCount: keepProofs.length,
			pubkey
		});
		return {
			status: "PENDING",
			pending,
			token
		};
	}
	/**
	* Finalize the send operation after proofs are confirmed spent.
	*/
	async finalize(ctx) {
		const { operation, proofService } = ctx;
		const sendSecrets = getSendProofSecrets(operation);
		const keepSecrets = getKeepProofSecrets(operation);
		await proofService.releaseProofs(operation.mintUrl, operation.inputProofSecrets);
		if (sendSecrets.length > 0) await proofService.releaseProofs(operation.mintUrl, sendSecrets);
		if (keepSecrets.length > 0) await proofService.releaseProofs(operation.mintUrl, keepSecrets);
	}
	/**
	* Rollback the send operation.
	* Note: P2PK tokens sent to an external pubkey cannot be reclaimed without the private key.
	* This rollback only handles the prepared state (before swap) and releases reservations.
	*/
	async rollback(ctx) {
		const { operation, proofService, logger } = ctx;
		const { mintUrl, inputProofSecrets } = operation;
		if (operation.state === "prepared") {
			await proofService.releaseProofs(mintUrl, inputProofSecrets);
			logger?.info("Rolling back prepared P2PK operation - released reserved proofs", { operationId: operation.id });
		} else throw new Error(`P2PK Send Operation in ${operation.state} state can not be rolled back.`);
	}
	/**
	* Recover an executing operation that failed mid-execution.
	*/
	async recoverExecuting(ctx) {
		const { operation, wallet, proofRepository, proofService, logger } = ctx;
		const proofInputs = operation.inputProofSecrets.map((secret) => ({ secret }));
		let inputStates;
		try {
			inputStates = await wallet.checkProofsStates(proofInputs);
		} catch (error) {
			logger?.warn("Could not reach mint for recovery, will retry later", {
				operationId: operation.id,
				mintUrl: operation.mintUrl
			});
			throw error;
		}
		if (!inputStates.every((s) => s.state === "SPENT")) {
			await proofService.releaseProofs(operation.mintUrl, operation.inputProofSecrets);
			return {
				status: "FAILED",
				failed: {
					...operation,
					state: "rolled_back",
					updatedAt: Date.now(),
					error: "Recovered: P2PK swap never executed"
				}
			};
		}
		if (!operation.outputData) throw new Error("Missing output data for P2PK recovery after swap execution");
		const existingProofs = await proofRepository.getProofsByOperationId(operation.mintUrl, operation.id);
		const outputSecrets = getSecretsFromSerializedOutputData(operation.outputData);
		const keepOutputData = {
			keep: operation.outputData.keep,
			send: []
		};
		if (existingProofs.filter((p) => outputSecrets.keepSecrets.includes(p.secret)).length === 0 && keepOutputData.keep.length > 0) await proofService.recoverProofsFromOutputData(operation.mintUrl, keepOutputData, {
			unit: operation.unit,
			createdByOperationId: operation.id
		});
		let sendProofs = existingProofs.filter((p) => outputSecrets.sendSecrets.includes(p.secret));
		if (sendProofs.length === 0 && operation.outputData.send.length > 0) {
			const recoveredSendProofs = await proofService.recoverProofsFromOutputData(operation.mintUrl, {
				keep: [],
				send: operation.outputData.send
			}, {
				unit: operation.unit,
				persistRecoveredProofs: false
			});
			if (recoveredSendProofs.length > 0) await proofService.saveProofs(operation.mintUrl, mapProofToCoreProof(operation.mintUrl, "inflight", recoveredSendProofs, {
				unit: operation.unit,
				createdByOperationId: operation.id
			}));
			sendProofs = recoveredSendProofs;
		}
		await proofService.setProofState(operation.mintUrl, operation.inputProofSecrets, "spent");
		let token;
		if (sendProofs.length > 0) token = {
			mint: operation.mintUrl,
			proofs: sendProofs,
			unit: operation.unit
		};
		else if (outputSecrets.sendSecrets.length > 0) {
			if (!(await wallet.checkProofsStates(outputSecrets.sendSecrets.map((secret) => ({ secret })))).every((state) => state.state === "SPENT")) throw new Error("Recovered P2PK swap succeeded but token could not be reconstructed");
		}
		const pending = {
			...operation,
			state: "pending",
			updatedAt: Date.now(),
			token
		};
		logger?.info("Recovered P2PK executing operation", { operationId: operation.id });
		return {
			status: "PENDING",
			pending,
			token
		};
	}
};

//#endregion
//#region infra/handlers/mint/MintHandlerProvider.ts
/**
* Runtime registry for mint method handlers.
*/
var MintHandlerProvider = class {
	registry = {};
	constructor(initialHandlers) {
		if (initialHandlers) this.registerMany(initialHandlers);
	}
	register(method, handler) {
		this.set(method, handler);
	}
	registerMany(handlers) {
		for (const method of Object.keys(handlers)) {
			const handler = handlers[method];
			if (handler) this.set(method, handler);
		}
	}
	get(method) {
		const handler = this.registry[method];
		if (!handler) throw new Error(`No mint handler registered for method ${method}`);
		return handler;
	}
	getAll() {
		return this.registry;
	}
	set(method, handler) {
		this.registry[method] = handler;
	}
};

//#endregion
//#region infra/handlers/mint/MintBolt11Handler.ts
var MintBolt11Handler = class {
	async createQuote(ctx) {
		const remoteQuote = await ctx.wallet.createMintQuoteBolt11(ctx.createQuoteData.amount.amount);
		return mintQuoteFromBolt11Response(ctx.mintUrl, remoteQuote);
	}
	async fetchRemoteQuote(ctx) {
		const remoteQuote = await ctx.mintAdapter.checkMintQuote(ctx.quote.mintUrl, "bolt11", ctx.quote.quoteId);
		return mintQuoteFromBolt11Response(ctx.quote.mintUrl, remoteQuote);
	}
	async prepare(ctx) {
		const quote = ctx.importedQuote;
		if (!quote) throw new Error(`Mint quote ${ctx.operation.quoteId ?? "(missing)"} was not provided`);
		if (!quote.amount || quote.amount.isZero()) throw new Error(`Mint quote ${quote.quote} has invalid amount`);
		if (ctx.operation.quoteId !== quote.quote) throw new Error(`Mint quote ${quote.quote} does not match operation quote ${ctx.operation.quoteId}`);
		if (!quote.amount.equals(ctx.operation.amount)) throw new Error(`Mint quote ${quote.quote} amount ${quote.amount} does not match requested amount ${ctx.operation.amount}`);
		assertSameUnit(quote.unit, ctx.operation.unit, `Mint quote ${quote.quote}`);
		const outputData = await ctx.proofService.createOutputsAndIncrementCounters(ctx.operation.mintUrl, {
			keep: {
				amount: quote.amount,
				unit: ctx.operation.unit
			},
			send: {
				amount: Amount$1.zero(),
				unit: ctx.operation.unit
			}
		}, {});
		if (outputData.keep.length === 0) throw new Error("Failed to create deterministic outputs for mint operation");
		return {
			...ctx.operation,
			quoteId: quote.quote,
			amount: quote.amount,
			unit: ctx.operation.unit,
			request: quote.request,
			expiry: quote.expiry,
			pubkey: quote.pubkey,
			outputData: serializeOutputData({
				keep: outputData.keep,
				send: []
			}),
			state: "pending"
		};
	}
	async execute(ctx) {
		const outputData = deserializeOutputData(ctx.operation.outputData);
		try {
			return {
				status: "ISSUED",
				proofs: await ctx.wallet.mintProofsBolt11(ctx.operation.amount, ctx.operation.quoteId, void 0, {
					type: "custom",
					data: outputData.keep
				})
			};
		} catch (err) {
			if (err instanceof MintOperationError && err.code === 20002) return { status: "ALREADY_ISSUED" };
			throw err;
		}
	}
	async recoverExecuting(ctx) {
		const { mintUrl, quoteId } = ctx.operation;
		let remoteQuote;
		try {
			remoteQuote = await ctx.mintAdapter.checkMintQuote(mintUrl, "bolt11", quoteId);
		} catch (error) {
			ctx.logger?.warn("Failed to check mint quote state during recovery", {
				mintUrl,
				quoteId,
				error: error instanceof Error ? error.message : String(error)
			});
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
		if (remoteQuote.state === "PAID") {
			const outputData = deserializeOutputData(ctx.operation.outputData);
			try {
				const proofs = await ctx.wallet.mintProofsBolt11(ctx.operation.amount, ctx.operation.quoteId, void 0, {
					type: "custom",
					data: outputData.keep
				});
				await ctx.proofService.saveProofs(ctx.operation.mintUrl, mapProofToCoreProof(ctx.operation.mintUrl, "ready", proofs, {
					unit: ctx.operation.unit,
					createdByOperationId: ctx.operation.id
				}));
				return { status: "FINALIZED" };
			} catch (err) {
				if (err instanceof MintOperationError) if (err.code === 20002) {} else if (err.code === 20007) return {
					status: "TERMINAL",
					error: `Recovered: quote ${quoteId} expired while executing mint`
				};
				else return {
					status: "PENDING",
					error: err.message
				};
				else return {
					status: "PENDING",
					error: err instanceof Error ? err.message : String(err)
				};
			}
		} else if (remoteQuote.state === "UNPAID") return {
			status: "PENDING",
			error: `Recovered: quote ${quoteId} is still UNPAID`
		};
		else if (remoteQuote.state !== "ISSUED") return {
			status: "PENDING",
			error: `Recovered: quote ${quoteId} remains in remote state ${remoteQuote.state}`
		};
		try {
			if ((await ctx.proofService.recoverProofsFromOutputData(ctx.operation.mintUrl, ctx.operation.outputData, {
				unit: ctx.operation.unit,
				createdByOperationId: ctx.operation.id
			})).length === 0) return {
				status: "PENDING",
				error: `Recovered: quote ${quoteId} issued remotely but proofs were not recoverable`
			};
			return { status: "FINALIZED" };
		} catch (error) {
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	async checkPending(ctx) {
		const { mintUrl, quoteId } = ctx.operation;
		ctx.logger?.info("Checking pending mint operation", {
			mintUrl,
			quoteId
		});
		const quote = await ctx.mintAdapter.checkMintQuote(mintUrl, "bolt11", quoteId);
		ctx.logger?.info("Pending mint quote state", {
			mintUrl,
			quoteId,
			state: quote.state
		});
		const observedRemoteStateAt = Date.now();
		switch (quote.state) {
			case "UNPAID": return {
				observedRemoteState: quote.state,
				observedRemoteStateAt,
				category: "waiting"
			};
			case "PAID": return {
				observedRemoteState: quote.state,
				observedRemoteStateAt,
				category: "ready"
			};
			case "ISSUED": return {
				observedRemoteState: quote.state,
				observedRemoteStateAt,
				category: "completed"
			};
			default: throw new Error(`Unexpected mint quote state: ${quote.state} for quote ${quoteId} at mint ${mintUrl}`);
		}
	}
};

//#endregion
//#region infra/handlers/mint/MintOnchainHandler.ts
var MintOnchainHandler = class {
	constructor(keyRingService) {
		this.keyRingService = keyRingService;
	}
	async createQuote(ctx) {
		const quoteKey = await this.keyRingService.generateMintQuoteKeyPair();
		const remoteQuote = await this.createRemoteQuote(ctx.wallet, {
			pubkey: quoteKey.publicKeyHex,
			unit: ctx.createQuoteData.unit
		});
		this.assertQuoteMatchesRequest(remoteQuote, quoteKey.publicKeyHex, ctx.createQuoteData.unit);
		return mintQuoteFromOnchainResponse(ctx.mintUrl, remoteQuote);
	}
	async fetchRemoteQuote(ctx) {
		const remoteQuote = await ctx.mintAdapter.checkMintQuote(ctx.quote.mintUrl, "onchain", ctx.quote.quoteId);
		this.assertQuoteMatchesRequest(remoteQuote, ctx.quote.quoteData.pubkey, ctx.quote.unit);
		return mintQuoteFromOnchainResponse(ctx.quote.mintUrl, remoteQuote);
	}
	async validateQuoteForPrepare(quote) {
		await this.requireQuoteKey(quote.quoteData.pubkey);
	}
	async prepare(ctx) {
		const quote = ctx.importedQuote;
		if (!quote) throw new Error(`Mint quote ${ctx.operation.quoteId ?? "(missing)"} was not provided`);
		if (ctx.operation.quoteId !== quote.quote) throw new Error(`Mint quote ${quote.quote} does not match operation quote ${ctx.operation.quoteId}`);
		assertSameUnit(quote.unit, ctx.operation.unit, `Onchain mint quote ${quote.quote}`);
		await this.requireQuoteKey(quote.pubkey);
		const outputData = await ctx.proofService.createOutputsAndIncrementCounters(ctx.operation.mintUrl, {
			keep: {
				amount: ctx.operation.amount,
				unit: ctx.operation.unit
			},
			send: {
				amount: Amount$1.zero(),
				unit: ctx.operation.unit
			}
		}, {});
		if (outputData.keep.length === 0) throw new Error("Failed to create deterministic outputs for onchain mint operation");
		return {
			...ctx.operation,
			quoteId: quote.quote,
			request: quote.request,
			expiry: quote.expiry,
			pubkey: quote.pubkey,
			outputData: serializeOutputData({
				keep: outputData.keep,
				send: []
			}),
			state: "pending"
		};
	}
	async execute(ctx) {
		const quoteKey = await this.keyRingService.getMintQuoteKeyPair(ctx.operation.pubkey ?? "");
		if (!quoteKey) throw new Error(`Missing NUT-20 mint quote key for pubkey ${ctx.operation.pubkey ?? "(missing)"}`);
		const outputData = deserializeOutputData(ctx.operation.outputData);
		const remoteQuote = await ctx.mintAdapter.checkMintQuote(ctx.operation.mintUrl, "onchain", ctx.operation.quoteId);
		this.assertQuoteMatchesRequest(remoteQuote, ctx.operation.pubkey ?? "", ctx.operation.unit);
		return {
			status: "ISSUED",
			proofs: await ctx.wallet.mintProofsOnchain(ctx.operation.amount, remoteQuote, bytesToHex(quoteKey.secretKey), void 0, {
				type: "custom",
				data: outputData.keep
			})
		};
	}
	async recoverExecuting(ctx) {
		const restored = await this.recoverSignedOutputs(ctx);
		if (restored) return restored;
		const { operation } = ctx;
		const expectedPubkey = operation.pubkey;
		if (!expectedPubkey) return {
			status: "TERMINAL",
			error: `Recovered: onchain mint operation ${operation.id} is missing NUT-20 quote pubkey`
		};
		let remoteQuote;
		try {
			remoteQuote = await ctx.mintAdapter.checkMintQuote(operation.mintUrl, "onchain", operation.quoteId);
		} catch (error) {
			ctx.logger?.warn("Failed to check onchain mint quote during recovery", {
				mintUrl: operation.mintUrl,
				quoteId: operation.quoteId,
				operationId: operation.id,
				error: error instanceof Error ? error.message : String(error)
			});
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
		const validationError = this.getQuoteValidationError(remoteQuote, expectedPubkey, operation.unit);
		if (validationError) return {
			status: "TERMINAL",
			error: validationError.message
		};
		if (this.isExpired(remoteQuote)) return {
			status: "TERMINAL",
			error: `Recovered: onchain quote ${operation.quoteId} expired while executing mint`
		};
		const quoteKey = await this.keyRingService.getMintQuoteKeyPair(expectedPubkey);
		if (!quoteKey) return {
			status: "TERMINAL",
			error: `Missing NUT-20 mint quote key for pubkey ${expectedPubkey}`
		};
		const available = this.getAvailableAmount(remoteQuote);
		if (available.lessThan(operation.amount)) return {
			status: "PENDING",
			error: `Recovered: onchain quote ${operation.quoteId} has ${available} available, requested ${operation.amount}`
		};
		const outputData = deserializeOutputData(operation.outputData);
		try {
			const proofs = await ctx.wallet.mintProofsOnchain(operation.amount, remoteQuote, bytesToHex(quoteKey.secretKey), void 0, {
				type: "custom",
				data: outputData.keep
			});
			await ctx.proofService.saveProofs(operation.mintUrl, mapProofToCoreProof(operation.mintUrl, "ready", proofs, {
				unit: operation.unit,
				createdByOperationId: operation.id
			}));
			return { status: "FINALIZED" };
		} catch (error) {
			if (this.isAlreadyIssuedError(error)) return await this.recoverSignedOutputs(ctx) ?? {
				status: "PENDING",
				error: `Recovered: onchain quote ${operation.quoteId} was already issued but proofs were not recoverable`
			};
			if (this.isExpiredMintError(error)) return {
				status: "TERMINAL",
				error: `Recovered: onchain quote ${operation.quoteId} expired while executing mint`
			};
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	async checkPending(ctx) {
		const { operation } = ctx;
		const observedRemoteStateAt = Date.now();
		const remoteQuote = await ctx.mintAdapter.checkMintQuote(operation.mintUrl, "onchain", operation.quoteId);
		const expectedPubkey = operation.pubkey;
		if (!expectedPubkey) return {
			observedRemoteStateAt,
			quoteSnapshot: remoteQuote,
			category: "terminal",
			terminalFailure: {
				reason: `Onchain mint operation ${operation.id} is missing NUT-20 quote pubkey`,
				code: "missing_quote_pubkey",
				retryable: false,
				observedAt: observedRemoteStateAt
			}
		};
		const validationError = this.getQuoteValidationError(remoteQuote, expectedPubkey, operation.unit);
		if (validationError) return {
			observedRemoteStateAt,
			category: "terminal",
			terminalFailure: {
				reason: validationError.message,
				code: "invalid_quote",
				retryable: false,
				observedAt: observedRemoteStateAt
			}
		};
		if (this.isExpired(remoteQuote)) return {
			observedRemoteStateAt,
			quoteSnapshot: remoteQuote,
			category: "terminal",
			terminalFailure: {
				reason: `Onchain mint quote ${operation.quoteId} expired before operation ${operation.id} could be minted`,
				code: "quote_expired",
				retryable: false,
				observedAt: observedRemoteStateAt
			}
		};
		return {
			observedRemoteStateAt,
			quoteSnapshot: remoteQuote,
			category: this.getAvailableAmount(remoteQuote).greaterThanOrEqual(operation.amount) ? "ready" : "waiting"
		};
	}
	async createRemoteQuote(wallet, payload) {
		const quote = await wallet.createMintQuoteOnchain(payload.pubkey);
		assertSameUnit(quote.unit, payload.unit, `Onchain mint quote ${quote.quote}`);
		return quote;
	}
	async requireQuoteKey(pubkey) {
		if (!await this.keyRingService.getMintQuoteKeyPair(pubkey)) throw new Error(`Missing NUT-20 mint quote key for pubkey ${pubkey}`);
	}
	assertQuoteMatchesRequest(quote, expectedPubkey, expectedUnit) {
		if (quote.pubkey !== expectedPubkey) throw new Error(`Onchain mint quote ${quote.quote} returned pubkey ${quote.pubkey} instead of requested pubkey ${expectedPubkey}`);
		assertSameUnit(quote.unit, expectedUnit, `Onchain mint quote ${quote.quote}`);
		if (Amount$1.from(quote.amount_paid).lessThan(Amount$1.from(quote.amount_issued))) throw new Error(`Onchain mint quote ${quote.quote} has amount_issued greater than amount_paid`);
	}
	async recoverSignedOutputs(ctx) {
		try {
			return (await ctx.proofService.recoverProofsFromOutputData(ctx.operation.mintUrl, ctx.operation.outputData, {
				unit: ctx.operation.unit,
				createdByOperationId: ctx.operation.id
			})).length > 0 ? { status: "FINALIZED" } : null;
		} catch (error) {
			ctx.logger?.warn("Failed to recover onchain mint outputs from output data", {
				mintUrl: ctx.operation.mintUrl,
				quoteId: ctx.operation.quoteId,
				operationId: ctx.operation.id,
				error: error instanceof Error ? error.message : String(error)
			});
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	getQuoteValidationError(quote, expectedPubkey, expectedUnit) {
		try {
			this.assertQuoteMatchesRequest(quote, expectedPubkey, expectedUnit);
			return null;
		} catch (error) {
			return error instanceof Error ? error : new Error(String(error));
		}
	}
	getAvailableAmount(quote) {
		return Amount$1.from(quote.amount_paid).subtract(Amount$1.from(quote.amount_issued));
	}
	isExpired(quote) {
		return quote.expiry !== null && quote.expiry * 1e3 <= Date.now();
	}
	isAlreadyIssuedError(error) {
		if (error instanceof MintOperationError && (error.code === 20002 || error.code === 11003)) return true;
		const message = error instanceof Error ? error.message : String(error);
		return /already (issued|signed)|outputs? already/i.test(message);
	}
	isExpiredMintError(error) {
		if (error instanceof MintOperationError && error.code === 20007) return true;
		const message = error instanceof Error ? error.message : String(error);
		return /expired/i.test(message);
	}
};

//#endregion
//#region infra/handlers/mint/MintBolt12Handler.ts
var MintBolt12Handler = class {
	constructor(keyRingService) {
		this.keyRingService = keyRingService;
	}
	async createQuote(ctx) {
		const quoteKey = await this.keyRingService.generateMintQuoteKeyPair();
		const amount = ctx.createQuoteData.amount ? normalizeUnitAmount(ctx.createQuoteData.amount).amount : void 0;
		const remoteQuote = await this.createRemoteQuote(ctx.wallet, {
			pubkey: quoteKey.publicKeyHex,
			unit: ctx.createQuoteData.unit,
			amount,
			description: ctx.createQuoteData.description
		});
		this.assertQuoteMatchesRequest(remoteQuote, quoteKey.publicKeyHex, ctx.createQuoteData.unit, amount);
		return mintQuoteFromBolt12Response(ctx.mintUrl, remoteQuote);
	}
	async fetchRemoteQuote(ctx) {
		const remoteQuote = await ctx.mintAdapter.checkMintQuote(ctx.quote.mintUrl, "bolt12", ctx.quote.quoteId);
		this.assertQuoteMatchesRequest(remoteQuote, ctx.quote.quoteData.pubkey, ctx.quote.unit, ctx.quote.quoteData.amount);
		return mintQuoteFromBolt12Response(ctx.quote.mintUrl, remoteQuote);
	}
	async validateQuoteForPrepare(quote) {
		await this.requireQuoteKey(quote.quoteData.pubkey);
	}
	async prepare(ctx) {
		const quote = ctx.importedQuote;
		if (!quote) throw new Error(`Mint quote ${ctx.operation.quoteId ?? "(missing)"} was not provided`);
		if (ctx.operation.quoteId !== quote.quote) throw new Error(`Mint quote ${quote.quote} does not match operation quote ${ctx.operation.quoteId}`);
		assertSameUnit(quote.unit, ctx.operation.unit, `BOLT12 mint quote ${quote.quote}`);
		await this.requireQuoteKey(quote.pubkey);
		const outputData = await ctx.proofService.createOutputsAndIncrementCounters(ctx.operation.mintUrl, {
			keep: {
				amount: ctx.operation.amount,
				unit: ctx.operation.unit
			},
			send: {
				amount: Amount$1.zero(),
				unit: ctx.operation.unit
			}
		}, {});
		if (outputData.keep.length === 0) throw new Error("Failed to create deterministic outputs for BOLT12 mint operation");
		return {
			...ctx.operation,
			quoteId: quote.quote,
			request: quote.request,
			expiry: quote.expiry,
			pubkey: quote.pubkey,
			outputData: serializeOutputData({
				keep: outputData.keep,
				send: []
			}),
			state: "pending"
		};
	}
	async execute(ctx) {
		const quoteKey = await this.keyRingService.getMintQuoteKeyPair(ctx.operation.pubkey ?? "");
		if (!quoteKey) throw new Error(`Missing NUT-20 mint quote key for pubkey ${ctx.operation.pubkey ?? "(missing)"}`);
		const outputData = deserializeOutputData(ctx.operation.outputData);
		const remoteQuote = await ctx.mintAdapter.checkMintQuote(ctx.operation.mintUrl, "bolt12", ctx.operation.quoteId);
		this.assertQuoteMatchesRequest(remoteQuote, ctx.operation.pubkey ?? "", ctx.operation.unit);
		try {
			return {
				status: "ISSUED",
				proofs: await ctx.wallet.mintProofsBolt12(ctx.operation.amount, remoteQuote, bytesToHex(quoteKey.secretKey), void 0, {
					type: "custom",
					data: outputData.keep
				})
			};
		} catch (error) {
			if (this.isAlreadyIssuedError(error)) return { status: "ALREADY_ISSUED" };
			throw error;
		}
	}
	async recoverExecuting(ctx) {
		const restored = await this.recoverSignedOutputs(ctx);
		if (restored) return restored;
		const { operation } = ctx;
		const expectedPubkey = operation.pubkey;
		if (!expectedPubkey) return {
			status: "TERMINAL",
			error: `Recovered: BOLT12 mint operation ${operation.id} is missing NUT-20 quote pubkey`
		};
		let remoteQuote;
		try {
			remoteQuote = await ctx.mintAdapter.checkMintQuote(operation.mintUrl, "bolt12", operation.quoteId);
		} catch (error) {
			ctx.logger?.warn("Failed to check BOLT12 mint quote during recovery", {
				mintUrl: operation.mintUrl,
				quoteId: operation.quoteId,
				operationId: operation.id,
				error: error instanceof Error ? error.message : String(error)
			});
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
		const validationError = this.getQuoteValidationError(remoteQuote, expectedPubkey, operation.unit);
		if (validationError) return {
			status: "TERMINAL",
			error: validationError.message
		};
		if (this.isExpired(remoteQuote)) return {
			status: "TERMINAL",
			error: `Recovered: BOLT12 quote ${operation.quoteId} expired while executing mint`
		};
		const quoteKey = await this.keyRingService.getMintQuoteKeyPair(expectedPubkey);
		if (!quoteKey) return {
			status: "TERMINAL",
			error: `Missing NUT-20 mint quote key for pubkey ${expectedPubkey}`
		};
		const available = this.getAvailableAmount(remoteQuote);
		if (available.lessThan(operation.amount)) return {
			status: "PENDING",
			error: `Recovered: BOLT12 quote ${operation.quoteId} has ${available} available, requested ${operation.amount}`
		};
		const outputData = deserializeOutputData(operation.outputData);
		try {
			const proofs = await ctx.wallet.mintProofsBolt12(operation.amount, remoteQuote, bytesToHex(quoteKey.secretKey), void 0, {
				type: "custom",
				data: outputData.keep
			});
			await ctx.proofService.saveProofs(operation.mintUrl, mapProofToCoreProof(operation.mintUrl, "ready", proofs, {
				unit: operation.unit,
				createdByOperationId: operation.id
			}));
			return { status: "FINALIZED" };
		} catch (error) {
			if (this.isAlreadyIssuedError(error)) return await this.recoverSignedOutputs(ctx) ?? {
				status: "PENDING",
				error: `Recovered: BOLT12 quote ${operation.quoteId} was already issued but proofs were not recoverable`
			};
			if (this.isExpiredMintError(error)) return {
				status: "TERMINAL",
				error: `Recovered: BOLT12 quote ${operation.quoteId} expired while executing mint`
			};
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	async checkPending(ctx) {
		const { operation } = ctx;
		const observedRemoteStateAt = Date.now();
		const remoteQuote = await ctx.mintAdapter.checkMintQuote(operation.mintUrl, "bolt12", operation.quoteId);
		const expectedPubkey = operation.pubkey;
		if (!expectedPubkey) return {
			observedRemoteStateAt,
			quoteSnapshot: remoteQuote,
			category: "terminal",
			terminalFailure: {
				reason: `BOLT12 mint operation ${operation.id} is missing NUT-20 quote pubkey`,
				code: "missing_quote_pubkey",
				retryable: false,
				observedAt: observedRemoteStateAt
			}
		};
		const validationError = this.getQuoteValidationError(remoteQuote, expectedPubkey, operation.unit);
		if (validationError) return {
			observedRemoteStateAt,
			category: "terminal",
			terminalFailure: {
				reason: validationError.message,
				code: "invalid_quote",
				retryable: false,
				observedAt: observedRemoteStateAt
			}
		};
		if (this.isExpired(remoteQuote)) return {
			observedRemoteStateAt,
			quoteSnapshot: remoteQuote,
			category: "terminal",
			terminalFailure: {
				reason: `BOLT12 mint quote ${operation.quoteId} expired before operation ${operation.id} could be minted`,
				code: "quote_expired",
				retryable: false,
				observedAt: observedRemoteStateAt
			}
		};
		return {
			observedRemoteStateAt,
			quoteSnapshot: remoteQuote,
			category: this.getAvailableAmount(remoteQuote).greaterThanOrEqual(operation.amount) ? "ready" : "waiting"
		};
	}
	async createRemoteQuote(wallet, payload) {
		const quote = await wallet.createMintQuoteBolt12(payload.pubkey, {
			amount: payload.amount,
			description: payload.description
		});
		assertSameUnit(quote.unit, payload.unit, `BOLT12 mint quote ${quote.quote}`);
		return quote;
	}
	async requireQuoteKey(pubkey) {
		if (!await this.keyRingService.getMintQuoteKeyPair(pubkey)) throw new Error(`Missing NUT-20 mint quote key for pubkey ${pubkey}`);
	}
	assertQuoteMatchesRequest(quote, expectedPubkey, expectedUnit, expectedAmount) {
		if (quote.pubkey !== expectedPubkey) throw new Error(`BOLT12 mint quote ${quote.quote} returned pubkey ${quote.pubkey} instead of requested pubkey ${expectedPubkey}`);
		assertSameUnit(quote.unit, expectedUnit, `BOLT12 mint quote ${quote.quote}`);
		this.assertQuoteAmount(quote, expectedAmount);
		if (Amount$1.from(quote.amount_paid).lessThan(Amount$1.from(quote.amount_issued))) throw new Error(`BOLT12 mint quote ${quote.quote} has amount_issued greater than amount_paid`);
	}
	assertQuoteAmount(quote, expectedAmount) {
		if (expectedAmount === void 0) return;
		if (!quote.amount || !quote.amount.equals(expectedAmount)) {
			const observedAmount = quote.amount ?? "(missing)";
			throw new Error(`Mint quote ${quote.quote} amount ${observedAmount} does not match requested amount ${expectedAmount}`);
		}
	}
	async recoverSignedOutputs(ctx) {
		try {
			return (await ctx.proofService.recoverProofsFromOutputData(ctx.operation.mintUrl, ctx.operation.outputData, {
				unit: ctx.operation.unit,
				createdByOperationId: ctx.operation.id
			})).length > 0 ? { status: "FINALIZED" } : null;
		} catch (error) {
			ctx.logger?.warn("Failed to recover BOLT12 mint outputs from output data", {
				mintUrl: ctx.operation.mintUrl,
				quoteId: ctx.operation.quoteId,
				operationId: ctx.operation.id,
				error: error instanceof Error ? error.message : String(error)
			});
			return {
				status: "PENDING",
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	getQuoteValidationError(quote, expectedPubkey, expectedUnit) {
		try {
			this.assertQuoteMatchesRequest(quote, expectedPubkey, expectedUnit);
			return null;
		} catch (error) {
			return error instanceof Error ? error : new Error(String(error));
		}
	}
	getAvailableAmount(quote) {
		return Amount$1.from(quote.amount_paid).subtract(Amount$1.from(quote.amount_issued));
	}
	isExpired(quote) {
		return quote.expiry !== null && quote.expiry * 1e3 <= Date.now();
	}
	isAlreadyIssuedError(error) {
		if (error instanceof MintOperationError && (error.code === 20002 || error.code === 11003)) return true;
		const message = error instanceof Error ? error.message : String(error);
		return /already (issued|signed)|outputs? already/i.test(message);
	}
	isExpiredMintError(error) {
		if (error instanceof MintOperationError && error.code === 20007) return true;
		const message = error instanceof Error ? error.message : String(error);
		return /expired/i.test(message);
	}
};

//#endregion
//#region infra/handlers/paymentRequestReceive/PaymentRequestReceiveTransportHandlerProvider.ts
/**
* Runtime registry for incoming payment request transport handlers.
* Keeps transport wiring concerns out of the receive saga.
*/
var PaymentRequestReceiveTransportHandlerProvider = class {
	registry = /* @__PURE__ */ new Map();
	register(handler) {
		if (this.registry.has(handler.type)) throw new PaymentRequestError(`Payment request receive transport handler '${handler.type}' is already registered`);
		this.registry.set(handler.type, handler);
		return () => {
			if (this.registry.get(handler.type) === handler) this.registry.delete(handler.type);
		};
	}
	get(type) {
		const handler = this.registry.get(type);
		if (!handler) throw new PaymentRequestError(`No payment request receive transport handler registered for '${type}'`);
		return handler;
	}
	getOptional(type) {
		return this.registry.get(type);
	}
};

//#endregion
//#region logging/ConsoleLogger.ts
var ConsoleLogger = class ConsoleLogger {
	prefix;
	level;
	static levelPriority = {
		error: 0,
		warn: 1,
		info: 2,
		debug: 3
	};
	constructor(prefix = "coco", options = {}) {
		this.prefix = prefix;
		this.level = options.level ?? "info";
	}
	shouldLog(level) {
		return ConsoleLogger.levelPriority[level] <= ConsoleLogger.levelPriority[this.level];
	}
	error(message, ...meta) {
		if (!this.shouldLog("error")) return;
		console.error(`[${this.prefix}] ERROR: ${message}`, ...meta);
	}
	warn(message, ...meta) {
		if (!this.shouldLog("warn")) return;
		console.warn(`[${this.prefix}] WARN: ${message}`, ...meta);
	}
	info(message, ...meta) {
		if (!this.shouldLog("info")) return;
		console.info(`[${this.prefix}] INFO: ${message}`, ...meta);
	}
	debug(message, ...meta) {
		if (!this.shouldLog("debug")) return;
		console.debug(`[${this.prefix}] DEBUG: ${message}`, ...meta);
	}
	log(level, message, ...meta) {
		switch (level) {
			case "error":
				this.error(message, ...meta);
				break;
			case "warn":
				this.warn(message, ...meta);
				break;
			case "info":
				this.info(message, ...meta);
				break;
			case "debug":
				this.debug(message, ...meta);
				break;
			default: this.info(message, ...meta);
		}
	}
	child(bindings) {
		return new ConsoleLogger([this.prefix, ...Object.entries(bindings).map(([k, v]) => `${k}=${String(v)}`)].join(" "), { level: this.level });
	}
};

//#endregion
//#region logging/NullLogger.ts
var NullLogger = class {
	error(_message, ..._meta) {}
	warn(_message, ..._meta) {}
	info(_message, ..._meta) {}
	debug(_message, ..._meta) {}
	log(_level, _message, ..._meta) {}
	child(_bindings) {
		return this;
	}
};

//#endregion
//#region api/WalletBalancesApi.ts
var WalletBalancesApi = class {
	proofService;
	constructor(proofService) {
		this.proofService = proofService;
	}
	async byMint(scope) {
		return this.proofService.getBalancesByMint(scope);
	}
	async byMintAndUnit(scope) {
		return this.proofService.getBalancesByMintAndUnit(scope);
	}
	async byUnit(scope) {
		return this.proofService.getBalancesByUnit(scope);
	}
	async total(scope) {
		return this.proofService.getBalanceTotal(scope);
	}
	async totalByUnit(scope) {
		return this.proofService.getBalanceTotalByUnit(scope);
	}
};

//#endregion
//#region api/WalletApi.ts
var WalletApi = class {
	mintService;
	walletService;
	proofService;
	walletRestoreService;
	receiveOperationService;
	tokenService;
	logger;
	balances;
	constructor(mintService, walletService, proofService, walletRestoreService, receiveOperationService, tokenService, logger) {
		this.mintService = mintService;
		this.walletService = walletService;
		this.proofService = proofService;
		this.walletRestoreService = walletRestoreService;
		this.receiveOperationService = receiveOperationService;
		this.tokenService = tokenService;
		this.logger = logger;
		this.balances = new WalletBalancesApi(proofService);
	}
	/**
	* Receive a token in one shot.
	*
	* For a multi-step receive flow (review fees/amounts before committing),
	* use `manager.ops.receive.prepare()` and `manager.ops.receive.execute()`.
	*/
	async receive(token) {
		return this.receiveOperationService.receive(token);
	}
	async restore(mintUrl, options) {
		this.logger?.info("Starting restore", { mintUrl });
		const mint = await this.mintService.addMintByUrl(mintUrl, { trusted: true });
		this.logger?.debug("Mint fetched for restore", {
			mintUrl,
			keysetCount: mint.keysets.length
		});
		const unitFilter = this.getUnitFilter(options?.units);
		const failedKeysetIds = {};
		for (const { keyset, unit } of this.getUnitScopedKeysets(mint.keysets, unitFilter)) try {
			const wallet = await this.walletService.getWallet(mintUrl, unit);
			await this.walletRestoreService.restoreKeyset(mintUrl, wallet, keyset.id, unit);
		} catch (error) {
			this.logger?.error("Keyset restore failed", {
				mintUrl,
				keysetId: keyset.id,
				unit,
				error
			});
			failedKeysetIds[keyset.id] = error;
		}
		if (Object.keys(failedKeysetIds).length > 0) {
			this.logger?.error("Restore completed with failures", {
				mintUrl,
				failedKeysetIds: Object.keys(failedKeysetIds)
			});
			throw new Error("Failed to restore some keysets");
		}
		this.logger?.info("Restore completed successfully", { mintUrl });
	}
	/**
	* Sweeps a mint by sweeping each keyset and adds the swept proofs to the wallet
	* @param mintUrl - The URL of the mint to sweep
	* @param bip39seed - The BIP39 seed of the wallet to sweep
	*/
	async sweep(mintUrl, bip39seed, options) {
		this.logger?.info("Starting sweep", { mintUrl });
		const mint = await this.mintService.addMintByUrl(mintUrl, { trusted: true });
		this.logger?.debug("Mint fetched for sweep", {
			mintUrl,
			keysetCount: mint.keysets.length
		});
		const unitFilter = this.getUnitFilter(options?.units);
		const failedKeysetIds = {};
		for (const { keyset, unit } of this.getUnitScopedKeysets(mint.keysets, unitFilter)) try {
			await this.walletRestoreService.sweepKeyset(mintUrl, keyset.id, bip39seed, unit);
		} catch (error) {
			this.logger?.error("Keyset restore failed", {
				mintUrl,
				keysetId: keyset.id,
				unit,
				error
			});
			failedKeysetIds[keyset.id] = error;
		}
		if (Object.keys(failedKeysetIds).length > 0) {
			this.logger?.error("Restore completed with failures", {
				mintUrl,
				failedKeysetIds: Object.keys(failedKeysetIds)
			});
			throw new Error("Failed to restore some keysets");
		}
		this.logger?.info("Restore completed successfully", { mintUrl });
	}
	/**
	* Decode a token string into a Token object.
	* If mintUrl is provided, decodes token with mint keysets (supports all token formats).
	* If no mintUrl, attempts to decode using wallet's known keysets (may fail for some token formats).
	*
	* Note: For reliable decoding of all token formats, provide a mintUrl.
	*
	* @param tokenString - The encoded token string to decode
	* @param mintUrl - Optional mint URL to use for decoding (provides access to mint keysets for decoding)
	* @returns The decoded Token or array of Proofs
	*/
	async decodeToken(tokenString, mintUrl) {
		if (mintUrl) return await this.tokenService.decodeToken(tokenString, mintUrl);
		const metadata = getTokenMetadata$1(tokenString);
		return this.tokenService.decodeToken(tokenString, metadata.mint);
	}
	/**
	* Encode a token to a string.
	* @param token - The token to encode
	* @param opts - Optional encoding options
	* @returns Encoded token string
	*/
	encodeToken(token, opts) {
		return getEncodedToken$1(token, opts);
	}
	/**
	* Encode a PaymentRequest to a string.
	* @param paymentRequest - The PaymentRequest to encode
	* @param version - Encoding version ('creqA' for base64 text, 'creqB' for bech32m binary). Defaults to 'creqA'.
	* @returns Encoded payment request string
	*/
	encodePaymentRequest(paymentRequest, version) {
		if (version === "creqB") return paymentRequest.toEncodedCreqB();
		return paymentRequest.toEncodedCreqA();
	}
	getUnitFilter(units) {
		const normalizedUnits = normalizeUnitList(units);
		return normalizedUnits ? new Set(normalizedUnits) : void 0;
	}
	getUnitScopedKeysets(keysets, unitFilter) {
		return keysets.map((keyset) => ({
			keyset,
			unit: normalizeUnit(keyset.unit ?? DEFAULT_UNIT, { defaultUnit: DEFAULT_UNIT })
		})).filter(({ unit }) => !unitFilter || unitFilter.has(unit));
	}
};

//#endregion
//#region api/MintApi.ts
var MintApi = class {
	constructor(mintService) {
		this.mintService = mintService;
	}
	async addMint(mintUrl, options) {
		return this.mintService.addMintByUrl(mintUrl, options);
	}
	async getMintInfo(mintUrl) {
		return this.mintService.getMintInfo(mintUrl);
	}
	async isTrustedMint(mintUrl) {
		return this.mintService.isTrustedMint(mintUrl);
	}
	async getAllMints() {
		return this.mintService.getAllMints();
	}
	async getAllTrustedMints() {
		return this.mintService.getAllTrustedMints();
	}
	async trustMint(mintUrl) {
		return this.mintService.trustMint(mintUrl);
	}
	async untrustMint(mintUrl) {
		return this.mintService.untrustMint(mintUrl);
	}
};

//#endregion
//#region api/KeyRingApi.ts
var KeyRingApi = class {
	constructor(keyRingService) {
		this.keyRingService = keyRingService;
	}
	async generateKeyPair(dumpSecretKey) {
		if (dumpSecretKey === true) return this.keyRingService.generateNewKeyPair({ dumpSecretKey: true });
		return this.keyRingService.generateNewKeyPair({ dumpSecretKey: false });
	}
	/**
	* Adds an existing keypair to the keyring using a secret key.
	* @param secretKey - The 32-byte secret key as Uint8Array
	*/
	async addKeyPair(secretKey) {
		return this.keyRingService.addKeyPair(secretKey);
	}
	/**
	* Removes a keypair from the keyring.
	* @param publicKey - The public key (hex string) of the keypair to remove
	*/
	async removeKeyPair(publicKey) {
		return this.keyRingService.removeKeyPair(publicKey);
	}
	/**
	* Retrieves a specific keypair by its public key.
	* @param publicKey - The public key (hex string) to look up
	* @returns The keypair if found, null otherwise
	*/
	async getKeyPair(publicKey) {
		return this.keyRingService.getKeyPair(publicKey);
	}
	/**
	* Gets the most recently added keypair.
	* @returns The latest keypair if any exist, null otherwise
	*/
	async getLatestKeyPair() {
		return this.keyRingService.getLatestKeyPair();
	}
	/**
	* Gets all keypairs stored in the keyring.
	* @returns Array of all keypairs
	*/
	async getAllKeyPairs() {
		return this.keyRingService.getAllKeyPairs();
	}
};

//#endregion
//#region api/SubscriptionApi.ts
var SubscriptionApi = class {
	subs;
	logger;
	constructor(subs, logger) {
		this.subs = subs;
		this.logger = logger;
	}
	async awaitMintQuotePaid(mintUrl, quoteId, method = "bolt11") {
		return this.awaitFirstNotification(mintUrl, `${method}_mint_quote`, [quoteId]);
	}
	async awaitMeltQuotePaid(mintUrl, quoteId, method = "bolt11") {
		return this.awaitFirstNotification(mintUrl, `${method}_melt_quote`, [quoteId]);
	}
	async awaitFirstNotification(mintUrl, kind, filters) {
		return new Promise(async (resolve, reject) => {
			try {
				const { unsubscribe } = await this.subs.subscribe(mintUrl, kind, filters, (payload) => {
					try {
						resolve(payload);
					} finally {
						unsubscribe().catch(() => void 0);
					}
				});
			} catch (err) {
				this.logger?.error("Failed to await subscription notification", {
					mintUrl,
					kind,
					err
				});
				reject(err);
			}
		});
	}
};

//#endregion
//#region api/HistoryApi.ts
var HistoryApi = class {
	historyService;
	constructor(historyService) {
		this.historyService = historyService;
	}
	async getPaginatedHistory(offset = 0, limit = 25) {
		return this.historyService.getPaginatedHistory(offset, limit);
	}
	async getHistoryEntryById(id) {
		return this.historyService.getHistoryEntryById(id);
	}
	async getOperationIdForHistoryEntry(id) {
		return this.historyService.getHistoryEntryById(id).then((entry) => {
			const operationId = entry?.operationId?.trim();
			return operationId ? operationId : null;
		});
	}
};

//#endregion
//#region api/AuthApi.ts
/**
* Public API for NUT-21/22 authentication.
*
* Thin wrapper that delegates to AuthService,
* consistent with the other Api → Service pattern.
*/
var AuthApi = class {
	constructor(authService) {
		this.authService = authService;
	}
	async startDeviceAuth(mintUrl) {
		return this.authService.startDeviceAuth(mintUrl);
	}
	async login(mintUrl, tokens) {
		return this.authService.login(mintUrl, tokens);
	}
	async restore(mintUrl) {
		return this.authService.restore(mintUrl);
	}
	async logout(mintUrl) {
		return this.authService.logout(mintUrl);
	}
	async getSession(mintUrl) {
		return this.authService.getSession(mintUrl);
	}
	async hasSession(mintUrl) {
		return this.authService.hasSession(mintUrl);
	}
	getAuthProvider(mintUrl) {
		return this.authService.getAuthProvider(mintUrl);
	}
	getPoolSize(mintUrl) {
		return this.authService.getPoolSize(mintUrl);
	}
};

//#endregion
//#region api/SendOpsApi.ts
/**
* Operation-oriented API for send workflows.
*
* This API exposes the send lifecycle explicitly:
* 1. `prepare()` to create and reserve inputs
* 2. `execute()` to produce the outgoing token
* 3. `refresh()` to re-check pending operations
* 4. `cancel()` or `reclaim()` to roll back when allowed
*/
var SendOpsApi = class {
	/** Recovery helpers for send operations. */
	recovery = {
		run: async () => this.sendOperationService.recoverPendingOperations(),
		inProgress: () => this.sendOperationService.isRecoveryInProgress()
	};
	/** Lightweight diagnostics for send operations. */
	diagnostics = { isLocked: (operationId) => this.sendOperationService.isOperationLocked(operationId) };
	constructor(sendOperationService) {
		this.sendOperationService = sendOperationService;
	}
	/**
	* Creates a prepared send operation without executing it.
	*
	* Use this to inspect the operation, fee impact, and target configuration
	* before producing the outgoing token.
	*/
	async prepare(input) {
		const parsed = parseUnitAmount(input.amount, { explicitUnit: input.unit });
		const initOp = await this.sendOperationService.init(input.mintUrl, parsed, this.getCreateOptions(input.target));
		return this.sendOperationService.prepare(initOp);
	}
	/**
	* Executes a prepared send operation and returns the shareable token.
	*
	* Accepts either a prepared operation object or its ID. The latest operation
	* state is always reloaded before execution.
	*/
	async execute(operationOrId) {
		const operation = await this.resolveOperation(operationOrId);
		if (operation.state !== "prepared") throw new Error(`Cannot execute operation in state '${operation.state}'. Expected 'prepared'.`);
		return this.sendOperationService.execute(operation);
	}
	/** Returns a send operation by ID, or `null` when it does not exist. */
	async get(operationId) {
		return this.sendOperationService.getOperation(operationId);
	}
	/** Lists send operations that are prepared and ready to execute or cancel. */
	async listPrepared() {
		return this.sendOperationService.getPreparedOperations();
	}
	/** Lists send operations that are currently in flight. */
	async listInFlight() {
		return this.sendOperationService.getPendingOperations();
	}
	/**
	* Re-checks a send operation and returns its latest persisted state.
	*
	* Pending operations are actively checked with the service before the updated
	* operation is returned.
	*/
	async refresh(operationId) {
		const operation = await this.requireOperation(operationId);
		if (operation.state === "pending") {
			await this.sendOperationService.checkPendingOperation(operation);
			return this.requireOperation(operationId);
		}
		return operation;
	}
	/**
	* Cancels a prepared send operation before it has been executed.
	*/
	async cancel(operationId) {
		const operation = await this.requireOperation(operationId);
		if (operation.state !== "prepared") throw new Error(`Cannot cancel operation in state '${operation.state}'. Expected 'prepared'.`);
		await this.sendOperationService.rollback(operation.id);
	}
	/**
	* Attempts to reclaim a pending send operation.
	*
	* This is intended for sends that are already in flight but still support
	* rollback according to the underlying send method.
	*/
	async reclaim(operationId) {
		const operation = await this.requireOperation(operationId);
		if (operation.state !== "pending") throw new Error(`Cannot reclaim operation in state '${operation.state}'. Expected 'pending'.`);
		await this.sendOperationService.rollback(operation.id);
	}
	/**
	* Finalizes a pending send operation explicitly.
	*
	* Most callers should rely on proof-state watchers when available, but this
	* method remains useful when the caller knows the token has been claimed.
	*/
	async finalize(operationId) {
		await this.sendOperationService.finalize(operationId);
	}
	getCreateOptions(target) {
		if (!target) return {
			method: "default",
			methodData: {}
		};
		const { type, ...methodData } = target;
		return {
			method: type,
			methodData
		};
	}
	async resolveOperation(operationOrId) {
		if (typeof operationOrId === "string") return this.requireOperation(operationOrId);
		return this.requireOperation(operationOrId.id);
	}
	async requireOperation(operationId) {
		const operation = await this.sendOperationService.getOperation(operationId);
		if (!operation) throw new Error(`Operation ${operationId} not found`);
		return operation;
	}
};

//#endregion
//#region api/ReceiveOpsApi.ts
/**
* Operation-oriented API for receive workflows.
*
* This API exposes receiving as an explicit lifecycle so callers can inspect,
* resume, and cancel operations instead of relying only on a one-shot receive
* call.
*/
var ReceiveOpsApi = class {
	/** Recovery helpers for receive operations. */
	recovery = {
		run: async () => this.receiveOperationService.recoverPendingOperations(),
		inProgress: () => this.receiveOperationService.isRecoveryInProgress()
	};
	/** Lightweight diagnostics for receive operations. */
	diagnostics = { isLocked: (operationId) => this.receiveOperationService.isOperationLocked(operationId) };
	constructor(receiveOperationService) {
		this.receiveOperationService = receiveOperationService;
	}
	/**
	* Decodes and validates a token, then prepares a receive operation without
	* executing it.
	*/
	async prepare(input) {
		const initOp = await this.receiveOperationService.init(input.token);
		return this.receiveOperationService.prepare(initOp);
	}
	/**
	* Executes a prepared receive operation.
	*
	* Accepts either a prepared operation object or its ID. The latest operation
	* state is always reloaded before execution.
	*/
	async execute(operationOrId) {
		const operation = await this.resolveOperation(operationOrId);
		if (operation.state !== "prepared") throw new Error(`Cannot execute operation in state '${operation.state}'. Expected 'prepared'.`);
		return this.receiveOperationService.execute(operation);
	}
	/** Returns a receive operation by ID, or `null` when it does not exist. */
	async get(operationId) {
		return this.receiveOperationService.getOperation(operationId);
	}
	/** Lists receive operations that are prepared and ready to execute or cancel. */
	async listPrepared() {
		return this.receiveOperationService.getPreparedOperations();
	}
	/** Lists receive operations that are currently in flight. */
	async listInFlight() {
		return this.receiveOperationService.getPendingOperations();
	}
	/**
	* Re-checks a receive operation and returns its latest persisted state.
	*
	* Executing operations are actively recovered before the updated operation is
	* returned.
	*/
	async refresh(operationId) {
		const operation = await this.requireOperation(operationId);
		if (operation.state === "executing") {
			await this.receiveOperationService.recoverExecutingOperation(operation);
			return this.requireOperation(operationId);
		}
		return operation;
	}
	/**
	* Cancels a receive operation that has not completed yet.
	*
	* Only `init` and `prepared` receive operations can be cancelled.
	*/
	async cancel(operationId, reason) {
		const operation = await this.requireOperation(operationId);
		if (operation.state !== "init" && operation.state !== "prepared") throw new Error(`Cannot cancel operation in state '${operation.state}'. Expected 'init' or 'prepared'.`);
		await this.receiveOperationService.rollback(operation.id, reason);
	}
	async resolveOperation(operationOrId) {
		if (typeof operationOrId === "string") return this.requireOperation(operationOrId);
		return this.requireOperation(operationOrId.id);
	}
	async requireOperation(operationId) {
		const operation = await this.receiveOperationService.getOperation(operationId);
		if (!operation) throw new Error(`Operation ${operationId} not found`);
		return operation;
	}
};

//#endregion
//#region api/MeltOpsApi.ts
/**
* Operation-oriented API for melt workflows.
*
* This API makes the melt lifecycle explicit so callers can prepare a payment,
* execute it, inspect or refresh its state, and recover or roll it back when
* allowed by the underlying method.
*/
var MeltOpsApi = class {
	/** Recovery helpers for melt operations. */
	recovery = {
		run: async () => this.meltOperationService.recoverPendingOperations(),
		inProgress: () => this.meltOperationService.isRecoveryInProgress()
	};
	/** Lightweight diagnostics for melt operations. */
	diagnostics = { isLocked: (operationId) => this.meltOperationService.isOperationLocked(operationId) };
	constructor(meltOperationService) {
		this.meltOperationService = meltOperationService;
	}
	/**
	* Prepares a melt operation against an existing canonical quote without executing it.
	*
	* Use this to inspect the generated operation and any quote-related data
	* before committing to the external payment.
	*/
	async prepare(input) {
		return this.meltOperationService.prepareExistingQuote(input.mintUrl, input.method, input.quoteId, {
			expectedUnit: input.unit,
			feeIndex: input.method === "onchain" ? input.feeIndex : void 0
		});
	}
	/**
	* Executes a prepared melt operation.
	*
	* Accepts either a prepared operation object or its ID. The latest operation
	* state is always reloaded before execution.
	*/
	async execute(operationOrId) {
		const operation = await this.resolveOperation(operationOrId);
		if (operation.state !== "prepared") throw new Error(`Cannot execute operation in state '${operation.state}'. Expected 'prepared'.`);
		return this.meltOperationService.execute(operation.id);
	}
	/** Returns a melt operation by ID, or `null` when it does not exist. */
	async get(operationId) {
		return this.meltOperationService.getOperation(operationId);
	}
	/** Returns a melt operation by mint URL, method, and quote ID, or `null` if not found. */
	async getByQuote(input) {
		return this.meltOperationService.getOperationByQuote(input.mintUrl, input.method, input.quoteId);
	}
	/** Lists melt operations for a mint URL and quote ID. */
	async listByQuote(mintUrl, quoteId) {
		return this.meltOperationService.listOperationsByQuote(mintUrl, quoteId);
	}
	/** Lists melt operations that are prepared and ready to execute or cancel. */
	async listPrepared() {
		return this.meltOperationService.getPreparedOperations();
	}
	/** Lists melt operations that are currently in flight. */
	async listInFlight() {
		return this.meltOperationService.getPendingOperations();
	}
	/**
	* Re-checks a melt operation and returns its latest persisted state.
	*
	* Pending operations are actively checked with the service before the updated
	* operation is returned. Executing operations are recovered before returning
	* the updated state.
	*/
	async refresh(operationId) {
		const operation = await this.requireOperation(operationId);
		if (operation.state === "pending") {
			await this.meltOperationService.checkPendingOperation(operation.id);
			return this.requireOperation(operationId);
		}
		if (operation.state === "executing") {
			await this.meltOperationService.recoverExecutingOperation(operation);
			return this.requireOperation(operationId);
		}
		return operation;
	}
	/**
	* Cancels a prepared melt operation before payment has entered the pending
	* phase.
	*/
	async cancel(operationId, reason) {
		const operation = await this.requireOperation(operationId);
		if (operation.state !== "prepared") throw new Error(`Cannot cancel operation in state '${operation.state}'. Expected 'prepared'.`);
		await this.meltOperationService.rollback(operation.id, reason);
	}
	/**
	* Attempts to reclaim a pending melt operation.
	*
	* This is intended for in-flight melts whose handler determines that rollback
	* is still safe.
	*/
	async reclaim(operationId, reason) {
		const operation = await this.requireOperation(operationId);
		if (operation.state !== "pending") throw new Error(`Cannot reclaim operation in state '${operation.state}'. Expected 'pending'.`);
		await this.meltOperationService.rollback(operation.id, reason);
	}
	/**
	* Finalizes a pending melt operation explicitly.
	*
	* Most callers should prefer `refresh()` unless they already know the melt is
	* ready to finalize.
	*/
	async finalize(operationId) {
		await this.meltOperationService.finalize(operationId);
	}
	async resolveOperation(operationOrId) {
		if (typeof operationOrId === "string") return this.requireOperation(operationOrId);
		return this.requireOperation(operationOrId.id);
	}
	async requireOperation(operationId) {
		const operation = await this.meltOperationService.getOperation(operationId);
		if (!operation) throw new Error(`Operation ${operationId} not found`);
		return operation;
	}
};

//#endregion
//#region api/MintOpsApi.ts
/**
* Operation-oriented API for quote-backed mint workflows.
*
* This API makes the mint lifecycle explicit so callers can move a canonical
* quote into a durable pending operation, execute it, and inspect its progress.
*/
var MintOpsApi = class {
	/** Recovery helpers for mint operations. */
	recovery = {
		run: async () => this.mintOperationService.recoverPendingOperations(),
		inProgress: () => this.mintOperationService.isRecoveryInProgress()
	};
	/** Lightweight diagnostics for mint operations. */
	diagnostics = { isLocked: (operationId) => this.mintOperationService.isOperationLocked(operationId) };
	constructor(mintOperationService) {
		this.mintOperationService = mintOperationService;
	}
	/**
	* Prepares a mint operation against an existing canonical quote without executing it.
	*/
	async prepare(input) {
		const methodData = ("methodData" in input ? input.methodData : void 0) ?? {};
		const explicitAmount = "amount" in input && input.amount !== void 0 ? parseUnitAmount(input.amount, { explicitUnit: input.unit }) : void 0;
		return this.mintOperationService.prepare(input.mintUrl, input.method, input.quoteId, methodData, input.unit, explicitAmount);
	}
	/**
	* Executes a pending mint operation and returns the latest operation state.
	*/
	async execute(operationOrId) {
		const operation = await this.resolveOperation(operationOrId);
		if (operation.state !== "pending") throw new Error(`Cannot execute operation in state '${operation.state}'. Expected 'pending'.`);
		return this.mintOperationService.execute(operation.id);
	}
	/** Returns a mint operation by ID, or `null` when it does not exist. */
	async get(operationId) {
		return this.mintOperationService.getOperation(operationId);
	}
	/** Returns a mint operation by mint URL, method, and quote ID, or `null` if not found. */
	async getByQuote(input) {
		return this.mintOperationService.getOperationByQuote(input.mintUrl, input.method, input.quoteId);
	}
	/** Lists mint operations for a mint URL and quote ID. */
	async listByQuote(mintUrl, quoteId) {
		return this.mintOperationService.listOperationsByQuote(mintUrl, quoteId);
	}
	/** Lists mint operations that are pending redemption or remote settlement. */
	async listPending() {
		return this.mintOperationService.getPendingOperations();
	}
	/** Lists mint operations that are pending or currently executing. */
	async listInFlight() {
		return this.mintOperationService.getInFlightOperations();
	}
	/**
	* Checks the remote quote state for a pending mint operation.
	* Paid or issued quotes are reconciled immediately.
	*/
	async checkPayment(operationId) {
		const operation = await this.requireOperation(operationId);
		if (operation.state !== "pending") throw new Error(`Cannot check payment in state '${operation.state}'. Expected 'pending'.`);
		return this.mintOperationService.checkPendingOperation(operation.id);
	}
	/**
	* Re-checks a mint operation and returns its latest persisted state.
	*/
	async refresh(operationId) {
		const operation = await this.requireOperation(operationId);
		if (operation.state === "pending") {
			await this.mintOperationService.checkPendingOperation(operation.id);
			return this.requireOperation(operationId);
		}
		if (operation.state === "executing") {
			await this.mintOperationService.recoverExecutingOperation(operation);
			return this.requireOperation(operationId);
		}
		return operation;
	}
	/**
	* Attempts to finalize a mint operation explicitly.
	*
	* Pending operations are executed, executing operations are recovered,
	* and terminal operations are returned as-is.
	*/
	async finalize(operationId) {
		return this.mintOperationService.finalize(operationId);
	}
	async resolveOperation(operationOrId) {
		if (typeof operationOrId === "string") return this.requireOperation(operationOrId);
		return this.requireOperation(operationOrId.id);
	}
	async requireOperation(operationId) {
		const operation = await this.mintOperationService.getOperation(operationId);
		if (!operation) throw new Error(`Operation ${operationId} not found`);
		return operation;
	}
};

//#endregion
//#region api/QuoteApi.ts
var MintQuoteApi = class {
	constructor(quoteLifecycle) {
		this.quoteLifecycle = quoteLifecycle;
	}
	async create(input) {
		if (input.method === "bolt11") {
			const bolt11Input = input;
			const parsed = parseUnitAmount(bolt11Input.amount, { explicitUnit: bolt11Input.unit });
			return this.quoteLifecycle.createMintQuote(bolt11Input.mintUrl, bolt11Input.method, { amount: parsed });
		}
		if (input.method === "bolt12") {
			const bolt12Input = input;
			const parsed = bolt12Input.amount !== void 0 ? parseUnitAmount(bolt12Input.amount, { explicitUnit: bolt12Input.unit }) : void 0;
			const unit = parsed?.unit ?? normalizeUnit(bolt12Input.unit, { defaultUnit: DEFAULT_UNIT });
			const createQuoteData = parsed === void 0 ? {
				unit,
				description: bolt12Input.description
			} : {
				unit,
				amount: parsed,
				description: bolt12Input.description
			};
			return this.quoteLifecycle.createMintQuote(bolt12Input.mintUrl, bolt12Input.method, { ...createQuoteData });
		}
		const onchainInput = input;
		return this.quoteLifecycle.createMintQuote(onchainInput.mintUrl, onchainInput.method, { unit: normalizeUnit(onchainInput.unit, { defaultUnit: DEFAULT_UNIT }) });
	}
	get(input) {
		return this.quoteLifecycle.getMintQuote(input.mintUrl, input.method, input.quoteId);
	}
	import(input) {
		return this.quoteLifecycle.importMintQuote(input.mintUrl, input.method, input.quote);
	}
	listPending(input = {}) {
		return this.quoteLifecycle.getPendingMintQuotes(input.method);
	}
	refresh(input) {
		return this.quoteLifecycle.refreshMintQuote(input.mintUrl, input.method, input.quoteId);
	}
};
var MeltQuoteApi = class {
	constructor(quoteLifecycle) {
		this.quoteLifecycle = quoteLifecycle;
	}
	create(input) {
		return this.quoteLifecycle.createMeltQuote(input.mintUrl, input.method, input.methodData, input.unit);
	}
	get(input) {
		return this.quoteLifecycle.getMeltQuote(input.mintUrl, input.method, input.quoteId);
	}
	listPending(input = {}) {
		return this.quoteLifecycle.getPendingMeltQuotes(input.method);
	}
	refresh(input) {
		return this.quoteLifecycle.refreshMeltQuote(input.mintUrl, input.method, input.quoteId);
	}
};
/**
* API for durable canonical quote state.
*
* Quote rows are not value movements and are separate from operation history.
*/
var QuoteApi = class {
	mint;
	melt;
	constructor(quoteLifecycle) {
		this.mint = new MintQuoteApi(quoteLifecycle);
		this.melt = new MeltQuoteApi(quoteLifecycle);
	}
};

//#endregion
//#region api/OpsApi.ts
/**
* Unified entry point for operation-based wallet workflows.
*
* This API groups the high-level send, receive, and melt operation APIs under a
* single object so callers can discover and use the new operation-oriented
* lifecycle consistently.
*/
var OpsApi = class {
	/**
	* Send operations for preparing, executing, inspecting, refreshing, and
	* recovering token sends.
	*/
	constructor(send, receive, mint, melt) {
		this.send = send;
		this.receive = receive;
		this.mint = mint;
		this.melt = melt;
	}
};

//#endregion
//#region api/PaymentRequestsApi.ts
/**
* API for parsing, preparing, and executing payment requests.
*/
var PaymentRequestsApi = class {
	paymentRequestService;
	incoming;
	constructor(paymentRequestService, paymentRequestReceiveService) {
		this.paymentRequestService = paymentRequestService;
		this.incoming = {
			create: (input) => {
				const parsed = parseUnitAmount(input.amount, { explicitUnit: input.unit });
				return paymentRequestReceiveService.create({
					...input,
					amount: parsed.amount,
					unit: parsed.unit
				});
			},
			cancel: (operationId, reason) => paymentRequestReceiveService.cancel(operationId, reason),
			get: (operationId) => paymentRequestReceiveService.get(operationId),
			list: (filter) => paymentRequestReceiveService.list(filter),
			claimPayload: (operationOrId, payload, source) => paymentRequestReceiveService.claimPayload(operationOrId, payload, source),
			ingestPayload: (payload, source) => paymentRequestReceiveService.ingestPayload(payload, source),
			recovery: { run: () => paymentRequestReceiveService.recoverPendingAttempts() },
			diagnostics: { isLocked: (operationId) => paymentRequestReceiveService.isOperationLocked(operationId) }
		};
	}
	/**
	* Parse and validate an encoded payment request.
	*/
	async parse(paymentRequest) {
		return this.paymentRequestService.parse(paymentRequest);
	}
	/**
	* Prepare a payment request for execution.
	*/
	async prepare(request, options) {
		return this.paymentRequestService.prepare(request, {
			mintUrl: options.mintUrl,
			amount: options.amount === void 0 ? void 0 : parseUnitAmount(options.amount, {
				defaultUnit: request.unit,
				explicitUnit: request.unit
			})
		});
	}
	/**
	* Execute a prepared payment request.
	*/
	async execute(transaction) {
		return this.paymentRequestService.execute(transaction);
	}
};

//#endregion
//#region plugins/types.ts
/**
* Error thrown when a plugin attempts to register an extension key that is already registered.
*/
var ExtensionRegistrationError = class extends Error {
	constructor(pluginName, key) {
		super(`Plugin "${pluginName}" attempted to register extension "${key}", but it is already registered`);
		this.name = "ExtensionRegistrationError";
	}
};
/**
* Error thrown when the same plugin instance is registered more than once.
*/
var DuplicatePluginRegistrationError = class extends Error {
	constructor(pluginName) {
		super(`Plugin "${pluginName}" is already registered`);
		this.name = "DuplicatePluginRegistrationError";
	}
};

//#endregion
//#region plugins/PluginHost.ts
var PluginHost = class {
	plugins = [];
	cleanups = [];
	extensions = {};
	registeredPlugins = /* @__PURE__ */ new WeakSet();
	initializedPlugins = /* @__PURE__ */ new WeakSet();
	readyPlugins = /* @__PURE__ */ new WeakSet();
	initPromises = /* @__PURE__ */ new WeakMap();
	readyPromises = /* @__PURE__ */ new WeakMap();
	services;
	initialized = false;
	readyPhase = false;
	use(plugin) {
		if (this.registeredPlugins.has(plugin)) throw new DuplicatePluginRegistrationError(plugin.name);
		this.registeredPlugins.add(plugin);
		this.plugins.push(plugin);
		if (this.initialized && this.services) {
			const services = this.services;
			const initPromise = this.ensureInitialized(plugin, services);
			if (this.readyPhase) initPromise.then(() => this.ensureReady(plugin, services));
		}
	}
	async init(services) {
		this.services = services;
		this.initialized = true;
		for (const p of this.plugins) await this.ensureInitialized(p, services);
	}
	async ready() {
		if (!this.services) return;
		this.readyPhase = true;
		for (const p of this.plugins) await this.ensureReady(p, this.services);
	}
	async dispose() {
		const errors = [];
		for (const p of this.plugins) try {
			await p.onDispose?.();
		} catch (err) {
			console.error("Plugin dispose error", {
				plugin: p.name,
				err
			});
			errors.push(err);
		}
		while (this.cleanups.length) {
			const fn = this.cleanups.pop();
			try {
				await fn();
			} catch (err) {
				errors.push(err);
			}
		}
		if (errors.length > 0) console.error("One or more plugin dispose/cleanup handlers failed");
	}
	/**
	* Get all registered plugin extensions
	*/
	getExtensions() {
		return this.extensions;
	}
	async ensureInitialized(plugin, services) {
		if (this.initializedPlugins.has(plugin)) return;
		const existing = this.initPromises.get(plugin);
		if (existing) {
			await existing;
			return;
		}
		const promise = this.runInit(plugin, services).then(() => {
			this.initializedPlugins.add(plugin);
		}).finally(() => {
			this.initPromises.delete(plugin);
		});
		this.initPromises.set(plugin, promise);
		await promise;
	}
	async ensureReady(plugin, services) {
		await this.ensureInitialized(plugin, services);
		if (this.readyPlugins.has(plugin)) return;
		const existing = this.readyPromises.get(plugin);
		if (existing) {
			await existing;
			return;
		}
		const promise = this.runReady(plugin, services).then(() => {
			this.readyPlugins.add(plugin);
		}).finally(() => {
			this.readyPromises.delete(plugin);
		});
		this.readyPromises.set(plugin, promise);
		await promise;
	}
	async runInit(plugin, services) {
		const ctx = this.createContext(plugin, services);
		try {
			const cleanup = await plugin.onInit?.(ctx);
			if (typeof cleanup === "function") this.cleanups.push(cleanup);
		} catch (err) {
			if (err instanceof ExtensionRegistrationError) throw err;
			console.error("Plugin init error", {
				plugin: plugin.name,
				err
			});
		}
	}
	async runReady(plugin, services) {
		const ctx = this.createContext(plugin, services);
		try {
			const cleanup = await plugin.onReady?.(ctx);
			if (typeof cleanup === "function") this.cleanups.push(cleanup);
		} catch (err) {
			if (err instanceof ExtensionRegistrationError) throw err;
			console.error("Plugin ready error", {
				plugin: plugin.name,
				err
			});
		}
	}
	createContext(plugin, services) {
		const required = plugin.required ?? [];
		const selected = {};
		for (const k of required) selected[k] = services[k];
		const registerExtension = (key, api) => {
			if (key in this.extensions) throw new ExtensionRegistrationError(plugin.name, key);
			this.extensions[key] = api;
		};
		return {
			services: selected,
			registerExtension
		};
	}
};

//#endregion
//#region quotes/QuoteLifecycle.ts
const MINT_QUOTE_STATE_RANK = {
	UNPAID: 0,
	PAID: 1,
	ISSUED: 2
};
function isMintQuoteStateDowngrade(existing, incoming) {
	return (MINT_QUOTE_STATE_RANK[incoming] ?? 0) < (MINT_QUOTE_STATE_RANK[existing] ?? 0);
}
function maxAmount(left, right) {
	return left.greaterThan(right) ? left : right;
}
function hasReusableSettlementAmounts(snapshot) {
	return snapshot.amount_paid !== void 0 && snapshot.amount_issued !== void 0;
}
function getRemoteStateChange(existing, incoming, rawSnapshot) {
	if (!existing) return true;
	if (existing.method !== incoming.method || existing.quoteId !== incoming.quoteId) return true;
	if (existing.method === "bolt11" && incoming.method === "bolt11") return existing.state !== incoming.state;
	if (existing.reusable && incoming.reusable) {
		const snapshot = rawSnapshot;
		if (!snapshot || hasReusableSettlementAmounts(snapshot)) return !existing.quoteData.amountPaid.equals(incoming.quoteData.amountPaid) || !existing.quoteData.amountIssued.equals(incoming.quoteData.amountIssued);
		const existingState = existing.state;
		const incomingState = rawSnapshot.state;
		return incomingState !== void 0 && existingState !== incomingState;
	}
	return false;
}
var QuoteLifecycle = class {
	mintHandlerProvider;
	meltHandlerProvider;
	mintQuoteRepository;
	meltQuoteRepository;
	proofRepository;
	proofService;
	mintService;
	walletService;
	mintAdapter;
	eventBus;
	logger;
	constructor(deps) {
		this.mintHandlerProvider = deps.mintHandlerProvider;
		this.meltHandlerProvider = deps.meltHandlerProvider;
		this.mintQuoteRepository = deps.mintQuoteRepository;
		this.meltQuoteRepository = deps.meltQuoteRepository;
		this.proofRepository = deps.proofRepository;
		this.proofService = deps.proofService;
		this.mintService = deps.mintService;
		this.walletService = deps.walletService;
		this.mintAdapter = deps.mintAdapter;
		this.eventBus = deps.eventBus;
		this.logger = deps.logger;
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
	async createMintQuote(mintUrl, methodOrIntent, createQuoteDataOrMethod) {
		const method = typeof methodOrIntent === "string" ? methodOrIntent : typeof createQuoteDataOrMethod === "string" ? createQuoteDataOrMethod : "bolt11";
		const createQuoteData = typeof methodOrIntent === "string" ? createQuoteDataOrMethod : { amount: normalizeUnitAmount(methodOrIntent) };
		const parsed = "amount" in createQuoteData && createQuoteData.amount !== void 0 ? normalizeUnitAmount(createQuoteData.amount) : void 0;
		const unit = parsed?.unit ?? normalizeUnit("unit" in createQuoteData ? createQuoteData.unit : void 0, { defaultUnit: DEFAULT_UNIT });
		if (!await this.mintService.isTrustedMint(mintUrl)) throw new UnknownMintError(`Mint ${mintUrl} is not trusted`);
		if (parsed?.amount.isZero()) throw new ProofValidationError("Amount must be a positive number");
		await this.mintService.assertMethodUnitSupported(mintUrl, 4, method, parsed ?? unit);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, unit);
		const quote = await this.mintHandlerProvider.get(method).createQuote({
			...this.buildDeps(),
			mintUrl,
			createQuoteData,
			wallet
		});
		await this.mintQuoteRepository.upsertMintQuote(quote);
		const persistedQuote = await this.mintQuoteRepository.getMintQuote(mintUrl, method, quote.quoteId) ?? quote;
		this.logger?.info("Mint quote created", {
			mintUrl: persistedQuote.mintUrl,
			quoteId: persistedQuote.quoteId,
			method,
			amount: getMintQuoteAmount(persistedQuote)?.toString(),
			unit: persistedQuote.unit
		});
		await this.eventBus.emit("mint-quote:updated", {
			mintUrl: persistedQuote.mintUrl,
			method: persistedQuote.method,
			quoteId: persistedQuote.quoteId,
			quote: persistedQuote
		});
		return persistedQuote;
	}
	getMintQuote(mintUrl, method, quoteId) {
		return this.mintQuoteRepository.getMintQuote(mintUrl, method, quoteId);
	}
	getPendingMintQuotes(method) {
		return this.mintQuoteRepository.getPendingMintQuotes(method);
	}
	async refreshMintQuote(mintUrl, method, quoteId) {
		const existingQuote = await this.mintQuoteRepository.getMintQuote(mintUrl, method, quoteId);
		if (!existingQuote) throw new Error(`Mint quote ${quoteId} for ${method} at ${mintUrl} was not found`);
		const refreshed = await this.mintHandlerProvider.get(method).fetchRemoteQuote({
			...this.buildDeps(),
			quote: existingQuote
		});
		const remoteStateChanged = getRemoteStateChange(existingQuote, refreshed);
		const quote = await this.persistCanonicalMintQuote(refreshed);
		await this.emitMintQuoteUpdatedIfNeeded(quote, remoteStateChanged);
		return quote;
	}
	async requireMintQuoteForPrepare(mintUrl, method, quoteId, expectedUnit) {
		const quote = await this.mintQuoteRepository.getMintQuote(mintUrl, method, quoteId);
		if (!quote) throw new Error(`Mint quote ${quoteId} for ${method} at ${mintUrl} was not found`);
		if (expectedUnit && quote.unit !== expectedUnit.toLowerCase()) throw new Error(`Mint quote ${quoteId} unit ${quote.unit} does not match requested unit ${expectedUnit}`);
		this.assertMintQuoteCanPrepare(quote, `mint quote ${quoteId}`);
		return quote;
	}
	async loadMintQuoteSnapshotForOperation(op) {
		if (!op.quoteId) throw new Error(`Cannot prepare operation ${op.id}: no mint quote ID is attached`);
		const quote = await this.mintQuoteRepository.getMintQuote(op.mintUrl, op.method, op.quoteId);
		if (!quote) throw new Error(`Cannot prepare operation ${op.id}: mint quote ${op.quoteId} for ${op.method} at ${op.mintUrl} was not found`);
		this.assertMintQuoteCanPrepare(quote, `operation ${op.id} mint quote ${op.quoteId}`);
		const quoteAmount = getMintQuoteAmount(quote);
		if (quoteAmount && !quoteAmount.equals(op.amount)) throw new Error(`Cannot prepare operation ${op.id}: mint quote ${op.quoteId} amount ${quoteAmount} does not match requested amount ${op.amount}`);
		if (quote.unit !== op.unit) throw new Error(`Cannot prepare operation ${op.id}: mint quote ${op.quoteId} unit ${quote.unit} does not match requested unit ${op.unit}`);
		return mintQuoteToMethodSnapshot(quote);
	}
	async importMintQuote(mintUrl, method, quote) {
		const normalizedMintUrl = normalizeMintUrl(mintUrl);
		if (!await this.mintService.isTrustedMint(normalizedMintUrl)) throw new UnknownMintError(`Mint ${normalizedMintUrl} is not trusted`);
		const { quote: imported, remoteStateChanged } = await this.resolveAndPersistMintQuoteSnapshot(normalizedMintUrl, method, quote, (resolvedQuote) => this.assertMintQuoteCapabilities(resolvedQuote));
		await this.emitMintQuoteUpdatedIfNeeded(imported, remoteStateChanged);
		return imported;
	}
	async resolveAndPersistMintQuoteSnapshot(mintUrl, method, quote, beforePersist) {
		let canonicalQuote;
		if (method === "bolt11") {
			const bolt11Quote = quote;
			const rawAmount = bolt11Quote.amount;
			if (rawAmount === void 0 || rawAmount === null) throw new ProofValidationError("Mint quote " + bolt11Quote.quote + " has invalid amount");
			const amount = Amount$1.from(rawAmount);
			if (amount.isZero()) throw new ProofValidationError("Mint quote " + bolt11Quote.quote + " has invalid amount");
			canonicalQuote = mintQuoteFromBolt11Response(mintUrl, {
				...bolt11Quote,
				amount
			});
		} else if (method === "onchain") {
			const onchainQuote = quote;
			canonicalQuote = mintQuoteFromOnchainResponse(mintUrl, {
				...onchainQuote,
				amount_paid: onchainQuote.amount_paid ?? Amount$1.zero(),
				amount_issued: onchainQuote.amount_issued ?? Amount$1.zero()
			});
		} else if (method === "bolt12") {
			const bolt12Quote = quote;
			canonicalQuote = mintQuoteFromBolt12Response(mintUrl, {
				...bolt12Quote,
				amount_paid: bolt12Quote.amount_paid ?? Amount$1.zero(),
				amount_issued: bolt12Quote.amount_issued ?? Amount$1.zero()
			});
		} else throw new Error(`Unsupported mint quote import method ${String(method)}`);
		const existing = await this.mintQuoteRepository.getMintQuote(canonicalQuote.mintUrl, canonicalQuote.method, canonicalQuote.quoteId);
		if (existing && isStatefulMintQuote(existing) && isStatefulMintQuote(canonicalQuote) && isMintQuoteStateDowngrade(existing.state, canonicalQuote.state)) {
			await beforePersist?.(existing);
			return {
				quote: existing,
				remoteStateChanged: false
			};
		}
		if (existing?.reusable && canonicalQuote.reusable) canonicalQuote = {
			...canonicalQuote,
			quoteData: {
				...canonicalQuote.quoteData,
				amountPaid: maxAmount(existing.quoteData.amountPaid, canonicalQuote.quoteData.amountPaid),
				amountIssued: maxAmount(existing.quoteData.amountIssued, canonicalQuote.quoteData.amountIssued)
			}
		};
		const remoteStateChanged = getRemoteStateChange(existing, canonicalQuote, quote);
		await beforePersist?.(canonicalQuote);
		return {
			quote: await this.persistCanonicalMintQuote(canonicalQuote),
			remoteStateChanged
		};
	}
	async recordMintQuoteSnapshot(mintUrl, method, snapshot) {
		const { quote, remoteStateChanged } = await this.resolveAndPersistMintQuoteSnapshot(mintUrl, method, snapshot);
		await this.emitMintQuoteUpdatedIfNeeded(quote, remoteStateChanged);
		return quote;
	}
	async recordMintQuoteObservation(operation, state, observedAt = Date.now()) {
		await this.ensureMintQuoteRecordForOperation(operation);
		const existing = await this.mintQuoteRepository.getMintQuote(operation.mintUrl, operation.method, operation.quoteId);
		await this.mintQuoteRepository.setMintQuoteState(operation.mintUrl, operation.method, operation.quoteId, state, observedAt);
		const quote = await this.mintQuoteRepository.getMintQuote(operation.mintUrl, operation.method, operation.quoteId);
		if (!quote) throw new Error(`Cannot record quote observation: mint quote ${operation.quoteId} for ${operation.method} at ${operation.mintUrl} was not found`);
		await this.emitMintQuoteUpdatedIfNeeded(quote, !existing || getMintQuoteRemoteState(existing) !== getMintQuoteRemoteState(quote));
		return quote;
	}
	async createMeltQuote(mintUrl, method, methodData, unit = DEFAULT_UNIT) {
		const normalizedUnit = normalizeUnit(unit, { defaultUnit: DEFAULT_UNIT });
		if (!await this.mintService.isTrustedMint(mintUrl)) throw new UnknownMintError(`Mint ${mintUrl} is not trusted`);
		const normalizedMethodData = normalizeMeltMethodData(methodData);
		if ("amountSats" in normalizedMethodData && normalizedMethodData.amountSats !== void 0 && normalizedMethodData.amountSats.isZero()) throw new ProofValidationError("Amount must be a positive number");
		await this.mintService.assertMethodUnitSupported(mintUrl, 5, method, normalizedUnit);
		const { wallet } = await this.walletService.getWalletWithActiveKeysetId(mintUrl, normalizedUnit);
		const quote = await this.meltHandlerProvider.get(method).createQuote({
			...this.buildDeps(),
			mintUrl,
			methodData: normalizedMethodData,
			unit: normalizedUnit,
			wallet
		});
		if (quote.unit !== normalizedUnit) throw new ProofValidationError(`Melt quote ${quote.quoteId} unit ${quote.unit} does not match requested unit ${normalizedUnit}`);
		await this.meltQuoteRepository.upsertMeltQuote(quote);
		return await this.meltQuoteRepository.getMeltQuote(mintUrl, method, quote.quoteId) ?? quote;
	}
	getMeltQuote(mintUrl, method, quoteId) {
		return this.meltQuoteRepository.getMeltQuote(mintUrl, method, quoteId);
	}
	getPendingMeltQuotes(method) {
		return this.meltQuoteRepository.getPendingMeltQuotes(method);
	}
	async refreshMeltQuote(mintUrl, method, quoteId) {
		const existingQuote = await this.meltQuoteRepository.getMeltQuote(mintUrl, method, quoteId);
		if (!existingQuote) throw new Error(`Melt quote ${quoteId} for ${method} at ${mintUrl} was not found`);
		const refreshed = await this.meltHandlerProvider.get(method).fetchRemoteQuote({
			...this.buildDeps(),
			quote: existingQuote
		});
		await this.meltQuoteRepository.upsertMeltQuote(refreshed);
		const quote = await this.meltQuoteRepository.getMeltQuote(existingQuote.mintUrl, method, quoteId);
		if (!quote) throw new Error(`Cannot refresh quote: melt quote ${quoteId} for ${method} at ${mintUrl} was not found after persistence`);
		return quote;
	}
	async requireMeltQuoteForPrepare(mintUrl, method, quoteId, expectedUnit) {
		const quote = await this.meltQuoteRepository.getMeltQuote(mintUrl, method, quoteId);
		if (!quote) throw new Error(`Melt quote ${quoteId} for ${method} at ${mintUrl} was not found`);
		if (expectedUnit && quote.unit !== normalizeUnit(expectedUnit, { defaultUnit: DEFAULT_UNIT })) throw new Error(`Melt quote ${quoteId} unit ${quote.unit} does not match requested unit ${expectedUnit}`);
		this.assertMeltQuoteCanPrepare(quote, `melt quote ${quoteId}`);
		return quote;
	}
	async loadMeltQuoteSnapshotForOperation(op) {
		if (!op.quoteId) throw new Error(`Cannot prepare operation ${op.id}: no melt quote ID is attached`);
		const quote = await this.meltQuoteRepository.getMeltQuote(op.mintUrl, op.method, op.quoteId);
		if (!quote) throw new Error(`Cannot prepare operation ${op.id}: melt quote ${op.quoteId} for ${op.method} at ${op.mintUrl} was not found`);
		this.assertMeltQuoteCanPrepare(quote, `operation ${op.id} melt quote ${op.quoteId}`);
		if (quote.unit !== op.unit) throw new Error(`Cannot prepare operation ${op.id}: melt quote ${op.quoteId} unit ${quote.unit} does not match requested unit ${op.unit}`);
		return meltQuoteToMethodSnapshot(quote);
	}
	async persistCanonicalMintQuote(canonicalQuote) {
		await this.mintQuoteRepository.upsertMintQuote(canonicalQuote);
		return await this.mintQuoteRepository.getMintQuote(canonicalQuote.mintUrl, canonicalQuote.method, canonicalQuote.quoteId) ?? canonicalQuote;
	}
	async emitMintQuoteUpdatedIfNeeded(quote, remoteStateChanged) {
		if (!remoteStateChanged) return;
		await this.eventBus.emit("mint-quote:updated", {
			mintUrl: quote.mintUrl,
			method: quote.method,
			quoteId: quote.quoteId,
			quote
		});
	}
	async assertMintQuoteCapabilities(quote) {
		const amount = getMintQuoteAmount(quote);
		await this.mintService.assertMethodUnitSupported(quote.mintUrl, 4, quote.method, amount ? {
			amount,
			unit: quote.unit
		} : quote.unit);
	}
	assertMintQuoteCanPrepare(quote, context) {
		if (quote.expiry !== null && quote.expiry * 1e3 <= Date.now()) throw new Error(`Cannot prepare ${context}: quote is expired`);
		if (isStatefulMintQuote(quote) && quote.state === "ISSUED") throw new Error(`Cannot prepare ${context}: quote is terminal`);
	}
	assertMeltQuoteCanPrepare(quote, context) {
		if (quote.expiry * 1e3 <= Date.now()) throw new Error(`Cannot prepare ${context}: quote is expired`);
		if (quote.state !== "UNPAID") throw new Error(`Cannot prepare ${context}: quote is ${quote.state}`);
	}
	async ensureMintQuoteRecordForOperation(operation) {
		if (await this.mintQuoteRepository.getMintQuote(operation.mintUrl, operation.method, operation.quoteId)) return;
		if (operation.method !== "bolt11") throw new Error(`Cannot create canonical quote record from ${operation.method} operation observation`);
		await this.mintQuoteRepository.upsertMintQuote({
			mintUrl: operation.mintUrl,
			method: operation.method,
			quoteId: operation.quoteId,
			quote: operation.quoteId,
			request: operation.request,
			unit: operation.unit,
			amount: operation.amount,
			expiry: operation.expiry,
			pubkey: operation.pubkey,
			state: "UNPAID",
			reusable: false,
			quoteData: { amount: operation.amount },
			createdAt: operation.createdAt,
			updatedAt: operation.updatedAt
		});
	}
};

//#endregion
//#region Manager.ts
/**
* Initializes and configures a new Coco Cashu manager instance
* @param config - Configuration options including repositories, seed, and optional features
* @returns A fully initialized Manager instance
*/
async function initializeCoco(config) {
	await config.repo.init();
	const coco = new Manager(config.repo, config.seedGetter, config.logger, config.webSocketFactory, config.plugins, config.watchers, config.processors, config.subscriptions);
	await coco.initPlugins();
	await coco.reconcileLegacyMintQuotes();
	const mintOperationWatcherConfig = config.watchers?.mintOperationWatcher;
	if (!mintOperationWatcherConfig?.disabled) await coco.enableMintOperationWatcher(mintOperationWatcherConfig);
	const proofStateWatcherConfig = config.watchers?.proofStateWatcher;
	if (!proofStateWatcherConfig?.disabled) await coco.enableProofStateWatcher(proofStateWatcherConfig);
	const mintOperationProcessorConfig = config.processors?.mintOperationProcessor;
	if (!mintOperationProcessorConfig?.disabled) await coco.enableMintOperationProcessor(mintOperationProcessorConfig);
	await coco.ops.send.recovery.run();
	await coco.ops.melt.recovery.run();
	await coco.recoverPendingPaymentRequestReceiveAttempts();
	await coco.recoverPendingMintOperations();
	return coco;
}
var Manager = class {
	mint;
	wallet;
	keyring;
	subscription;
	history;
	auth;
	ops;
	quotes;
	paymentRequests;
	ext;
	mintService;
	walletService;
	proofService;
	walletRestoreService;
	keyRingService;
	eventBus;
	logger;
	subscriptions;
	mintOperationWatcher;
	mintOperationProcessor;
	legacyMintQuoteRepository;
	quoteLifecycle;
	proofStateWatcher;
	historyService;
	seedService;
	counterService;
	tokenService;
	paymentRequestService;
	paymentRequestReceiveService;
	authSessionService;
	authService;
	sendOperationService;
	sendOperationRepository;
	meltOperationService;
	meltOperationRepository;
	mintOperationService;
	mintOperationRepository;
	receiveOperationService;
	receiveOperationRepository;
	paymentRequestReceiveOperationRepository;
	paymentRequestReceiveAttemptRepository;
	proofRepository;
	pluginHost = new PluginHost();
	subscriptionsPaused = false;
	originalWatcherConfig;
	originalProcessorConfig;
	mintRequestProvider;
	mintAdapter;
	constructor(repositories, seedGetter, logger, webSocketFactory, plugins, watchers, processors, subscriptions) {
		this.logger = logger ?? new NullLogger();
		this.eventBus = this.createEventBus();
		this.mintRequestProvider = new MintRequestProvider({
			capacity: 20,
			refillPerMinute: 20,
			logger: this.getChildLogger("RequestRateLimiter")
		});
		this.mintAdapter = new MintAdapter(this.mintRequestProvider);
		this.subscriptions = this.createSubscriptionManager(webSocketFactory, subscriptions);
		this.originalWatcherConfig = watchers;
		this.originalProcessorConfig = processors;
		if (plugins && plugins.length > 0) for (const p of plugins) this.pluginHost.use(p);
		const core = this.buildCoreServices(repositories, seedGetter);
		this.mintService = core.mintService;
		this.walletService = core.walletService;
		this.proofService = core.proofService;
		this.walletRestoreService = core.walletRestoreService;
		this.keyRingService = core.keyRingService;
		this.seedService = core.seedService;
		this.counterService = core.counterService;
		this.legacyMintQuoteRepository = core.legacyMintQuoteRepository;
		this.historyService = core.historyService;
		this.paymentRequestService = core.paymentRequestService;
		this.sendOperationService = core.sendOperationService;
		this.tokenService = core.tokenService;
		this.sendOperationRepository = core.sendOperationRepository;
		this.receiveOperationService = core.receiveOperationService;
		this.receiveOperationRepository = core.receiveOperationRepository;
		this.paymentRequestReceiveService = core.paymentRequestReceiveService;
		this.paymentRequestReceiveOperationRepository = core.paymentRequestReceiveOperationRepository;
		this.paymentRequestReceiveAttemptRepository = core.paymentRequestReceiveAttemptRepository;
		this.meltOperationService = core.meltOperationService;
		this.meltOperationRepository = core.meltOperationRepository;
		this.quoteLifecycle = core.quoteLifecycle;
		this.authSessionService = core.authSessionService;
		this.authService = core.authService;
		this.mintOperationService = core.mintOperationService;
		this.mintOperationRepository = core.mintOperationRepository;
		this.proofRepository = repositories.proofRepository;
		const apis = this.buildApis();
		this.mint = apis.mint;
		this.wallet = apis.wallet;
		this.keyring = apis.keyring;
		this.subscription = apis.subscription;
		this.history = apis.history;
		this.ops = apis.ops;
		this.quotes = apis.quotes;
		this.auth = apis.auth;
		this.paymentRequests = apis.paymentRequests;
		this.ext = this.pluginHost.getExtensions();
		this.eventBus.on("mint:untrusted", ({ mintUrl }) => {
			this.logger.info("Mint untrusted, closing subscriptions", { mintUrl });
			this.subscriptions.closeMint(mintUrl);
		});
		const clearWalletCache = ({ mintUrl }) => {
			this.walletService.clearCache(mintUrl);
		};
		this.eventBus.on("auth-session:updated", clearWalletCache);
		this.eventBus.on("auth-session:deleted", clearWalletCache);
	}
	on(event, handler) {
		return this.eventBus.on(event, handler);
	}
	once(event, handler) {
		return this.eventBus.once(event, handler);
	}
	use(plugin) {
		this.pluginHost.use(plugin);
	}
	/**
	* Initialize the plugin system.
	* This is called automatically by `initializeCoco()`.
	* Only call this directly if you instantiate Manager without using the factory.
	*/
	async initPlugins() {
		const services = {
			mintService: this.mintService,
			walletService: this.walletService,
			proofService: this.proofService,
			keyRingService: this.keyRingService,
			seedService: this.seedService,
			walletRestoreService: this.walletRestoreService,
			paymentRequestService: this.paymentRequestService,
			counterService: this.counterService,
			meltOperationService: this.meltOperationService,
			mintOperationService: this.mintOperationService,
			historyService: this.historyService,
			sendOperationService: this.sendOperationService,
			receiveOperationService: this.receiveOperationService,
			paymentRequestReceiveService: this.paymentRequestReceiveService,
			tokenService: this.tokenService,
			subscriptions: this.subscriptions,
			eventBus: this.eventBus,
			logger: this.logger
		};
		await this.pluginHost.init(services);
		await this.pluginHost.ready();
	}
	async dispose() {
		await this.pluginHost.dispose();
	}
	off(event, handler) {
		return this.eventBus.off(event, handler);
	}
	async enableMintOperationWatcher(options) {
		if (this.mintOperationWatcher?.isRunning()) return;
		const watcherLogger = this.logger.child ? this.logger.child({ module: "MintOperationWatcherService" }) : this.logger;
		this.mintOperationWatcher = new MintOperationWatcherService(this.subscriptions, this.mintService, this.mintOperationService, this.quoteLifecycle, this.eventBus, watcherLogger, {
			watchExistingPendingOnStart: options?.watchExistingPendingOnStart ?? true,
			watchExistingPendingQuotesOnStart: options?.watchExistingPendingQuotesOnStart ?? true
		});
		await this.mintOperationWatcher.start();
	}
	async disableMintOperationWatcher() {
		if (!this.mintOperationWatcher) return;
		await this.mintOperationWatcher.stop();
		this.mintOperationWatcher = void 0;
	}
	async enableMintOperationProcessor(options) {
		if (this.mintOperationProcessor?.isRunning()) return false;
		const processorLogger = this.logger.child ? this.logger.child({ module: "MintOperationProcessor" }) : this.logger;
		this.mintOperationProcessor = new MintOperationProcessor(this.mintOperationService, this.quoteLifecycle, this.eventBus, processorLogger, options);
		await this.mintOperationProcessor.start();
		return true;
	}
	async disableMintOperationProcessor() {
		if (!this.mintOperationProcessor) return;
		await this.mintOperationProcessor.stop();
		this.mintOperationProcessor = void 0;
	}
	async waitForMintOperationProcessor() {
		if (!this.mintOperationProcessor) return;
		await this.mintOperationProcessor.waitForCompletion();
	}
	async enableProofStateWatcher(options) {
		if (this.proofStateWatcher?.isRunning()) return;
		const watcherLogger = this.logger.child ? this.logger.child({ module: "ProofStateWatcherService" }) : this.logger;
		this.proofStateWatcher = new ProofStateWatcherService(this.subscriptions, this.mintService, this.proofService, this.proofRepository, this.eventBus, watcherLogger, { watchExistingInflightOnStart: options?.watchExistingInflightOnStart ?? true });
		this.proofStateWatcher.setSendOperationService(this.sendOperationService);
		await this.proofStateWatcher.start();
	}
	async disableProofStateWatcher() {
		if (!this.proofStateWatcher) return;
		await this.proofStateWatcher.stop();
		this.proofStateWatcher = void 0;
	}
	async recoverPendingMintOperations() {
		await this.mintOperationService.recoverPendingOperations();
	}
	async recoverPendingPaymentRequestReceiveAttempts() {
		await this.paymentRequestReceiveService.recoverPendingAttempts();
	}
	async reconcileLegacyMintQuotes(mintUrl) {
		const reconciled = [];
		const skipped = [];
		const quotes = await this.legacyMintQuoteRepository.getPendingLegacyMintQuotes(mintUrl);
		for (const quote of quotes) {
			if (!isStatefulMintQuote(quote)) {
				skipped.push(quote.quote);
				continue;
			}
			if (quote.state === "ISSUED") {
				skipped.push(quote.quote);
				continue;
			}
			if (!await this.mintService.isTrustedMint(quote.mintUrl)) {
				this.logger.debug("Skipping legacy mint quote reconciliation for untrusted mint", {
					mintUrl: quote.mintUrl,
					quoteId: quote.quote
				});
				skipped.push(quote.quote);
				continue;
			}
			const existing = await this.mintOperationService.getOperationByQuote(quote.mintUrl, quote.method, quote.quoteId);
			if (existing && existing.state !== "init") {
				skipped.push(quote.quote);
				continue;
			}
			try {
				const imported = await this.quoteLifecycle.importMintQuote(quote.mintUrl, "bolt11", mintQuoteToMethodSnapshot(quote));
				const operation = await this.mintOperationService.prepare(imported.mintUrl, imported.method, imported.quoteId, {});
				reconciled.push(operation.quoteId);
			} catch (err) {
				this.logger.warn("Failed to reconcile legacy mint quote", {
					mintUrl: quote.mintUrl,
					quoteId: quote.quote,
					err
				});
				skipped.push(quote.quote);
			}
		}
		this.logger.info("Legacy mint quote reconciliation completed", {
			mintUrl,
			reconciled: reconciled.length,
			skipped: skipped.length
		});
		return {
			reconciled,
			skipped
		};
	}
	async pauseSubscriptions() {
		if (this.subscriptionsPaused) {
			this.logger.debug("Subscriptions already paused");
			return;
		}
		this.subscriptionsPaused = true;
		this.logger.info("Pausing subscriptions");
		this.subscriptions.pause();
		await this.disableMintOperationWatcher();
		await this.disableProofStateWatcher();
		await this.disableMintOperationProcessor();
		this.logger.info("Subscriptions paused");
		await this.eventBus.emit("subscriptions:paused", void 0);
	}
	async resumeSubscriptions() {
		this.subscriptionsPaused = false;
		this.logger.info("Resuming subscriptions");
		await this.eventBus.emit("subscriptions:resumed", void 0);
		this.subscriptions.resume();
		const mintOperationWatcherConfig = this.originalWatcherConfig?.mintOperationWatcher;
		if (!mintOperationWatcherConfig?.disabled) await this.enableMintOperationWatcher(mintOperationWatcherConfig);
		const proofStateWatcherConfig = this.originalWatcherConfig?.proofStateWatcher;
		if (!proofStateWatcherConfig?.disabled) await this.enableProofStateWatcher(proofStateWatcherConfig);
		const mintOperationProcessorConfig = this.originalProcessorConfig?.mintOperationProcessor;
		if (!mintOperationProcessorConfig?.disabled) await this.enableMintOperationProcessor(mintOperationProcessorConfig);
		await this.recoverPendingMintOperations();
		this.logger.info("Subscriptions resumed");
	}
	getChildLogger(moduleName) {
		return this.logger.child ? this.logger.child({ module: moduleName }) : this.logger;
	}
	async requeuePaidMintQuotes(mintUrl) {
		const requeued = [];
		const pendingOperations = await this.mintOperationService.getPendingOperations();
		for (const operation of pendingOperations) {
			if (mintUrl && operation.mintUrl !== mintUrl) continue;
			const quote = await this.quoteLifecycle.getMintQuote(operation.mintUrl, operation.method, operation.quoteId);
			if (!quote || !isStatefulMintQuote(quote) || quote.state !== "PAID") continue;
			if (!await this.mintService.isTrustedMint(operation.mintUrl)) continue;
			await this.eventBus.emit("mint-op:requeue", {
				mintUrl: operation.mintUrl,
				operationId: operation.id,
				operation
			});
			requeued.push(operation.quoteId);
		}
		return { requeued };
	}
	createEventBus() {
		const eventLogger = this.getChildLogger("EventBus");
		return new EventBus({ onError: (args) => {
			eventLogger.error("Event handler error", args);
		} });
	}
	createSubscriptionManager(webSocketFactory, subscriptionOptions) {
		const wsLogger = this.getChildLogger("SubscriptionManager");
		const defaultFactory = typeof globalThis.WebSocket !== "undefined" ? (url) => new globalThis.WebSocket(url) : void 0;
		const wsFactoryToUse = webSocketFactory ?? defaultFactory;
		const options = {
			slowPollingIntervalMs: subscriptionOptions?.slowPollingIntervalMs ?? 2e4,
			fastPollingIntervalMs: subscriptionOptions?.fastPollingIntervalMs ?? 5e3
		};
		if (!wsFactoryToUse) return new SubscriptionManager(new PollingTransport(this.mintAdapter, { intervalMs: options.fastPollingIntervalMs }, wsLogger), this.mintAdapter, wsLogger, options);
		return new SubscriptionManager(wsFactoryToUse, this.mintAdapter, wsLogger, options);
	}
	buildCoreServices(repositories, seedGetter) {
		const mintLogger = this.getChildLogger("MintService");
		const walletLogger = this.getChildLogger("WalletService");
		const counterLogger = this.getChildLogger("CounterService");
		const proofLogger = this.getChildLogger("ProofService");
		const walletRestoreLogger = this.getChildLogger("WalletRestoreService");
		const keyRingLogger = this.getChildLogger("KeyRingService");
		const historyLogger = this.getChildLogger("HistoryService");
		const tokenLogger = this.getChildLogger("TokenService");
		const mintService = new MintService(repositories.mintRepository, repositories.keysetRepository, this.mintAdapter, mintLogger, this.eventBus);
		const seedService = new SeedService(seedGetter);
		const keyRingService = new KeyRingService(repositories.keyRingRepository, seedService, keyRingLogger);
		const walletService = new WalletService(mintService, seedService, this.mintRequestProvider, walletLogger, (mintUrl) => this.mintAdapter.getAuthProvider(mintUrl));
		const counterService = new CounterService(repositories.counterRepository, counterLogger, this.eventBus);
		const proofService = new ProofService(counterService, repositories.proofRepository, walletService, mintService, keyRingService, seedService, proofLogger, this.eventBus);
		const walletRestoreService = new WalletRestoreService(proofService, counterService, walletService, this.mintRequestProvider, walletRestoreLogger);
		const mintScopedLock = new MintScopedLock();
		const sendOperationLogger = this.getChildLogger("SendOperationService");
		const sendHandlerProvider = new SendHandlerProvider({
			default: new DefaultSendHandler(),
			p2pk: new P2pkSendHandler()
		});
		const sendOperationService = new SendOperationService(repositories.sendOperationRepository, repositories.proofRepository, proofService, mintService, walletService, this.eventBus, sendHandlerProvider, sendOperationLogger, mintScopedLock);
		const sendOperationRepository = repositories.sendOperationRepository;
		const tokenService = new TokenService(mintService, tokenLogger);
		const receiveOperationLogger = this.getChildLogger("ReceiveOperationService");
		const receiveOperationService = new ReceiveOperationService(repositories.receiveOperationRepository, repositories.proofRepository, proofService, mintService, walletService, this.mintAdapter, tokenService, this.eventBus, receiveOperationLogger);
		const receiveOperationRepository = repositories.receiveOperationRepository;
		const paymentRequestReceiveOperationRepository = repositories.paymentRequestReceiveOperationRepository;
		const paymentRequestReceiveAttemptRepository = repositories.paymentRequestReceiveAttemptRepository;
		const meltOperationLogger = this.getChildLogger("MeltOperationService");
		const quoteLifecycleLogger = this.getChildLogger("QuoteLifecycle");
		const meltHandlerProvider = new MeltHandlerProvider({
			bolt11: new MeltBolt11Handler(),
			bolt12: new MeltBolt12Handler(),
			onchain: new MeltOnchainHandler()
		});
		const mintHandlerProvider = new MintHandlerProvider({
			bolt11: new MintBolt11Handler(),
			onchain: new MintOnchainHandler(keyRingService),
			bolt12: new MintBolt12Handler(keyRingService)
		});
		const quoteLifecycle = new QuoteLifecycle({
			mintHandlerProvider,
			meltHandlerProvider,
			mintQuoteRepository: repositories.mintQuoteRepository,
			meltQuoteRepository: repositories.meltQuoteRepository,
			proofRepository: repositories.proofRepository,
			proofService,
			mintService,
			walletService,
			mintAdapter: this.mintAdapter,
			eventBus: this.eventBus,
			logger: quoteLifecycleLogger
		});
		const meltOperationService = new MeltOperationService(meltHandlerProvider, repositories.meltOperationRepository, quoteLifecycle, repositories.proofRepository, proofService, mintService, walletService, this.mintAdapter, this.eventBus, meltOperationLogger, mintScopedLock);
		const meltOperationRepository = repositories.meltOperationRepository;
		const mintOperationLogger = this.getChildLogger("MintOperationService");
		const mintOperationService = new MintOperationService(mintHandlerProvider, repositories.mintOperationRepository, quoteLifecycle, repositories.proofRepository, proofService, mintService, walletService, this.mintAdapter, this.eventBus, mintOperationLogger, mintScopedLock);
		const mintOperationRepository = repositories.mintOperationRepository;
		const historyService = new HistoryService(repositories.historyRepository, this.eventBus, historyLogger);
		const legacyMintQuoteRepository = repositories.legacyMintQuoteRepository;
		const paymentRequestService = new PaymentRequestService(sendOperationService, proofService, this.getChildLogger("PaymentRequestService"));
		const paymentRequestReceiveLogger = this.getChildLogger("PaymentRequestReceiveService");
		const paymentRequestReceiveService = new PaymentRequestReceiveService(paymentRequestReceiveOperationRepository, paymentRequestReceiveAttemptRepository, receiveOperationService, receiveOperationRepository, mintService, new PaymentRequestReceiveTransportHandlerProvider(), paymentRequestReceiveLogger);
		const authSessionLogger = this.getChildLogger("AuthSessionService");
		const authSessionService = new AuthSessionService(repositories.authSessionRepository, this.eventBus, authSessionLogger);
		const authServiceLogger = this.getChildLogger("AuthService");
		return {
			mintService,
			seedService,
			walletService,
			counterService,
			proofService,
			tokenService,
			walletRestoreService,
			keyRingService,
			legacyMintQuoteRepository,
			quoteLifecycle,
			historyService,
			paymentRequestService,
			sendOperationService,
			sendOperationRepository,
			receiveOperationService,
			receiveOperationRepository,
			paymentRequestReceiveService,
			paymentRequestReceiveOperationRepository,
			paymentRequestReceiveAttemptRepository,
			meltOperationService,
			meltOperationRepository,
			authSessionService,
			authService: new AuthService(authSessionService, this.mintAdapter, authServiceLogger),
			mintOperationService,
			mintOperationRepository
		};
	}
	buildApis() {
		const walletApiLogger = this.getChildLogger("WalletApi");
		const subscriptionApiLogger = this.getChildLogger("SubscriptionApi");
		return {
			mint: new MintApi(this.mintService),
			wallet: new WalletApi(this.mintService, this.walletService, this.proofService, this.walletRestoreService, this.receiveOperationService, this.tokenService, walletApiLogger),
			keyring: new KeyRingApi(this.keyRingService),
			subscription: new SubscriptionApi(this.subscriptions, subscriptionApiLogger),
			history: new HistoryApi(this.historyService),
			ops: new OpsApi(new SendOpsApi(this.sendOperationService), new ReceiveOpsApi(this.receiveOperationService), new MintOpsApi(this.mintOperationService), new MeltOpsApi(this.meltOperationService)),
			quotes: new QuoteApi(this.quoteLifecycle),
			auth: new AuthApi(this.authService),
			paymentRequests: new PaymentRequestsApi(this.paymentRequestService, this.paymentRequestReceiveService)
		};
	}
};

//#endregion
//#region repositories/memory/MemoryAuthSessionRepository.ts
var MemoryAuthSessionRepository = class {
	sessions = /* @__PURE__ */ new Map();
	async getSession(mintUrl) {
		return this.sessions.get(mintUrl) ?? null;
	}
	async saveSession(session) {
		this.sessions.set(session.mintUrl, session);
	}
	async deleteSession(mintUrl) {
		this.sessions.delete(mintUrl);
	}
	async getAllSessions() {
		return [...this.sessions.values()];
	}
};

//#endregion
//#region repositories/memory/MemoryCounterRepository.ts
var MemoryCounterRepository = class {
	counters = /* @__PURE__ */ new Map();
	key(mintUrl, keysetId) {
		return `${mintUrl}::${keysetId}`;
	}
	async getCounter(mintUrl, keysetId) {
		return this.counters.get(this.key(mintUrl, keysetId)) ?? null;
	}
	async setCounter(mintUrl, keysetId, counter) {
		const key = this.key(mintUrl, keysetId);
		this.counters.set(key, {
			mintUrl,
			keysetId,
			counter
		});
	}
};

//#endregion
//#region repositories/memory/MemoryHistoryRepository.ts
var MemoryHistoryRepository = class {
	legacyEntries = [];
	constructor(operationRepositories = {}) {
		this.operationRepositories = operationRepositories;
	}
	async getPaginatedHistoryEntries(limit, offset) {
		return (await this.getProjectedEntries()).slice(offset, offset + limit);
	}
	async getHistoryEntryById(id) {
		const parsed = parseHistoryEntryId(id);
		if (!parsed) return null;
		if (parsed.source === "legacy") return (await this.getProjectedEntries()).find((entry) => entry.id === id && entry.source === "legacy") ?? null;
		return this.projectOperationById(parsed.type, parsed.operationId);
	}
	async addLegacyHistoryEntry(history) {
		const entry = projectLegacyHistoryRow(history);
		this.legacyEntries.push(entry);
		return entry;
	}
	async getSendHistoryEntry(mintUrl, operationId) {
		const operation = await this.operationRepositories.sendOperationRepository?.getById(operationId);
		if (!operation || operation.mintUrl !== mintUrl) return null;
		return projectSendOperation(operation);
	}
	async getReceiveHistoryEntry(mintUrl, operationId) {
		const operation = await this.operationRepositories.receiveOperationRepository?.getById(operationId);
		if (!operation || operation.mintUrl !== mintUrl) return null;
		return projectReceiveOperation(operation);
	}
	async getProjectedEntries() {
		const operationEntries = await this.getOperationEntries();
		const dedupedLegacyEntries = this.dedupeLegacyEntries(operationEntries);
		return [...operationEntries, ...dedupedLegacyEntries].sort(compareHistoryEntries);
	}
	async getOperationEntries() {
		const entries = [];
		const sendOperations = await this.operationRepositories.sendOperationRepository?.getAll();
		for (const operation of sendOperations ?? []) {
			const entry = projectSendOperation(operation);
			if (entry) entries.push(entry);
		}
		const meltOperations = await this.operationRepositories.meltOperationRepository?.getAll();
		for (const operation of meltOperations ?? []) {
			const entry = projectMeltOperation(operation);
			if (entry) entries.push(entry);
		}
		const mintOperations = await this.operationRepositories.mintOperationRepository?.getAll();
		for (const operation of mintOperations ?? []) {
			const entry = await this.projectMintOperation(operation);
			if (entry) entries.push(entry);
		}
		const receiveOperations = await this.operationRepositories.receiveOperationRepository?.getAll();
		for (const operation of receiveOperations ?? []) {
			const entry = projectReceiveOperation(operation);
			if (entry) entries.push(entry);
		}
		return entries;
	}
	async projectOperationById(type, operationId) {
		switch (type) {
			case "send": {
				const operation = await this.operationRepositories.sendOperationRepository?.getById(operationId);
				return operation ? projectSendOperation(operation) : null;
			}
			case "melt": {
				const operation = await this.operationRepositories.meltOperationRepository?.getById(operationId);
				return operation ? projectMeltOperation(operation) : null;
			}
			case "mint": {
				const operation = await this.operationRepositories.mintOperationRepository?.getById(operationId);
				return operation ? this.projectMintOperation(operation) : null;
			}
			case "receive": {
				const operation = await this.operationRepositories.receiveOperationRepository?.getById(operationId);
				return operation ? projectReceiveOperation(operation) : null;
			}
		}
	}
	async projectMintOperation(operation) {
		const entry = projectMintOperation(operation);
		if (!entry) return null;
		const quote = await this.operationRepositories.mintQuoteRepository?.getMintQuote(operation.mintUrl, operation.method, operation.quoteId);
		const remoteState = quote ? getMintQuoteRemoteState(quote) : void 0;
		return remoteState ? {
			...entry,
			remoteState
		} : entry;
	}
	dedupeLegacyEntries(operationEntries) {
		const operationKeys = /* @__PURE__ */ new Set();
		const quoteKeys = /* @__PURE__ */ new Set();
		for (const entry of operationEntries) {
			if (entry.source !== "operation") continue;
			operationKeys.add(this.operationKey(entry.type, entry.operationId));
			if ((entry.type === "mint" || entry.type === "melt") && entry.quoteId) quoteKeys.add(this.quoteKey(entry.type, entry.mintUrl, entry.quoteId));
		}
		return this.legacyEntries.filter((entry) => {
			if (entry.operationId && operationKeys.has(this.operationKey(entry.type, entry.operationId))) return false;
			if ((entry.type === "mint" || entry.type === "melt") && entry.quoteId && quoteKeys.has(this.quoteKey(entry.type, entry.mintUrl, entry.quoteId))) return false;
			return true;
		});
	}
	operationKey(type, operationId) {
		return `${type}:${operationId}`;
	}
	quoteKey(type, mintUrl, quoteId) {
		return `${type}:${mintUrl}:${quoteId}`;
	}
};

//#endregion
//#region repositories/memory/MemoryKeyRingRepository.ts
const DEFAULT_KEYPAIR_PURPOSE = "p2pk";
var MemoryKeyRingRepository = class {
	keyPairs = /* @__PURE__ */ new Map();
	insertionOrder = [];
	async getPersistedKeyPair(publicKey, purpose) {
		const keyPair = this.keyPairs.get(publicKey) ?? null;
		if (!keyPair || !purpose) return keyPair;
		return (keyPair.purpose ?? DEFAULT_KEYPAIR_PURPOSE) === purpose ? keyPair : null;
	}
	async setPersistedKeyPair(keyPair) {
		if (!this.keyPairs.has(keyPair.publicKeyHex)) this.insertionOrder.push(keyPair.publicKeyHex);
		const existing = this.keyPairs.get(keyPair.publicKeyHex);
		let derivationIndex = keyPair.derivationIndex;
		if (derivationIndex == null) {
			if (existing?.derivationIndex != null) derivationIndex = existing.derivationIndex;
		}
		this.keyPairs.set(keyPair.publicKeyHex, {
			...keyPair,
			derivationIndex,
			purpose: keyPair.purpose ?? existing?.purpose ?? DEFAULT_KEYPAIR_PURPOSE
		});
	}
	async deletePersistedKeyPair(publicKey, purpose) {
		if (purpose) {
			const existing = this.keyPairs.get(publicKey);
			if (existing && (existing.purpose ?? DEFAULT_KEYPAIR_PURPOSE) !== purpose) return;
		}
		this.keyPairs.delete(publicKey);
		const index = this.insertionOrder.indexOf(publicKey);
		if (index !== -1) this.insertionOrder.splice(index, 1);
	}
	async getAllPersistedKeyPairs(purpose) {
		const values = Array.from(this.keyPairs.values());
		if (!purpose) return values;
		return values.filter((keyPair) => (keyPair.purpose ?? DEFAULT_KEYPAIR_PURPOSE) === purpose);
	}
	async getLatestKeyPair(purpose) {
		for (let i = this.insertionOrder.length - 1; i >= 0; i--) {
			const keyPair = this.keyPairs.get(this.insertionOrder[i]);
			if (!keyPair) continue;
			if (!purpose || (keyPair.purpose ?? DEFAULT_KEYPAIR_PURPOSE) === purpose) return keyPair;
		}
		return null;
	}
	async getLastDerivationIndex(purpose) {
		let maxIndex = -1;
		for (const keypair of this.keyPairs.values()) {
			if (purpose && (keypair.purpose ?? DEFAULT_KEYPAIR_PURPOSE) !== purpose) continue;
			if (keypair.derivationIndex != null && keypair.derivationIndex > maxIndex) maxIndex = keypair.derivationIndex;
		}
		return maxIndex;
	}
};

//#endregion
//#region repositories/memory/MemoryKeysetRepository.ts
var MemoryKeysetRepository = class {
	keysetsByMint = /* @__PURE__ */ new Map();
	getMintMap(mintUrl) {
		if (!this.keysetsByMint.has(mintUrl)) this.keysetsByMint.set(mintUrl, /* @__PURE__ */ new Map());
		return this.keysetsByMint.get(mintUrl);
	}
	async getKeysetsByMintUrl(mintUrl) {
		return Array.from(this.getMintMap(mintUrl).values());
	}
	async getKeysetById(mintUrl, id) {
		return this.getMintMap(mintUrl).get(id) ?? null;
	}
	async updateKeyset(keyset) {
		const mintMap = this.getMintMap(keyset.mintUrl);
		const existing = mintMap.get(keyset.id);
		if (!existing) {
			mintMap.set(keyset.id, {
				...keyset,
				keypairs: {},
				updatedAt: Math.floor(Date.now() / 1e3)
			});
			return;
		}
		mintMap.set(keyset.id, {
			...existing,
			unit: keyset.unit,
			active: keyset.active,
			feePpk: keyset.feePpk,
			updatedAt: Math.floor(Date.now() / 1e3)
		});
	}
	async addKeyset(keyset) {
		this.getMintMap(keyset.mintUrl).set(keyset.id, {
			...keyset,
			updatedAt: Math.floor(Date.now() / 1e3)
		});
	}
	async deleteKeyset(mintUrl, keysetId) {
		this.getMintMap(mintUrl).delete(keysetId);
	}
};

//#endregion
//#region repositories/memory/MemoryMeltOperationRepository.ts
const getOperationQuoteId = (operation) => "quoteId" in operation && operation.quoteId ? operation.quoteId : void 0;
var MemoryMeltOperationRepository = class {
	operations = /* @__PURE__ */ new Map();
	async create(operation) {
		if (this.operations.has(operation.id)) throw new Error(`MeltOperation with id ${operation.id} already exists`);
		this.assertNoDuplicateQuoteOperation(operation);
		this.operations.set(operation.id, { ...operation });
	}
	async update(operation) {
		if (!this.operations.has(operation.id)) throw new Error(`MeltOperation with id ${operation.id} not found`);
		this.assertNoDuplicateQuoteOperation(operation);
		this.operations.set(operation.id, {
			...operation,
			updatedAt: Date.now()
		});
	}
	async getById(id) {
		const operation = this.operations.get(id);
		return operation ? { ...operation } : null;
	}
	async getByState(state) {
		const results = [];
		for (const operation of this.operations.values()) if (operation.state === state) results.push({ ...operation });
		return results;
	}
	async getPending() {
		const results = [];
		for (const operation of this.operations.values()) if (operation.state === "executing" || operation.state === "pending") results.push({ ...operation });
		return results;
	}
	async getByMintUrl(mintUrl) {
		const results = [];
		for (const operation of this.operations.values()) if (operation.mintUrl === mintUrl) results.push({ ...operation });
		return results;
	}
	async getByQuoteId(mintUrl, quoteId) {
		const results = [];
		for (const operation of this.operations.values()) if (operation.mintUrl === mintUrl && "quoteId" in operation && operation.quoteId === quoteId) results.push({ ...operation });
		return results;
	}
	async getAll() {
		return Array.from(this.operations.values(), (operation) => ({ ...operation }));
	}
	async delete(id) {
		this.operations.delete(id);
	}
	assertNoDuplicateQuoteOperation(operation) {
		const quoteId = getOperationQuoteId(operation);
		if (!quoteId) return;
		for (const existing of this.operations.values()) if (existing.id !== operation.id && existing.mintUrl === operation.mintUrl && getOperationQuoteId(existing) === quoteId) throw new Error(`MeltOperation already exists for mint ${operation.mintUrl} and quote ${quoteId}`);
	}
};

//#endregion
//#region repositories/memory/MemoryMintQuoteRepository.ts
var MemoryMintQuoteRepository = class {
	quotes = /* @__PURE__ */ new Map();
	makeKey(mintUrl, method, quoteId) {
		return `${normalizeMintUrl(mintUrl)}::${method}::${quoteId}`;
	}
	async getMintQuote(mintUrl, method, quoteId) {
		const key = this.makeKey(mintUrl, method, quoteId);
		const quote = this.quotes.get(key);
		return quote ? { ...quote } : null;
	}
	async upsertMintQuote(quote) {
		const normalizedMintUrl = normalizeMintUrl(quote.mintUrl);
		const now = Date.now();
		const existing = await this.getMintQuote(normalizedMintUrl, quote.method, quote.quoteId);
		const key = this.makeKey(normalizedMintUrl, quote.method, quote.quoteId);
		this.quotes.set(key, {
			...quote,
			mintUrl: normalizedMintUrl,
			quote: quote.quoteId,
			createdAt: existing?.createdAt ?? quote.createdAt,
			updatedAt: now
		});
	}
	async setMintQuoteState(mintUrl, method, quoteId, state, observedAt = Date.now()) {
		const key = this.makeKey(mintUrl, method, quoteId);
		const existing = this.quotes.get(key);
		if (!existing) return;
		if (!isStatefulMintQuote(existing)) return;
		this.quotes.set(key, {
			...existing,
			state,
			lastObservedRemoteState: state,
			lastObservedRemoteStateAt: observedAt,
			updatedAt: observedAt
		});
	}
	async getPendingMintQuotes(method) {
		const result = [];
		for (const q of this.quotes.values()) {
			if (method && q.method !== method) continue;
			if (isMintQuotePending(q)) result.push({ ...q });
		}
		return result;
	}
};

//#endregion
//#region repositories/memory/MemoryLegacyMintQuoteRepository.ts
var MemoryLegacyMintQuoteRepository = class {
	quotes = /* @__PURE__ */ new Map();
	makeKey(mintUrl, method, quoteId) {
		return `${normalizeMintUrl(mintUrl)}::${method}::${quoteId}`;
	}
	async upsertMintQuote(quote) {
		const normalizedMintUrl = normalizeMintUrl(quote.mintUrl);
		const key = this.makeKey(normalizedMintUrl, quote.method, quote.quoteId);
		this.quotes.set(key, {
			...quote,
			mintUrl: normalizedMintUrl,
			quote: quote.quoteId
		});
	}
	async getPendingLegacyMintQuotes(mintUrl) {
		const normalizedMintUrl = mintUrl ? normalizeMintUrl(mintUrl) : void 0;
		const result = [];
		for (const quote of this.quotes.values()) {
			if (normalizedMintUrl && quote.mintUrl !== normalizedMintUrl) continue;
			if (isMintQuotePending(quote)) result.push({ ...quote });
		}
		return result;
	}
};

//#endregion
//#region repositories/memory/MemoryMintRepository.ts
var MemoryMintRepository = class {
	mints = /* @__PURE__ */ new Map();
	async isTrustedMint(mintUrl) {
		return this.mints.get(mintUrl)?.trusted ?? false;
	}
	async getMintByUrl(mintUrl) {
		const mint = this.mints.get(mintUrl);
		if (!mint) throw new Error(`Mint not found: ${mintUrl}`);
		return mint;
	}
	async getAllMints() {
		return Array.from(this.mints.values());
	}
	async getAllTrustedMints() {
		return Array.from(this.mints.values()).filter((mint) => mint.trusted);
	}
	async addNewMint(mint) {
		this.mints.set(mint.mintUrl, mint);
	}
	async addOrUpdateMint(mint) {
		this.mints.set(mint.mintUrl, mint);
	}
	async updateMint(mint) {
		this.mints.set(mint.mintUrl, mint);
	}
	async setMintTrusted(mintUrl, trusted) {
		const mint = this.mints.get(mintUrl);
		if (mint) {
			mint.trusted = trusted;
			this.mints.set(mintUrl, mint);
		}
	}
	async deleteMint(mintUrl) {
		this.mints.delete(mintUrl);
	}
};

//#endregion
//#region repositories/memory/MemoryProofRepository.ts
function normalizeProofUnit(proof) {
	return normalizeUnit(proof.unit);
}
function getUnitFilter(filter) {
	const units = [...filter?.units ?? [], ...filter?.unit ? [filter.unit] : []];
	if (units.length === 0) return void 0;
	return new Set(units.map((unit) => normalizeUnit(unit)));
}
function matchesUnit(proof, unitFilter) {
	return !unitFilter || unitFilter.has(normalizeProofUnit(proof));
}
var MemoryProofRepository = class {
	proofsByMint = /* @__PURE__ */ new Map();
	getMintMap(mintUrl) {
		if (!this.proofsByMint.has(mintUrl)) this.proofsByMint.set(mintUrl, /* @__PURE__ */ new Map());
		return this.proofsByMint.get(mintUrl);
	}
	async saveProofs(mintUrl, proofs) {
		if (!proofs || proofs.length === 0) return;
		const map = this.getMintMap(mintUrl);
		const normalizedProofs = proofs.map((proof) => ({
			...proof,
			unit: normalizeProofUnit(proof)
		}));
		for (const p of normalizedProofs) if (map.has(p.secret)) throw new Error(`Proof with secret already exists: ${p.secret}`);
		for (const p of normalizedProofs) map.set(p.secret, {
			...p,
			mintUrl
		});
	}
	async getReadyProofs(mintUrl, filter) {
		const map = this.getMintMap(mintUrl);
		const unitFilter = getUnitFilter(filter);
		return Array.from(map.values()).filter((p) => p.state === "ready" && matchesUnit(p, unitFilter)).map((p) => ({ ...p }));
	}
	async getInflightProofs(mintUrls, filter) {
		const unitFilter = getUnitFilter(filter);
		if (!mintUrls || mintUrls.length === 0) {
			const all = [];
			for (const map of this.proofsByMint.values()) for (const p of map.values()) if (p.state === "inflight" && matchesUnit(p, unitFilter)) all.push({ ...p });
			return all;
		}
		const mintUrlList = mintUrls.map((url) => url.trim()).filter((url) => url.length > 0);
		if (mintUrlList.length === 0) return [];
		const uniqueMintUrls = Array.from(new Set(mintUrlList));
		const results = [];
		for (const mintUrl of uniqueMintUrls) {
			const map = this.proofsByMint.get(mintUrl);
			if (!map) continue;
			for (const p of map.values()) if (p.state === "inflight" && matchesUnit(p, unitFilter)) results.push({ ...p });
		}
		return results;
	}
	async getAllReadyProofs(filter) {
		const unitFilter = getUnitFilter(filter);
		const all = [];
		for (const map of this.proofsByMint.values()) for (const p of map.values()) if (p.state === "ready" && matchesUnit(p, unitFilter)) all.push({ ...p });
		return all;
	}
	async getProofsByKeysetId(mintUrl, keysetId, filter) {
		const map = this.getMintMap(mintUrl);
		const unitFilter = getUnitFilter(filter);
		const results = [];
		for (const p of map.values()) if (p.state === "ready" && p.id === keysetId && matchesUnit(p, unitFilter)) results.push({ ...p });
		return results;
	}
	async setProofState(mintUrl, secrets, state) {
		const map = this.getMintMap(mintUrl);
		for (const secret of secrets) {
			const p = map.get(secret);
			if (p) map.set(secret, {
				...p,
				state
			});
		}
	}
	async deleteProofs(mintUrl, secrets) {
		const map = this.getMintMap(mintUrl);
		for (const s of secrets) map.delete(s);
	}
	async wipeProofsByKeysetId(mintUrl, keysetId) {
		const map = this.getMintMap(mintUrl);
		for (const [secret, p] of Array.from(map.entries())) if (p.id === keysetId) map.delete(secret);
	}
	async reserveProofs(mintUrl, secrets, operationId) {
		const map = this.getMintMap(mintUrl);
		for (const secret of secrets) {
			const p = map.get(secret);
			if (!p) throw new Error(`Proof with secret not found: ${secret}`);
			if (p.state !== "ready") throw new Error(`Proof is not ready, cannot reserve: ${secret}`);
			if (p.usedByOperationId) throw new Error(`Proof already reserved by operation ${p.usedByOperationId}: ${secret}`);
		}
		for (const secret of secrets) {
			const p = map.get(secret);
			map.set(secret, {
				...p,
				usedByOperationId: operationId
			});
		}
	}
	async releaseProofs(mintUrl, secrets) {
		const map = this.getMintMap(mintUrl);
		for (const secret of secrets) {
			const p = map.get(secret);
			if (p) {
				const { usedByOperationId: _, ...rest } = p;
				map.set(secret, rest);
			}
		}
	}
	async setCreatedByOperation(mintUrl, secrets, operationId) {
		const map = this.getMintMap(mintUrl);
		for (const secret of secrets) {
			const p = map.get(secret);
			if (p) map.set(secret, {
				...p,
				createdByOperationId: operationId
			});
		}
	}
	async getProofBySecret(mintUrl, secret) {
		const proof = this.getMintMap(mintUrl).get(secret);
		return proof ? { ...proof } : null;
	}
	async getProofsBySecrets(mintUrl, secrets) {
		if (!secrets || secrets.length === 0) return [];
		const map = this.getMintMap(mintUrl);
		const uniqueSecrets = Array.from(new Set(secrets));
		const proofs = [];
		for (const secret of uniqueSecrets) {
			const proof = map.get(secret);
			if (proof) proofs.push({ ...proof });
		}
		return proofs;
	}
	async getProofsByOperationId(mintUrl, operationId) {
		const map = this.getMintMap(mintUrl);
		const results = [];
		for (const p of map.values()) if (p.usedByOperationId === operationId || p.createdByOperationId === operationId) results.push({ ...p });
		return results;
	}
	async getAvailableProofs(mintUrl, filter) {
		const map = this.getMintMap(mintUrl);
		const unitFilter = getUnitFilter(filter);
		return Array.from(map.values()).filter((p) => p.state === "ready" && !p.usedByOperationId && matchesUnit(p, unitFilter)).map((p) => ({ ...p }));
	}
	async getReservedProofs() {
		const all = [];
		for (const map of this.proofsByMint.values()) for (const p of map.values()) if (p.state === "ready" && p.usedByOperationId) all.push({ ...p });
		return all;
	}
};

//#endregion
//#region repositories/memory/MemoryMeltQuoteRepository.ts
var MemoryMeltQuoteRepository = class {
	quotes = /* @__PURE__ */ new Map();
	makeKey(mintUrl, method, quoteId) {
		return `${normalizeMintUrl(mintUrl)}::${method}::${quoteId}`;
	}
	async getMeltQuote(mintUrl, method, quoteId) {
		const quote = this.quotes.get(this.makeKey(mintUrl, method, quoteId));
		return quote ? { ...quote } : null;
	}
	async upsertMeltQuote(quote) {
		const normalizedMintUrl = normalizeMintUrl(quote.mintUrl);
		const now = Date.now();
		const existing = await this.getMeltQuote(normalizedMintUrl, quote.method, quote.quoteId);
		this.quotes.set(this.makeKey(normalizedMintUrl, quote.method, quote.quoteId), {
			...quote,
			mintUrl: normalizedMintUrl,
			quote: quote.quoteId,
			createdAt: existing?.createdAt ?? quote.createdAt,
			updatedAt: now
		});
	}
	async getPendingMeltQuotes(method) {
		const result = [];
		for (const quote of this.quotes.values()) {
			if (method && quote.method !== method) continue;
			if (quote.state !== "PAID") result.push({ ...quote });
		}
		return result;
	}
};

//#endregion
//#region repositories/memory/MemorySendOperationRepository.ts
var MemorySendOperationRepository = class {
	operations = /* @__PURE__ */ new Map();
	async create(operation) {
		if (this.operations.has(operation.id)) throw new Error(`SendOperation with id ${operation.id} already exists`);
		this.operations.set(operation.id, { ...operation });
	}
	async update(operation) {
		if (!this.operations.has(operation.id)) throw new Error(`SendOperation with id ${operation.id} not found`);
		this.operations.set(operation.id, {
			...operation,
			updatedAt: Date.now()
		});
	}
	async getById(id) {
		const op = this.operations.get(id);
		return op ? { ...op } : null;
	}
	async getByState(state) {
		const results = [];
		for (const op of this.operations.values()) if (op.state === state) results.push({ ...op });
		return results;
	}
	async getPending() {
		const results = [];
		for (const op of this.operations.values()) if (op.state === "executing" || op.state === "pending" || op.state === "rolling_back") results.push({ ...op });
		return results;
	}
	async getByMintUrl(mintUrl) {
		const results = [];
		for (const op of this.operations.values()) if (op.mintUrl === mintUrl) results.push({ ...op });
		return results;
	}
	async getAll() {
		return Array.from(this.operations.values(), (operation) => ({ ...operation }));
	}
	async delete(id) {
		this.operations.delete(id);
	}
};

//#endregion
//#region repositories/memory/MemoryMintOperationRepository.ts
var MemoryMintOperationRepository = class {
	operations = /* @__PURE__ */ new Map();
	async create(operation) {
		if (this.operations.has(operation.id)) throw new Error(`MintOperation with id ${operation.id} already exists`);
		this.operations.set(operation.id, { ...operation });
	}
	async update(operation) {
		if (!this.operations.has(operation.id)) throw new Error(`MintOperation with id ${operation.id} not found`);
		this.operations.set(operation.id, {
			...operation,
			updatedAt: Date.now()
		});
	}
	async getById(id) {
		const operation = this.operations.get(id);
		return operation ? { ...operation } : null;
	}
	async getByState(state) {
		const results = [];
		for (const operation of this.operations.values()) if (operation.state === state) results.push({ ...operation });
		return results;
	}
	async getPending() {
		const results = [];
		for (const operation of this.operations.values()) if (operation.state === "pending" || operation.state === "executing") results.push({ ...operation });
		return results;
	}
	async getByMintUrl(mintUrl) {
		const results = [];
		for (const operation of this.operations.values()) if (operation.mintUrl === mintUrl) results.push({ ...operation });
		return results;
	}
	async getByQuoteId(mintUrl, method, quoteId) {
		const results = [];
		for (const operation of this.operations.values()) if (operation.mintUrl === mintUrl && operation.method === method && "quoteId" in operation && operation.quoteId === quoteId) results.push({ ...operation });
		return results.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
	}
	async getAll() {
		return Array.from(this.operations.values(), (operation) => ({ ...operation }));
	}
	async delete(id) {
		this.operations.delete(id);
	}
};

//#endregion
//#region repositories/memory/MemoryReceiveOperationRepository.ts
var MemoryReceiveOperationRepository = class {
	operations = /* @__PURE__ */ new Map();
	async create(operation) {
		if (this.operations.has(operation.id)) throw new Error(`ReceiveOperation with id ${operation.id} already exists`);
		this.operations.set(operation.id, { ...operation });
	}
	async update(operation) {
		if (!this.operations.has(operation.id)) throw new Error(`ReceiveOperation with id ${operation.id} not found`);
		this.operations.set(operation.id, {
			...operation,
			updatedAt: Date.now()
		});
	}
	async getById(id) {
		const op = this.operations.get(id);
		return op ? { ...op } : null;
	}
	async getByState(state) {
		const results = [];
		for (const op of this.operations.values()) if (op.state === state) results.push({ ...op });
		return results;
	}
	async getPending() {
		const results = [];
		for (const op of this.operations.values()) if (op.state === "executing") results.push({ ...op });
		return results;
	}
	async getByMintUrl(mintUrl) {
		const results = [];
		for (const op of this.operations.values()) if (op.mintUrl === mintUrl) results.push({ ...op });
		return results;
	}
	async getByPaymentRequestAttemptId(attemptId) {
		for (const op of this.operations.values()) if (op.source?.type === "payment-request" && op.source.attemptId === attemptId) return { ...op };
		return null;
	}
	async getAll() {
		return Array.from(this.operations.values(), (operation) => ({ ...operation }));
	}
	async delete(id) {
		this.operations.delete(id);
	}
};

//#endregion
//#region repositories/memory/MemoryPaymentRequestReceiveRepository.ts
function cloneOperation(operation) {
	return {
		...operation,
		mints: [...operation.mints]
	};
}
function cloneAttempt(attempt) {
	return {
		...attempt,
		payload: attempt.payload ? {
			...attempt.payload,
			proofs: attempt.payload.proofs.map((proof) => ({ ...proof }))
		} : void 0
	};
}
var MemoryPaymentRequestReceiveOperationRepository = class {
	operations = /* @__PURE__ */ new Map();
	async create(operation) {
		if (this.operations.has(operation.id)) throw new Error(`PaymentRequestReceiveOperation with id ${operation.id} already exists`);
		this.operations.set(operation.id, cloneOperation(operation));
	}
	async update(operation) {
		if (!this.operations.has(operation.id)) throw new Error(`PaymentRequestReceiveOperation with id ${operation.id} not found`);
		this.operations.set(operation.id, cloneOperation({
			...operation,
			updatedAt: Date.now()
		}));
	}
	async getById(id) {
		const operation = this.operations.get(id);
		return operation ? cloneOperation(operation) : null;
	}
	async getByState(state) {
		return Array.from(this.operations.values()).filter((operation) => operation.state === state).map(cloneOperation);
	}
	async getActiveByRequestId(requestId) {
		return Array.from(this.operations.values()).filter((operation) => operation.state === "active" && operation.requestId === requestId).map(cloneOperation);
	}
	async list(filter) {
		return Array.from(this.operations.values()).filter((operation) => !filter?.state || operation.state === filter.state).map(cloneOperation);
	}
};
var MemoryPaymentRequestReceiveAttemptRepository = class {
	attempts = /* @__PURE__ */ new Map();
	async create(attempt) {
		if (this.attempts.has(attempt.id)) throw new Error(`PaymentRequestReceiveAttempt with id ${attempt.id} already exists`);
		if (attempt.transportMessageId && await this.getByTransportMessageId(attempt.transportMessageId)) throw new Error(`PaymentRequestReceiveAttempt with transport message id ${attempt.transportMessageId} already exists`);
		if (await this.getByPayloadHash(attempt.requestOperationId, attempt.payloadHash)) throw new Error(`PaymentRequestReceiveAttempt with payload hash ${attempt.payloadHash} already exists`);
		this.attempts.set(attempt.id, cloneAttempt(attempt));
	}
	async update(attempt) {
		if (!this.attempts.has(attempt.id)) throw new Error(`PaymentRequestReceiveAttempt with id ${attempt.id} not found`);
		this.attempts.set(attempt.id, cloneAttempt({
			...attempt,
			updatedAt: Date.now()
		}));
	}
	async getById(id) {
		const attempt = this.attempts.get(id);
		return attempt ? cloneAttempt(attempt) : null;
	}
	async getByRequestOperationId(requestOperationId) {
		return Array.from(this.attempts.values()).filter((attempt) => attempt.requestOperationId === requestOperationId).map(cloneAttempt);
	}
	async getByReceiveOperationId(receiveOperationId) {
		const attempt = Array.from(this.attempts.values()).find((candidate) => candidate.receiveOperationId === receiveOperationId);
		return attempt ? cloneAttempt(attempt) : null;
	}
	async getByTransportMessageId(transportMessageId) {
		const attempt = Array.from(this.attempts.values()).find((candidate) => candidate.transportMessageId === transportMessageId);
		return attempt ? cloneAttempt(attempt) : null;
	}
	async getByPayloadHash(requestOperationId, payloadHash) {
		const attempt = Array.from(this.attempts.values()).find((candidate) => candidate.requestOperationId === requestOperationId && candidate.payloadHash === payloadHash);
		return attempt ? cloneAttempt(attempt) : null;
	}
	async getByRequestIdAndPayloadHash(requestId, payloadHash) {
		const attempts = Array.from(this.attempts.values()).filter((candidate) => candidate.requestId === requestId && candidate.payloadHash === payloadHash);
		const attempt = attempts.find((candidate) => candidate.state === "finalized") ?? attempts[0];
		return attempt ? cloneAttempt(attempt) : null;
	}
	async getByState(state) {
		return Array.from(this.attempts.values()).filter((attempt) => attempt.state === state).map(cloneAttempt);
	}
	async delete(id) {
		this.attempts.delete(id);
	}
};

//#endregion
//#region repositories/memory/MemoryRepositories.ts
var MemoryRepositories = class {
	mintRepository;
	keyRingRepository;
	counterRepository;
	keysetRepository;
	proofRepository;
	mintQuoteRepository;
	legacyMintQuoteRepository;
	meltQuoteRepository;
	historyRepository;
	sendOperationRepository;
	meltOperationRepository;
	authSessionRepository;
	mintOperationRepository;
	receiveOperationRepository;
	paymentRequestReceiveOperationRepository;
	paymentRequestReceiveAttemptRepository;
	constructor() {
		this.mintRepository = new MemoryMintRepository();
		this.keyRingRepository = new MemoryKeyRingRepository();
		this.counterRepository = new MemoryCounterRepository();
		this.keysetRepository = new MemoryKeysetRepository();
		this.proofRepository = new MemoryProofRepository();
		const sendOperationRepository = new MemorySendOperationRepository();
		const meltOperationRepository = new MemoryMeltOperationRepository();
		const mintOperationRepository = new MemoryMintOperationRepository();
		const receiveOperationRepository = new MemoryReceiveOperationRepository();
		this.sendOperationRepository = sendOperationRepository;
		this.meltOperationRepository = meltOperationRepository;
		this.mintOperationRepository = mintOperationRepository;
		this.receiveOperationRepository = receiveOperationRepository;
		this.mintQuoteRepository = new MemoryMintQuoteRepository();
		this.legacyMintQuoteRepository = new MemoryLegacyMintQuoteRepository();
		this.meltQuoteRepository = new MemoryMeltQuoteRepository();
		this.historyRepository = new MemoryHistoryRepository({
			sendOperationRepository,
			meltOperationRepository,
			mintOperationRepository,
			mintQuoteRepository: this.mintQuoteRepository,
			receiveOperationRepository
		});
		this.authSessionRepository = new MemoryAuthSessionRepository();
		this.paymentRequestReceiveOperationRepository = new MemoryPaymentRequestReceiveOperationRepository();
		this.paymentRequestReceiveAttemptRepository = new MemoryPaymentRequestReceiveAttemptRepository();
	}
	async init() {}
	async withTransaction(fn) {
		return fn(this);
	}
};

//#endregion
export { Amount, AuthApi, AuthService, AuthSessionError, AuthSessionExpiredError, AuthSessionService, ConsoleLogger, CounterService, DEFAULT_UNIT, DuplicatePluginRegistrationError, ExtensionRegistrationError, HistoryApi, HistoryService, HttpResponseError, KeyRingApi, KeyRingService, KeysetSyncError, Manager, MeltOperationService, MeltOpsApi, MeltQuoteApi, MemoryAuthSessionRepository, MemoryCounterRepository, MemoryHistoryRepository, MemoryKeyRingRepository, MemoryKeysetRepository, MemoryLegacyMintQuoteRepository, MemoryMeltOperationRepository, MemoryMeltQuoteRepository, MemoryMintOperationRepository, MemoryMintQuoteRepository, MemoryMintRepository, MemoryPaymentRequestReceiveAttemptRepository, MemoryPaymentRequestReceiveOperationRepository, MemoryProofRepository, MemoryReceiveOperationRepository, MemoryRepositories, MemorySendOperationRepository, MintApi, MintFetchError, MintOperationError, MintOperationProcessor, MintOperationService, MintOperationWatcherService, MintOpsApi, MintQuoteApi, MintService, NetworkError, OperationInProgressError, OpsApi, PaymentRequestError, PaymentRequestReceiveService, PaymentRequestReceiveTransportHandlerProvider, PaymentRequestService, PaymentRequestsApi, PluginHost, ProofOperationError, ProofService, ProofStateWatcherService, ProofValidationError, QuoteApi, ReceiveOperationService, ReceiveOpsApi, SeedService, SendOperationService, SendOpsApi, SubscriptionApi, SubscriptionManager, TokenService, TokenValidationError, UnitMismatchError, UnitValidationError, UnknownMintError, WalletApi, WalletBalancesApi, WalletRestoreService, WalletService, WsConnectionManager, assertSameUnit, assertUnitAmount, compareHistoryEntries, createSendOperation, deserializeAmount, deserializeToken, getDecodedToken, getEncodedToken, getKeepProofSecrets, getMintQuoteAmount, getMintQuoteAvailableAmount, getMintQuoteRemoteState, getSendProofSecrets, getTokenMetadata, hasPreparedData, initializeCoco, isExecutingOperation, isFinalizedOperation, isInitOperation, isLegacyHistoryEntry, isMintQuotePending, isOperationHistoryEntry, isPendingOperation, isPreparedOperation, isRolledBackOperation, isRollingBackOperation, isStatefulMintQuote, isTerminalOperation, isUnitAmountLikeObject, legacyHistoryId, meltQuoteFromBolt11Response, meltQuoteFromBolt12Response, meltQuoteFromOnchainResponse, meltQuoteToMethodSnapshot, mintQuoteFromBolt11Response, mintQuoteFromBolt12Response, mintQuoteFromOnchainResponse, mintQuoteToMethodSnapshot, normalizeMeltMethodData, normalizeMintUrl, normalizeUnit, normalizeUnitAmount, normalizeUnitList, operationHistoryId, parseHistoryEntryId, parseUnitAmount, projectLegacyHistoryRow, projectMeltOperation, projectMintOperation, projectOperationToHistoryEntry, projectReceiveOperation, projectSendOperation, resolveOnchainMeltFeeOption, sameUnitAmount, serializeAmount, stringifyJson, sumAmounts, toAmount };