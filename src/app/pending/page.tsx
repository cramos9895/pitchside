import { LogOut, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Account Verification | Pitch Side',
    description: 'Your account is under review',
};

export default async function PendingVerificationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If they aren't logged in, they shouldn't be here
    if (!user) {
        redirect('/login');
    }

    // Get their profile to check their verification status
    const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .single();

    // If they are actually verified, send them to the dashboard so they aren't stuck
    if (profile?.verification_status === 'verified') {
        redirect('/');
    }

    // Handle the sign out explicitly here as a server action
    async function signOutUser() {
        'use server';
        const supabase = await createClient();
        await supabase.auth.signOut();
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-pitch-black flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Background Stylings */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-pitch-accent/10 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] opacity-30 mix-blend-screen" />
            </div>

            <div className="w-full max-w-lg bg-pitch-card/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Glow Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pitch-accent via-blue-500 to-pitch-accent"></div>

                <div className="p-10 space-y-8 flex flex-col items-center text-center">

                    <div className="w-20 h-20 bg-pitch-black border-2 border-orange-500/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                        <ShieldAlert className="w-10 h-10 text-orange-400" />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-4xl font-heading font-black italic uppercase tracking-tight text-white">
                            Account Under Review
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed font-medium">
                            Thank you for applying to join <span className="text-pitch-accent font-bold">Pitch Side</span>. Our team is currently reviewing your application and verifying your facility's details.
                        </p>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-6 rounded-lg w-full text-sm text-gray-400">
                        We will notify you via the email address registered to your account once you have been approved and your portal has been activated.
                    </div>

                    <div className="pt-4 w-full">
                        <form action={signOutUser} className="w-full">
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                            >
                                <LogOut className="w-5 h-5" />
                                Sign Out / Use Different Account
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
