import { Html, Head, Body, Container, Tailwind, Preview, Img, Section, Text, Link, Hr } from '@react-email/components';
import * as React from 'react';

interface LayoutProps {
    children: React.ReactNode;
    previewText?: string;
}

export const Layout = ({ children, previewText }: LayoutProps) => {
    return (
        <Html>
            <Head />
            {previewText && <Preview>{previewText}</Preview>}
            <Tailwind>
                <Body className="bg-[#f6f9fc] font-sans text-gray-800 m-0 p-4">
                    <Container className="bg-white border border-gray-200 rounded-lg shadow-sm w-full max-w-[600px] mx-auto overflow-hidden">
                        {/* Header */}
                        <Section className="bg-black py-6 px-10 text-center">
                            <Text className="text-3xl font-black italic uppercase tracking-tighter m-0">
                                <span className="text-[#ff4f00]">PITCH</span>
                                <span className="text-white">SIDE</span>
                            </Text>
                        </Section>

                        {/* Main Content */}
                        <Section className="p-8">
                            {children}
                        </Section>

                        {/* Footer */}
                        <Hr className="border border-gray-200 my-0 mx-8" />
                        <Section className="p-8 text-center">
                            <Text className="text-sm text-gray-500 mb-4">
                                123 FC Street, Soccer City, US 90210
                            </Text>
                            <Text className="text-sm text-gray-500 m-0">
                                <Link href="#" className="text-gray-500 underline">Unsubscribe</Link> • <Link href="https://www.pitchsidecf.com" className="text-gray-500 underline">Pitch Side</Link>
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default Layout;
