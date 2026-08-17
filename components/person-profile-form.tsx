"use client";

import { useActionState } from "react";
import {
  updatePersonAction,
  updateProfilePasswordAction,
} from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import type { Organisation } from "@/lib/organisations/types";

const initialState: AuthFormState = {};

type PersonProfileFormProps = {
  fullName: string;
  email: string;
  phone: string;
  organisation: Organisation;
  canEditOrganisation: boolean;
};

export function PersonProfileForm({
  fullName,
  email,
  phone,
  organisation,
  canEditOrganisation,
}: PersonProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePersonAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organisation_id" value={organisation.id} />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-sea" role="status">
          {state.message}
        </p>
      ) : null}
      <div>
        <label htmlFor="full_name" className="block text-sm text-ink">
          Your name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          defaultValue={fullName}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={email}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm text-ink">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          defaultValue={phone}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="legal_name" className="block text-sm text-ink">
          Legal name
        </label>
        <input
          id="legal_name"
          name="legal_name"
          required={canEditOrganisation}
          defaultValue={organisation.legal_name}
          disabled={!canEditOrganisation}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="trading_name" className="block text-sm text-ink">
          Trading name
        </label>
        <input
          id="trading_name"
          name="trading_name"
          defaultValue={organisation.trading_name ?? ""}
          disabled={!canEditOrganisation}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="abn" className="block text-sm text-ink">
          ABN
        </label>
        <input
          id="abn"
          name="abn"
          inputMode="numeric"
          defaultValue={organisation.abn ?? ""}
          disabled={!canEditOrganisation}
          className={fieldClassName}
        />
      </div>
      {canEditOrganisation ? null : (
        <p className="text-sm text-ink-muted">
          Only owners and admins can edit business details.
        </p>
      )}
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function ProfilePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updateProfilePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-sea" role="status">
          {state.message}
        </p>
      ) : null}
      <div>
        <label htmlFor="current_password" className="block text-sm text-ink">
          Current password
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-ink">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="confirm_password" className="block text-sm text-ink">
          Confirm new password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={fieldClassName}
        />
      </div>
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
