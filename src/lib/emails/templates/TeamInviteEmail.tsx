import { Html, Head, Body, Container, Text, Link, Section } from '@react-email/components';
import * as React from 'react';

interface TeamInviteEmailProps {
    captainName: string;
    gameTitle: string;
    inviteLink: string;
}

export default function TeamInviteEmail({
    captainName = 'A Team Captain',
    gameTitle = 'Upcoming Match',
    inviteLink = 'https://pitchside.io'
}: TeamInviteEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Text style={logoText}>PITCHSIDE</Text>
                    </Section>
                    <Text style={title}>You've been drafted!</Text>
                    <Text style={paragraph}>
                        <strong>{captainName}</strong> saw your Free Agent card and wants you to join their squad for an upcoming match: <strong>{gameTitle}</strong>.
                    </Text>
                    <Section style={btnContainer}>
                        <Link href={inviteLink} style={button}>
                            View Match & Join Roster
                        </Link>
                    </Section>
                    <Text style={paragraph}>
                        Spots fill up fast, so click the secure link above to claim your roster spot on the clipboard and sign the digital waiver for entry.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#0f172a',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    color: '#ffffff',
};

const container = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    margin: '40px auto',
    padding: '32px',
    maxWidth: '500px',
};

const header = {
    borderBottom: '1px solid #334155',
    paddingBottom: '20px',
    marginBottom: '24px',
};

const logoText = {
    fontSize: '24px',
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#ccff00',
    margin: '0',
    letterSpacing: '0.05em',
};

const title = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 16px',
    fontStyle: 'italic',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#94a3b8',
    margin: '0 0 24px',
};

const btnContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#ccff00',
    color: '#000000',
    padding: '16px 32px',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
};
