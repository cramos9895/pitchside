
'use client';

import Link from 'next/link';
import { X, LogOut, User, Home, LayoutDashboard, Settings, Trophy, Building, Bell, MapPin, ClipboardList, Calendar } from 'lucide-react';
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
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    const [isFacilityAdmin, setIsFacilityAdmin] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [refundCount, setRefundCount] = useState(0);
    const [notificationCount, setNotificationCount] = useState(0);

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
                    .select('role, system_role')
                    .eq('id', currentUser.id)
                    .single();

                const role = profile?.role;
                const systemRole = profile?.system_role;
                // We treat facility admins as regular players essentially in the main app, but they have their own portal.
                const isAdminUser = role === 'host' || role === 'master_admin';
                setIsAdmin(isAdminUser);
                setIsMasterAdmin(role === 'master_admin');
                setIsFacilityAdmin(systemRole === 'facility_admin' || systemRole === 'super_admin' || role === 'master_admin');

                if (isAdminUser) {
                    // Fetch pending refunds
                    const { count: refunds, error: refundError } = await supabase
                        .from('games')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'cancelled')
                        .is('refund_processed', false);

                    if (!refundError && refunds !== null) {
                        setRefundCount(refunds);
                    }
                }

                if (currentUser) {
                    // Fetch unread notifications
                    const { count: notifications, error: notifError } = await supabase
                        .from('notifications')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', currentUser.id)
                        .is('is_read', false);

                    if (!notifError && notifications !== null) {
                        setNotificationCount(notifications);
                    }
                }
            } else {
                setIsAdmin(false);
                setIsMasterAdmin(false);
                setIsFacilityAdmin(false);
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
                <div className="flex-1 py-8 px-6 space-y-6 overflow-y-auto">
                    <Link
                        href="/"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <Home className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                        Home
                    </Link>

                    <Link
                        href="/facilities"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <MapPin className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                        Locations
                    </Link>

                    <Link
                        href="/schedule"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <Calendar className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                        Event Hub
                    </Link>

                    {user && (
                        <Link
                            href="/dashboard"
                            onClick={onClose}
                            className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                        >
                            <LayoutDashboard className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                            My Dashboard
                        </Link>
                    )}

                    <Link
                        href="/leaderboard"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <Trophy className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                        Leaderboard
                    </Link>

                    <Link
                        href="/free-agents"
                        onClick={onClose}
                        className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-white hover:text-pitch-accent transition-colors group"
                    >
                        <User className="w-6 h-6 text-gray-500 group-hover:text-pitch-accent transition-colors" />
                        Free Agent Pool
                    </Link>

                    {isFacilityAdmin && !isMasterAdmin && (
                        <>
                            <Link
                                href="/facility"
                                onClick={onClose}
                                className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-blue-400 hover:text-white transition-colors group border-l-4 border-blue-400 pl-4 -ml-5 mt-4"
                            >
                                <Building className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                                Facility Portal
                            </Link>

                            <Link
                                href="/facility/operations"
                                onClick={onClose}
                                className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-pitch-accent hover:text-white transition-colors group border-l-4 border-pitch-accent pl-4 -ml-5 mt-4"
                            >
                                <ClipboardList className="w-6 h-6 text-pitch-accent group-hover:text-white transition-colors" />
                                Game Day
                            </Link>

                            {/* Notification Hub */}
                            <Link
                                href="/facility/notifications"
                                onClick={onClose}
                                className="flex items-center gap-4 text-xl font-heading font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors group border-l-4 border-transparent hover:border-white pl-4 -ml-5"
                            >
                                <div className="relative">
                                    <Bell className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                                    {notificationCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-pitch-accent text-black text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-[0_0_10px_rgba(204,255,0,0.5)]">
                                            {notificationCount}
                                        </span>
                                    )}
                                </div>
                                Notifications
                            </Link>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <Link
                                href="/admin"
                                onClick={onClose}
                                className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-red-500 hover:text-white transition-colors group border-l-4 border-red-500 pl-4 -ml-5"
                            >
                                <LayoutDashboard className="w-6 h-6 text-red-500 group-hover:text-white transition-colors" />
                                {isMasterAdmin ? 'Master Portal' : 'Host Portal'}
                                {refundCount > 0 && (
                                    <span className="ml-2 bg-red-500 text-white text-[12px] font-sans not-italic font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                        {refundCount}
                                    </span>
                                )}
                            </Link>
                        </>
                    )}



                    {/* Settings Link (Bottom) */}
                    <div className="mt-auto pt-6 border-t border-white/10">
                        <Link
                            href="/settings"
                            onClick={onClose}
                            className="flex items-center gap-4 text-3xl font-heading font-bold uppercase italic text-gray-400 hover:text-white transition-colors group"
                        >
                            <Settings className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />
                            My Settings
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
            </div >
        </>
    );
}
