import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Button, Section, Row, Column } from '@react-email/components';

interface WaitlistAlertEmailProps {
    gameDate: string;
    time: string;
    location: string;
    claimUrl: string;
}

export const WaitlistAlertEmail = ({ gameDate, time, location, claimUrl }: WaitlistAlertEmailProps) => {
    return (
        <Layout previewText="A spot just opened up! Claim it before it's gone.">
            <Text className="text-2xl font-black italic uppercase tracking-tighter text-[#ff4f00] mb-4">
                SPOT DETECTED!
            </Text>

            <Text className="text-base text-gray-800 font-bold mb-2">
                A spot has just opened up for the following run:
            </Text>

            <Section className="bg-gray-100 rounded-lg p-6 mb-8 border border-gray-200 mt-4">
                <Row className="mb-4">
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Date</Text>
                        <Text className="text-lg font-bold text-gray-900 m-0">{gameDate}</Text>
                    </Column>
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Time</Text>
                        <Text className="text-lg font-bold text-gray-900 m-0">{time}</Text>
                    </Column>
                </Row>
                <Row>
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Location</Text>
                        <Text className="text-lg font-bold text-gray-900 m-0">{location}</Text>
                    </Column>
                </Row>
            </Section>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                Waitlist spots are fiercely competitive and claimed on a first-come, first-served basis. If you want in, move fast!
            </Text>

            <Section className="text-center mt-2 mb-8">
                <Button
                    href={claimUrl}
                    className="bg-[#ff4f00] text-white px-10 py-5 rounded-md font-black uppercase tracking-widest text-lg hover:bg-[#ff6f33] transition-colors inline-block"
                >
                    CLAIM YOUR SPOT
                </Button>
            </Section>

            <Text className="text-sm text-gray-500 mt-8 mb-0">
                If you no longer want to play, you can safely ignore this email. Another player on the waitlist will claim the spot.
            </Text>
        </Layout>
    );
};

WaitlistAlertEmail.PreviewProps = {
    gameDate: "Friday, Oct 24th",
    time: "8:00 PM - 10:00 PM",
    location: "Downtown Sports Complex",
    claimUrl: "https://www.pitchsidecf.com/games/123",
} as WaitlistAlertEmailProps;

export default WaitlistAlertEmail;
