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

/**
 * Official FDU1465 declaration row 1 boxes (page 3 / index 2).
 * Coordinates are pdf-lib widget rectangles (origin bottom-left).
 */
const SALE_BOXES: PdfBox[] = [
  {
    fieldId: "sellerSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 48.5,
    y: 329,
    width: 118.3,
    height: 17.05,
  },
  {
    fieldId: "sellerWitnessName",
    type: "text",
    role: "Seller",
    pageIndex: 2,
    x: 172.8,
    y: 329,
    width: 156.7,
    height: 17.05,
  },
  {
    fieldId: "sellerWitnessSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 335.3,
    y: 329,
    width: 143.75,
    height: 17.05,
  },
  {
    fieldId: "sellerDate",
    type: "date",
    role: "Seller",
    pageIndex: 2,
    x: 485.05,
    y: 329,
    width: 86.15,
    height: 17.05,
  },
  {
    fieldId: "buyerSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 48.5,
    y: 154.8,
    width: 118.3,
    height: 17,
  },
  {
    fieldId: "buyerWitnessName",
    type: "text",
    role: "Buyer",
    pageIndex: 2,
    x: 172.8,
    y: 154.8,
    width: 156.7,
    height: 17,
  },
  {
    fieldId: "buyerWitnessSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 335.3,
    y: 154.8,
    width: 143.75,
    height: 17,
  },
  {
    fieldId: "buyerDate",
    type: "date",
    role: "Buyer",
    pageIndex: 2,
    x: 485.05,
    y: 154.8,
    width: 86.15,
    height: 17,
  },
];

/**
 * Official FDU1469 first seller/buyer declaration rows (page 3 / index 2).
 * Seller signature + witness sit on stacked rows in the left column.
 */
const LEASE_BOXES: PdfBox[] = [
  {
    fieldId: "sellerSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 89.92,
    y: 400.87,
    width: 115.25,
    height: 17.11,
  },
  {
    fieldId: "sellerWitnessName",
    type: "text",
    role: "Seller",
    pageIndex: 2,
    x: 272.89,
    y: 400.63,
    width: 115.25,
    height: 17.11,
  },
  {
    fieldId: "sellerWitnessSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 90.61,
    y: 382.53,
    width: 115.25,
    height: 17.11,
  },
  {
    fieldId: "sellerDate",
    type: "date",
    role: "Seller",
    pageIndex: 2,
    x: 472.03,
    y: 401.9,
    width: 91.04,
    height: 17.11,
  },
  {
    fieldId: "buyerSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 85.09,
    y: 173.89,
    width: 115.25,
    height: 17.11,
  },
  {
    fieldId: "buyerWitnessName",
    type: "text",
    role: "Buyer",
    pageIndex: 2,
    x: 269.57,
    y: 173.65,
    width: 115.25,
    height: 17.11,
  },
  {
    fieldId: "buyerWitnessSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 85.03,
    y: 155.54,
    width: 115.25,
    height: 17.11,
  },
  {
    fieldId: "buyerDate",
    type: "date",
    role: "Buyer",
    pageIndex: 2,
    x: 470.95,
    y: 174.91,
    width: 91.04,
    height: 17.11,
  },
];

function toPandaDocLayout(box: PdfBox): PandadocFieldLayout {
  return {
    fieldId: box.fieldId,
    type: box.type,
    role: box.role,
    page: box.pageIndex + 1,
    // PandaDoc field layout uses PDF user space with a bottom-left anchor.
    offsetX: box.x,
    offsetY: box.y,
    width: box.width,
    height: box.height,
  };
}

export function pandadocSigningLayoutsForForm(formType: string) {
  const boxes = formType === "FDU1469" ? LEASE_BOXES : SALE_BOXES;
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
