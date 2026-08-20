import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFBool, PDFDocument, PDFName, StandardFonts } from "pdf-lib";

async function loadOfficialTemplate(filename: string) {
  const candidates = [
    path.join(process.cwd(), "lib/transfers/forms", filename),
  ];

  try {
    candidates.push(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "forms", filename),
    );
  } catch {
    // Next may not expose a file URL for this module.
  }

  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      continue;
    }
  }

  throw new Error(`The official ${filename} template is missing.`);
}

export async function fillOfficialPdf(
  filename: string,
  values: Record<string, string>,
) {
  const template = await loadOfficialTemplate(filename);
  const pdf = await PDFDocument.load(template);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const [name, value] of Object.entries(values)) {
    try {
      form.getTextField(name).setText(value);
    } catch (error) {
      console.error(`Could not fill PDF field ${name}`, error);
    }
  }

  try {
    form.updateFieldAppearances(font);
  } catch {
    form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}
