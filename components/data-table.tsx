"use client";

import { Fragment, useId, useMemo, useState, type ReactNode } from "react";

export type DataTableColumn = {
  key: string;
  header: string;
  sortable?: boolean;
  filter?: "select";
  filterOptions?: { value: string; label: string }[];
  align?: "left" | "right";
};

export type DataTableRow = {
  id: string | number;
  values: Record<string, string | number>;
  display?: Record<string, ReactNode>;
  actions?: ReactNode;
  expanded?: ReactNode;
  expandedLabel?: string;
};

type DataTableProps = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  caption: string;
  empty?: string;
  searchPlaceholder?: string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
};

type SortState = { key: string; direction: "asc" | "desc" } | null;

const filterFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

function compareValues(a: string | number | undefined, b: string | number | undefined) {
  return String(a ?? "").localeCompare(String(b ?? ""), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function rowText(row: DataTableRow) {
  const values = Object.values(row.values).map((value) => String(value));
  const labels = Object.values(row.display ?? {}).flatMap((value) =>
    typeof value === "string" || typeof value === "number" ? [String(value)] : [],
  );
  return [...values, ...labels].join(" ").toLowerCase();
}

function uniqueValues(rows: DataTableRow[], key: string) {
  return [...new Set(rows.map((row) => String(row.values[key] ?? "")))]
    .filter((value) => value !== "")
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
}

function cellContent(row: DataTableRow, key: string) {
  const displayed = row.display?.[key];
  if (displayed != null && displayed !== "") {
    return displayed;
  }

  const value = row.values[key];
  if (value == null || value === "") {
    return "—";
  }

  return value;
}

export function TableActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-start gap-2">{children}</div>;
}

export function TableActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function formatTableDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-AU");
}

export function formatTableDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-AU");
}

export function DataTable({
  columns,
  rows,
  caption,
  empty = "No rows.",
  searchPlaceholder = "Filter…",
  defaultSort,
}: DataTableProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(defaultSort ?? null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const selectFilters = columns.filter((column) => {
    if (column.filter !== "select") {
      return false;
    }

    if (column.filterOptions && column.filterOptions.length > 0) {
      return true;
    }

    return uniqueValues(rows, column.key).length > 1;
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const activeFilters = columns.filter((column) => column.filter === "select");

    return rows.filter((row) => {
      if (needle && !rowText(row).includes(needle)) {
        return false;
      }

      return activeFilters.every((column) => {
        const selected = filters[column.key];
        if (!selected) {
          return true;
        }

        return String(row.values[column.key] ?? "") === selected;
      });
    });
  }, [columns, filters, query, rows]);

  const visible = useMemo(() => {
    if (!sort) {
      return filtered;
    }

    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) =>
        direction * compareValues(a.values[sort.key], b.values[sort.key]),
    );
  }, [filtered, sort]);

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) {
        return { key, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }

      return null;
    });
  }

  function toggleExpanded(id: string | number) {
    const key = String(id);
    setOpenIds((current) => ({ ...current, [key]: !current[key] }));
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">{empty}</p>;
  }

  const columnCount = columns.length + 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="sr-only" htmlFor={searchId}>
          Filter {caption}
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className={`${filterFieldClassName} w-full sm:max-w-xs`}
        />
        {selectFilters.map((column) => {
          const options =
            column.filterOptions ??
            uniqueValues(rows, column.key).map((value) => ({
              value,
              label: value,
            }));

          return (
            <label key={column.key} className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="whitespace-nowrap">{column.header}</span>
              <select
                value={filters[column.key] ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    [column.key]: event.target.value,
                  }))
                }
                className={filterFieldClassName}
              >
                <option value="">All</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-ink-muted">
        {visible.length === rows.length
          ? `${rows.length} ${rows.length === 1 ? "row" : "rows"}`
          : `${visible.length} of ${rows.length} rows`}
      </p>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper-raised text-xs uppercase tracking-[0.12em] text-ink-muted">
            <tr>
              {columns.map((column) => {
                const aligned = column.align === "right" ? "text-right" : "text-left";
                const sorted = sort?.key === column.key ? sort.direction : undefined;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : "none"
                    }
                    className={`whitespace-nowrap px-3 py-2 font-medium ${aligned}`}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              <th
                scope="col"
                className="whitespace-nowrap px-3 py-2 font-medium min-w-[10rem]"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-3 py-6 text-center text-ink-muted"
                >
                  No matching rows.
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const expanded = Boolean(openIds[String(row.id)]);

                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-line align-top hover:bg-paper-raised">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-3 py-3 text-ink ${
                            column.align === "right" ? "text-right" : ""
                          }`}
                        >
                          {cellContent(row, column.key)}
                        </td>
                      ))}
                      <td className="min-w-[10rem] px-3 py-3">
                        <TableActions>
                          {row.expanded ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(row.id)}
                              aria-expanded={expanded}
                              className="text-sm underline"
                            >
                              {expanded
                                ? "Hide"
                                : row.expandedLabel ?? "Details"}
                            </button>
                          ) : null}
                          {row.actions}
                          {!row.expanded && !row.actions ? (
                            <span className="text-ink-muted">—</span>
                          ) : null}
                        </TableActions>
                      </td>
                    </tr>
                    {row.expanded && expanded ? (
                      <tr className="border-t border-line">
                        <td colSpan={columnCount} className="bg-paper px-3 py-4">
                          {row.expanded}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
