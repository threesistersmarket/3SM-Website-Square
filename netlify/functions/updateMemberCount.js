import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);

        // Ensure it's a valid membership payment
        if (body.type === 'payment.created' && body.data.object.payment.status === 'COMPLETED') {
            // Extract description or order details to determine membership type
            const payment = body.data.object.payment;
            const description = payment.note || ''; // Assuming the payment note contains the membership type

            const membershipType = getMembershipType(description);
            if (!membershipType) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: false, message: 'No valid membership found' }),
                };
            }

            // Choose the correct Supabase function
            const rpcFunction = membershipType === 'Payment Plan Membership' 
                ? 'increment_member_count_25' 
                : 'increment_member_count';

            const { error } = await supabase.rpc(rpcFunction);
            if (error) throw error;

            return {
                statusCode: 200,
                body: JSON.stringify({ success: true }),
            };
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, message: 'Invalid event' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};

// Function to determine membership type from payment description
function getMembershipType(description) {
    if (description.includes('Pay in Full Membership')) return 'Pay in Full Membership';
    if (description.includes('Sponsor a Membership')) return 'Sponsor a Membership';
    if (description.includes('Payment Plan Membership')) return 'Payment Plan Membership';
    return null;
}
