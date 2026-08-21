import {
  AnnotationFlags,
  PDFAcroSignature,
  PDFDocument,
  PDFSignature,
  PDFWidgetAnnotation,
  type PDFPage,
} from "pdf-lib";
import type { PandadocFieldLayout } from "@/lib/transfers/pandadoc-fields";

export type PandaDocFormFieldAssignment = {
  role: "Seller" | "Buyer";
  value?: string;
};

function addSignatureField(
  pdf: PDFDocument,
  page: PDFPage,
  name: string,
  rect: { x: number; y: number; width: number; height: number },
) {
  const form = pdf.getForm();
  const context = pdf.context;
  const sigDict = context.obj({ FT: "Sig", Kids: [] });
  const sigDictRef = context.register(sigDict);
  const acroSig = PDFAcroSignature.fromDict(sigDict, sigDictRef);
  acroSig.setPartialName(name);
  form.acroForm.addField(sigDictRef);
  PDFSignature.of(acroSig, sigDictRef, pdf);
  const widget = PDFWidgetAnnotation.create(context, sigDictRef);
  widget.setRectangle(rect);
  widget.setP(page.ref);
  widget.setFlagTo(AnnotationFlags.Print, true);
  const widgetRef = context.register(widget.dict);
  acroSig.addWidget(widgetRef);
  page.node.addAnnot(widgetRef);
}

function addTextField(
  pdf: PDFDocument,
  page: PDFPage,
  name: string,
  rect: { x: number; y: number; width: number; height: number },
) {
  const field = pdf.getForm().createTextField(name);
  field.addToPage(page, {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    borderWidth: 0,
  });
  const widget = field.acroField.getWidgets()[0];
  if (widget) {
    widget.setRectangle(rect);
  }
}

/**
 * Burn in the pre-filled official form, then leave only the Sign Online
 * widgets. PandaDoc `parse_form_fields` uses these native positions, which
 * avoids the Create Document Fields coordinate drift.
 */
export async function preparePandaDocSigningPdf(
  filledPdf: Buffer,
  layouts: readonly PandadocFieldLayout[],
) {
  const pdf = await PDFDocument.load(filledPdf);
  const form = pdf.getForm();
  form.flatten();

  const pages = pdf.getPages();
  const fields: Record<string, PandaDocFormFieldAssignment> = {};

  for (const layout of layouts) {
    const page = pages[layout.page - 1];
    if (!page) {
      throw new Error(`PandaDoc layout page ${layout.page} is missing.`);
    }
    const rect = {
      x: layout.offsetX,
      y: layout.offsetY,
      width: layout.width,
      height: layout.height,
    };
    if (layout.type === "signature") {
      addSignatureField(pdf, page, layout.fieldId, rect);
    } else {
      addTextField(pdf, page, layout.fieldId, rect);
    }
    fields[layout.fieldId] = {
      role: layout.role,
      value: "",
    };
  }

  return {
    pdf: Buffer.from(await pdf.save({ updateFieldAppearances: false })),
    fields,
  };
}
