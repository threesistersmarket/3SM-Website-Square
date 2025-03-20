import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);

        // Ensure it's a valid membership payment
        if (body.type === 'payment.created' && body.data.object.payment.status === 'COMPLETED') {
            // Call the SQL function
            const { error } = await supabase.rpc('increment_member_count');

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
