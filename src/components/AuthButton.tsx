
'use client';

import Link from 'next/link';
import { useEffect, useState, startTransition, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlobalPassportModal } from '@/components/public/checkin/GlobalPassportModal';

export function AuthButton() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);
    const [passportOpen, setPassportOpen] = useState(false);
    const router = useRouter();
    const prevUserId = useRef<string | null>(null);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUser = user ?? null;
            setUser(currentUser);
            prevUserId.current = currentUser?.id ?? null;
            
            if (currentUser) {
                const { data } = await supabase.from('profiles').select('first_name, last_name').eq('id', currentUser.id).single();
                setProfile(data);
            } else {
                setProfile(null);
            }
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: any, session: any) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                
                if (currentUser) {
                    const { data } = await supabase.from('profiles').select('first_name, last_name').eq('id', currentUser.id).single();
                    setProfile(data);
                } else {
                    setProfile(null);
                }

                if (event === 'SIGNED_OUT') {
                    prevUserId.current = null;
                    startTransition(() => {
                        router.refresh();
                    });
                } else if (event === 'SIGNED_IN') {
                    if (currentUser && prevUserId.current !== currentUser.id) {
                        prevUserId.current = currentUser.id;
                        startTransition(() => {
                            router.refresh();
                        });
                    }
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [router, supabase.auth]);

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } finally {
            // Trigger the native server-authoritative logout route
            window.location.href = '/auth/logout';
        }
    };

    if (!user) {
        return (
            <div className="flex gap-2 sm:gap-4">
                <Link href="/login" className="px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold uppercase tracking-wider hover:text-pitch-accent transition-colors">
                    Login
                </Link>
                <Link href="/signup" className="px-3 py-1.5 sm:px-5 sm:py-2 bg-white text-pitch-black text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-pitch-accent hover:text-pitch-black transition-colors rounded-sm">
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
                <span className="hidden md:inline">
                    {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (user.email?.split('@')[0])}
                </span>
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
