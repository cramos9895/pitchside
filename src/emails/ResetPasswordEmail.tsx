import * as React from 'react';
import { Layout } from './components/Layout';
import { Text, Button, Section, Link } from '@react-email/components';

interface ResetPasswordEmailProps {
    resetLink: string;
}

export const ResetPasswordEmail = ({ resetLink }: ResetPasswordEmailProps) => {
    return (
        <Layout previewText="Reset your Pitch Side password">
            <Text className="text-xl font-bold text-gray-800 mb-4">
                Password Reset Request
            </Text>

            <Text className="text-base text-gray-600 mb-6 leading-relaxed">
                We received a request to reset your password for your Pitch Side account. If you didn't make this request, you can safely ignore this email. Otherwise, click the button below to set a new password.
            </Text>

            <Section className="text-center mt-8 mb-8">
                <Button
                    href={resetLink}
                    className="bg-black text-white px-8 py-4 rounded-md font-bold uppercase tracking-wider text-base hover:bg-gray-800 transition-colors inline-block"
                >
                    Reset Password
                </Button>
            </Section>

            <Text className="text-sm text-gray-500 mb-2 mt-8">
                Or copy and paste this link into your browser:
            </Text>

            <Text className="text-sm mb-0 break-all">
                <Link href={resetLink} className="text-[#ff4f00] underline">
                    {resetLink}
                </Link>
            </Text>
        </Layout>
    );
};

ResetPasswordEmail.PreviewProps = {
    resetLink: "https://www.pitchsidecf.com/update-password?token=abcdef1234567890",
} as ResetPasswordEmailProps;

export default ResetPasswordEmail;
