import { formatAud } from "@/lib/listings/types";
import { formatTableDate } from "@/lib/format";

type PricePoint = {
  at: string;
  price: number;
};

type PriceKind = "sale" | "lease";

type PriceChartProps = {
  points: PricePoint[];
  unitLabel: string;
  kind?: PriceKind;
};

const copy: Record<PriceKind, { empty: string; title: string; last: string }> = {
  sale: {
    empty: "No sales recorded yet.",
    title: "Sales History",
    last: "Last sale",
  },
  lease: {
    empty: "No leases recorded yet.",
    title: "Lease History",
    last: "Last lease",
  },
};

export function PriceChart({
  points,
  unitLabel,
  kind = "sale",
}: PriceChartProps) {
  const labels = copy[kind];

  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-ink">{labels.title}</h3>
      {points.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{labels.empty}</p>
      ) : (
        <PriceChartPlot points={points} unitLabel={unitLabel} labels={labels} />
      )}
    </div>
  );
}

function PriceChartPlot({
  points,
  unitLabel,
  labels,
}: {
  points: PricePoint[];
  unitLabel: string;
  labels: (typeof copy)[PriceKind];
}) {

  const width = 640;
  const height = 240;
  const left = 72;
  const right = 16;
  const top = 16;
  const bottom = 36;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const prices = points.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const span = maxPrice - minPrice;
  const pad = span === 0 ? (minPrice === 0 ? 1 : minPrice * 0.1) : span * 0.1;
  const low = minPrice - pad;
  const high = maxPrice + pad;
  const range = high - low || 1;
  const times = points.map((point) => new Date(point.at).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = Math.max(maxTime - minTime, 1);

  const coords = points.map((point) => {
    const x =
      left + ((new Date(point.at).getTime() - minTime) / timeSpan) * innerWidth;
    const y = top + ((high - point.price) / range) * innerHeight;
    return { x, y, ...point };
  });

  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];

  return (
    <div className="mt-2 min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full max-w-full text-ink"
        role="img"
        aria-label={`${labels.title} per ${unitLabel} over time`}
      >
        <title>{labels.title}</title>
        <line
          x1={left}
          y1={top}
          x2={left}
          y2={top + innerHeight}
          stroke="currentColor"
          strokeOpacity="0.25"
        />
        <line
          x1={left}
          y1={top + innerHeight}
          x2={left + innerWidth}
          y2={top + innerHeight}
          stroke="currentColor"
          strokeOpacity="0.25"
        />
        <text
          x={left - 8}
          y={top + 4}
          textAnchor="end"
          className="fill-ink-muted text-[11px]"
        >
          {formatAud(high)}
        </text>
        <text
          x={left - 8}
          y={top + innerHeight}
          textAnchor="end"
          className="fill-ink-muted text-[11px]"
        >
          {formatAud(low)}
        </text>
        {coords.length > 1 ? (
          <polyline
            fill="none"
            className="stroke-sea"
            strokeWidth="2"
            points={line}
          />
        ) : null}
        {coords.map((point) => (
          <circle
            key={`${point.at}-${point.price}`}
            cx={point.x}
            cy={point.y}
            r="4"
            className="fill-sea"
          />
        ))}
        <text
          x={first.x}
          y={height - 8}
          textAnchor={coords.length === 1 ? "middle" : "start"}
          className="fill-ink-muted text-[11px]"
        >
          {formatTableDate(first.at)}
        </text>
        {coords.length > 1 ? (
          <text
            x={last.x}
            y={height - 8}
            textAnchor="end"
            className="fill-ink-muted text-[11px]"
          >
            {formatTableDate(last.at)}
          </text>
        ) : null}
      </svg>
      <p className="mt-2 text-sm text-ink-muted">
        Price per {unitLabel}. {labels.last} {formatAud(last.price)} on{" "}
        {formatTableDate(last.at)}.
      </p>
    </div>
  );
}
