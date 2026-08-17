"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import { StatusBadge, isStatusColumn } from "@/components/status-badge";
import {
  ListPager,
  listRangeLabel,
  paginateItems,
} from "@/components/list-pager";

export type DataTableColumn = {
  key: string;
  header: string;
  sortable?: boolean;
  filter?: "select";
  filterOptions?: { value: string; label: string }[];
  align?: "left" | "right";
  details?: boolean;
  nowrap?: boolean;
  stacked?: { key: string; label: string; filter?: "select" }[];
};

export type DataTableDetail = {
  label: string;
  value: string;
};

export type DataTableRow = {
  id: string | number;
  values: Record<string, string | number>;
  display?: Record<string, string>;
  needsAction?: boolean;
  details?: DataTableDetail[];
};

type DataTableRowExtrasProps = {
  id: string | number;
  links?: ReactNode;
  actions?: ReactNode;
  expanded?: ReactNode;
  expandedLabel?: string;
  children?: ReactNode;
};

type DataTableBulkAction = {
  label: string;
  action: (formData: FormData) => void | Promise<void>;
  confirm?: string;
  fieldName?: string;
};

type DataTableProps = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  caption: string;
  empty?: string;
  searchPlaceholder?: string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  selectable?: boolean;
  lockedIds?: Array<string | number>;
  bulkAction?: DataTableBulkAction;
  children?: ReactNode;
};

type SortState = { key: string; direction: "asc" | "desc" } | null;

const filterFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

const actionFilterClassName =
  "border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200";

const actionFilterActiveClassName =
  "border border-amber-800 bg-amber-800 px-3 py-2 text-sm font-medium text-amber-50";

function columnWidthClass(column: DataTableColumn) {
  return column.nowrap ? "whitespace-nowrap" : "";
}

function compareValues(a: string | number | undefined, b: string | number | undefined) {
  return String(a ?? "").localeCompare(String(b ?? ""), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function rowText(row: DataTableRow) {
  const values = Object.values(row.values).map((value) => String(value));
  const labels = Object.values(row.display ?? {});
  const details = (row.details ?? []).flatMap((item) => [
    item.label,
    item.value,
  ]);
  return [...values, ...labels, ...details].join(" ").toLowerCase();
}

function uniqueValues(rows: DataTableRow[], key: string) {
  return [...new Set(rows.map((row) => String(row.values[key] ?? "")))]
    .filter((value) => value !== "")
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
}

function filterColumns(columns: DataTableColumn[]): DataTableColumn[] {
  return columns.flatMap((column) => {
    if (column.stacked && column.stacked.length > 0) {
      return column.stacked
        .filter((line) => line.filter === "select")
        .map((line) => ({
          key: line.key,
          header: line.label,
          filter: "select" as const,
        }));
    }

    if (column.filter === "select") {
      return [column];
    }

    return [];
  });
}

function DetailsTooltip({ details }: { details: DataTableDetail[] }) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function show() {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const width = 288;
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - width - 8),
    );

    setPosition({ top: rect.bottom + 8, left });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="More details"
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-medium leading-none text-ink-muted hover:border-sea hover:text-sea"
      >
        i
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 w-72 border border-line bg-paper-raised p-3 text-left shadow-sm"
        >
          <dl className="space-y-2">
            {details.map((item) => (
              <div key={item.label}>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  {item.label}
                </dt>
                <dd className="mt-0.5 whitespace-pre-line text-xs text-ink">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </span>
      ) : null}
    </>
  );
}

