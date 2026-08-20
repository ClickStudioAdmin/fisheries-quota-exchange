import { QuantityField } from "@/components/quantity-field";

export function QldQuotaUsageFields({
  unitLabel,
  maxQuantity,
}: {
  unitLabel: string;
  maxQuantity: string;
}) {
  return (
    <>
      <div>
        <label htmlFor="unused_quantity" className="block text-sm text-ink">
          Unused quantity
        </label>
        <QuantityField
          id="unused_quantity"
          name="unused_quantity"
          unitLabel={unitLabel}
          required
          min="0"
          max={maxQuantity}
        />
      </div>
      <div>
        <label htmlFor="used_quantity" className="block text-sm text-ink">
          Used quantity
        </label>
        <QuantityField
          id="used_quantity"
          name="used_quantity"
          unitLabel={unitLabel}
          required
          min="0"
          max={maxQuantity}
        />
      </div>
      <p className="text-sm text-ink-muted">
        Unused and used must add up to the listing quantity.
      </p>
    </>
  );
}
