export const metadata = {
  title: 'Stocks | Medical Center Management System',
};

export default function StocksPage() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Stocks</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Medicine inventory tracking, purchase history, and stock alerts will appear here soon.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-dashed border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Stock Overview</h2>
          <p className="mt-1 text-sm text-slate-600">
            The inventory table will summarize medicine codes, types, quantities, and pricing.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Medicine Types</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage reusable categories and link new medicines through quick modals.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Incoming Shipments</h2>
          <p className="mt-1 text-sm text-slate-600">
            Record batch quantities with per-unit costs to keep margins up to date.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Restock Alerts</h2>
          <p className="mt-1 text-sm text-slate-600">
            Low-stock notifications and reorder suggestions will surface in this area.
          </p>
        </div>
      </div>
    </section>
  );
}