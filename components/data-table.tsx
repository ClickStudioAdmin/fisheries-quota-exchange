"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useId,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { tableSecondaryButtonClassName } from "@/components/auth-card";

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
  display?: Record<string, string>;
};

type DataTableRowExtrasProps = {
  id: string | number;
  links?: ReactNode;
  actions?: ReactNode;
  expanded?: ReactNode;
  expandedLabel?: string;
  children?: ReactNode;
};

type DataTableProps = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  caption: string;
  empty?: string;
  searchPlaceholder?: string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  children?: ReactNode;
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
  const labels = Object.values(row.display ?? {});
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

function hasNode(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") {
    return false;
  }

  if (typeof node === "string") {
    return node.trim() !== "";
  }

  if (typeof node === "number") {
    return true;
  }

  if (Array.isArray(node)) {
    return node.some(hasNode);
  }

  if (isValidElement(node)) {
    if (node.type === Fragment) {
      return hasNode((node.props as { children?: ReactNode }).children);
    }

    return true;
  }

  return true;
}

function collectExtras(children: ReactNode) {
  const extras = new Map<string, ReactElement<DataTableRowExtrasProps>>();

  Children.forEach(children, (child) => {
    if (!isValidElement<DataTableRowExtrasProps>(child)) {
      return;
    }

    if (child.props.id == null) {
      return;
    }

    extras.set(String(child.props.id), child);
  });

  return extras;
}

function extrasColumns(extras: Map<string, ReactElement<DataTableRowExtrasProps>>) {
  let links = false;
  let actions = false;

  for (const extra of extras.values()) {
    const props = extra.props;
    if (hasNode(props.links)) {
      links = true;
    }
    if (
      hasNode(props.actions) ||
      hasNode(props.children) ||
      hasNode(props.expanded)
    ) {
      actions = true;
    }
  }

  return { links, actions };
}

export function TableActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-start gap-2">{children}</div>;
}

export function TableActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export const tableLinkClassName = "text-sm underline";

export function DataTableRowExtras(_props: DataTableRowExtrasProps) {
  return null;
}

export function DataTable({
  columns,
  rows,
  caption,
  empty = "No rows.",
  searchPlaceholder = "Filter…",
  defaultSort,
  children,
}: DataTableProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(defaultSort ?? null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const extras = useMemo(() => collectExtras(children), [children]);
  const { links: showLinks, actions: showActions } = useMemo(
    () => extrasColumns(extras),
    [extras],
  );

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

  const columnCount =
    columns.length + (showLinks ? 1 : 0) + (showActions ? 1 : 0);

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
              {showLinks ? (
                <th
                  scope="col"
                  className="min-w-[8rem] whitespace-nowrap px-3 py-2 font-medium"
                >
                  Links
                </th>
              ) : null}
              {showActions ? (
                <th
                  scope="col"
                  className="min-w-[8rem] whitespace-nowrap px-3 py-2 font-medium"
                >
                  Actions
                </th>
              ) : null}
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
              visible.map((row, index) => {
                const extra = extras.get(String(row.id));
                const extraProps = extra?.props;
                const expanded = Boolean(openIds[String(row.id)]);
                const striped =
                  index % 2 === 0 ? "bg-paper" : "bg-paper-stripe";

                return (
                  <Fragment key={row.id}>
                    <tr
                      className={`border-t border-line align-top ${striped} hover:bg-line/40`}
                    >
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
                      {showLinks ? (
                        <td className="min-w-[8rem] px-3 py-3">
                          {hasNode(extraProps?.links) ? (
                            <TableActions>{extraProps?.links}</TableActions>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                      ) : null}
                      {showActions ? (
                        <td className="min-w-[8rem] px-3 py-3">
                          <TableActions>
                            {extraProps?.expanded ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(row.id)}
                                aria-expanded={expanded}
                                className={tableSecondaryButtonClassName}
                              >
                                {expanded
                                  ? "Hide"
                                  : extraProps.expandedLabel ?? "Details"}
                              </button>
                            ) : null}
                            {extraProps?.actions ?? extraProps?.children}
                            {!hasNode(extraProps?.expanded) &&
                            !hasNode(extraProps?.actions) &&
                            !hasNode(extraProps?.children) ? (
                              <span className="text-ink-muted">—</span>
                            ) : null}
                          </TableActions>
                        </td>
                      ) : null}
                    </tr>
                    {extraProps?.expanded && expanded ? (
                      <tr className="border-t border-line">
                        <td
                          colSpan={columnCount}
                          className="bg-paper-stripe px-3 py-4"
                        >
                          {extraProps.expanded}
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
