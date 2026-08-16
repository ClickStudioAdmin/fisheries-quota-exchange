import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/auth-card";
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
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-2 text-ink-muted">Signed in as {user.email}.</p>
      </div>
      <section>
        <h2 className="text-xl font-semibold text-ink">Organisations</h2>
        <p className="mt-2">
          <Link href="/organisations/new" className={buttonClassName}>
            Create organisation
          </Link>
        </p>
        {organisations.length === 0 ? (
          <p className="mt-4 text-ink-muted">
            You do not belong to an organisation yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {organisations.map((organisation) => (
              <li key={organisation.id}>
                <Link
                  href={`/organisations/${organisation.id}`}
                  className="block px-4 py-3 hover:bg-paper-raised"
                >
                  <span className="block text-ink">
                    {organisation.legal_name}
                  </span>
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
      </section>
      <section>
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
    </div>
  );
}
