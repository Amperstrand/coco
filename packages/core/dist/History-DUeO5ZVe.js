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
export { operationHistoryId as a, projectMeltOperation as c, projectReceiveOperation as d, projectSendOperation as f, legacyHistoryId as i, projectMintOperation as l, isLegacyHistoryEntry as n, parseHistoryEntryId as o, isOperationHistoryEntry as r, projectLegacyHistoryRow as s, compareHistoryEntries as t, projectOperationToHistoryEntry as u };