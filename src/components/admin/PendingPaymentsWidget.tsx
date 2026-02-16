'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, DollarSign, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface PendingPayment {
    id: string; // booking_id
    user_id: string;
    game_id: string;
    payment_amount: number;
    payment_method: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    } | null;
    games: {
        title: string;
        start_time: string;
    } | null;
}

export function PendingPaymentsWidget() {
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<string | null>(null); // booking_id or 'all'

    const supabase = createClient();
    const router = useRouter();
    const { success, error: toastError } = useToast();

    const fetchPending = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id, 
                    user_id, 
                    game_id, 
                    payment_amount, 
                    payment_method, 
                    created_at,
                    profiles(full_name, email),
                    games(title, start_time)
                `)
                .eq('payment_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }
            setPayments(data as any);
        } catch (err: any) {
            console.error("Error fetching pending payments:", err.message || err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();

        // Subscribe to changes on bookings to auto-refresh
        const channel = supabase
            .channel('pending-payments-widget')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings'
                },
                () => {
                    fetchPending();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const verifyPayment = async (bookingId: string) => {
        setVerifying(bookingId);
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ payment_status: 'verified' })
                .eq('id', bookingId);

            if (error) throw error;

            success("Payment Verified");
            setPayments(prev => prev.filter(p => p.id !== bookingId));
            router.refresh();
        } catch (err: any) {
            toastError(err.message);
        } finally {
            setVerifying(null);
        }
    };

    const verifyAll = async () => {
        if (!payments.length) return;
        if (!confirm(`Are you sure you want to verify all ${payments.length} pending payments?`)) return;

        setVerifying('all');
        try {
            const ids = payments.map(p => p.id);
            const { error } = await supabase
                .from('bookings')
                .update({ payment_status: 'verified' })
                .in('id', ids);

            if (error) throw error;

            success(`All ${payments.length} payments verified!`);
            setPayments([]);
            router.refresh();
        } catch (err: any) {
            toastError(err.message);
        } finally {
            setVerifying(null);
        }
    };

    if (loading) return <div className="h-32 flex items-center justify-center text-gray-500 animate-pulse">Checking for pending payments...</div>;

    if (payments.length === 0) return null; // Hide if empty, or show empty state? Let's hide to keep dashboard clean

    return (
        <div className="mb-12 border border-yellow-500/30 bg-yellow-500/5 rounded-sm overflow-hidden animate-in slide-in-from-top-4">
            <div className="p-4 border-b border-yellow-500/20 bg-yellow-500/10 flex items-center justify-between">
                <h3 className="font-bold text-yellow-500 flex items-center gap-2 uppercase tracking-wider">
                    <AlertCircle className="w-5 h-5" />
                    {payments.length} Pending Payments
                </h3>
                <button
                    onClick={verifyAll}
                    disabled={!!verifying}
                    className="flex items-center gap-2 px-3 py-1 bg-yellow-500 text-black font-bold text-xs uppercase rounded hover:bg-white transition-colors disabled:opacity-50"
                >
                    {verifying === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Verify All
                </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left">
                    <tbody className="divide-y divide-yellow-500/10">
                        {payments.map(item => {
                            const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                            const game = Array.isArray(item.games) ? item.games[0] : item.games;
                            const name = profile?.full_name || 'Unknown User';
                            const gameTitle = game?.title || 'Unknown Game';

                            return (
                                <tr key={item.id} className="hover:bg-yellow-500/5 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white text-sm">{name}</div>
                                        <div className="text-xs text-gray-500 uppercase">{item.payment_method}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-gray-300 font-medium truncate max-w-[150px]">{gameTitle}</div>
                                        <Link href={`/admin/games/${item.game_id}`} className="text-[10px] text-pitch-accent hover:underline flex items-center gap-1">
                                            View Roster <ArrowRight className="w-2 h-2" />
                                        </Link>
                                    </td>
                                    <td className="p-4 text-right font-mono text-white">
                                        ${item.payment_amount}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => verifyPayment(item.id)}
                                            disabled={!!verifying}
                                            className="p-2 text-yellow-500 hover:text-green-500 hover:bg-white/5 rounded transition-colors disabled:opacity-30"
                                            title="Verify Payment"
                                        >
                                            {verifying === (item.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
