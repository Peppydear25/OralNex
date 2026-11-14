type PaginationProps = {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, total, pageSize, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav
      aria-label="Results pages"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm"
    >
      <span className="text-slate-600">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-[#08788c] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-[#08788c] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
