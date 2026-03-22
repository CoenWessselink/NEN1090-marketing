import { forwardWithAuth, json, normalizeSubscriptionStatus, readJsonSafe, resolveBillingCandidates } from '../../_shared/backend-auth.js';

function normalizeInvoice(invoice = {}, index = 0) {
  return {
    id: String(invoice.id || invoice.invoiceId || invoice.invoice_id || `invoice-${index + 1}`).trim(),
    number: String(invoice.number || invoice.reference || invoice.invoiceNumber || invoice.invoice_number || `Factuur ${index + 1}`).trim(),
    amount: invoice.amount ?? invoice.total ?? invoice.totalAmount ?? invoice.total_amount ?? null,
    status: String(invoice.status || 'paid').trim().toLowerCase(),
    date: String(invoice.date || invoice.createdAt || invoice.created_at || '').trim(),
    url: String(invoice.url || invoice.downloadUrl || invoice.download_url || '').trim(),
  };
}

function extractSubscriptionContract(payload = {}) {
  const source = payload.subscription && typeof payload.subscription === 'object' ? payload.subscription : payload;
  const plan = String(source.plan || '').trim();
  const billing = String(source.billing || source.billingCycle || source.billing_cycle || '').trim();
  const seatsRaw = source.seats ?? source.seatCount ?? source.seat_count;
  const seats = Number(seatsRaw);

  if (!plan || !billing || !Number.isFinite(seats) || seats < 1) {
    return null;
  }

  return {
    plan,
    billing: billing === 'yearly' ? 'yearly' : 'monthly',
    seats,
    company: String(source.company || source.companyName || source.company_name || '').trim(),
    contactEmail: String(source.contactEmail || source.contact_email || '').trim(),
    nextInvoiceDate: String(source.nextInvoiceDate || source.next_invoice_date || '').trim(),
    amount: source.amount ?? source.amountMonthly ?? source.amount_monthly ?? null,
    status: normalizeSubscriptionStatus(source.status),
    portalUrl: String(source.portalUrl || source.portal_url || '').trim(),
    cancelAtPeriodEnd: !!(source.cancelAtPeriodEnd || source.cancel_at_period_end),
    invoices: Array.isArray(source.invoices) ? source.invoices.map(normalizeInvoice) : [],
  };
}

export async function onRequestGet(context) {
  const res = await forwardWithAuth({
    ...context,
    method: 'GET',
    pathCandidates: resolveBillingCandidates(context.env, 'subscription', 'BACKEND_BILLING_SUBSCRIPTION_PATH', [
      '/api/v1/billing/subscription',
      '/api/v1/account/billing/subscription',
    ]),
  });

  if (!res.ok) {
    const { text } = await readJsonSafe(res);
    const mapped = res.status === 401 ? 'SESSION_REQUIRED' : res.status === 403 ? 'FORBIDDEN' : 'SUBSCRIPTION_FETCH_FAILED';
    return json(res.status, { ok: false, error: mapped, detail: text.slice(0, 600) });
  }

  const { json: payload } = await readJsonSafe(res);
  const subscription = extractSubscriptionContract(payload || {});
  if (!subscription) {
    return json(502, { ok: false, error: 'SUBSCRIPTION_CONTRACT_INVALID' });
  }

  return json(200, { ok: true, subscription });
}
