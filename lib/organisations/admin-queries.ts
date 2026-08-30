import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  highestOrganisationRole,
  isOrganisationRole,
  type OrganisationRole,
} from "@/lib/organisations/types";

export type AdminUserMembership = {
  organisationId: number;
  organisation: string;
  role: OrganisationRole;
  joinedAt: string | null;
};

export type AdminUser = {
  id: number | null;
  email: string;
  fullName: string | null;
  phone: string | null;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  platformAdmin: boolean;
  memberships: AdminUserMembership[];
  listingCount: number;
  orderCount: number;
  joinedAt: string | null;
};

type MembershipRow = {
  id?: number | null;
  email?: string | null;
  role?: string | null;
  created_at?: string | null;
  organisation_id?: number | null;
  full_name?: string | null;
  organisations?: { legal_name?: string | null } | { legal_name?: string | null }[] | null;
};

type VerifiedRow = {
  email?: string | null;
  created_at?: string | null;
  verified_by_email?: string | null;
};

function asEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function countByEmail(rows: Array<{ created_by_email?: string | null }>) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const email = asEmail(row.created_by_email);

    if (!email) {
      continue;
    }

    counts.set(email, (counts.get(email) ?? 0) + 1);
  }

  return counts;
}

function emptyUser(email: string): AdminUser {
  return {
    id: null,
    email,
    fullName: null,
    phone: null,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    platformAdmin: false,
    memberships: [],
    listingCount: 0,
    orderCount: 0,
    joinedAt: null,
  };
}

function addMembership(user: AdminUser, row: MembershipRow) {
  const organisationId = Number(row.organisation_id);

  if (!Number.isInteger(organisationId) || organisationId <= 0) {
    return;
  }

  const membershipId = Number(row.id);

  if (
    Number.isInteger(membershipId) &&
    membershipId > 0 &&
    (user.id == null || membershipId < user.id)
  ) {
    user.id = membershipId;
  }

  const organisation = Array.isArray(row.organisations)
    ? row.organisations[0]
    : row.organisations;
  const legalName =
    organisation && typeof organisation === "object"
      ? String(organisation.legal_name ?? "")
      : "";
  const rawRole = String(row.role);
  const role: OrganisationRole = isOrganisationRole(rawRole)
    ? rawRole
    : "MEMBER";
  const joinedAt =
    typeof row.created_at === "string" && row.created_at ? row.created_at : null;

  if (
    !user.memberships.some(
      (membership) => membership.organisationId === organisationId,
    )
  ) {
    user.memberships.push({
      organisationId,
      organisation: legalName || `Account ${organisationId}`,
      role,
      joinedAt,
    });
  }

  if (joinedAt && (!user.joinedAt || joinedAt < user.joinedAt)) {
    user.joinedAt = joinedAt;
  }

  const fullName =
    typeof row.full_name === "string" ? row.full_name.trim() : "";

  if (fullName && !user.fullName) {
    user.fullName = fullName;
  }
}

function applyVerified(user: AdminUser, row: VerifiedRow) {
  user.verified = true;
  user.verifiedAt =
    typeof row.created_at === "string" && row.created_at ? row.created_at : null;
  user.verifiedBy = asEmail(row.verified_by_email) || null;
}

function finishUser(user: AdminUser) {
  user.memberships.sort((a, b) => a.organisation.localeCompare(b.organisation));
  return user;
}

export async function listOrganisationsForAdmin() {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("organisations")
    .select("id, legal_name")
    .order("legal_name");

  return (data ?? []) as { id: number; legal_name: string }[];
}

