import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Button, Section, Row, Column, Hr } from '@react-email/components';

interface BookingConfirmedEmailProps {
    resourceName: string;
    dates: string[]; // Either a single date for one-off or multiple for series
    amountPaid: string; // e.g. "$120.00"
}

export const BookingConfirmedEmail = ({ resourceName, dates, amountPaid }: BookingConfirmedEmailProps) => {
    return (
        <Layout previewText={`Payment Confirmed for ${resourceName}`}>
            <Text className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-6">
                Booking Confirmed 🏆
            </Text>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                Your payment was successful and your booking is officially secured! Please arrive 15 minutes prior to your start time and ensure all players have signed the required facility waivers.
            </Text>

            <Section className="bg-gray-100 rounded-lg p-6 mb-8 border border-gray-200">
                <Row className="mb-4">
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Resource</Text>
                        <Text className="text-lg font-bold text-gray-900 m-0">{resourceName}</Text>
                    </Column>
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Amount Paid</Text>
                        <Text className="text-lg font-bold text-green-600 m-0">{amountPaid}</Text>
                    </Column>
                </Row>
                <Hr className="border-gray-300 my-4" />
                <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0 mb-3">Secured Dates</Text>
                {dates.map((dateStr, index) => (
                    <Row key={index} className="mb-2">
                        <Column>
                            <Text className="text-base font-medium text-gray-900 m-0">• {dateStr}</Text>
                        </Column>
                    </Row>
                ))}
            </Section>

            <Section className="text-center mt-4 mb-8">
                <Button
                    href="https://www.pitchsidecf.com/dashboard?tab=rentals"
                    className="bg-black text-white px-8 py-4 rounded-md font-bold uppercase tracking-wider text-base hover:bg-gray-800 transition-colors inline-block"
                >
                    View My Rentals
                </Button>
            </Section>

            <Text className="text-base text-gray-600 mt-8 mb-0">
                Get ready to ball,<br />
                <span className="font-bold">The Pitch Side Team</span>
            </Text>
        </Layout>
    );
};

BookingConfirmedEmail.PreviewProps = {
    resourceName: "Stadium Turf Field",
    amountPaid: "$150.00",
    dates: [
        "Friday, Oct 24th, 2026 at 8:00 PM - 10:00 PM",
    ]
} as BookingConfirmedEmailProps;

export default BookingConfirmedEmail;
