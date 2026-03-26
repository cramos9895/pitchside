
import { sendNotification } from './src/lib/email';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runDiagnostics() {
    console.log('--- Resend Email Diagnostic ---');
    console.log('ENABLE_EMAILS:', process.env.ENABLE_EMAILS);
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Present (ends in ' + process.env.RESEND_API_KEY.slice(-4) + ')' : 'MISSING');
    
    // Test 1: Confirmation Email
    console.log('\nTesting: confirmation');
    const res1 = await sendNotification({
        to: 'cramos9895@gmail.com', // User's likely email or a safe test one
        subject: 'Diagnostic: Join Confirmation',
        type: 'confirmation',
        data: {
            userName: 'Diagnostic Player',
            gameTitle: 'Diagnostic Game',
            gameDate: '2026-03-25',
            gameTime: '08:00 PM',
            location: 'PitchSide CF',
            amountCharged: '$0.00'
        }
    });
    console.log('Result:', JSON.stringify(res1, null, 2));

    // Test 2: Cancellation Email
    console.log('\nTesting: cancellation');
    const res2 = await sendNotification({
        to: 'cramos9895@gmail.com',
        subject: 'Diagnostic: Cancellation',
        type: 'cancellation',
        data: {
            userName: 'Diagnostic Player',
            gameTitle: 'Diagnostic Game',
            gameDate: '2026-03-25',
            refundMethod: 'Credits'
        }
    });
    console.log('Result:', JSON.stringify(res2, null, 2));
}

runDiagnostics().catch(console.error);
