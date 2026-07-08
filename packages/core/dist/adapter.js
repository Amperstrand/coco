import { Amount, OutputData } from "@cashu/cashu-ts";

//#region models/Error.ts
var UnitValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "UnitValidationError";
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
//#region models/History.ts
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
function isMintQuotePending(quote) {
	if (isStatefulMintQuote(quote)) return quote.state !== "ISSUED";
	return true;
}

//#endregion
//#region operations/melt/MeltMethodHandler.ts
function normalizeMeltMethodData(methodData) {
	if (typeof methodData !== "object" || methodData === null || !("amountSats" in methodData) || methodData.amountSats === void 0) return methodData;
	return {
		...methodData,
		amountSats: Amount.from(methodData.amountSats)
	};
}

//#endregion
//#region amounts.ts
const DEFAULT_UNIT = "sat";
function normalizeUnit(unit, options) {
	const rawUnit = unit === void 0 ? options?.defaultUnit : unit;
	if (typeof rawUnit !== "string") throw new UnitValidationError("Unit is required");
	const normalized = rawUnit.trim().toLowerCase();
	if (!normalized) throw new UnitValidationError("Unit cannot be empty");
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
export { DEFAULT_UNIT, QuoteIdentityConflictError, compareHistoryEntries, deserializeAmount, deserializeOutput, deserializeOutputData, deserializeToken, getMintQuoteAmount, getMintQuoteRemoteState, getSecretsFromSerializedOutputData, isMintQuotePending, isStatefulMintQuote, normalizeMeltMethodData, normalizeMintUrl, normalizeUnit, operationHistoryId, parseHistoryEntryId, projectLegacyHistoryRow, serializeAmount, serializeOutput, serializeOutputData, stringifyJson };