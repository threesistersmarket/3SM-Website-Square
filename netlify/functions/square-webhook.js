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

    const order = body.data.object.order_created;
    const orderId = order.order_id;

    // Fetch order details
    const orderDetails = await fetchOrderDetails(orderId);
    if (!orderDetails) {
      return { statusCode: 500, body: 'Failed to fetch order details' };
    }

    // Extract membership type
    const membershipType = getMembershipType(orderDetails);
    if (!membershipType) {
      return { statusCode: 200, body: 'No valid membership found' };
    }


    // Update member count based on membership type
    const rpcFunction = membershipType === 'Payment Plan Membership' 
      ? 'increment_member_count_25' 
      : 'increment_member_count';

    const { error } = await supabase.rpc(rpcFunction);
    if (error) {
      console.error('Database update failed:', error);
      return { statusCode: 500, body: 'Database update failed' };
    }

    console.log('Member count updated successfully!');
    return { statusCode: 200, body: 'Member count updated' };

  } catch (err) {
    console.error('Webhook processing error:', err);
    return { statusCode: 500, body: 'Webhook processing error' };
  }
}

// Function to fetch order details
async function fetchOrderDetails(orderId) {
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

// Function to determine membership type based on order items
function getMembershipType(order) {
  const items = order.line_items || [];
  for (let item of items) {
    if (item.name.includes('Pay in Full Membership')) return 'Pay in Full Membership';
    if (item.name.includes('Sponsor a Membership')) return 'Sponsor a Membership';
    if (item.name.includes('Payment Plan Membership')) return 'Payment Plan Membership';
  }
  return null;
}