function cellContent(row: DataTableRow, column: DataTableColumn) {
  if (column.stacked && column.stacked.length > 0) {
    return (
      <div className="space-y-1.5">
        {column.stacked.map((line) => {
          const displayed = row.display?.[line.key];
          const value = row.values[line.key];
          const text =
            displayed != null && displayed !== ""
              ? displayed
              : value == null || value === ""
                ? "—"
                : String(value);

          return (
            <div key={line.key}>
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                {line.label}
              </div>
              {column.details &&
              line.key === "id" &&
              row.details &&
              row.details.length > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span>{text}</span>
                  <DetailsTooltip details={row.details} />
                </span>
              ) : (
                <div>{text}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const displayed = row.display?.[column.key];
  const value = row.values[column.key];
  const label =
    displayed != null && displayed !== ""
      ? displayed
      : value == null || value === ""
        ? ""
        : String(value);

  const content = isStatusColumn(column.key, column.header) ? (
    <StatusBadge label={label || "—"} code={value} />
  ) : label ? (
    label
  ) : (
    "—"
  );

  if (!column.details || !row.details?.length) {
    return content;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{content}</span>
      <DetailsTooltip details={row.details} />
    </span>
  );
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

function openLinksInNewTab(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    const props = child.props as { children?: ReactNode; href?: unknown };
    const children = openLinksInNewTab(props.children);

    if (child.type === "a" || props.href != null) {
      return cloneElement(child, {
        target: "_blank",
        rel: "noopener noreferrer",
        children,
      } as never);
    }

    return cloneElement(child, { children } as never);
  });
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
  return <div className="flex flex-row flex-wrap items-center gap-2">{children}</div>;
}

export function TableActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-nowrap items-center gap-3">{children}</div>;
}

export const tableLinkClassName = "whitespace-nowrap text-sm underline";

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
  selectable = false,
  lockedIds = [],
  bulkAction,
  children,
}: DataTableProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [actionOnly, setActionOnly] = useState(false);
  const [sort, setSort] = useState<SortState>(defaultSort ?? null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const extras = useMemo(() => collectExtras(children), [children]);
  const actionCount = useMemo(
    () => rows.filter((row) => row.needsAction).length,
    [rows],
  );
  const locked = useMemo(
    () => new Set(lockedIds.map((id) => String(id))),
    [lockedIds],
  );
  const { links: showLinks, actions: showActions } = useMemo(
    () => extrasColumns(extras),
    [extras],
  );

  const selectFilters = filterColumns(columns).filter((column) => {
    if (column.filterOptions && column.filterOptions.length > 0) {
      return true;
    }

    return uniqueValues(rows, column.key).length > 1;
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const activeFilters = filterColumns(columns);

    return rows.filter((row) => {
      if (actionOnly && !row.needsAction) {
        return false;
      }

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
  }, [actionOnly, columns, filters, query, rows]);

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

  const { pageCount, currentPage, from, to, paged } = paginateItems(
    visible,
    page,
  );

  useEffect(() => {
    setPage(1);
  }, [actionOnly, filters, query, sort]);

  const selectableVisible = useMemo(
    () =>
      selectable
        ? paged.filter((row) => !locked.has(String(row.id)))
        : [],
    [locked, paged, selectable],
  );

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

  const selectedIds = [...selected];
  const selectedVisibleCount = selectableVisible.filter((row) =>
    selected.has(String(row.id)),
  ).length;
  const allVisibleSelected =
    selectableVisible.length > 0 &&
    selectedVisibleCount === selectableVisible.length;

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of selectableVisible) {
        const id = String(row.id);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">{empty}</p>;
  }

  const columnCount =
    columns.length +
    (selectable ? 1 : 0) +
    (showLinks ? 1 : 0) +
    (showActions ? 1 : 0);
  const bulkFieldName = bulkAction?.fieldName ?? "ids";

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
        {actionCount > 0 || actionOnly ? (
          <button
            type="button"
            aria-pressed={actionOnly}
            onClick={() => setActionOnly((current) => !current)}
            className={
              actionOnly ? actionFilterActiveClassName : actionFilterClassName
            }
          >
            Needs action
            {actionCount > 0 ? ` (${actionCount})` : ""}
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {selectable && bulkAction ? (
          <form
            action={bulkAction.action}
            onSubmit={(event) => {
              if (selectedIds.length === 0) {
                event.preventDefault();
                return;
              }
              if (
                bulkAction.confirm &&
                !window.confirm(bulkAction.confirm)
              ) {
                event.preventDefault();
              }
            }}
            className="flex items-center gap-2"
          >
            {selectedIds.map((id) => (
              <input
                key={id}
                type="hidden"
                name={bulkFieldName}
                value={id}
              />
            ))}
            <button
              type="submit"
              disabled={selectedIds.length === 0}
              className={tableButtonClassName}
            >
              {bulkAction.label}
              {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </button>
          </form>
        ) : null}
        <p className="text-xs text-ink-muted">
          {listRangeLabel(from, to, visible.length, visible.length === 1 ? "row" : "rows")}
        </p>
      </div>
      <div className="overflow-x-auto border border-line bg-paper-raised">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper text-xs uppercase tracking-[0.12em] text-ink-muted">
            <tr>
              {selectable ? (
                <th scope="col" className="w-10 px-3 py-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={selectableVisible.length === 0}
                    onChange={(event) =>
                      toggleAllVisible(event.target.checked)
                    }
                    aria-label={`Select all ${caption}`}
                  />
                </th>
              ) : null}
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
                    className={`whitespace-nowrap px-3 py-2 font-medium ${aligned} ${columnWidthClass(column)}`.trim()}
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
                  className="whitespace-nowrap px-4 py-2 font-medium"
                >
                  Links
                </th>
              ) : null}
              {showActions ? (
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-2 font-medium"
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
              paged.map((row, index) => {
                const extra = extras.get(String(row.id));
                const extraProps = extra?.props;
                const rowId = String(row.id);
                const expanded = Boolean(openIds[rowId]);
                const lockedRow = locked.has(rowId);
                const striped =
                  index % 2 === 0 ? "bg-paper-raised" : "bg-paper-stripe";

                return (
                  <Fragment key={row.id}>
                    <tr
                      className={`border-t border-line align-top ${striped} hover:bg-line/40`}
                    >
                      {selectable ? (
                        <td className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(rowId)}
                            disabled={lockedRow}
                            onChange={(event) =>
                              toggleSelected(rowId, event.target.checked)
                            }
                            aria-label={
                              lockedRow
                                ? `Cannot select ${rowId}`
                                : `Select ${rowId}`
                            }
                          />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-3 py-3 text-ink ${
                            column.align === "right" ? "text-right" : ""
                          } ${columnWidthClass(column)}`.trim()}
                        >
                          {cellContent(row, column)}
                        </td>
                      ))}
                      {showLinks ? (
                        <td className="whitespace-nowrap px-4 py-3">
                          {hasNode(extraProps?.links) ? (
                            <TableActions>
                              {openLinksInNewTab(extraProps?.links)}
                            </TableActions>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                      ) : null}
                      {showActions ? (
                        <td className="whitespace-nowrap px-4 py-3">
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
      <ListPager
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        label={`${caption} pages`}
      />
    </div>
  );
}
