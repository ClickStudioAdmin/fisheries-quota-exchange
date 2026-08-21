import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TAGS = [
  ["Seller signature", "[signature:Seller:sellerSig___]"],
  ["Seller date", "[date:Seller:sellerDate___]"],
  ["Seller printed name", "[textfield:Seller:sellerPrinted___]"],
  ["Seller witness signature (physically present)", "[signature:Seller:sellerWitnessSig___]"],
  ["Seller witness name", "[textfield:Seller:sellerWitnessName___]"],
  ["Buyer signature", "[signature:Buyer:buyerSig___]"],
  ["Buyer date", "[date:Buyer:buyerDate___]"],
  ["Buyer printed name", "[textfield:Buyer:buyerPrinted___]"],
  ["Buyer witness signature (physically present)", "[signature:Buyer:buyerWitnessSig___]"],
  ["Buyer witness name", "[textfield:Buyer:buyerWitnessName___]"],
] as const;

export async function addPandadocSigningFields(pdfBytes: Buffer) {
  const pdf = await PDFDocument.load(pdfBytes);
  const page = pdf.addPage();
  const { height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = height - 48;

  page.drawText("FQX Sign Online fields", {
    x: 48,
    y,
    size: 14,
    font: bold,
    color: rgb(0.12, 0.16, 0.22),
  });
  y -= 22;
  page.drawText(
    "Complete these fields in FQX. Each party’s witness must be physically present.",
    {
      x: 48,
      y,
      size: 10,
      font,
      color: rgb(0.25, 0.28, 0.32),
    },
  );
  y -= 28;

  for (const [label, tag] of TAGS) {
    page.drawText(label, {
      x: 48,
      y,
      size: 10,
      font: bold,
      color: rgb(0.12, 0.16, 0.22),
    });
    y -= 16;
    page.drawText(tag, {
      x: 48,
      y,
      size: 11,
      font,
      color: rgb(0.12, 0.16, 0.22),
    });
    y -= 28;
    if (y < 64) {
      break;
    }
  }

  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}
