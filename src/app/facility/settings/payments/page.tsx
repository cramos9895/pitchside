import { CreditCard, DollarSign, CheckCircle, ShieldAlert, BadgeInfo } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ConnectStripeButton } from '@/components/facility/ConnectStripeButton';
import Link from 'next/link';

export default async function FacilityPaymentsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams;
    const error = resolvedSearchParams.error as string;
    const success = resolvedSearchParams.success as string;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let facility = null;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('facility_id')
            .eq('id', user.id)
            .single();

        if (profile?.facility_id) {
            const { data: f } = await supabase
                .from('facilities')
                .select('id, stripe_account_id, charges_enabled')
                .eq('id', profile.facility_id)
                .single();

            facility = f;
        }
    }

    if (!facility) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="p-8 text-center bg-black/40 border border-white/5 rounded-lg text-gray-400">
                    Unable to load facility payment data. Please ensure you are assigned to a facility.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3 text-white">
                        <DollarSign className="w-8 h-8 text-pitch-accent" />
                        Payouts & Billing
                    </h1>
                    <p className="text-gray-400 mt-2 max-w-2xl">
                        Manage your financial integration with PitchSide. Connect your bank account securely via Stripe to start receiving payouts for public bookings.
                    </p>
                </div>
            </div>

            {/* Status Messages from OAuth Returns */}
            {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                        <h3 className="text-red-400 font-bold uppercase tracking-wider text-sm">Connection Error</h3>
                        <p className="text-red-300 text-sm mt-0.5">
                            {error === 'missing_facility' && 'Facility context was lost.'}
                            {error === 'no_account_linked' && 'Unable to verify Stripe onboarding ticket.'}
                            {error === 'callback_failed' && 'An unexpected error occurred during the callback.'}
                            {error === 'link_expired' && 'The onboarding session was interrupted or expired.'}
                        </p>
                    </div>
                </div>
            )}

            {success === 'stripe_connected' && facility.charges_enabled && (
                <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                        <h3 className="text-green-400 font-bold uppercase tracking-wider text-sm">Success</h3>
                        <p className="text-green-300 text-sm mt-0.5">Your Stripe Express account is successfully connected. Payouts are active.</p>
                    </div>
                </div>
            )}

            {/* Dashboard Connection Status */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${facility.charges_enabled ? 'bg-pitch-accent/20 text-pitch-accent' : 'bg-white/5 text-gray-500'}`}>
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                                    Stripe Express
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${facility.charges_enabled ? 'bg-pitch-accent animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.6)]' : 'bg-gray-600'}`}></div>
                                    <span className={`text-sm font-medium uppercase tracking-wide ${facility.charges_enabled ? 'text-pitch-accent' : 'text-gray-500'}`}>
                                        {facility.charges_enabled ? 'Payouts Active' : 'Not Connected'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {!facility.charges_enabled ? (
                            <p className="text-gray-400 text-sm max-w-lg">
                                You must connect a Stripe Express account to accept paid bookings on the public PitchSide marketplace. Stripe handles all KYC logic and will deposit funds directly into your bank account.
                            </p>
                        ) : (
                            <div className="bg-black/40 border border-white/5 rounded-lg p-4 mt-4 max-w-md">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400 text-sm">Account ID</span>
                                    <span className="text-white font-mono text-sm tracking-wider">{facility.stripe_account_id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">Platform Fee</span>
                                    <span className="text-white font-bold text-sm">5.0%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 flex flex-col items-start md:items-end gap-3">
                        {!facility.charges_enabled ? (
                            <ConnectStripeButton />
                        ) : (
                            <p className="text-sm text-gray-400 flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                                <BadgeInfo className="w-4 h-4 text-pitch-secondary" />
                                Managed via Stripe Dashboard
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-white/10">
                <Link href="/facility/settings" className="text-pitch-secondary hover:text-white transition-colors text-sm font-medium uppercase tracking-wider">
                    &larr; Back to Settings
                </Link>
            </div>
        </div>
    );
}
