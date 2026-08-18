import type { OrderStep } from "@/lib/orders/progress";

const circleClass: Record<OrderStep["state"], string> = {
  done: "border-sea bg-sea text-paper",
  current: "border-amber-800 bg-amber-100 text-amber-900",
  failed: "border-red-800 bg-red-100 text-red-800",
  upcoming: "border-line bg-paper-raised text-ink-muted",
};

const labelClass: Record<OrderStep["state"], string> = {
  done: "text-ink",
  current: "text-ink",
  failed: "text-red-800",
  upcoming: "text-ink-muted",
};

function StepMark({ step, index }: { step: OrderStep; index: number }) {
  if (step.state === "done") {
    return (
      <span className="text-sm font-semibold leading-none" aria-hidden>
        ✓
      </span>
    );
  }

  return (
    <span className="text-xs font-semibold leading-none" aria-hidden>
      {index + 1}
    </span>
  );
}

export function OrderProgress({ steps }: { steps: OrderStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;

        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex w-7 shrink-0 flex-col items-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${circleClass[step.state]}`}
              >
                <StepMark step={step} index={index} />
              </span>
              {last ? null : (
                <span
                  className="flex flex-1 flex-col items-center py-1 text-ink-muted"
                  aria-hidden
                >
                  <span className="h-4 w-px bg-line" />
                  <span className="text-[10px] leading-none">↓</span>
                </span>
              )}
            </div>
            <div className={last ? "pb-0" : "pb-4"}>
              <p className={`text-sm font-medium ${labelClass[step.state]}`}>
                {step.label}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
