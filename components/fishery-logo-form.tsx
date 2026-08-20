"use client";

import { useActionState } from "react";
import { buttonClassName, tableButtonClassName } from "@/components/auth-card";
import { FileDropzone } from "@/components/file-dropzone";
import {
  removeFisheryLogoAction,
  updateFisheryLogoAction,
  type AdminFormState,
} from "@/lib/fisheries/actions";
import { FISHERY_LOGO_MAX_BYTES } from "@/lib/fisheries/logo";

const initialState: AdminFormState = {};
const logoAccept = "image/jpeg,image/png,image/webp,image/gif";

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
            <p className="text-sm text-ink">
              {hasLogo ? "Replace logo" : "Upload logo"}
            </p>
            <FileDropzone
              id="logo"
              name="logo"
              accept={logoAccept}
              required
              emptyTitle="Drop image here or click to browse"
              hint="JPEG, PNG, WebP, or GIF. 2 MB max"
              maxBytes={FISHERY_LOGO_MAX_BYTES}
            />
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
            className={tableButtonClassName}
            disabled={removing}
          >
            {removing ? "Removing…" : "Remove logo"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
