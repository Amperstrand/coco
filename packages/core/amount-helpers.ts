/**
 * Defensive proof-amount extraction for cashu-ts v4 Amount value objects.
 * Handles all representations: Amount instance, number, bigint, string, _hex, valueOf.
 */
import { Amount } from '@cashu/cashu-ts';

export function coerceAmount(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    const n = trimmed.startsWith('0x') || trimmed.startsWith('-0x')
      ? parseInt(trimmed, 16)
      : Number(trimmed);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj.toNumber === 'function') {
      try { const n = (obj.toNumber as () => number).call(obj); return Number.isFinite(n) ? n : 0; } catch { /* fall through */ }
    }
    if (typeof obj.valueOf === 'function') {
      try { const n = Number((obj.valueOf as () => unknown).call(obj)); if (Number.isFinite(n)) return n; } catch { /* fall through */ }
    }
    if (typeof obj._hex === 'string') {
      const n = parseInt(obj._hex, 16);
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

export function proofAmount(proof: unknown): number {
  if (proof == null) return 0;
  const p = proof as Record<string, unknown>;
  const raw = p.amount ?? p.a ?? p.value ?? p.v;
  const n = coerceAmount(raw);
  return n > 0 && Number.isFinite(n) ? Math.floor(n) : 0;
}

export function sumProofAmounts(proofs: unknown[] | null | undefined): number {
  if (!Array.isArray(proofs)) return 0;
  return proofs.reduce<number>((sum, p) => sum + proofAmount(p), 0);
}

export function amountToNumber(v: unknown): number {
  return coerceAmount(v);
}
