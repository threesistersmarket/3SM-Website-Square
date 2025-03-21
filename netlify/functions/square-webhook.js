import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN; // Add this to your Netlify environment variables

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
    const locationId = order.location_id;

    // Fetch order details to get line items
    const orderDetails = await fetchOrderDetails(orderId, locationId);
    if (!orderDetails) {
      return { statusCode: 500, body: 'Failed to fetch order details' };
    }

    // Extract customer ID and membership type
    const customerId = orderDetails.customer_id;
    const membershipType = getMembershipType(orderDetails);

    if (!membershipType) {
      return { statusCode: 200, body: 'No valid membership found' };
    }

    // Special check for Payment Plan Membership
    if (membershipType === 'Payment Plan Membership') {
      const hasPreviousPayments = await checkCustomerPaymentHistory(customerId);

      if (hasPreviousPayments) {
        console.log('Customer has already made a Payment Plan Membership payment.');
        return { statusCode: 200, body: 'Duplicate payment ignored' };
      }
    }

    // Update member count
    const { error } = await supabase
      .from('settings')
      .update({ member_count: supabase.raw('member_count + 1') })
      .eq('id', 1);

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

// Function to check if customer has previous payments
async function checkCustomerPaymentHistory(customerId) {
  if (!customerId) return false;

  const response = await fetch(`https://connect.squareup.com/v2/payments?customer_id=${customerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch payment history:', await response.text());
    return false;
  }

  const data = await response.json();
  return data.payments.some(payment => payment.amount_money.amount === 2750); // 27.50 in cents
}
