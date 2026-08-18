"use client";

import { useState } from "react";
import { tableSecondaryButtonClassName } from "@/components/auth-card";

export const LIST_PAGE_SIZE = 20;
export const LIST_PAGE_SIZES = [10, 20, 50, 100] as const;

const pageSizeFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

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

export function useListPagination() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(LIST_PAGE_SIZE);

  function setPageSize(next: number) {
    setPageSizeState(next);
    setPage(1);
  }

  return { page, setPage, pageSize, setPageSize };
}

export function ListPager({
  page,
  pageCount,
  onPageChange,
  pageSize,
  onPageSizeChange,
  label,
  itemCount,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  label: string;
  itemCount: number;
}) {
  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="whitespace-nowrap">Per page</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className={pageSizeFieldClassName}
        >
          {LIST_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      {pageCount > 1 ? (
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
      ) : null}
    </div>
  );
}
