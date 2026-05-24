// Cloudflare Pages Function: POST /api/checkout
// Creates a Stripe Checkout Session (one-time payment, MYR) with all cart
// items and their quantities, then returns the hosted checkout URL.
//
// Your Stripe SECRET key is read from an environment variable set in the
// Cloudflare dashboard (Settings -> Variables and Secrets):  STRIPE_SECRET_KEY
// Never hard-code the secret key in this file.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { items, lang } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Cart is empty" }, 400);
    }

    const isEN = lang === "en";
    const origin = new URL(request.url).origin;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/?checkout=cancelled`);

    params.append("shipping_address_collection[allowed_countries][0]", "MY");
    params.append("phone_number_collection[enabled]", "true");

    const UNIT_AMOUNT = 5800; // RM58.00
    let idx = 0;
    for (const item of items) {
      const qty = Math.max(1, Math.min(999, parseInt(item.qty) || 1));
      const name = isEN
        ? (item.name || "Herbal Foot Spa")
        : (item.nameZH || item.name || "Herbal Foot Spa");
      params.append(`line_items[${idx}][price_data][currency]`, "myr");
      params.append(`line_items[${idx}][price_data][unit_amount]`, String(UNIT_AMOUNT));
      params.append(`line_items[${idx}][price_data][product_data][name]`, name);
      params.append(`line_items[${idx}][quantity]`, String(qty));
      params.append(`line_items[${idx}][adjustable_quantity][enabled]`, "true");
      params.append(`line_items[${idx}][adjustable_quantity][minimum]`, "1");
      params.append(`line_items[${idx}][adjustable_quantity][maximum]`, "99");
      idx++;
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await res.json();
    if (session.error) {
      return json({ error: session.error.message }, 500);
    }
    return json({ url: session.url });
  } catch (err) {
    return json({ error: err.message || "Server error" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
