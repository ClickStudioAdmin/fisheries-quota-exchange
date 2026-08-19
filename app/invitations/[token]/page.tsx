import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { InvitationDecisionForms } from "@/components/invitation-actions";
import { formatTableDate, timestampHasPassed } from "@/lib/format";
import { isInvitationToken } from "@/lib/organisations/paths";
import { getInvitationByToken } from "@/lib/organisations/queries";
import { organisationRoleLabel } from "@/lib/organisations/types";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Account invitation",
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getUser();

  if (!user) {
    return null;
  }

  if (!isInvitationToken(token)) {
    return (
      <AuthCard title="Invitation">
        <p className="text-sm text-ink-muted">
          This invitation link is not valid.
        </p>
      </AuthCard>
    );
  }

  const invitation = await getInvitationByToken(token);
  const signedInEmail = user.email?.toLowerCase() ?? "";

  if (!invitation) {
    return (
      <AuthCard title="Invitation">
        <p className="text-sm text-ink-muted">
          This invitation was not found. It may have been cancelled.
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          <Link href="/dashboard" className="underline">
            Go to Overview
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (invitation.email !== signedInEmail) {
    return (
      <AuthCard title="Invitation">
        <p className="text-sm text-ink-muted">
          This invitation was sent to {invitation.email}. You are signed in as{" "}
          {signedInEmail}. Log out, then open this invitation link again while
          signed in with the invited email.
        </p>
      </AuthCard>
    );
  }

  if (invitation.accepted_at) {
    return (
      <AuthCard title="Invitation">
        <p className="text-sm text-ink-muted">
          You have already accepted this invitation to{" "}
          {invitation.organisation_name}.
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          <Link href="/dashboard" className="underline">
            Go to Overview
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (timestampHasPassed(invitation.expires_at)) {
    return (
      <AuthCard title="Invitation">
        <p className="text-sm text-ink-muted">
          This invitation to {invitation.organisation_name} expired on{" "}
          {formatTableDate(invitation.expires_at)}. Ask an owner or admin to
          send a new invitation.
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          <Link href="/dashboard" className="underline">
            Go to Overview
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Invitation">
      <p className="text-sm text-ink-muted">
        You have been invited to join {invitation.organisation_name} as{" "}
        {organisationRoleLabel(invitation.role)}. You are not a member until
        you accept. This invitation expires on{" "}
        {formatTableDate(invitation.expires_at)}.
      </p>
      <div className="mt-6">
        <InvitationDecisionForms token={token} />
      </div>
    </AuthCard>
  );
}
