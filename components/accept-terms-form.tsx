"use client";

import { useActionState } from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/auth-card";
import { ActionNotice } from "@/components/notices";
import { acceptTermsAction, type TermsFormState } from "@/lib/terms/actions";
import { TERMS_VERSION } from "@/lib/terms/version";

const initialState: TermsFormState = {};

export function AcceptTermsForm() {
  const [state, formAction, pending] = useActionState(
    acceptTermsAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="version" value={TERMS_VERSION} />
      <ActionNotice
        title="Agree to the terms"
        action={
          <button
            type="submit"
            className={`shrink-0 ${buttonClassName}`}
            disabled={pending}
          >
            {pending ? "Saving…" : "Agree to terms"}
          </button>
        }
      >
        {state.error ? (
          <p className="text-red-800" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p className="text-sea" role="status">
            {state.message}
          </p>
        ) : null}
        <p>
          Agree to the terms of service before you can buy or list.
        </p>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="checkbox"
            name="agreed"
            required
            className="mt-1 h-4 w-4 shrink-0 border-line accent-sea"
          />
          <span>
            I have read the{" "}
            <Link href="/terms" className="underline">
              terms of service
            </Link>{" "}
            and I agree. I understand that buying or listing quota is a binding
            agreement to complete the trade, and that if I do not proceed I may
            be liable to pay the platform commission.
          </span>
        </label>
      </ActionNotice>
    </form>
  );
}
