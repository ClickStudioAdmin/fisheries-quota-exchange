import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type SigningTag = {
  page: number;
  x: number;
  y: number;
  size?: number;
  tag: string;
};

const SALE_TAGS: SigningTag[] = [
  { page: 2, x: 51, y: 332, tag: "[signature:Seller:sellerSig___]" },
  { page: 2, x: 175, y: 332, tag: "[textfield:Seller:sellerWitnessName___]" },
  { page: 2, x: 337, y: 332, tag: "[signature:Seller:sellerWitnessSig___]" },
  { page: 2, x: 487, y: 332, tag: "[date:Seller:sellerDate___]" },
  { page: 2, x: 51, y: 158, tag: "[signature:Buyer:buyerSig___]" },
  { page: 2, x: 175, y: 158, tag: "[textfield:Buyer:buyerWitnessName___]" },
  { page: 2, x: 337, y: 158, tag: "[signature:Buyer:buyerWitnessSig___]" },
  { page: 2, x: 487, y: 158, tag: "[date:Buyer:buyerDate___]" },
];

const LEASE_TAGS: SigningTag[] = [
  { page: 3, x: 86, y: 404, tag: "[signature:Seller:sellerSig___]" },
  { page: 3, x: 206, y: 404, size: 5, tag: "[signature:Seller:sellerWitnessSig___]" },
  { page: 3, x: 275, y: 404, tag: "[textfield:Seller:sellerWitnessName___]" },
  { page: 3, x: 474, y: 405, tag: "[date:Seller:sellerDate___]" },
  { page: 3, x: 87, y: 177, tag: "[signature:Buyer:buyerSig___]" },
  { page: 3, x: 207, y: 177, size: 5, tag: "[signature:Buyer:buyerWitnessSig___]" },
  { page: 3, x: 272, y: 177, tag: "[textfield:Buyer:buyerWitnessName___]" },
  { page: 3, x: 473, y: 178, tag: "[date:Buyer:buyerDate___]" },
];

export function pandadocSigningTagsForForm(formType: string) {
  if (formType === "FDU1469") {
    return LEASE_TAGS;
  }
  return SALE_TAGS;
}

export async function addPandadocSigningFields(
  pdfBytes: Buffer,
  formType: string,
) {
  const pdf = await PDFDocument.load(pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Courier);
  const pages = pdf.getPages();

  for (const item of pandadocSigningTagsForForm(formType)) {
    const page = pages[item.page];
    if (!page) {
      continue;
    }
    page.drawText(item.tag, {
      x: item.x,
      y: item.y,
      size: item.size ?? 6,
      font,
      color: rgb(0.12, 0.16, 0.22),
    });
  }

  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}
