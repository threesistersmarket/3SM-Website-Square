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

    // Log the webhook event for debugging
    console.log('Received Webhook:', JSON.stringify(body, null, 2));

    // Ensure this is a payment event
    if (body.type !== 'payment.created') {
      console.log('Ignoring non-payment event.');
      return { statusCode: 200, body: 'Event ignored' };
    }

    // Extract payment details
    const payment = body.data.object;
    const amount = payment.amount_money?.amount || 0; // Amount in cents
    const note = payment.note || ''; // Optional description

    // Check if this is a membership purchase
    const isMembership = note.includes('Membership');

    if (!isMembership) {
      console.log('Ignoring non-membership payment.');
      return { statusCode: 200, body: 'Non-membership payment ignored' };
    }

    // Increment member count in Supabase
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
