import { Amount, HttpResponseError, MintOperationError, NetworkError, OutputData, hashToCurve } from "@cashu/cashu-ts";

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
var MintQuoteValidationError = class extends Error {
	constructor(message, cause) {
		super(message);
		this.name = "MintQuoteValidationError";
		this.cause = cause;
	}
};
var MintQuoteKeyError = class extends Error {
	constructor(message, cause) {
		super(message);
		this.name = "MintQuoteKeyError";
		this.cause = cause;
	}
};
var DerivationIndexExhaustedError = class extends Error {
	purpose;
	constructor(purpose) {
		super(`No derivation indexes remain for keypair purpose ${purpose}`);
		this.name = "DerivationIndexExhaustedError";
		this.purpose = purpose;
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
var QuoteIdentityConflictError = class extends Error {
	kind;
	mintUrl;
	quoteId;
	methods;
	constructor(kind, mintUrl, quoteId, methods, message) {
		super(message ?? `${kind} quote identity conflict for quote ${quoteId} at ${mintUrl}: methods ${methods.join(", ")}`);
		this.name = "QuoteIdentityConflictError";
		this.kind = kind;
		this.mintUrl = mintUrl;
		this.quoteId = quoteId;
		this.methods = [...methods];
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
		amount: Amount.from(amountInput),
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
		amount: Amount.from(value.amount),
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
		secret: uint8ArrayToHex(output.secret),
		...output.ephemeralE === void 0 ? {} : { ephemeralE: output.ephemeralE }
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
	}, BigInt("0x" + serialized.blindingFactor), hexToUint8Array(serialized.secret), serialized.ephemeralE);
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
function getProofStateInputsFromSerializedOutputs(outputs) {
	return outputs.map((output) => ({
		id: output.blindedMessage.id,
		secret: decodeSecretHex(output.secret)
	}));
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
	return Amount.from(value);
}
function sumAmounts(values) {
	return Amount.sum(values);
}
function serializeAmount(value) {
	return Amount.from(value).toString();
}
function stringifyJson(value) {
	const json = JSON.stringify(value, (_key, value) => typeof value === "bigint" ? value.toString() : value);
	if (json === void 0) throw new TypeError("Value cannot be serialized to JSON");
	return json;
}
function deserializeAmount(value) {
	return Amount.from(value);
}
function deserializeStoredAmount(value) {
	if (value instanceof Amount || typeof value === "string" || typeof value === "number" || typeof value === "bigint") return deserializeAmount(value);
	if (value && typeof value === "object" && "value" in value) {
		const legacyValue = value.value;
		if (typeof legacyValue === "string" || typeof legacyValue === "number" || typeof legacyValue === "bigint") return deserializeAmount(legacyValue);
	}
	throw new TypeError("Stored amount is invalid");
}
/**
* Convert blinded signatures to a repository-safe form.
*/
function serializeBlindedSignatures(signatures) {
	return signatures?.map((signature) => ({
		...signature,
		amount: serializeAmount(signature.amount)
	}));
}
/**
* Restore blinded signature Amount instances after repository hydration.
*/
function deserializeBlindedSignatures(value) {
	if (value === void 0 || value === null) return;
	if (!Array.isArray(value)) throw new TypeError("Stored blinded signatures must be an array");
	return value.map((signature, index) => {
		if (!signature || typeof signature !== "object" || !("amount" in signature)) throw new TypeError(`Stored blinded signature ${index} is invalid`);
		return {
			...signature,
			amount: deserializeStoredAmount(signature.amount)
		};
	});
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
export { AuthSessionError as A, OperationInProgressError as B, assertUnitAmount as C, normalizeUnitList as D, normalizeUnitAmount as E, MintFetchError as F, TokenValidationError as G, ProofOperationError as H, MintOperationError as I, UnknownMintError as J, UnitMismatchError as K, MintQuoteKeyError as L, DerivationIndexExhaustedError as M, HttpResponseError as N, parseUnitAmount as O, KeysetSyncError as P, MintQuoteValidationError as R, assertSameUnit as S, normalizeUnit as T, ProofValidationError as U, PaymentRequestError as V, QuoteIdentityConflictError as W, serializeOutputData as _, deserializeBlindedSignatures as a, toAmount as b, deserializeToken as c, getSecretsFromSerializedOutputData as d, mapProofToCoreProof as f, serializeOutput as g, serializeBlindedSignatures as h, deserializeAmount as i, AuthSessionExpiredError as j, sameUnitAmount as k, generateSubId as l, serializeAmount as m, buildYHexMapsForSecrets as n, deserializeOutput as o, normalizeMintUrl as p, UnitValidationError as q, computeYHexForSecrets as r, deserializeOutputData as s, assertNonNegativeInteger as t, getProofStateInputsFromSerializedOutputs as u, stringifyJson as v, isUnitAmountLikeObject as w, DEFAULT_UNIT as x, sumAmounts as y, NetworkError as z };