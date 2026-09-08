// The existing approval webhook keeps handling paid events. Cancellation events
// are routed to the independent, signed + live-GET reconciliation boundary.
export async function forwardRefundWebhook(body: Record<string, unknown>, transport = fetch, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!supabaseUrl || !['cancelled', 'partialCancelled'].includes(String(body.status))) {
    return new Response('Rejected', { status: 400 });
  }
  try {
    const response = await transport(`${supabaseUrl}/functions/v1/nicepay-refund-webhook`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const confirmed = response.ok && (await response.text()) === 'OK';
    return new Response(confirmed ? 'OK' : 'Refund review pending', {
      status: confirmed ? 200 : 503, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response('Refund review pending', { status: 503 });
  }
}
