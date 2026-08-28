import { Amount } from "@cashu/cashu-ts";

//#region operations/melt/MeltMethodHandler.ts
function normalizeMeltMethodData(methodData) {
	if (typeof methodData !== "object" || methodData === null || !("amountSats" in methodData) || methodData.amountSats === void 0) return methodData;
	return {
		...methodData,
		amountSats: Amount.from(methodData.amountSats)
	};
}

//#endregion
export { normalizeMeltMethodData as t };