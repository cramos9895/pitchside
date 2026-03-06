import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Section,
} from '@react-email/components';
import React from 'react';

interface BookingCancelledEmailProps {
    resourceName: string;
    dates: string[];
    amountRefunded?: string;
}

export const BookingCancelledEmail = ({
    resourceName,
    dates,
    amountRefunded,
}: BookingCancelledEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Your Pitch Side Booking Cancellation Update</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={heading}>Booking Cancelled</Heading>
                    <Text style={paragraph}>
                        Your upcoming booking for <strong>{resourceName}</strong> has been cancelled by the facility.
                    </Text>

                    <Section style={detailsContainer}>
                        <Text style={detailsText}>
                            <strong>Cancelled Dates:</strong>
                        </Text>
                        <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0' }}>
                            {dates.map((date, idx) => (
                                <li key={idx} style={listItem}>{date}</li>
                            ))}
                        </ul>

                        {amountRefunded && (
                            <Text style={detailsText}>
                                <strong>Amount Refunded:</strong> {amountRefunded}
                            </Text>
                        )}
                    </Section>

                    {amountRefunded && (
                        <Text style={{ ...paragraph, fontSize: '14px', color: '#666' }}>
                            Refunds are processed immediately but may take 5-10 business days to appear on your original payment method depending on your bank.
                        </Text>
                    )}

                    <Text style={paragraph}>
                        If you have any questions or feel this was done in error, please contact the facility directly.
                    </Text>

                    <Text style={footer}>
                        Pitch Side Team<br />
                        <a href="https://pitchsidecf.com" style={{ color: '#000', textDecoration: 'underline' }}>
                            pitchsidecf.com
                        </a>
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    border: '1px solid #e1e3e8',
    borderRadius: '8px',
};

const heading = {
    fontSize: '24px',
    letterSpacing: '-1px',
    lineHeight: '1.3',
    fontWeight: '800',
    color: '#000000',
    padding: '0 40px',
    margin: '16px 0',
};

const paragraph = {
    margin: '0 0 16px',
    fontSize: '16px',
    lineHeight: '24px',
    color: '#333333',
    padding: '0 40px',
};

const detailsContainer = {
    backgroundColor: '#fbfbfb',
    border: '1px solid #e5e5e5',
    borderRadius: '4px',
    padding: '24px',
    margin: '24px 40px',
};

const detailsText = {
    fontSize: '15px',
    color: '#333333',
    margin: '0 0 8px 0',
};

const listItem = {
    fontSize: '15px',
    color: '#333333',
    marginBottom: '4px',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    padding: '0 40px',
    marginTop: '40px',
};

export default BookingCancelledEmail;
