import { getProduct } from "../data/catalog.ts";
import { MAX_CART_ITEMS, MAX_ITEM_QUANTITY, MAX_MESSAGE_LENGTH, type CartItem } from "./cart.ts";

export const DRAFT_STORAGE_KEY = "flomira.order-drafts.v1";
export const DRAFT_STATUS = "Draft — not submitted" as const;
export const MAX_DRAFTS = 10;
export const MAX_HORIZON_DAYS = 180;
export const ORDER_LIMITS = {
  name: 80,
  email: 254,
  phone: 32,
  address: 500,
  note: 1500,
  allergies: 1000,
} as const;

export const REQUESTED_WINDOWS = [
  { id: "morning", label: "Morning · 9 am–12 pm" },
  { id: "afternoon", label: "Afternoon · 12–4 pm" },
  { id: "evening", label: "Evening · 4–7 pm" },
] as const;

export type OrderDetails = {
  name: string;
  email: string;
  phone: string;
  fulfillment: "" | "pickup" | "delivery";
  address: string;
  date: string;
  timeWindow: string;
  note: string;
  allergies: string;
  acknowledged: boolean;
};

export const EMPTY_ORDER_DETAILS: OrderDetails = {
  name: "", email: "", phone: "", fulfillment: "", address: "", date: "",
  timeWindow: "", note: "", allergies: "", acknowledged: false,
};

export type OrderErrors = Partial<Record<keyof OrderDetails | "cart", string>>;

export type DraftItem = {
  id: string;
  productId: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  servings: string;
  flavor: string;
  message: string;
  allergens: string[];
  leadTimeDays: number;
  quantity: number;
  unitPriceCents: number;
};

export type OrderDraft = {
  version: 1;
  reference: string;
  createdAt: string;
  status: typeof DRAFT_STATUS;
  details: OrderDetails;
  items: DraftItem[];
  sampleSubtotalCents: number;
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/** Plain text only; bounded, trimmed, with control characters removed. */
export function cleanOrderText(value: unknown, maxLength: number, multiline = false): string {
  if (typeof value !== "string") return "";
  const cleaned = Array.from(value).filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return (code >= 32 && code !== 127 && !(code >= 128 && code <= 159)
      && !(code >= 0x202a && code <= 0x202e) && !(code >= 0x2066 && code <= 0x2069))
      || (multiline && (character === "\n" || character === "\t"));
  }).join("");
  return cleaned.trim().slice(0, maxLength);
}

/** A local calendar date, never a UTC ISO slice. Invalid dates return "". */
export function localCalendarDate(date: Date): string {
  if (!Number.isFinite(date.getTime())) return "";
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || year > 9999) return false;
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return localCalendarDate(date) === value;
}

