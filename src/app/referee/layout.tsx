import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Referee Hub | PitchSide',
    description: 'PitchSide Referee Ecosystem',
};

export default function RefereeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#000000] text-[#ffffff] font-sans">
            {children}
        </div>
    );
}
