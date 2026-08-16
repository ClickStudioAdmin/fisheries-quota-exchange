type MemberIconProps = {
  className?: string;
};

export function MemberIcon({ className }: MemberIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5" />
    </svg>
  );
}
