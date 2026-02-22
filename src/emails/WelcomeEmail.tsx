import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Button, Section } from '@react-email/components';

interface WelcomeEmailProps {
    firstName: string;
}

export const WelcomeEmail = ({ firstName }: WelcomeEmailProps) => {
    return (
        <Layout previewText="Welcome to the Pitch Side family!">
            <Text className="text-2xl font-bold text-gray-800 mb-4">
                Welcome to Pitch Side, {firstName}! ⚽
            </Text>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                We're excited to have you join our community. Pitch Side is your ultimate destination for high-quality, organized pick-up soccer. To get the most out of your experience, please take a moment to complete your profile, add your favorite position, and link your zip code so we can send you matches happening near you.
            </Text>

            <Section className="text-center mt-8 mb-8">
                <Button
                    href="https://www.pitchsidecf.com/settings"
                    className="bg-[#ff4f00] text-white px-8 py-4 rounded-md font-bold uppercase tracking-wider text-base hover:bg-[#ff6f33] transition-colors inline-block"
                >
                    Complete Profile
                </Button>
            </Section>

            <Text className="text-base text-gray-600 mb-4 leading-relaxed">
                Once your profile is set up, head over to the dashboard to find an upcoming game. We can't wait to see you on the pitch!
            </Text>

            <Text className="text-base text-gray-600 mt-8 mb-0">
                Lace up,<br />
                <span className="font-bold">The Pitch Side Team</span>
            </Text>
        </Layout>
    );
};

WelcomeEmail.PreviewProps = {
    firstName: "Christian",
} as WelcomeEmailProps;

export default WelcomeEmail;
