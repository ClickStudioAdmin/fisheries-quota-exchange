import type { OrderStep } from "@/lib/orders/progress";

const circleClass: Record<OrderStep["state"], string> = {
  done: "border-sea bg-sea text-paper",
  current: "border-amber-800 bg-amber-100 text-amber-900",
  failed: "border-red-800 bg-red-100 text-red-800",
  upcoming: "border-line bg-paper-raised text-ink-muted",
};

const lineClass: Record<OrderStep["state"], string> = {
  done: "bg-sea",
  current: "bg-line",
  failed: "bg-red-200",
  upcoming: "bg-line",
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
    <ol className="flex">
      {steps.map((step, index) => {
        const first = index === 0;
        const last = index === steps.length - 1;
        const previous = steps[index - 1];

        return (
          <li key={step.id} className="min-w-0 flex-1">
            <div className="flex items-center">
              <span
                className={`h-px min-w-2 flex-1 ${
                  first
                    ? "bg-transparent"
                    : lineClass[previous?.state === "done" ? "done" : "upcoming"]
                }`}
                aria-hidden
              />
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${circleClass[step.state]}`}
              >
                <StepMark step={step} index={index} />
              </span>
              <span
                className={`flex h-px min-w-2 flex-1 items-center ${
                  last ? "bg-transparent" : lineClass[step.state]
                }`}
                aria-hidden
              />
            </div>
            <p
              className={`mt-2 text-center text-sm font-medium ${labelClass[step.state]}`}
            >
              {step.label}
            </p>
            <p className="mt-0.5 text-center text-xs text-ink-muted">
              {step.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
