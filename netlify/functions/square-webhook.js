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

    // Square Event Type (Check if it's a successful payment)
    if (body.type === 'payment.created') {
      const payment = body.data.object.payment;
      const amount = payment.total_money.amount / 100; // Convert from cents to dollars
      const note = payment.note || ''; // Capture any notes

      // Identify Membership Type by amount or note
      if (amount === 100 || note.includes('Pay in Full Membership')) {
        await updateMemberCount();
      } else if (amount === 27.50 || note.includes('Payment Plan Membership')) {
        await updateMemberCount();
      } else if (amount === 100 || note.includes('Sponsor a Membership')) {
        await updateMemberCount();
      }
    }

    return { statusCode: 200, body: 'Webhook processed' };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
}

// Function to update member count in Supabase
async function updateMemberCount() {
  const { data, error } = await supabase.rpc('increment_member_count');

  if (error) {
    console.error('Supabase update error:', error);
  } else {
    console.log('Member count updated:', data);
  }
}
