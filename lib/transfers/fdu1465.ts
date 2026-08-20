import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFBool, PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import type { TransferApplicationPdfData } from "./application-data";
import {
  FDU1465_TEMPLATE_FILENAME,
  fdu1465FieldValues,
} from "./fdu1465-map";

async function loadFdu1465Template() {
  const candidates = [
    path.join(process.cwd(), "lib/transfers/forms", FDU1465_TEMPLATE_FILENAME),
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "forms",
      FDU1465_TEMPLATE_FILENAME,
    ),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      continue;
    }
  }

  throw new Error("The official FDU1465 template is missing.");
}

export async function fillFdu1465Application(data: TransferApplicationPdfData) {
  const template = await loadFdu1465Template();
  const pdf = await PDFDocument.load(template);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const values = fdu1465FieldValues(data);

  for (const [name, value] of Object.entries(values)) {
    const field = form.getTextField(name);
    field.setText(value);
    field.setFontSize(8);
  }

  try {
    form.updateFieldAppearances(font);
  } catch {
    form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}
