'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Receipt, Search, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardBillingPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        const fetchBilling = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Fetch all bookings (paid, unpaid, pending_contract)
                const { data: bData } = await supabase
                    .from('resource_bookings')
                    .select('*, facility:facilities(name), resource:resources(title)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (bData) {
                    // Extract group IDs to see if any are tied to Weekly terms
                    // For single bookings, recurring_group_id is null.
                    const groupIds = bData
                        .map((b: any) => b.recurring_group_id)
                        .filter((id: any) => id !== null);

                    const distinctGroupIds = Array.from(new Set(groupIds));
                    let contractsData: any[] = [];

                    if (distinctGroupIds.length > 0) {
                        const { data: cData } = await supabase
                            .from('recurring_booking_groups')
                            .select('*')
                            .in('id', distinctGroupIds);

                        if (cData) contractsData = cData;
                    }

                    // Map contracts down to transactions
                    const mappedTransactions = bData.map(booking => {
                        const contract = contractsData.find(c => c.id === booking.recurring_group_id);
                        return {
                            ...booking,
                            contract
                        };
                    });

                    setTransactions(mappedTransactions);
                }

            } catch (err) {
                console.error("Dashboard Billing Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBilling();
    }, [router, supabase]);

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold mb-1">Billing & Contracts</h2>
                    <p className="text-pitch-secondary text-sm">Review your payment history and active vaulted terms.</p>
                </div>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-16 bg-pitch-card border border-dashed border-white/10 rounded-lg">
                    <Receipt className="w-10 h-10 text-pitch-secondary mx-auto mb-3 opacity-50" />
                    <h3 className="font-bold mb-1">No Financial History</h3>
                    <p className="text-pitch-secondary text-sm">Your payment records will appear here.</p>
                </div>
            ) : (
                <div className="bg-pitch-card border flex flex-col border-white/10 rounded-lg shadow-sm overflow-hidden auto-x-scroll">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-black/20">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-pitch-secondary">Date Issued</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-pitch-secondary">Facility / Description</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-pitch-secondary">Event Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-pitch-secondary">Status</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-pitch-secondary">Terms</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                            {transactions.map((tx) => {
                                const isWeeklyAuto = tx.contract && tx.contract.payment_term === 'weekly';
                                const createdAt = new Date(tx.created_at);
                                const eventDate = new Date(tx.start_time);

                                return (
                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold">{tx.facility?.name}</div>
                                            <div className="text-sm text-pitch-secondary">{tx.resource?.title}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-pitch-secondary">
                                            {eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {tx.payment_status === 'paid' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                                    Paid
                                                </span>
                                            ) : tx.payment_status === 'unpaid' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                                    Unpaid
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/5 text-gray-300 border border-white/10">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            {isWeeklyAuto ? (
                                                <div className="flex items-center justify-end text-pitch-accent pt-1">
                                                    <RefreshCw className="w-4 h-4 mr-1 text-pitch-accent" />
                                                    <span className="font-bold text-xs uppercase tracking-widest text-pitch-accent bg-pitch-accent/10 border border-pitch-accent/20 px-2 py-1 rounded">Weekly Auto-Pay</span>
                                                </div>
                                            ) : (
                                                <span className="text-pitch-secondary font-bold uppercase text-xs tracking-wider">Standard</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
