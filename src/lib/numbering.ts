import { Counter } from "@/models/Counter";
import { connectDB } from "@/lib/db";

export type EntitySequenceKey =
  | "ORDER"
  | "WORK_ORDER"
  | "JOB_WORK"
  | "DELIVERY"
  | "CUSTOMER"
  | "ARTISAN";

interface SequenceOptions {
  prefix?: string;
  padDigits?: number;
  includeYear?: boolean;
}

const DEFAULT_OPTIONS: Record<EntitySequenceKey, SequenceOptions> = {
  ORDER: { prefix: "ORD", padDigits: 4, includeYear: true },
  WORK_ORDER: { prefix: "WO", padDigits: 4, includeYear: true },
  JOB_WORK: { prefix: "JW", padDigits: 4, includeYear: true },
  DELIVERY: { prefix: "DEL", padDigits: 4, includeYear: true },
  CUSTOMER: { prefix: "CUS", padDigits: 4, includeYear: false },
  ARTISAN: { prefix: "KAR", padDigits: 3, includeYear: false },
};

/**
 * Atomically increments and generates the next running reference number
 */
export async function getNextSequenceNumber(
  key: EntitySequenceKey,
  customPrefix?: string
): Promise<string> {
  await connectDB();
  const config = DEFAULT_OPTIONS[key];
  const currentYear = new Date().getFullYear();
  const prefix = customPrefix || config.prefix || key;
  const padDigits = config.padDigits || 4;

  const filter = config.includeYear
    ? { key, year: currentYear }
    : { key, year: 0 };

  const counter = await Counter.findOneAndUpdate(
    filter,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.seq).padStart(padDigits, "0");

  if (config.includeYear) {
    return `${prefix}-${currentYear}-${seqStr}`;
  }
  return `${prefix}-${seqStr}`;
}

/**
 * Formats a piece number relative to its parent order
 * Example: ORD-2026-0001/01
 */
export function formatPieceNumber(orderNo: string, pieceIndex: number): string {
  const indexStr = String(pieceIndex).padStart(2, "0");
  return `${orderNo}/${indexStr}`;
}
