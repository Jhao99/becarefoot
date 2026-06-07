export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { items, lang, address } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Cart is empty" }, 400);
    }
    const isEN = lang === "en";
    const origin = new URL(request.url).origin;
    const UNIT_PRICE = 58;
    let totalAmount = 0;
    const purposeParts = [];
    for (const item of items) {
      const qty = Math.max(1, Math.min(99, parseInt(item.qty) || 1));
      totalAmount += UNIT_PRICE * qty;
      const name = isEN ? (item.name || "Herbal Foot Spa") : (item.nameZH || item.name || "草本泡脚包");
      purposeParts.push(`${name} x${qty}`);
    }
    // Append delivery address to purpose so it appears in HitPay dashboard
    let purpose = purposeParts.join(", ");
    if (address) {
      const addrStr = [address.name, address.phone, address.line1, address.line2, address.postcode, address.city, address.state, address.country]
        .filter(Boolean).join(", ");
      purpose += ` | Deliver to: ${addrStr}`;
    }
    const params = new URLSearchParams();
    params.append("amount", totalAmount.toFixed(2));
    params.append("currency", "MYR");
    params.append("purpose", purpose);
    params.append("redirect_url", `${origin}/success.html`);
    params.append("allow_repeated_payments", "false");
    params.append("send_email", "false");
    if (address) {
      params.append("name", address.name || "");
      params.append("phone", address.phone || "");
    }
    const res = await fetch("https://api.hit-pay.com/v1/payment-requests", {
      method: "POST",
      headers: {
        "X-BUSINESS-API-KEY": env.HITPAY_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      console.error("HitPay error:", JSON.stringify(data));
      return json({ error: data.message || "Payment gateway error" }, 500);
    }
    return json({ url: data.url });
  } catch (err) {
    console.error("Checkout error:", err.message);
    return json({ error: err.message || "Server error" }, 500);
  }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
