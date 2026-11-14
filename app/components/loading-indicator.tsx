export function LoadingIndicator({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2" role="status">
      <svg
        className="size-4 animate-spin motion-reduce:animate-none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          d="M21 12a9 9 0 0 0-9-9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      {label}
    </span>
  );
}
