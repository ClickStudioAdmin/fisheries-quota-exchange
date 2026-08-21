export type PandadocFieldType = "signature" | "text" | "date";

export type PandadocFieldLayout = {
  fieldId: string;
  type: PandadocFieldType;
  role: "Seller" | "Buyer";
  /** 1-based PandaDoc page number */
  page: number;
  offsetX: number;
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
  x: number;
  y: number;
  width: number;
  height: number;
  pageHeight: number;
};

/** Official FDU1465 declaration row 1 boxes (page 3 / index 2). */
const SALE_BOXES: PdfBox[] = [
  {
    fieldId: "sellerSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 48.5,
    y: 329,
    width: 118.3,
    height: 24,
    pageHeight: 841.9,
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
    pageHeight: 841.9,
  },
  {
    fieldId: "sellerWitnessSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 335.3,
    y: 329,
    width: 143.75,
    height: 24,
    pageHeight: 841.9,
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
    pageHeight: 841.9,
  },
  {
    fieldId: "buyerSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 48.5,
    y: 154.8,
    width: 118.3,
    height: 24,
    pageHeight: 841.9,
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
    pageHeight: 841.9,
  },
  {
    fieldId: "buyerWitnessSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 335.3,
    y: 154.8,
    width: 143.75,
    height: 24,
    pageHeight: 841.9,
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
    pageHeight: 841.9,
  },
];

/** Official FDU1469 first seller/buyer declaration rows (page 3 / index 2). */
const LEASE_BOXES: PdfBox[] = [
  {
    fieldId: "sellerSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 89.9,
    y: 400.87,
    width: 115.25,
    height: 24,
    pageHeight: 841.92,
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
    pageHeight: 841.92,
  },
  {
    fieldId: "sellerWitnessSig",
    type: "signature",
    role: "Seller",
    pageIndex: 2,
    x: 90.61,
    y: 382.53,
    width: 115.25,
    height: 24,
    pageHeight: 841.92,
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
    pageHeight: 841.92,
  },
  {
    fieldId: "buyerSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 85.09,
    y: 173.89,
    width: 115.25,
    height: 24,
    pageHeight: 841.92,
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
    pageHeight: 841.92,
  },
  {
    fieldId: "buyerWitnessSig",
    type: "signature",
    role: "Buyer",
    pageIndex: 2,
    x: 85.03,
    y: 155.54,
    width: 115.25,
    height: 24,
    pageHeight: 841.92,
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
    pageHeight: 841.92,
  },
];

function toPandaDocLayout(box: PdfBox): PandadocFieldLayout {
  return {
    fieldId: box.fieldId,
    type: box.type,
    role: box.role,
    page: box.pageIndex + 1,
    offsetX: box.x,
    offsetY: box.pageHeight - box.y - box.height,
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
          offset_x: Number(layout.offsetX.toFixed(2)),
          offset_y: Number(layout.offsetY.toFixed(2)),
          anchor_point: "topleft" as const,
        },
        style: {
          width: Number(layout.width.toFixed(2)),
          height: Number(layout.height.toFixed(2)),
        },
      },
    })),
  };
}
