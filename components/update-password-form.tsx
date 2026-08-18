"use client";

import { useActionState } from "react";
import {
  updatePasswordAction,
} from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { authButtonClassName, authFieldClassName } from "@/components/auth-card";

const initialState: AuthFormState = {};

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
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
          className={authFieldClassName}
        />
      </div>
      <button type="submit" className={authButtonClassName} disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
