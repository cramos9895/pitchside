import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarRange, MapPin, Clock, Users, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

// Waiver Check Client Component
import { WaiverGateway } from './WaiverGateway';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const groupId = params.id; // This is either the resource_booking.id OR recurring_booking_group.id

    // 1. Fetch Booking Details (Try Resource Bookings first as it's the most common)
    let facilityId: string | null = null;
    let facilityName: string | null = null;
    let resourceName: string | null = null;
    let startTime: string | null = null;
    let endTime: string | null = null;
    let captainName: string | null = null;

    // Try finding it as a single resource booking
    const { data: singleBooking } = await supabase
        .from('resource_bookings')
        .select('*, facility:facilities(id, name), resource:resources(title)')
        .eq('id', groupId)
        .single();

    if (singleBooking) {
        facilityId = singleBooking.facility?.id;
        facilityName = singleBooking.facility?.name;
        resourceName = singleBooking.resource?.title;
        startTime = singleBooking.start_time;
        endTime = singleBooking.end_time;
        captainName = singleBooking.renter_name;
    } else {
        // Try finding it as a recurring group
        const { data: groupBooking } = await supabase
            .from('recurring_booking_groups')
            .select('*, facility:facilities(id, name), profile:profiles(full_name)')
            .eq('id', groupId)
            .single();

        if (groupBooking) {
            facilityId = groupBooking.facility?.id;
            facilityName = groupBooking.facility?.name;
            resourceName = "Recurring Series";
            startTime = groupBooking.created_at; // Fallback, would need a join to get exact next series date
            captainName = groupBooking.profile?.full_name;
        }
    }

    if (!facilityId) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LinkIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Invalid Invite Link</h1>
                    <p className="text-gray-400 text-sm">This team roster invite does not exist or has expired.</p>
                    <Link href="/" className="inline-block mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 rounded font-bold uppercase text-sm transition-colors">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    // 2. Check Authentication
    const { data: { user } } = await supabase.auth.getUser();

    // If not logged in, they must create an account first to sign the waiver
    if (!user) {
        // Store the redirect so they come back here after signup
        redirect(`/signup?next=/invite/${groupId}`);
    }

    // 3. User is logged in. Check if they are already on the roster.
    const { data: existingRoster } = await supabase
        .from('booking_rosters')
        .select('id')
        .eq('booking_group_id', groupId)
        .eq('user_id', user.id)
        .single();

    const isAlreadyOnRoster = !!existingRoster;

    // 4. If not on roster, check their Waiver Status for this facility
    let hasSignedWaiver = false;
    if (!isAlreadyOnRoster) {
        const { data: waiverSig } = await supabase
            .from('waiver_signatures')
            .select('id')
            .eq('user_id', user.id)
            .eq('facility_id', facilityId)
            .single();

        hasSignedWaiver = !!waiverSig;
    }

    // Server Action for Joining the Roster
    async function joinRosterAction() {
        'use server';
        const supabaseServer = await createClient();
        const { data: { user } } = await supabaseServer.auth.getUser();
        if (!user) return;

        // Double check waiver status on the server side just to be safe
        const { data: waiverCheck } = await supabaseServer
            .from('waiver_signatures')
            .select('id')
            .eq('user_id', user.id)
            .eq('facility_id', facilityId)
            .single();

        if (!waiverCheck) return; // Silent fail if they somehow bypassed the UI

        // Insert into roster
        await supabaseServer.from('booking_rosters').insert({
            booking_group_id: groupId,
            user_id: user.id
        });

        redirect(`/dashboard/schedule`);
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-pitch-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

                {/* Header Banner */}
                <div className="bg-white/5 p-8 text-center border-b border-white/5">
                    <div className="w-16 h-16 bg-pitch-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-pitch-accent/30">
                        <Users className="w-8 h-8 text-pitch-accent" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">
                        You've Been Invited
                    </h1>
                    <p className="text-gray-400 text-sm">
                        <span className="text-white font-bold">{captainName || 'A captain'}</span> has invited you to join their roster.
                    </p>
                </div>

                {/* Booking Details */}
                <div className="p-6 space-y-4 bg-black/40">
                    <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                        <MapPin className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Facility</p>
                            <p className="font-bold text-sm">{facilityName}</p>
                            {resourceName && <p className="text-xs text-gray-400">{resourceName}</p>}
                        </div>
                    </div>

                    {startTime && (
                        <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                            <CalendarRange className="w-5 h-5 text-pitch-accent shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Date & Time</p>
                                <p className="font-bold text-sm">
                                    {new Date(startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                                {endTime && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        {new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Area */}
                <div className="p-6 pt-2 border-t border-white/5 bg-black/40">
                    {isAlreadyOnRoster ? (
                        <div className="text-center">
                            <div className="inline-block px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-sm font-bold uppercase tracking-widest mb-4">
                                Already Joined
                            </div>
                            <p className="text-xs text-gray-400 mb-4">You are already on this roster.</p>
                            <Link href="/dashboard/schedule" className="block w-full py-3 bg-white/10 hover:bg-white/20 text-center rounded font-bold uppercase text-sm transition-colors">
                                View My Schedule
                            </Link>
                        </div>
                    ) : (
                        <WaiverGateway
                            facilityId={facilityId}
                            facilityName={facilityName || 'the facility'}
                            hasSignedWaiver={hasSignedWaiver}
                            joinAction={joinRosterAction}
                        />
                    )}
                </div>

            </div>
        </div>
    );
}
