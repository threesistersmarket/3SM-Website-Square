const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_API_URL = "https://connect.squareupsandbox.com/v2/orders";

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const orderId = body?.data?.object?.order_id;
    if (!orderId) throw new Error("Missing order ID in webhook payload");

    const orderResponse = await fetch(`${SQUARE_API_URL}/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    
    const { order } = await orderResponse.json();
    if (!order || !order.line_items) throw new Error("Invalid order response");

    let incrementValue = 0;
    order.line_items.forEach((item) => {
      if (item.name.includes("Pay in Full Membership")) {
        incrementValue += 1;
      } else if (item.name.includes("Quarterly Membership")) {
        incrementValue += 0.25;
      }
    });

    if (incrementValue > 0) {
      await supabase.rpc("increment_member_count", { value: incrementValue });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Webhook processed successfully" }),
    };
  } catch (error) {
    console.error("Webhook processing error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
