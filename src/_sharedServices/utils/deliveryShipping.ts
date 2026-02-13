/**
 * Server-side delivery options and shipping cost calculation.
 * Used by ecommerce checkout and create-order so delivery is fully controlled server-side.
 */

export interface DeliveryOptions {
  standardBase: number
  standardPerItem: number
  expressBase: number
  expressPerItem: number
  pickupCost: number
  deliveryOptionsTitle?: string
  standardDelivery?: string
  standardPrice?: string
  standardDelay?: string
  expressDelivery?: string
  expressPrice?: string
  expressDelay?: string
  pickupLabel?: string
  pickupDelay?: string
}

/** Default delivery options (legacy hardcoded values) */
const DEFAULT_DELIVERY: DeliveryOptions = {
  standardBase: 160,
  standardPerItem: 80,
  expressBase: 300,
  expressPerItem: 160,
  pickupCost: 0,
}

/**
 * Compute shipping cost from delivery options, method and item count.
 * Use this server-side only; frontend should fetch delivery options from GET settings/delivery for display.
 */
export function computeShippingCost(
  deliveryOptions: DeliveryOptions | null | undefined,
  deliveryMethod: string,
  itemCount: number
): number {
  const d = deliveryOptions || DEFAULT_DELIVERY
  if (deliveryMethod === "standard") {
    return d.standardBase + itemCount * d.standardPerItem
  }
  if (deliveryMethod === "express") {
    return d.expressBase + itemCount * d.expressPerItem
  }
  return d.pickupCost
}

/** Cart item shape for per-product delivery: quantity + optional per-unit override from product */
export interface CartItemForShipping {
  quantity: number
  productId?: { deliveryCostOverride?: number } | null
}

/**
 * Compute shipping cost with optional per-product delivery overrides.
 * For each item: uses product.deliveryCostOverride if set, otherwise site per-item rate.
 * Pickup: returns pickupCost only (no per-item).
 */
export function computeShippingCostFromItems(
  deliveryOptions: DeliveryOptions | null | undefined,
  deliveryMethod: string,
  items: CartItemForShipping[]
): number {
  const d = deliveryOptions || DEFAULT_DELIVERY
  if (deliveryMethod === "pickup") {
    return d.pickupCost
  }
  const perItem = deliveryMethod === "express" ? d.expressPerItem : d.standardPerItem
  const base = deliveryMethod === "express" ? d.expressBase : d.standardBase
  const itemsTotal = items.reduce((sum, item) => {
    const override = item.productId?.deliveryCostOverride
    const costPerUnit = typeof override === "number" && override >= 0 ? override : perItem
    return sum + item.quantity * costPerUnit
  }, 0)
  return base + itemsTotal
}

/** Normalize raw site ecommerce.delivery to DeliveryOptions (with defaults) */
export function normalizeDeliveryOptions(raw: Record<string, unknown> | null | undefined): DeliveryOptions {
  if (!raw || typeof raw !== "object") return DEFAULT_DELIVERY
  return {
    standardBase: typeof raw.standardBase === "number" ? raw.standardBase : DEFAULT_DELIVERY.standardBase,
    standardPerItem: typeof raw.standardPerItem === "number" ? raw.standardPerItem : DEFAULT_DELIVERY.standardPerItem,
    expressBase: typeof raw.expressBase === "number" ? raw.expressBase : DEFAULT_DELIVERY.expressBase,
    expressPerItem: typeof raw.expressPerItem === "number" ? raw.expressPerItem : DEFAULT_DELIVERY.expressPerItem,
    pickupCost: typeof raw.pickupCost === "number" ? raw.pickupCost : DEFAULT_DELIVERY.pickupCost,
    deliveryOptionsTitle: typeof raw.deliveryOptionsTitle === "string" ? raw.deliveryOptionsTitle : undefined,
    standardDelivery: typeof raw.standardDelivery === "string" ? raw.standardDelivery : undefined,
    standardPrice: typeof raw.standardPrice === "string" ? raw.standardPrice : undefined,
    standardDelay: typeof raw.standardDelay === "string" ? raw.standardDelay : undefined,
    expressDelivery: typeof raw.expressDelivery === "string" ? raw.expressDelivery : undefined,
    expressPrice: typeof raw.expressPrice === "string" ? raw.expressPrice : undefined,
    expressDelay: typeof raw.expressDelay === "string" ? raw.expressDelay : undefined,
    pickupLabel: typeof raw.pickupLabel === "string" ? raw.pickupLabel : undefined,
    pickupDelay: typeof raw.pickupDelay === "string" ? raw.pickupDelay : undefined,
  }
}
