"use client";

import { useActionState, useEffect, useState } from "react";
import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type ReviewFormState = {
  error?: string;
  message?: string;
};

const initialState: ReviewFormState = {};

export function ReviewChecklistForm({
  action,
  hidden,
  checks,
  completed,
  hint = "Save as you work. You must save all checks before you can approve.",
  proceedGoal = "to approve",
}: {
  action: (
    prev: ReviewFormState,
    formData: FormData,
  ) => Promise<ReviewFormState>;
  hidden: Record<string, string>;
  checks: readonly string[];
  completed: readonly string[];
  hint?: string;
  proceedGoal?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [checked, setChecked] = useState(() => new Set(completed));
  const saved = completed.join("\u0001");

  useEffect(() => {
    setChecked(new Set(saved ? saved.split("\u0001") : []));
  }, [saved]);

  const done = checks.filter((item) => checked.has(item)).length;
  const savedComplete =
    checks.length > 0 && checks.every((item) => completed.includes(item));

  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className="text-sm text-ink-muted">
        {done} of {checks.length} complete. {hint}
      </p>
      <ul className="space-y-3">
        {checks.map((item, index) => (
          <li key={item}>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="checks"
                value={item}
                checked={checked.has(item)}
                onChange={(event) => {
                  setChecked((current) => {
                    const next = new Set(current);
                    if (event.target.checked) {
                      next.add(item);
                    } else {
                      next.delete(item);
                    }
                    return next;
                  });
                }}
                className="mt-1 h-4 w-4 shrink-0 border-line accent-sea"
              />
              <span className="min-w-0 flex-1 whitespace-normal break-words">
                <span className="mr-1 text-ink-muted">{index + 1}.</span>
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {savedComplete ? (
        <p className="min-w-0 text-sm leading-6 text-sea" role="status">
          All checks are saved. Continue to the{" "}
          <button
            type="button"
            className="inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit underline decoration-current underline-offset-2"
            onClick={() => {
              document.getElementById("review-decision")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            Decision section
          </button>{" "}
          below {proceedGoal}.
        </p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message && !savedComplete ? (
        <p className="text-sm text-sea" role="status">
          {state.message}
        </p>
      ) : null}
      <PendingSubmitButton
        className={tableButtonClassName}
        pendingLabel="Saving…"
      >
        Save progress
      </PendingSubmitButton>
    </form>
  );
}
