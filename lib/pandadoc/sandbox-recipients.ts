export function pandadocApiRecipientEmail(
  role: "Seller" | "Buyer",
  realEmail: string,
) {
  const sandbox = getPandaDocSandboxRecipients();
  if (!sandbox) {
    return realEmail;
  }

  return role === "Seller" ? sandbox.sellerEmail : sandbox.buyerEmail;
}
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) {
    return null;
  }

  const local = email.slice(0, at).split("+")[0]?.trim();
  const domain = email.slice(at + 1).trim();
  if (!local || !domain) {
    return null;
  }

  return {
    sellerEmail: `${local}+fqx-seller@${domain}`,
    buyerEmail: `${local}+fqx-buyer@${domain}`,
  };
}

export function getPandaDocSandboxRecipients() {
  const sellerEmail = process.env.PANDADOC_SANDBOX_SELLER_EMAIL?.trim();
  const buyerEmail = process.env.PANDADOC_SANDBOX_BUYER_EMAIL?.trim();
  if (sellerEmail && buyerEmail) {
    return { sellerEmail, buyerEmail };
  }

  const shared = process.env.PANDADOC_SANDBOX_RECIPIENT_EMAIL?.trim();
  return shared ? plusTaggedSandboxEmails(shared) : null;
}

export function pandadocApiRecipientEmail(
  role: typeof PANDADOC_SELLER_ROLE | typeof PANDADOC_BUYER_ROLE,
  realEmail: string,
) {
  const sandbox = getPandaDocSandboxRecipients();
  if (!sandbox) {
    return realEmail;
  }

  return role === PANDADOC_SELLER_ROLE
    ? sandbox.sellerEmail
    : sandbox.buyerEmail;
}
