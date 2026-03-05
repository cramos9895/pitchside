import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Button, Section, Row, Column } from '@react-email/components';

interface NewRequestEmailProps {
    userName: string;
    resourceName: string;
    requestedDates: string[]; // e.g. ["Friday, Oct 24th at 8:00 PM", "Friday, Oct 31st at 8:00 PM"]
}

export const NewRequestEmail = ({ userName, resourceName, requestedDates }: NewRequestEmailProps) => {
    return (
        <Layout previewText={`New Booking Request from ${userName}`}>
            <Text className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-6">
                New Action Required ⚡
            </Text>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                You have received a new booking or contract request from <span className="font-bold">{userName}</span> for your <span className="font-bold">{resourceName}</span>. Please review the desired dates and provide them with a final quote.
            </Text>

            <Section className="bg-gray-100 rounded-lg p-6 mb-8 border border-gray-200">
                <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0 mb-3">Requested Dates</Text>

                {requestedDates.map((dateStr, index) => (
                    <Row key={index} className="mb-2">
                        <Column>
                            <Text className="text-base font-medium text-gray-900 m-0">• {dateStr}</Text>
                        </Column>
                    </Row>
                ))}
            </Section>

            <Section className="text-center mt-4 mb-8">
                <Button
                    href="https://www.pitchsidecf.com/facility"
                    className="bg-pitch-accent text-black px-8 py-4 rounded-md font-bold uppercase tracking-wider text-base hover:bg-pitch-accent/90 transition-colors inline-block"
                >
                    Review Request
                </Button>
            </Section>

            <Text className="text-base text-gray-600 mt-8 mb-0">
                The Pitch Side Network<br />
                <span className="font-bold">Automated Dispatch</span>
            </Text>
        </Layout>
    );
};

NewRequestEmail.PreviewProps = {
    userName: "Christian Ramos",
    resourceName: "Stadium Turf Field",
    requestedDates: [
        "Friday, Oct 24th, 2026 at 8:00 PM - 10:00 PM",
        "Friday, Oct 31st, 2026 at 8:00 PM - 10:00 PM",
    ]
} as NewRequestEmailProps;

export default NewRequestEmail;
