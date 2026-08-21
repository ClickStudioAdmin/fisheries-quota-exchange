export type PandadocFieldType = "signature" | "text" | "date";

export type PandadocFieldLayout = {
  fieldId: string;
  type: PandadocFieldType;
  role: "Seller" | "Buyer";
  /** 1-based PandaDoc page number */
  page: number;
  /** PDF user-space X (points from left). */
  offsetX: number;
  /** PDF user-space Y (points from bottom). */
  offsetY: number;
  width: number;
  height: number;
};

export type PandadocSigningRowCounts = {
  sellerRows: number;
  buyerRows: number;
};

type PdfBox = {
  fieldId: string;
  type: PandadocFieldType;
  role: "Seller" | "Buyer";
  /** 0-based PDF page index */
  pageIndex: number;
  /** Bottom-left of the AcroForm widget in PDF points. */
  x: number;
  y: number;
  width: number;
  height: number;
};

type DeclarationColumn = {
  type: PandadocFieldType;
  fieldId: string;
  x: number;
  width: number;
  height: number;
};

const MAX_DECLARATION_ROWS = 3;

/** FDU1465 transferor / transferee columns (page 3). */
const SALE_COLUMNS: DeclarationColumn[] = [
  { type: "signature", fieldId: "Sig", x: 48.5, width: 118.3, height: 17.05 },
  {
    type: "text",
    fieldId: "WitnessName",
    x: 172.8,
    width: 156.7,
    height: 17.05,
  },
  {
    type: "signature",
    fieldId: "WitnessSig",
    x: 335.3,
    width: 143.75,
    height: 17.05,
  },
  { type: "date", fieldId: "Date", x: 485.05, width: 86.15, height: 17.05 },
];

/** Bottom Y of transferor rows 1–3, then transferee rows 1–3. */
const SALE_SELLER_ROW_Y = [329, 297.8, 266.6] as const;
const SALE_BUYER_ROW_Y = [154.8, 123.6, 92.4] as const;

/**
 * FDU1469 lessor / lessee party blocks (page 3).
 * Each party uses a stacked pair: signature + witness name + date on the
 * upper line, witness signature on the lower-left.
 */
type LeasePartyBlock = {
  sig: { x: number; y: number; width: number; height: number };
  witnessName: { x: number; y: number; width: number; height: number };
  witnessSig: { x: number; y: number; width: number; height: number };
  date: { x: number; y: number; width: number; height: number };
};

const LEASE_SELLER_BLOCKS: readonly LeasePartyBlock[] = [
  {
    sig: { x: 89.92, y: 400.87, width: 115.25, height: 17.11 },
    witnessName: { x: 272.89, y: 400.63, width: 115.25, height: 17.11 },
    witnessSig: { x: 90.61, y: 382.53, width: 115.25, height: 17.11 },
    date: { x: 472.03, y: 401.9, width: 91.04, height: 17.11 },
  },
  {
    sig: { x: 91.08, y: 352.33, width: 115.25, height: 17.11 },
    witnessName: { x: 271.86, y: 353.13, width: 115.25, height: 17.11 },
    witnessSig: { x: 91.02, y: 334.64, width: 115.25, height: 17.11 },
    date: { x: 472.77, y: 353.73, width: 91.04, height: 17.11 },
  },
  {
    sig: { x: 91.04, y: 304.59, width: 115.25, height: 17.11 },
    witnessName: { x: 272.54, y: 305.79, width: 115.25, height: 17.11 },
    witnessSig: { x: 90.98, y: 285.12, width: 115.25, height: 17.11 },
    date: { x: 473.18, y: 304.15, width: 91.04, height: 17.11 },
  },
];

/** FDU1469 page 3 has two lessee declaration blocks (three lessor blocks). */
const LEASE_BUYER_BLOCKS: readonly LeasePartyBlock[] = [
  {
    sig: { x: 85.09, y: 173.89, width: 115.25, height: 17.11 },
    witnessName: { x: 269.57, y: 173.65, width: 115.25, height: 17.11 },
    witnessSig: { x: 85.03, y: 155.54, width: 115.25, height: 17.11 },
    date: { x: 470.95, y: 174.91, width: 91.04, height: 17.11 },
  },
  {
    sig: { x: 84.0, y: 122.35, width: 115.25, height: 17.11 },
    witnessName: { x: 269.28, y: 122.39, width: 115.25, height: 17.11 },
    witnessSig: { x: 84.32, y: 103.91, width: 115.25, height: 17.11 },
    date: { x: 472.45, y: 122.25, width: 91.04, height: 17.11 },
  },
];

