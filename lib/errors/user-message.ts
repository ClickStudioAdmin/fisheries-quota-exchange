const FALLBACK = "Something went wrong. Try again.";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  organisations_abn_unique:
    "This ABN is already registered to another account.",
  organisation_users_organisation_email_unique:
    "That email is already a member of this account.",
  organisations_stripe_account_id_unique:
    "This payment account is already connected.",
  quota_holdings_unique:
    "A holding already exists for that stock, season and quota type.",
  stocks_fishery_name_unique:
    "A stock with that name already exists for this fishery.",
  quota_types_fishery_name_unique:
    "A quota type with that name already exists for this fishery.",
  fishery_rules_fishery_code_unique:
    "A rule with that code already exists for this fishery.",
  species_jurisdiction_common_name_unique:
    "That species already exists in this jurisdiction.",
  payments_stripe_transfer_id_unique:
    "This settlement transfer has already been recorded.",
  payments_order_id_key: "A payment already exists for this order.",
  payments_checkout_session_id_key:
    "This checkout session has already been recorded.",
  fisheries_code_key: "A fishery with that code already exists.",
  jurisdictions_code_key: "A jurisdiction with that code already exists.",
};

const COLUMN_MESSAGES: Record<string, string> = {
  abn: "This ABN is already registered to another account.",
  email: "That email is already in use.",
  code: "That code is already in use.",
  stripe_account_id: "This payment account is already connected.",
  stripe_transfer_id: "This settlement transfer has already been recorded.",
  checkout_session_id: "This checkout session has already been recorded.",
  order_id: "A record already exists for this order.",
};

const CODE_MESSAGES: Record<string, string> = {
  "23505": "That value is already in use.",
  "23503": "That record is in use and cannot be changed.",
  "23514": "That value is not allowed.",
  "23502": "A required value is missing.",
  "42501": "You do not have permission to do that.",
  PGRST301: "You do not have permission to do that.",
};

const AUTH_MESSAGES: Record<string, string> = {
  "invalid login credentials": "Email or password is incorrect.",
  "invalid_credentials": "Email or password is incorrect.",
  "email not confirmed": "Confirm your email before logging in.",
  "user already registered": "An account with that email already exists.",
  "user_already_exists": "An account with that email already exists.",
  "signup_disabled": "New registrations are closed.",
  "over_email_send_rate_limit": "Please wait a moment before requesting another email.",
  "over_request_rate_limit": "Please wait a moment and try again.",
  "same_password": "Choose a password you have not used before.",
  "weak_password": "Choose a stronger password.",
  "email_exists": "An account with that email already exists.",
  "email_address_invalid": "Enter a valid email address.",
  "email_not_confirmed": "Confirm your email before logging in.",
  "user_not_found": "No account was found for that email.",
  "session_not_found": "Your session has expired. Log in again.",
  "refresh_token_not_found": "Your session has expired. Log in again.",
  "invalid_token": "That link is invalid or has expired.",
  "otp_expired": "That code has expired. Request a new one.",
  "validation_failed": "Check the details and try again.",
};

const EXCEPTION_MESSAGES: Record<string, string> = {
  "not authenticated": "You must be signed in.",
  "not a platform admin": "You do not have permission to do that.",
  "terms version is required": "Refresh the page and agree to the current terms.",
  "you already have an account": "You already have a business account.",
  "legal name is required": "Legal name is required.",
  "you do not have permission to invite members":
    "You do not have permission to invite members.",
  "you cannot invite yourself": "You cannot invite yourself.",
  "that email is already a member of this account":
    "That email is already a member of this account.",
  "invitation not found": "Invitation not found.",
  "this invitation has expired": "This invitation has expired.",
  "this invitation was sent to a different email":
    "This invitation was sent to a different email.",
  "you cannot cancel that invitation": "You cannot cancel that invitation.",
};

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function quotedNames(text: string) {
  return [...text.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function constraintMessage(error: ErrorLike) {
  const haystack = [asText(error.message), asText(error.details), asText(error.hint)]
    .filter(Boolean)
    .join(" ");

  for (const name of quotedNames(haystack)) {
    if (CONSTRAINT_MESSAGES[name]) {
      return CONSTRAINT_MESSAGES[name];
    }
  }

  const uniqueName = haystack.match(/unique constraint "?([a-z0-9_]+)"?/i)?.[1];
  if (uniqueName && CONSTRAINT_MESSAGES[uniqueName]) {
    return CONSTRAINT_MESSAGES[uniqueName];
  }

  const columns = haystack.match(/Key \(([^)]+)\)=/i)?.[1];
  if (columns) {
    const first = columns.split(",")[0]?.trim();
    if (first && COLUMN_MESSAGES[first]) {
      return COLUMN_MESSAGES[first];
    }
  }

  return null;
}

function looksTechnical(message: string) {
  const lower = message.toLowerCase();

  return (
    /violates|duplicate key|constraint|permission denied for|row-level security|row level security|relation "|column "|syntax error|pgrst|sqlstate|infinite recursion|null value in column|current transaction is aborted|could not find the function|schema cache|jwt|stack depth|operator does not exist|foreign key|not-null|check constraint|unique constraint|already exists\./i.test(
      lower,
    ) ||
    /_[a-z0-9]+_(?:key|unique|fkey|check)\b/i.test(message) ||
    /\b(?:sk|pk|whsec)_(?:test|live)_/i.test(message) ||
    /\bno such (?:customer|account|payment|charge|transfer)\b/i.test(lower) ||
    /invalid api key|invalid_request_error|api_key_expired/i.test(lower)
  );
}

function knownMessage(text: string) {
  const key = text.toLowerCase().replace(/\.+$/, "");
  return AUTH_MESSAGES[key] ?? EXCEPTION_MESSAGES[key] ?? null;
}

export function userFacingError(
  error: unknown,
  fallback = FALLBACK,
): string {
  if (typeof error === "string") {
    const known = knownMessage(error);
    if (known) {
      return known;
    }

    if (!looksTechnical(error) && error.trim()) {
      return error.trim();
    }

    return fallback;
  }

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const record = error as ErrorLike;
  const mappedConstraint = constraintMessage(record);

  if (mappedConstraint) {
    return mappedConstraint;
  }

  const code = asText(record.code);
  if (code && AUTH_MESSAGES[code]) {
    return AUTH_MESSAGES[code];
  }

  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  const message = asText(record.message);
  const known = knownMessage(message);

  if (known) {
    return known;
  }

  if (message && !looksTechnical(message)) {
    return message;
  }

  return fallback;
}
