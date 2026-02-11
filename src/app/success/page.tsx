
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { syncPlayerCount } from '@/lib/games';

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SuccessPage({ searchParams }: Props) {
    const params = await searchParams;
    const sessionId = params.session_id;

    if (!sessionId || typeof sessionId !== 'string') {
        return (
            <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Invalid Session</h1>
                    <Link href="/" className="text-pitch-accent hover:underline">Return Home</Link>
                </div>
            </div>
        );
    }

    try {
        // 1. Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return (
                <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Payment Not Completed</h1>
                        <Link href="/" className="text-pitch-accent hover:underline">Return Home</Link>
                    </div>
                </div>
            );
        }

        const gameId = session.metadata?.game_id;
        const userId = session.metadata?.user_id;
        const note = session.metadata?.note; // Extract note

        if (!gameId || !userId) {
            throw new Error("Missing metadata in Stripe session");
        }

        // 2. Insert Booking into Supabase
        const supabase = await createClient();

        // Check if already exists to avoid duplicate insert errors
        const { data: existingBooking } = await supabase
            .from('bookings')
            .select('id')
            .eq('game_id', gameId)
            .eq('user_id', userId)
            .single();

        if (!existingBooking) {
            const { error: insertError } = await supabase
                .from('bookings')
                .insert({
                    game_id: gameId,
                    user_id: userId,
                    status: 'paid',
                    note: note // Save note
                });

            if (insertError) {
                console.error("Supabase Insert Error:", insertError);
                // We continue anyway, as payment was successful. 
                // In a real app we might log this to a monitoring service.
            }
        }

        return (
            <div className="min-h-screen bg-pitch-black flex flex-col items-center justify-center text-white px-4">
                <div className="bg-pitch-card border border-white/10 p-8 rounded-sm max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-pitch-accent" />

                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-pitch-accent/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-pitch-accent" />
                        </div>
                    </div>

                    <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter mb-2">
                        You're In!
                    </h1>
                    <p className="text-pitch-secondary mb-8">
                        Payment successful. Your spot on the roster is confirmed.
                    </p>

                    <Link
                        href="/"
                        className="inline-block w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                    >
                        Back to Pitch
                    </Link>
                </div>
            </div>
        );

    } catch (err) {
        console.error("Success Page Error:", err);
        return (
            <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-gray-400 mb-4">Please contact support with your Session ID: {sessionId.slice(-8)}</p>
                    <Link href="/" className="text-pitch-accent hover:underline">Return Home</Link>
                </div>
            </div>
        );
    }
}
