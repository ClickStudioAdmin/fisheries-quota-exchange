"use client";

import { useActionState } from "react";
import {
  buttonClassName,
  fieldClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import {
  removeFisheryLogoAction,
  updateFisheryLogoAction,
  type AdminFormState,
} from "@/lib/fisheries/actions";

const initialState: AdminFormState = {};

export function FisheryLogoForm({
  fisheryId,
  hasLogo,
  hideUpload = false,
}: {
  fisheryId: number;
  hasLogo: boolean;
  hideUpload?: boolean;
}) {
  const [saveState, saveAction, saving] = useActionState(
    updateFisheryLogoAction,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeFisheryLogoAction,
    initialState,
  );
  const error = saveState.error ?? removeState.error;
  const message = saveState.message ?? removeState.message;

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-sea" role="status">
          {message}
        </p>
      ) : null}
      {hideUpload ? null : (
        <form action={saveAction} className="space-y-3">
          <input type="hidden" name="fishery_id" value={String(fisheryId)} />
          <div>
            <label htmlFor="logo" className="block text-sm text-ink">
              {hasLogo ? "Replace logo" : "Upload logo"}
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              className={fieldClassName}
            />
            <p className="mt-1 text-sm text-ink-muted">
              JPEG, PNG, WebP, or GIF. 2 MB max.
            </p>
          </div>
          <button type="submit" className={buttonClassName} disabled={saving}>
            {saving ? "Saving…" : hasLogo ? "Replace logo" : "Save logo"}
          </button>
        </form>
      )}
      {hasLogo ? (
        <form action={removeAction}>
          <input type="hidden" name="fishery_id" value={String(fisheryId)} />
          <button
            type="submit"
            className={tableSecondaryButtonClassName}
            disabled={removing}
          >
            {removing ? "Removing…" : "Remove logo"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
