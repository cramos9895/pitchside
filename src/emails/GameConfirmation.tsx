import * as React from 'react';

interface GameConfirmationProps {
    userName: string;
    eventName: string;
    date: string;
    location: string;
}

export const GameConfirmation = ({
    userName,
    eventName,
    date,
    location
}: GameConfirmationProps): React.ReactElement => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h2>You're in, {userName}!</h2>
        <p>Your spot for <strong>{eventName}</strong> is confirmed.</p>

        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <p style={{ margin: '5px 0' }}><strong>Date:</strong> {date}</p>
            <p style={{ margin: '5px 0' }}><strong>Location:</strong> {location}</p>
        </div>

        <p>Please arrive 15 minutes early to warm up.</p>
        <p>See you at the field!</p>
        <p style={{ fontSize: '12px', color: '#888' }}>PitchSide League</p>
    </div>
);
