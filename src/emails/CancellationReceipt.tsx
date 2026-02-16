import * as React from 'react';

interface CancellationReceiptProps {
    userName: string;
    eventName: string;
    refunded: boolean;
}

export const CancellationReceipt = ({
    userName,
    eventName,
    refunded
}: CancellationReceiptProps): React.ReactElement => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Booking Cancelled</h2>
        <p>Hi {userName},</p>
        <p>You have successfully left <strong>{eventName}</strong>.</p>

        {refunded ? (
            <div style={{ background: '#e6fffa', color: '#047481', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
                <strong>Refund Processed:</strong> A game credit has been returned to your account.
            </div>
        ) : (
            <div style={{ background: '#fff5f5', color: '#c53030', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
                <strong>No Refund:</strong> Cancellation was less than 6 hours before kickoff.
            </div>
        )}

        <p>We hope to see you at the next game!</p>
        <p style={{ fontSize: '12px', color: '#888' }}>PitchSide League</p>
    </div>
);
