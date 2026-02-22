import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Section, Row, Column } from '@react-email/components';

interface CancellationEmailProps {
    playerName: string;
    gameDate: string;
    refundMethod: 'Credits' | 'Original Payment' | 'None (Late Cancellation)';
}

export const CancellationEmail = ({ playerName, gameDate, refundMethod }: CancellationEmailProps) => {
    return (
        <Layout previewText="Confirmation of your canceled spot">
            <Text className="text-xl font-bold text-gray-800 mb-4">
                Booking Canceled
            </Text>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                Hi {playerName}, this email confirms that you have successfully withdrawn from the upcoming game on <span className="font-bold">{gameDate}</span>. Your spot has been removed from the roster and offered to the waitlist.
            </Text>

            <Section className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
                <Row>
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Refund Status</Text>
                        <Text className="text-lg font-bold text-gray-900 m-0">{refundMethod}</Text>
                    </Column>
                </Row>
            </Section>

            <Text className="text-sm text-gray-500 mb-6 leading-relaxed">
                If your refund was processed back to your original payment method, please allow 3-5 business days for it to appear on your statement. If issued as Pitch Side Credits, they are immediately available in your account.
            </Text>

            <Text className="text-base text-gray-600 mt-8 mb-0">
                Hope to see you next time,<br />
                <span className="font-bold">The Pitch Side Team</span>
            </Text>
        </Layout>
    );
};

CancellationEmail.PreviewProps = {
    playerName: "Christian",
    gameDate: "Friday, Oct 24th",
    refundMethod: "Credits",
} as CancellationEmailProps;

export default CancellationEmail;
