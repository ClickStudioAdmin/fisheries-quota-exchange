export const tableWrapClassName =
  "overflow-x-auto border border-line bg-paper-raised";
export const tableClassName = "w-full border-collapse text-left text-sm";
export const tableHeadClassName =
  "bg-paper text-xs uppercase tracking-[0.12em] text-ink-muted";
export const tableHeaderCellClassName =
  "whitespace-nowrap px-3 py-2 font-medium";
export const tableBodyCellClassName = "px-3 py-3 text-ink";

export function tableRowClassName(index: number) {
  const striped = index % 2 === 0 ? "bg-paper-raised" : "bg-paper-stripe";
  return `border-t border-line align-top ${striped} hover:bg-line/40`;
}
