export function selectedComplianceUpdateNotes(input: {
  notifyBuyer: boolean;
  buyerNote: string;
  notifySeller: boolean;
  sellerNote: string;
}) {
  const buyerNote = input.notifyBuyer ? input.buyerNote.trim() : "";
  const sellerNote = input.notifySeller ? input.sellerNote.trim() : "";

  if (!input.notifyBuyer && !input.notifySeller) {
    return { error: "Tick at least one party to notify." };
  }

  if (input.notifyBuyer && !buyerNote) {
    return { error: "Add a message for the buyer." };
  }

  if (input.notifySeller && !sellerNote) {
    return { error: "Add a message for the seller." };
  }

  return {
    buyerNote: buyerNote || null,
    sellerNote: sellerNote || null,
  };
}

export function latestComplianceUpdateNotes(
  events: ReadonlyArray<{
    event_type: string;
    payload: Record<string, unknown>;
  }>,
) {
  let buyer: string | null = null;
  let seller: string | null = null;

  for (const event of events) {
    const note =
      typeof event.payload.note === "string" ? event.payload.note.trim() : "";

    if (!note) {
      continue;
    }

    if (
      event.event_type === "COMPLIANCE_UPDATE_REQUESTED_BUYER" &&
      buyer == null
    ) {
      buyer = note;
    }

    if (
      event.event_type === "COMPLIANCE_UPDATE_REQUESTED_SELLER" &&
      seller == null
    ) {
      seller = note;
    }

    if (buyer && seller) {
      break;
    }
  }

  return { buyer, seller };
}
