import { tableSecondaryButtonClassName } from "@/components/auth-card";

export const LIST_PAGE_SIZE = 20;

export function paginateItems<T>(items: T[], page: number, pageSize = LIST_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const from = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, items.length);
  const paged = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return { pageCount, currentPage, from, to, paged };
}

export function listRangeLabel(
  from: number,
  to: number,
  total: number,
  noun: string,
) {
  if (total === 0) {
    return `0 ${noun}`;
  }

  return `Showing ${from}–${to} of ${total} ${noun}`;
}

export function ListPager({
  page,
  pageCount,
  onPageChange,
  label,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={tableSecondaryButtonClassName}
      >
        Previous
      </button>
      <p className="text-sm text-ink-muted">
        Page {page} of {pageCount}
      </p>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={tableSecondaryButtonClassName}
      >
        Next
      </button>
    </nav>
  );
}
