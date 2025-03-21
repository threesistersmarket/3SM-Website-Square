import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Received Webhook:', JSON.stringify(body, null, 2));

    if (body.type !== 'order.created') {
      return { statusCode: 200, body: 'Event ignored' };
    }

    // Extract order ID and location ID
    const orderId = body.data.object.order_id;
    const locationId = body.data.object.location_id;

    if (!orderId || !locationId) {
      console.error('Missing order ID or location ID in webhook payload:', body);
      return { statusCode: 400, body: 'Invalid order data' };
    }

    // Fetch order details from Square
    const orderDetails = await fetchOrderDetails(orderId, locationId);
    if (!orderDetails) {
      return { statusCode: 500, body: 'Failed to fetch order details' };
    }

    // Process the order and determine how much to increment member_count
    let incrementValue = calculateIncrement(orderDetails);

    if (incrementValue === 0) {
      return { statusCode: 200, body: 'No valid membership found' };
    }

    // Update the member_count in Supabase
    const { error } = await supabase.rpc('increment_member_count', { value: incrementValue });

    if (error) {
      console.error('Database update failed:', error);
      return { statusCode: 500, body: 'Database update failed' };
    }

    console.log(`Member count updated by ${incrementValue}!`);
    return { statusCode: 200, body: 'Member count updated' };

  } catch (err) {
    console.error('Webhook processing error:', err);
    return { statusCode: 500, body: 'Webhook processing error' };
  }
}

// Function to fetch order details from Square
async function fetchOrderDetails(orderId, locationId) {
  const response = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch order details:', await response.text());
    return null;
  }

  const data = await response.json();
  return data.order;
}

// Function to determine how much to increment member_count
function calculateIncrement(order) {
  let incrementValue = 0;
  const items = order.line_items || [];

  for (let item of items) {
    if (item.name.includes('Pay in Full Membership') || item.name.includes('Sponsor a Membership')) {
      incrementValue += 1;
    } else if (item.name.includes('Payment Plan Membership')) {
      incrementValue += 0.25;
    }
  }

  return incrementValue;
}
