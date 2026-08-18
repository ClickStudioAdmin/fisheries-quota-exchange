import Link from "next/link";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={className}
      aria-label="Fisheries Quota Exchange home"
    >
      <span className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 40 40"
          className="h-9 w-9 shrink-0"
          aria-hidden="true"
        >
          <rect width="40" height="40" rx="8" fill="#0d5ea8" />
          <path
            d="M8 24c4-1.5 7-1.5 11 0s7 1.5 13 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M8 28c4-1.5 7-1.5 11 0s7 1.5 13 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M14 14.5c6-1 12.5 1.2 16 5.2-4.2 1.2-8.4.2-12.2-1.2-1.6 2.4-2.2 4.2-1.6 6.2-3.4-1.8-5.6-4.4-6.2-7.4 1.4.2 2.8.2 4 0z"
            fill="#ffffff"
          />
        </svg>
        <span className="text-lg font-semibold tracking-tight">FQX</span>
      </span>
    </Link>
  );
}
