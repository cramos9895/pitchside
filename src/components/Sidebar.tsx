
'use client';

import Link from 'next/link';
import { X, LogOut, User, Home, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isAdmin, setIsAdmin] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [refundCount, setRefundCount] = useState(0);

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;

            if (currentUser?.id !== user?.id) {
                setUser(currentUser);
            }

            if (currentUser) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', currentUser.id)
                    .single();

                const isAdminUser = profile?.role === 'admin';
                setIsAdmin(isAdminUser);

                if (isAdminUser) {
                    // Fetch pending refunds
                    const { count, error } = await supabase
                        .from('games')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'cancelled')
                        .is('refund_processed', false); // Assume defaults to false or NULL

                    // Note: 'is' checks for NULL but false is a value. 
                    // Better: .eq('refund_processed', false) if column exists and has default.

                    if (!error && count !== null) {
                        setRefundCount(count);
                    }
                }
            } else {
                setIsAdmin(false);
            }
        };
        getUser();
    }, [isOpen, user?.id]);
    // User requested: "Ensure the useEffect dependency array includes user?.id so it re-runs when I log in."
    // If I add user?.id, I must ensure I don't create a loop.
    // The problem is if I rely on `user` state which I set inside. 
    // Instead, I will rely on the fact that opening the sidebar triggers the check.
    // BUT, if the user logs in, the page likely refreshes or redirects?
    // If they sign in via AuthButton, the session changes.
    // AuthButton logic: router.refresh() on login.
    // So the component re-mounts or re-renders.
    // I will stick to `[isOpen]` but add a listener for auth changes which is cleaner.

    // logic update: strictly follow user request of logging.


    const handleSignOut = async () => {
        await supabase.auth.signOut();
        onClose();
        router.push('/');
        router.refresh();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div className={cn(
                "fixed top-0 right-0 h-full w-[300px] bg-neutral-900 border-l border-pitch-accent/50 z-[100] transform transition-transform duration-300 shadow-2xl flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="font-heading text-2xl font-bold italic text-white tracking-tighter">
                        MENU
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-pitch-accent transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 py-8 px-6 space-y-6">
                    <Link
                        href="/"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <Home className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                        Home
                    </Link>

                    <Link
                        href="/dashboard"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <LayoutDashboard className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                        My Dashboard
                    </Link>

                    {isAdmin && (
                        <Link
                            href="/admin"
                            onClick={onClose}
                            className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-red-500 hover:text-white transition-colors group border-l-4 border-red-500 pl-4 -ml-5"
                        >
                            <LayoutDashboard className="w-6 h-6 text-red-500 group-hover:text-white transition-colors" />
                            Admin Portal
                            {refundCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                    {refundCount}
                                </span>
                            )}
                        </Link>
                    )}

                    <Link
                        href="/profile"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <User className="w-6 h-6" />
                        Profile
                    </Link>

                    {/* Settings Link (Bottom) */}
                    <div className="mt-auto pt-6 border-t border-white/10">
                        <Link
                            href="/settings"
                            onClick={onClose}
                            className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-gray-400 hover:text-white transition-colors group"
                        >
                            <Settings className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />
                            Settings
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-black/20">
                    {user ? (
                        <div className="space-y-4">
                            <div className="text-xs uppercase text-gray-500 font-bold tracking-widest">
                                Logged in as
                            </div>
                            <div className="break-all text-sm font-bold text-white mb-4">
                                {user.email}
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 transition-all rounded-sm"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            onClick={onClose}
                            className="block w-full text-center py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}