/**
 * How many Transferor / Transferee declaration rows to place.
 * Uses Owner/Admin signatories on the organisation (same list as the PDF
 * party block). Always at least one row; form capacity is three.
 */
export function pandadocDeclarationRowCount(signatoryCount: number) {
  if (!Number.isFinite(signatoryCount) || signatoryCount < 1) {
    return 1;
  }
  return Math.min(MAX_DECLARATION_ROWS, Math.floor(signatoryCount));
}

function saleBoxesForRole(
  role: "Seller" | "Buyer",
  rowCount: number,
  rowYs: readonly number[],
): PdfBox[] {
  const count = Math.min(
    pandadocDeclarationRowCount(rowCount),
    rowYs.length,
  );
  const boxes: PdfBox[] = [];
  for (let row = 0; row < count; row += 1) {
    const y = rowYs[row];
    if (y == null) {
      break;
    }
    const suffix = row === 0 ? "" : String(row + 1);
    for (const column of SALE_COLUMNS) {
      boxes.push({
        fieldId: `${role.toLowerCase()}${column.fieldId}${suffix}`,
        type: column.type,
        role,
        pageIndex: 2,
        x: column.x,
        y,
        width: column.width,
        height: column.height,
      });
    }
  }
  return boxes;
}

function leaseBoxesForRole(
  role: "Seller" | "Buyer",
  rowCount: number,
  blocks: readonly LeasePartyBlock[],
): PdfBox[] {
  const count = Math.min(
    pandadocDeclarationRowCount(rowCount),
    blocks.length,
  );
  const boxes: PdfBox[] = [];
  for (let row = 0; row < count; row += 1) {
    const block = blocks[row];
    if (!block) {
      break;
    }
    const suffix = row === 0 ? "" : String(row + 1);
    const prefix = role.toLowerCase();
    boxes.push(
      {
        fieldId: `${prefix}Sig${suffix}`,
        type: "signature",
        role,
        pageIndex: 2,
        ...block.sig,
      },
      {
        fieldId: `${prefix}WitnessName${suffix}`,
        type: "text",
        role,
        pageIndex: 2,
        ...block.witnessName,
      },
      {
        fieldId: `${prefix}WitnessSig${suffix}`,
        type: "signature",
        role,
        pageIndex: 2,
        ...block.witnessSig,
      },
      {
        fieldId: `${prefix}Date${suffix}`,
        type: "date",
        role,
        pageIndex: 2,
        ...block.date,
      },
    );
  }
  return boxes;
}

function toPandaDocLayout(box: PdfBox): PandadocFieldLayout {
  return {
    fieldId: box.fieldId,
    type: box.type,
    role: box.role,
    page: box.pageIndex + 1,
    offsetX: box.x,
    offsetY: box.y,
    width: box.width,
    height: box.height,
  };
}

export function pandadocSigningLayoutsForForm(
  formType: string,
  counts: PandadocSigningRowCounts = { sellerRows: 1, buyerRows: 1 },
) {
  const sellerRows = pandadocDeclarationRowCount(counts.sellerRows);
  const buyerRows = pandadocDeclarationRowCount(counts.buyerRows);
  const boxes =
    formType === "FDU1469"
      ? [
          ...leaseBoxesForRole("Seller", sellerRows, LEASE_SELLER_BLOCKS),
          ...leaseBoxesForRole("Buyer", buyerRows, LEASE_BUYER_BLOCKS),
        ]
      : [
          ...saleBoxesForRole("Seller", sellerRows, SALE_SELLER_ROW_Y),
          ...saleBoxesForRole("Buyer", buyerRows, SALE_BUYER_ROW_Y),
        ];
  return boxes.map(toPandaDocLayout);
}

export function pandadocCreateFieldsPayload(
  layouts: readonly PandadocFieldLayout[],
  recipientIds: {
    sellerId: string;
    buyerId: string;
  },
) {
  return {
    fields: layouts.map((layout) => ({
      field_id: layout.fieldId,
      type: layout.type === "text" ? "text" : layout.type,
      assigned_to:
        layout.role === "Seller"
          ? recipientIds.sellerId
          : recipientIds.buyerId,
      settings: {
        required: true,
        ...(layout.type === "text"
          ? { placeholder: "Witness name", multiline: false }
          : {}),
      },
      layout: {
        page: layout.page,
        position: {
          offset_x: Math.round(layout.offsetX),
          offset_y: Math.round(layout.offsetY),
          anchor_point: "bottomleft" as const,
        },
        style: {
          width: Math.max(1, Math.round(layout.width)),
          height: Math.max(1, Math.round(layout.height)),
        },
      },
    })),
  };
}
