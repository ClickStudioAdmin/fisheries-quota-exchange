import { fieldClassName } from "@/components/auth-card";
import {
  listingOfferingLabel,
  type ListingOffering,
} from "@/lib/listings/types";

export function OfferingField({
  offerings,
}: {
  offerings: readonly ListingOffering[];
}) {
  if (offerings.length === 0) {
    return (
      <p className="text-sm text-red-800" role="alert">
        This fishery cannot be listed for sale or lease.
      </p>
    );
  }

  if (offerings.length === 1) {
    const offering = offerings[0];
    if (!offering) {
      return null;
    }
    return (
      <div>
        <p className="block text-sm text-ink">Offering</p>
        <input type="hidden" name="offering" value={offering} />
        <p className="mt-1 text-sm text-ink-muted">
          {listingOfferingLabel(offering)} only
        </p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="offering" className="block text-sm text-ink">
        Offering
      </label>
      <select
        id="offering"
        name="offering"
        required
        className={fieldClassName}
        defaultValue={offerings[0]}
      >
        {offerings.map((offering) => (
          <option key={offering} value={offering}>
            {listingOfferingLabel(offering)}
          </option>
        ))}
      </select>
    </div>
  );
}