/** Adds calendar days at local noon so daylight-saving changes do not shift dates. */
export function addCalendarDays(value: string, days: number): string {
  if (!isCalendarDate(value) || !Number.isInteger(days)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localCalendarDate(date);
}

export function formatRequestedDate(value: string): string {
  if (!isCalendarDate(value)) return "Not specified";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

export function getDateBounds(items: readonly CartItem[], now: Date): {
  today: string; min: string; max: string; leadTimeDays: number;
} {
  const today = localCalendarDate(now);
  const safeItems = Array.isArray(items) ? items : [];
  const leadTimeDays = safeItems.reduce((max, item) => Math.max(max, getProduct(record(item).productId as string)?.leadTimeDays ?? 0), 0);
  return { today, min: addCalendarDays(today, leadTimeDays), max: addCalendarDays(today, MAX_HORIZON_DAYS), leadTimeDays };
}

export function sanitizeOrderDetails(value: unknown): OrderDetails {
  const input = record(value);
  const fulfillment = input.fulfillment === "pickup" || input.fulfillment === "delivery" ? input.fulfillment : "";
  return {
    name: cleanOrderText(input.name, ORDER_LIMITS.name),
    email: cleanOrderText(input.email, ORDER_LIMITS.email),
    phone: cleanOrderText(input.phone, ORDER_LIMITS.phone),
    fulfillment,
    address: fulfillment === "delivery" ? cleanOrderText(input.address, ORDER_LIMITS.address, true) : "",
    date: cleanOrderText(input.date, 10),
    timeWindow: REQUESTED_WINDOWS.some((window) => window.id === input.timeWindow) ? String(input.timeWindow) : "",
    note: cleanOrderText(input.note, ORDER_LIMITS.note, true),
    allergies: cleanOrderText(input.allergies, ORDER_LIMITS.allergies, true),
    acknowledged: input.acknowledged === true,
  };
}

function detailErrors(value: unknown): { details: OrderDetails; errors: OrderErrors } {
  const input = record(value);
  const details = sanitizeOrderDetails(value);
  const errors: OrderErrors = {};
  if (!details.name) errors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) errors.email = "Enter a valid email address, such as name@example.com.";
  const phoneDigits = details.phone.replace(/\D/g, "");
  if (!/^\+?[\d\s().-]+$/.test(details.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Enter a phone number with 7–15 digits; country code, spaces, +, ( ), and - are accepted.";
  }
  if (!details.fulfillment) errors.fulfillment = "Choose a requested delivery or pickup preference.";
  if (details.fulfillment === "delivery" && details.address.length < 10) errors.address = "Enter a delivery address, including street, city, and postal code.";
  if (!isCalendarDate(details.date)) errors.date = "Choose a valid requested date.";
  if (!details.timeWindow) errors.timeWindow = "Choose a requested time window.";
  if (!details.acknowledged) errors.acknowledged = "Acknowledge that this preview is not an order, payment, or reservation.";
  for (const key of Object.keys(ORDER_LIMITS) as (keyof typeof ORDER_LIMITS)[]) {
    if (key === "address" && details.fulfillment !== "delivery") continue;
    if (typeof input[key] === "string" && (input[key] as string).length > ORDER_LIMITS[key]) {
      errors[key] = `Use ${ORDER_LIMITS[key]} characters or fewer.`;
    }
  }
  if (typeof input.date === "string" && input.date !== details.date) errors.date = "Choose a valid requested date.";
  return { details, errors };
}

/** Creates a catalog-backed price snapshot; rejects an empty or invalid cart. */
export function getOrderItems(items: readonly CartItem[]): DraftItem[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_CART_ITEMS) throw new Error(`Choose between 1 and ${MAX_CART_ITEMS} cake selections before reviewing.`);
  const seen = new Set<string>();
  return items.map((item) => {
    if (!item || typeof item !== "object") throw new Error("A cart selection is no longer valid. Update your cart before reviewing.");
    const product = getProduct(item.productId);
    const size = product?.sizes.find((option) => option.id === item.sizeId);
    if (!product || !size || !product.flavors.includes(item.flavor)
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY
      || !Number.isSafeInteger(size.price) || size.price < 0 || size.price > 100_000_000
      || typeof item.id !== "string" || !item.id || item.id.length > 160 || seen.has(item.id)
      || cleanOrderText(item.id, 160) !== item.id
      || typeof item.message !== "string" || item.message.length > MAX_MESSAGE_LENGTH) {
      throw new Error("A cart selection is no longer valid. Update your cart before reviewing.");
    }
    seen.add(item.id);
    return {
      id: item.id, productId: product.id, productName: product.name,
      sizeId: size.id, sizeLabel: size.label, servings: String(size.servings),
      flavor: item.flavor, message: cleanOrderText(item.message, MAX_MESSAGE_LENGTH, true),
      allergens: [...product.allergens], leadTimeDays: product.leadTimeDays,
      quantity: item.quantity, unitPriceCents: size.price,
    };
  });
}

export function getDraftSubtotal(items: readonly DraftItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

/** Includes catalog prices/lead times and every cart selection; used to invalidate reviews. */
export function cartFingerprint(items: readonly CartItem[]): string {
  try { return JSON.stringify(getOrderItems(items)); }
  catch {
    try { return JSON.stringify(items); }
    catch { return "invalid-cart"; }
  }
}

export function validateOrderDetails(value: unknown, items: readonly CartItem[], now: Date): {
  details: OrderDetails; errors: OrderErrors; valid: boolean;
} {
  const { details, errors } = detailErrors(value);
  try { getOrderItems(items); } catch (error) {
    errors.cart = error instanceof Error ? error.message : "Update your cart before reviewing.";
  }
  const bounds = getDateBounds(items, now);
  if (!bounds.today) errors.date = "Your device date could not be read. Check its date settings.";
  else if (!errors.date && details.date < bounds.min) errors.date = `Choose ${formatRequestedDate(bounds.min)} or later for this cart’s ${bounds.leadTimeDays}-day sample lead time.`;
  else if (!errors.date && details.date > bounds.max) errors.date = `Choose a date within ${MAX_HORIZON_DAYS} days, by ${formatRequestedDate(bounds.max)}.`;
  return { details, errors, valid: Object.keys(errors).length === 0 };
}

/** Pure creation: caller supplies time and a unique reference; does not write storage. */
export function createOrderDraft(value: unknown, items: readonly CartItem[], options: {
  now: Date; reference: string;
}): OrderDraft {
  const result = validateOrderDetails(value, items, options.now);
  if (!result.valid) throw new Error(Object.values(result.errors)[0]);
  if (!/^FLO-[A-Z0-9-]{8,64}$/.test(options.reference)) throw new Error("A valid unique draft reference is required.");
  const snapshot = getOrderItems(items);
  return {
    version: 1, reference: options.reference, createdAt: options.now.toISOString(),
    status: DRAFT_STATUS, details: result.details, items: snapshot,
    sampleSubtotalCents: getDraftSubtotal(snapshot),
  };
}

function sanitizeDraftItem(value: unknown): DraftItem | null {
  const item = record(value);
  const text = (key: string, limit: number) => cleanOrderText(item[key], limit);
  if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > MAX_ITEM_QUANTITY
    || !Number.isSafeInteger(item.unitPriceCents) || Number(item.unitPriceCents) < 0 || Number(item.unitPriceCents) > 100_000_000
    || !Number.isInteger(item.leadTimeDays) || Number(item.leadTimeDays) < 0 || Number(item.leadTimeDays) > MAX_HORIZON_DAYS
    || !Array.isArray(item.allergens) || item.allergens.length > 30) return null;
  const result: DraftItem = {
    id: text("id", 160), productId: text("productId", 100), productName: text("productName", 150),
    sizeId: text("sizeId", 100), sizeLabel: text("sizeLabel", 100), servings: text("servings", 100),
    flavor: text("flavor", 150), message: cleanOrderText(item.message, MAX_MESSAGE_LENGTH, true),
    allergens: item.allergens.map((allergen) => cleanOrderText(allergen, 100)).filter(Boolean),
    leadTimeDays: Number(item.leadTimeDays), quantity: Number(item.quantity), unitPriceCents: Number(item.unitPriceCents),
  };
  if (!result.id || !result.productId || !result.productName || !result.sizeId || !result.sizeLabel || !result.flavor) return null;
  return result;
}

/** Reads a historical snapshot without applying today's lead-time limits. Drops unknown fields. */
export function sanitizeOrderDraft(value: unknown): OrderDraft | null {
  const input = record(value);
  if (input.version !== 1 || input.status !== DRAFT_STATUS
    || typeof input.reference !== "string" || !/^FLO-[A-Z0-9-]{8,64}$/.test(input.reference)
    || typeof input.createdAt !== "string" || input.createdAt.length > 30
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.createdAt)
    || !Number.isFinite(Date.parse(input.createdAt))
    || new Date(input.createdAt).toISOString() !== input.createdAt
    || !Array.isArray(input.items) || input.items.length === 0 || input.items.length > MAX_CART_ITEMS) return null;
  const { details, errors } = detailErrors(input.details);
  if (Object.keys(errors).length) return null;
  const items = input.items.map(sanitizeDraftItem);
  if (items.some((item) => !item)) return null;
  const validItems = items as DraftItem[];
  if (new Set(validItems.map((item) => item.id)).size !== validItems.length) return null;
  const subtotal = getDraftSubtotal(validItems);
  if (!Number.isSafeInteger(subtotal)) return null;
  return {
    version: 1, reference: input.reference, createdAt: input.createdAt, status: DRAFT_STATUS,
    details, items: validItems, sampleSubtotalCents: subtotal,
  };
}

