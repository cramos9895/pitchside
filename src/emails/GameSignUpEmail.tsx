import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Button, Section, Row, Column } from '@react-email/components';

interface GameSignUpEmailProps {
    playerName: string;
    gameDate: string;
    time: string;
    location: string;
    mode: string;
}

export const GameSignUpEmail = ({ playerName, gameDate, time, location, mode }: GameSignUpEmailProps) => {
    return (
        <Layout previewText={`Confirmed: You're in for ${gameDate}!`}>
            <Text className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-6">
                You're In, {playerName}! 🔥
            </Text>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                Your spot is officially secured for the upcoming run. Get your boots ready, hydrate, and prepare to show out on the pitch. Here are the details for your match:
            </Text>

            <Section className="bg-gray-100 rounded-lg p-6 mb-8 border border-gray-200">
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
                    <Column>
                        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 m-0">Mode</Text>
                        <Text className="text-lg font-bold text-pitch-accent uppercase italic m-0">{mode}</Text>
                    </Column>
                </Row>
            </Section>

            <Section className="text-center mt-4 mb-8">
                <Button
                    href="https://www.pitchsidecf.com/dashboard"
                    className="bg-black text-white px-8 py-4 rounded-md font-bold uppercase tracking-wider text-base hover:bg-gray-800 transition-colors inline-block"
                >
                    View Game Lobby
                </Button>
            </Section>

            <Text className="text-base text-gray-600 mt-8 mb-0">
                See you on the pitch,<br />
                <span className="font-bold">The Pitch Side Team</span>
            </Text>
        </Layout>
    );
};

GameSignUpEmail.PreviewProps = {
    playerName: "Christian",
    gameDate: "Friday, Oct 24th",
    time: "8:00 PM - 10:00 PM",
    location: "Downtown Sports Complex",
    mode: "Tournament",
} as GameSignUpEmailProps;

export default GameSignUpEmail;
