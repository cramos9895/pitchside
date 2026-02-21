import * as React from 'react';

interface ChatNotificationProps {
    eventName: string;
    senderName: string;
    messageContent: string;
    isBroadcast: boolean;
    gameUrl: string;
}

export const ChatNotification = ({
    eventName,
    senderName,
    messageContent,
    isBroadcast,
    gameUrl
}: ChatNotificationProps): React.ReactElement => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h2>{isBroadcast ? '📢 Event Announcement' : '💬 New Message'}</h2>
        <p>
            <strong>{senderName}</strong> posted in the chat for <strong>{eventName}</strong>:
        </p>

        <div style={{ background: '#f5f5f5', padding: '15px 20px', borderRadius: '8px', margin: '20px 0', borderLeft: isBroadcast ? '4px solid #ef4444' : '4px solid #10b981', fontStyle: 'italic', color: '#333' }}>
            "{messageContent}"
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <a href={gameUrl} style={{ background: '#ccff00', color: '#000', padding: '12px 24px', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                View Full Chat
            </a>
        </div>

        <p style={{ fontSize: '12px', color: '#888', marginTop: '40px' }}>You received this because you are a host, confirmed player, or waitlisted player for this event.</p>
        <p style={{ fontSize: '12px', color: '#888' }}>PitchSide League</p>
    </div>
);