export type ParsedDrafts = { drafts: OrderDraft[]; invalid: boolean };

/** Invalid/corrupt storage is reported; valid entries remain available for review. */
export function deserializeOrderDrafts(raw: string | null): ParsedDrafts {
  if (raw === null) return { drafts: [], invalid: false };
  if (raw.length > 2_000_000) return { drafts: [], invalid: true };
  try {
    const input = record(JSON.parse(raw));
    if (input.version !== 1 || !Array.isArray(input.drafts)) return { drafts: [], invalid: true };
    let invalid = input.drafts.length > MAX_DRAFTS;
    const drafts: OrderDraft[] = [];
    const seen = new Set<string>();
    for (const value of input.drafts.slice(0, MAX_DRAFTS)) {
      const draft = sanitizeOrderDraft(value);
      if (!draft || seen.has(draft.reference)) { invalid = true; continue; }
      seen.add(draft.reference);
      drafts.push(draft);
    }
    return { drafts, invalid };
  } catch { return { drafts: [], invalid: true }; }
}

/** Serializes only whitelisted data, recomputes cents, and refuses silent eviction. */
export function serializeOrderDrafts(drafts: readonly OrderDraft[]): string {
  if (drafts.length > MAX_DRAFTS) throw new Error(`You can keep up to ${MAX_DRAFTS} drafts. Remove a draft before saving another.`);
  const sanitized = drafts.map(sanitizeOrderDraft);
  if (sanitized.some((draft) => !draft) || new Set(drafts.map((draft) => draft.reference)).size !== drafts.length) {
    throw new Error("These draft details could not be saved safely. Review them again.");
  }
  return JSON.stringify({ version: 1, drafts: sanitized });
}
