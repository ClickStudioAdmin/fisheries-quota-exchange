import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { buttonClassName } from "@/components/auth-card";
import { PageIntro } from "@/components/page-intro";
import { listMyOrganisations } from "@/lib/organisations/queries";
import { listMyOrders } from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const organisations = await listMyOrganisations();
  const orders = await listMyOrders();

  return (
    <PageIntro title="Dashboard">
      <p>Signed in as {user.email}.</p>
      <p>
        <Link href="/organisations/new" className={buttonClassName}>
          Create organisation
        </Link>
      </p>
      {organisations.length === 0 ? (
        <p>You do not belong to an organisation yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line">
          {organisations.map((organisation) => (
            <li key={organisation.id}>
              <Link
                href={`/organisations/${organisation.id}`}
                className="block px-4 py-3 hover:bg-paper-raised"
              >
                <span className="block text-ink">{organisation.legal_name}</span>
                <span className="block text-sm text-ink-muted">
                  {organisation.role}
                  {organisation.trading_name
                    ? ` · ${organisation.trading_name}`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No simulated purchases yet. Buy a published listing from the
            marketplace using a different organisation than the seller.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="block px-4 py-3 hover:bg-paper-raised"
                >
                  <span className="block text-ink">
                    Order {order.id} · {order.fishery_name} · {order.offering}
                  </span>
                  <span className="block text-sm text-ink-muted">
                    {orderStatusLabel(order.status)} · {order.buyer_name} buying
                    from {order.seller_name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form action={logoutAction} className="mt-8">
        <button
          type="submit"
          className="border border-line px-4 py-2 text-sm text-ink hover:bg-paper-raised"
        >
          Log out
        </button>
      </form>
    </PageIntro>
  );
}
