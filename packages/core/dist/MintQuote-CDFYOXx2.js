import { R as MintQuoteValidationError } from "./utils-CmANTq2P.js";
import { Amount } from "@cashu/cashu-ts";

//#region models/MintQuoteObservationFactory.ts
/** Maps a normalized BOLT11 response without enforcing canonical accounting invariants. */
function mintQuoteObservationFromBolt11Response(mintUrl, quote, options) {
	const now = options?.now ?? Date.now();
	const amount = Amount.from(quote.amount);
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
		reusable: false,
		amountPaid: Amount.from(quote.amount_paid),
		amountIssued: Amount.from(quote.amount_issued),
		remoteUpdatedAt: quote.updated_at ?? null,
		quoteData: { amount },
		createdAt: now,
		updatedAt: now
	};
}
/** Maps a normalized on-chain response without enforcing canonical accounting invariants. */
function mintQuoteObservationFromOnchainResponse(mintUrl, quote, options) {
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
		amountPaid: Amount.from(quote.amount_paid),
		amountIssued: Amount.from(quote.amount_issued),
		remoteUpdatedAt: quote.updated_at ?? null,
		quoteData: { pubkey: quote.pubkey },
		createdAt: now,
		updatedAt: now
	};
}
/** Maps a normalized BOLT12 response without enforcing canonical accounting invariants. */
function mintQuoteObservationFromBolt12Response(mintUrl, quote, options) {
	const now = options?.now ?? Date.now();
	const amount = quote.amount ? Amount.from(quote.amount) : void 0;
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
		amountPaid: Amount.from(quote.amount_paid),
		amountIssued: Amount.from(quote.amount_issued),
		remoteUpdatedAt: quote.updated_at ?? null,
		quoteData: {
			pubkey: quote.pubkey,
			amount
		},
		createdAt: now,
		updatedAt: now
	};
}

//#endregion
//#region models/MintQuoteClaimability.ts
function invalid(remoteAvailable) {
	return {
		status: "invalid",
		remoteAvailable
	};
}
function waiting(remoteAvailable) {
	return {
		status: "waiting",
		remoteAvailable
	};
}
function assessAtomicClaimability(quote, facts, remoteAvailable) {
	if (!quote.amountIssued.isZero() && !quote.amountIssued.equals(quote.amount) || facts.requestedAmount !== void 0 && !facts.requestedAmount.equals(quote.amount)) return invalid(remoteAvailable);
	if (quote.amountIssued.equals(quote.amount) || facts.finalizedAmount?.greaterThanOrEqual(quote.amount)) return {
		status: "complete",
		remoteAvailable
	};
	if (quote.amountPaid.lessThan(quote.amount)) return waiting(remoteAvailable);
	return {
		status: "claimable",
		remoteAvailable,
		claimAmount: quote.amount
	};
}
function assessBalanceClaimability(quote, facts, remoteAvailable) {
	const finalizedAmount = facts.finalizedAmount ?? Amount.zero();
	const effectiveIssued = finalizedAmount.greaterThan(quote.amountIssued) ? finalizedAmount : quote.amountIssued;
	const availableAfterFinalized = quote.amountPaid.lessThan(effectiveIssued) ? Amount.zero() : quote.amountPaid.subtract(effectiveIssued);
	const reservedAmount = facts.reservedAmount ?? Amount.zero();
	const locallyAvailable = availableAfterFinalized.lessThan(reservedAmount) ? Amount.zero() : availableAfterFinalized.subtract(reservedAmount);
	const claimAmount = facts.requestedAmount ?? locallyAvailable;
	if (claimAmount.isZero() || claimAmount.greaterThan(locallyAvailable)) return waiting(remoteAvailable);
	return {
		status: "claimable",
		remoteAvailable,
		claimAmount
	};
}
/**
* Assesses canonical Mint Quote Accounting for one local claim.
*
* Quote expiry and deprecated BOLT11 compatibility state are deliberately absent from the facts
* consumed by this module. Atomic-versus-balance policy is private to this implementation.
*/
function assessMintQuoteClaimability(quote, facts = {}) {
	if (quote.amountIssued.greaterThan(quote.amountPaid)) return invalid(Amount.zero());
	const remoteAvailable = quote.amountPaid.subtract(quote.amountIssued);
	if (facts.requestedAmount?.isZero()) return invalid(remoteAvailable);
	if (quote.method === "bolt11") return assessAtomicClaimability(quote, facts, remoteAvailable);
	return assessBalanceClaimability(quote, facts, remoteAvailable);
}

