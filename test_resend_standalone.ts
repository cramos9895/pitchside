
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.RESEND_API_KEY;
const enableEmails = process.env.ENABLE_EMAILS;

console.log('--- Standalone Resend Test ---');
console.log('API Key:', apiKey ? 'Found' : 'MISSING');
console.log('Enable Emails:', enableEmails);

if (!apiKey) {
    console.error('Missing RESEND_API_KEY');
    process.exit(1);
}

const resend = new Resend(apiKey);

async function testEmail() {
    console.log('\nSending test email...');
    
    // We'll use the "registration-confirmed" template ID as seen in email.ts
    const { data, error } = await resend.emails.send({
        from: 'PitchSide Team <support@pitchsidecf.com>',
        to: 'cramos9895@gmail.com',
        subject: 'PitchSide Test: Registration Confirmed',
        template: {
            id: 'registration-confirmed',
            variables: {
                userName: 'Test Player',
                gameTitle: 'Test Game',
                gameDate: '2026-03-25',
                gameTime: '08:00 PM',
                location: 'PitchSide CF',
                amountCharged: '$0.00'
            }
        }
    });

    if (error) {
        console.error('Resend Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Success! ID:', data?.id);
    }
}

testEmail().catch(console.error);
