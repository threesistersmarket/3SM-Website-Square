import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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

    const order = body.data.object.order;
    const lineItems = order.line_items || [];

    let incrementValue = 0;

    for (let item of lineItems) {
      if (item.name.includes('Pay in Full Membership') || item.name.includes('Sponsor a Membership')) {
        incrementValue += 1;
      } else if (item.name.includes('Payment Plan Membership')) {
        incrementValue += 0.25;
      }
    }

    if (incrementValue === 0) {
      return { statusCode: 200, body: 'No valid membership found' };
    }

    // Update the member_count in the "settings" table
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
