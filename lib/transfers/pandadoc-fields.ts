import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type SigningTag = {
  page: number;
  x: number;
  y: number;
  size?: number;
  tag: string;
};

const SALE_TAGS: SigningTag[] = [
  { page: 2, x: 48, y: 328, size: 8, tag: "[signature:Seller:sellerSig_____________]" },
  { page: 2, x: 170, y: 328, size: 7, tag: "[textfield:Seller:sellerWitnessName_______]" },
  { page: 2, x: 330, y: 328, size: 8, tag: "[signature:Seller:sellerWitnessSig________]" },
  { page: 2, x: 480, y: 328, size: 7, tag: "[date:Seller:sellerDate____]" },
  { page: 2, x: 48, y: 154, size: 8, tag: "[signature:Buyer:buyerSig_____________]" },
  { page: 2, x: 170, y: 154, size: 7, tag: "[textfield:Buyer:buyerWitnessName_______]" },
  { page: 2, x: 330, y: 154, size: 8, tag: "[signature:Buyer:buyerWitnessSig________]" },
  { page: 2, x: 480, y: 154, size: 7, tag: "[date:Buyer:buyerDate____]" },
];

const LEASE_TAGS: SigningTag[] = [
  { page: 3, x: 82, y: 400, size: 8, tag: "[signature:Seller:sellerSig_____________]" },
  { page: 3, x: 200, y: 400, size: 7, tag: "[signature:Seller:sellerWitnessSig________]" },
  { page: 3, x: 268, y: 400, size: 7, tag: "[textfield:Seller:sellerWitnessName_______]" },
  { page: 3, x: 468, y: 401, size: 7, tag: "[date:Seller:sellerDate____]" },
  { page: 3, x: 83, y: 173, size: 8, tag: "[signature:Buyer:buyerSig_____________]" },
  { page: 3, x: 201, y: 173, size: 7, tag: "[signature:Buyer:buyerWitnessSig________]" },
  { page: 3, x: 266, y: 173, size: 7, tag: "[textfield:Buyer:buyerWitnessName_______]" },
  { page: 3, x: 467, y: 174, size: 7, tag: "[date:Buyer:buyerDate____]" },
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
      // Match the page so tags are parsed but do not show as dark text.
      color: rgb(1, 1, 1),
    });
  }

  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}
