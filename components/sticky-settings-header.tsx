import type { ReactNode } from "react";
import { buttonClassName } from "@/components/auth-card";

export function StickySettingsHeader({
  title,
  description,
  pending,
  saveLabel,
  heading: Heading = "h1",
  form,
}: {
  title: string;
  description: ReactNode;
  pending: boolean;
  saveLabel: string;
  heading?: "h1" | "h2";
  form?: string;
}) {
  return (
    <div className="sticky top-4 z-20 mb-6 flex items-start justify-between gap-4 bg-paper/95 py-3 backdrop-blur-sm lg:top-6">
      <div>
        <Heading
          className={
            Heading === "h1"
              ? "text-3xl font-semibold tracking-tight text-ink"
              : "text-lg font-semibold text-ink"
          }
        >
          {title}
        </Heading>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">{description}</p>
      </div>
      <button
        type="submit"
        form={form}
        className={`${buttonClassName} shrink-0 shadow-md`}
        disabled={pending}
      >
        {pending ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}
