"use client";

import { useActionState } from "react";
import { registerAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { authButtonClassName, authFieldClassName } from "@/components/auth-card";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
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
        <label htmlFor="full_name" className="block text-sm text-ink">
          Your name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          className={authFieldClassName}
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
          className={authFieldClassName}
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
          className={authFieldClassName}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-ink">
          Password
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
      <p className="pt-2 text-sm font-medium text-ink">Business details</p>
      <div>
        <label htmlFor="legal_name" className="block text-sm text-ink">
          Legal name
        </label>
        <input
          id="legal_name"
          name="legal_name"
          required
          className={authFieldClassName}
        />
      </div>
      <div>
        <label htmlFor="trading_name" className="block text-sm text-ink">
          Trading name
        </label>
        <input
          id="trading_name"
          name="trading_name"
          className={authFieldClassName}
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
          autoComplete="off"
          className={authFieldClassName}
        />
      </div>
      <button type="submit" className={authButtonClassName} disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
