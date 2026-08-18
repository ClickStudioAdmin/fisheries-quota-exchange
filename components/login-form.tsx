"use client";

import { useActionState } from "react";
import {
  loginAction,
} from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { authButtonClassName, authFieldClassName } from "@/components/auth-card";

const initialState: AuthFormState = {};

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
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
        <label htmlFor="password" className="block text-sm text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className={authFieldClassName}
        />
      </div>
      <button type="submit" className={authButtonClassName} disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
