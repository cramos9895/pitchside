
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlobalPassportModal } from '@/components/public/checkin/GlobalPassportModal';

export function AuthButton() {
    const [user, setUser] = useState<User | null>(null);
    const [passportOpen, setPassportOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            const { data: authListener } = supabase.auth.onAuthStateChange(
                (event, session) => {
                    setUser(session?.user ?? null);
                    if (event === 'SIGNED_OUT') {
                        router.refresh();
                    }
                }
            );

            return () => {
                authListener.subscription.unsubscribe();
            };
        };

        getUser();
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    if (!user) {
        return (
            <div className="flex gap-4">
                <Link href="/login" className="px-5 py-2 text-sm font-bold uppercase tracking-wider hover:text-pitch-accent transition-colors">
                    Login
                </Link>
                <Link href="/signup" className="px-5 py-2 bg-white text-pitch-black text-sm font-bold uppercase tracking-wider hover:bg-pitch-accent hover:text-pitch-black transition-colors rounded-sm">
                    Sign Up
                </Link>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 sm:gap-4">
            <button 
                onClick={() => setPassportOpen(true)}
                className="flex items-center justify-center bg-white/5 border border-white/10 hover:border-pitch-accent hover:text-pitch-accent text-white rounded-full p-2 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] group"
                title="My Player Passport"
            >
                <QrCode className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-white hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-pitch-accent rounded-full flex items-center justify-center text-pitch-black">
                    <UserIcon className="w-4 h-4" />
                </div>
                <span className="hidden md:inline">{user.email?.split('@')[0]}</span>
            </Link>
            <button
                onClick={handleSignOut}
                className="text-pitch-secondary hover:text-white transition-colors"
                title="Sign Out"
            >
                <LogOut className="w-5 h-5" />
            </button>

            {passportOpen && <GlobalPassportModal userId={user.id} onClose={() => setPassportOpen(false)} />}
        </div>
    );
}
