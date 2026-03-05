import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Button, Section, Row, Column, Hr } from '@react-email/components';

interface ContractApprovedEmailProps {
    facilityName: string;
    finalPrice: string; // pre-formatted like "$500.00"
    paymentTerms: 'upfront' | 'weekly';
}

export const ContractApprovedEmail = ({ facilityName, finalPrice, paymentTerms }: ContractApprovedEmailProps) => {
    return (
        <Layout previewText={`Your contract for ${facilityName} is ready!`}>
            <Text className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-6">
                Contract Approved ✅
            </Text>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                Great news! The team at <span className="font-bold">{facilityName}</span> has reviewed your booking request and approved your contract. Your slot reservations are now locked pending immediate payment.
            </Text>

            <Section className="bg-gray-100 rounded-lg p-6 mb-8 border border-gray-200">
                <Row className="mb-4">
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Invoicing Facility</Text>
                        <Text className="text-lg font-bold text-gray-900 m-0">{facilityName}</Text>
                    </Column>
                </Row>
                <Hr className="border-gray-300 my-4" />
                <Row>
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Final Contract Price</Text>
                        <Text className="text-2xl font-black text-pitch-accent m-0">{finalPrice}</Text>
                    </Column>
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Payment Terms</Text>
                        <Text className="text-lg font-bold text-gray-900 m-0 capitalize">{paymentTerms === 'upfront' ? 'Pay In Full' : 'Weekly Auto-Pay'}</Text>
                    </Column>
                </Row>
            </Section>

            <Text className="text-sm text-gray-500 mb-6 italic">
                Note: Returning Series & Contract bookings must be fully confirmed within your Player Dashboard. For Weekly terms, your card will be securely vaulted to process future charges.
            </Text>

            <Section className="text-center mt-4 mb-8">
                <Button
                    href="https://www.pitchsidecf.com/dashboard?tab=rentals"
                    className="bg-black text-white px-8 py-4 rounded-md font-bold uppercase tracking-wider text-base hover:bg-gray-800 transition-colors inline-block"
                >
                    Pay & Confirm
                </Button>
            </Section>

            <Text className="text-base text-gray-600 mt-8 mb-0">
                Lace up,<br />
                <span className="font-bold">The Pitch Side Team</span>
            </Text>
        </Layout>
    );
};

ContractApprovedEmail.PreviewProps = {
    facilityName: "The Fire Pitch",
    finalPrice: "$1,200.00",
    paymentTerms: "weekly"
} as ContractApprovedEmailProps;

export default ContractApprovedEmail;
