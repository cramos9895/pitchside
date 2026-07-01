'use server';

import { sendNotification } from '@/lib/email';
import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';
import React from 'react';

const RefereeInviteEmail = ({ matchDetails }: { matchDetails: string }) => (
    <Html>
        <Head />
        <Body style={{ backgroundColor: '#0a0a0a', color: '#ffffff', fontFamily: 'sans-serif' }}>
            <Container style={{ margin: '0 auto', padding: '20px', maxWidth: '600px' }}>
                <Section style={{ border: '1px solid #333', borderRadius: '4px', padding: '24px', backgroundColor: '#171717' }}>
                    <Text style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', color: '#ccff00' }}>
                        You've been invited!
                    </Text>
                    <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#a3a3a3' }}>
                        You have been manually assigned to officiate a match at PitchSide.
                    </Text>
                    <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>
                        {matchDetails}
                    </Text>
                    <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#a3a3a3', marginTop: '20px' }}>
                        Please create an account to confirm your assignment, track your stats, and setup automatic Stripe payouts.
                    </Text>
                    <Button 
                        href="https://pitchsidecf.com/login"
                        style={{ backgroundColor: '#ccff00', color: '#000000', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block', marginTop: '20px' }}
                    >
                        Join PitchSide
                    </Button>
                </Section>
            </Container>
        </Body>
    </Html>
);

export async function sendRefereeInvite(email: string, matchDetails: string) {
    try {
        const { success, error } = await sendNotification({
            to: email,
            subject: 'PitchSide Match Assignment',
            type: 'referee_invite',
            react: React.createElement(RefereeInviteEmail, { matchDetails })
        });

        if (!success) {
            console.error('[sendRefereeInvite] Error:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('[sendRefereeInvite] Exception:', error);
        return { success: false, error };
    }
}