//#endregion
//#region models/MintQuote.ts
function isStatefulMintQuote(quote) {
	return quote.method !== "onchain" && quote.method !== "bolt12";
}
/** Derives the deprecated BOLT11 state projection from canonical quote accounting. */
function deriveBolt11MintQuoteState(amountPaid, amountIssued) {
	return amountPaid.isZero() && amountIssued.isZero() ? "UNPAID" : amountPaid.greaterThan(amountIssued) ? "PAID" : "ISSUED";
}
/**
* Applies a legacy BOLT11 state observation without allowing it to reduce canonical accounting.
*
* @deprecated Legacy state is a fallback for snapshots that do not carry Mint Quote Accounting.
*/
function applyBolt11MintQuoteStateFallback(quote, state, observedAt = Date.now()) {
	const hasLegacyProjectionShape = quote.amountPaid.isZero() && quote.amountIssued.isZero() || quote.amountPaid.equals(quote.amount) && quote.amountIssued.isZero() || quote.amountPaid.equals(quote.amount) && quote.amountIssued.equals(quote.amount);
	if (quote.remoteUpdatedAt !== null || !hasLegacyProjectionShape) return {
		...quote,
		state: deriveBolt11MintQuoteState(quote.amountPaid, quote.amountIssued)
	};
	const paidFallback = state === "UNPAID" ? Amount.zero() : quote.amount;
	const issuedFallback = state === "ISSUED" ? quote.amount : Amount.zero();
	const amountPaid = quote.amountPaid.greaterThan(paidFallback) ? quote.amountPaid : paidFallback;
	const amountIssued = quote.amountIssued.greaterThan(issuedFallback) ? quote.amountIssued : issuedFallback;
	return {
		...quote,
		state: deriveBolt11MintQuoteState(amountPaid, amountIssued),
		amountPaid,
		amountIssued,
		updatedAt: Math.max(quote.updatedAt, observedAt)
	};
}
/**
* Returns the deprecated BOLT11 state projection for compatibility consumers.
*
* @deprecated Use `amountPaid` and `amountIssued`, or the common Claimability assessment.
*/
function getMintQuoteRemoteState(quote) {
	return isStatefulMintQuote(quote) ? deriveBolt11MintQuoteState(quote.amountPaid, quote.amountIssued) : void 0;
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
/** Returns mint-reported availability without local issuance or reservation facts. */
function getMintQuoteAvailableAmount(quote) {
	return assessMintQuoteClaimability(quote).remoteAvailable;
}
function isMintQuotePending(quote) {
	const { status } = assessMintQuoteClaimability(quote);
	return status === "waiting" || status === "claimable";
}
function assertValidMintQuoteAccounting(quoteId, amountPaid, amountIssued) {
	if (amountIssued.greaterThan(amountPaid)) throw new MintQuoteValidationError(`Mint quote ${quoteId} has amount_issued greater than amount_paid`);
}
function mintQuoteFromBolt11Response(mintUrl, quote, options) {
	const observation = mintQuoteObservationFromBolt11Response(mintUrl, quote, options);
	const canonicalQuote = {
		...observation,
		state: deriveBolt11MintQuoteState(observation.amountPaid, observation.amountIssued)
	};
	assertValidMintQuoteAccounting(canonicalQuote.quoteId, canonicalQuote.amountPaid, canonicalQuote.amountIssued);
	return canonicalQuote;
}
function mintQuoteFromOnchainResponse(mintUrl, quote, options) {
	const canonicalQuote = mintQuoteObservationFromOnchainResponse(mintUrl, quote, options);
	assertValidMintQuoteAccounting(canonicalQuote.quoteId, canonicalQuote.amountPaid, canonicalQuote.amountIssued);
	return canonicalQuote;
}
function mintQuoteFromBolt12Response(mintUrl, quote, options) {
	const canonicalQuote = mintQuoteObservationFromBolt12Response(mintUrl, quote, options);
	assertValidMintQuoteAccounting(canonicalQuote.quoteId, canonicalQuote.amountPaid, canonicalQuote.amountIssued);
	return canonicalQuote;
}
function mintQuoteToMethodSnapshot(quote) {
	if (quote.method === "bolt11") return {
		quote: quote.quoteId,
		request: quote.request,
		method: "bolt11",
		amount: quote.amount,
		unit: quote.unit,
		expiry: quote.expiry,
		pubkey: quote.pubkey,
		state: deriveBolt11MintQuoteState(quote.amountPaid, quote.amountIssued),
		amount_paid: quote.amountPaid,
		amount_issued: quote.amountIssued,
		updated_at: quote.remoteUpdatedAt
	};
	if (quote.method === "onchain") return {
		quote: quote.quoteId,
		request: quote.request,
		method: "onchain",
		unit: quote.unit,
		expiry: quote.expiry,
		pubkey: quote.quoteData.pubkey,
		amount_paid: quote.amountPaid,
		amount_issued: quote.amountIssued,
		updated_at: quote.remoteUpdatedAt
	};
	return {
		quote: quote.quoteId,
		request: quote.request,
		method: "bolt12",
		amount: quote.amount,
		unit: quote.unit,
		expiry: quote.expiry,
		pubkey: quote.quoteData.pubkey,
		amount_paid: quote.amountPaid,
		amount_issued: quote.amountIssued,
		updated_at: quote.remoteUpdatedAt
	};
}

//#endregion
export { getMintQuoteRemoteState as a, mintQuoteFromBolt11Response as c, mintQuoteToMethodSnapshot as d, assessMintQuoteClaimability as f, mintQuoteObservationFromOnchainResponse as h, getMintQuoteAvailableAmount as i, mintQuoteFromBolt12Response as l, mintQuoteObservationFromBolt12Response as m, deriveBolt11MintQuoteState as n, isMintQuotePending as o, mintQuoteObservationFromBolt11Response as p, getMintQuoteAmount as r, isStatefulMintQuote as s, applyBolt11MintQuoteStateFallback as t, mintQuoteFromOnchainResponse as u };