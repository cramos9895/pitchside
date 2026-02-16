import * as React from 'react';

interface WaitlistAlertProps {
    userName: string;
    eventName: string;
    gameId: string;
}

export const WaitlistAlert = ({
    userName,
    eventName,
    gameId
}: WaitlistAlertProps): React.ReactElement => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Good news, {userName}!</h2>
        <p>A spot just opened up for <strong>{eventName}</strong>.</p>

        <p>Since you are next on the waitlist, you have the first chance to claim it.</p>

        <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <a
                href={`${process.env.NEXT_PUBLIC_APP_URL}/games/${gameId}`}
                style={{
                    background: '#000',
                    color: '#fff',
                    padding: '12px 24px',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                }}
            >
                Claim Spot Now
            </a>
        </div>

        <p>Act fast! Spots are filled on a first-come, first-served basis amongst waitlisted players.</p>
        <p style={{ fontSize: '12px', color: '#888' }}>PitchSide League</p>
    </div>
);