export async function listUsersForAdmin(): Promise<AdminUser[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const [
    { data: members },
    { data: verified },
    { data: admins },
    { data: listings },
    { data: orders },
    { data: people },
  ] = await Promise.all([
    supabase
      .from("organisation_users")
      .select("id, email, role, created_at, organisation_id, full_name, organisations ( legal_name )")
      .order("email"),
    supabase
      .from("verified_users")
      .select("email, created_at, verified_by_email"),
    supabase.from("platform_admins").select("email"),
    supabase.from("listings").select("created_by_email"),
    supabase.from("orders").select("created_by_email"),
    supabase.rpc("admin_auth_people"),
  ]);

  const users = new Map<string, AdminUser>();
  const listingCounts = countByEmail(listings ?? []);
  const orderCounts = countByEmail(orders ?? []);

  for (const row of members ?? []) {
    const email = asEmail(row.email);

    if (!email) {
      continue;
    }

    const existing = users.get(email) ?? emptyUser(email);
    addMembership(existing, row);
    users.set(email, existing);
  }

  for (const row of verified ?? []) {
    const email = asEmail(row.email);

    if (!email) {
      continue;
    }

    const existing = users.get(email) ?? emptyUser(email);
    applyVerified(existing, row);
    users.set(email, existing);
  }

  for (const row of admins ?? []) {
    const email = asEmail(row.email);

    if (!email) {
      continue;
    }

    const existing = users.get(email) ?? emptyUser(email);
    existing.platformAdmin = true;
    users.set(email, existing);
  }

  applyAuthPeople(users, people);

  return [...users.values()]
    .map((user) => {
      user.listingCount = listingCounts.get(user.email) ?? 0;
      user.orderCount = orderCounts.get(user.email) ?? 0;
      return finishUser(user);
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export function adminUserRole(user: AdminUser) {
  if (user.memberships.length === 0) {
    return null;
  }

  return highestOrganisationRole(user.memberships.map((membership) => membership.role));
}

export function adminUserDisplayName(user: Pick<AdminUser, "email" | "fullName">) {
  return user.fullName || user.email;
}

function applyAuthPeople(users: Map<string, AdminUser>, data: unknown) {
  const rows = Array.isArray(data) ? data : [];

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }

    const record = row as { email?: unknown };
    const email = asEmail(record.email);
    const existing = users.get(email);

    if (!existing) {
      continue;
    }

    const person = readAuthPerson(row);

    if (person.fullName) {
      existing.fullName = person.fullName;
    }

    if (person.phone) {
      existing.phone = person.phone;
    }
  }
}

function readAuthPerson(data: unknown) {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { fullName: null, phone: null };
  }

  const record = row as { full_name?: unknown; phone?: unknown };
  const fullName =
    typeof record.full_name === "string" && record.full_name.trim()
      ? record.full_name.trim()
      : null;
  const phone =
    typeof record.phone === "string" && record.phone.trim()
      ? record.phone.trim()
      : null;

  return { fullName, phone };
}

async function countCreatedBy(table: "listings" | "orders", email: string) {
  const supabase = await createClient();

  if (!supabase) {
    return 0;
  }

  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("created_by_email", email);

  return count ?? 0;
}

export const getAdminUserForAdmin = cache(async (
  email: string,
): Promise<AdminUser | null> => {
  const normalised = asEmail(email);

  if (!normalised.includes("@")) {
    return null;
  }

  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const [
    { data: members },
    { data: verified },
    { data: admin },
    { data: person },
    listingCount,
    orderCount,
  ] = await Promise.all([
    supabase
      .from("organisation_users")
      .select("id, email, role, created_at, organisation_id, full_name, organisations ( legal_name )")
      .eq("email", normalised),
    supabase
      .from("verified_users")
      .select("email, created_at, verified_by_email")
      .eq("email", normalised)
      .maybeSingle(),
    supabase
      .from("platform_admins")
      .select("email")
      .eq("email", normalised)
      .maybeSingle(),
    supabase.rpc("admin_auth_person", { p_email: normalised }),
    countCreatedBy("listings", normalised),
    countCreatedBy("orders", normalised),
  ]);

  const user = emptyUser(normalised);

  for (const row of members ?? []) {
    addMembership(user, row);
  }

  const authPerson = readAuthPerson(person);

  if (authPerson.fullName) {
    user.fullName = authPerson.fullName;
  }

  if (authPerson.phone) {
    user.phone = authPerson.phone;
  }

  if (verified) {
    applyVerified(user, verified);
  }

  if (admin) {
    user.platformAdmin = true;
  }

  user.listingCount = listingCount;
  user.orderCount = orderCount;

  if (
    user.memberships.length === 0 &&
    !user.verified &&
    !user.platformAdmin &&
    user.listingCount === 0 &&
    user.orderCount === 0
  ) {
    return null;
  }

  return finishUser(user);
});
