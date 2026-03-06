import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChevronLeft, MapPin, Clock, CalendarDays, Link as LinkIcon, Users, UserCheck } from 'lucide-react';
import Link from 'next/link';

// Simple Copy Button Client Component
import { CopyButton } from './CopyButton';

export const dynamic = 'force-dynamic';

export default async function BookingDetailsPage({ params }: { params: { bookingId: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Since our IDs in schedule are prefixed like 'rental-uuid' or 'game-uuid', we need to strip it.
    // Wait, the Next.js router might just get the raw UUID if we linked it directly.
    // Let's assume the ID is the raw UUID of the resource_booking for now.
    const bookingId = params.bookingId.replace('rental-', ''); // Just in case

    // 1. Fetch the Booking and Facility Details
    const { data: booking, error: bookingError } = await supabase
        .from('resource_bookings')
        .select(`
            *,
            facility:facilities(id, name, address),
            resource:resources(title)
        `)
        .eq('id', bookingId)
        .single();

    if (bookingError || !booking) {
        return (
            <div className="text-center py-24 text-white">
                <h1 className="text-2xl font-bold mb-2 text-red-500">Booking Not Found</h1>
                <p className="text-pitch-secondary mb-6">We couldn't locate this facility rental.</p>
                <Link href="/dashboard/schedule" className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded font-bold uppercase text-sm transition-colors">
                    Back to Schedule
                </Link>
            </div>
        );
    }

    // Determine the actual group ID. If it's a recurring series, the roster is tied to the group.
    // If it's a single booking, the roster is tied to this specific booking ID.
    const groupId = booking.recurring_group_id || booking.id;

    // 2. Fetch the existing Roster
    const { data: roster, error: rosterError } = await supabase
        .from('booking_rosters')
        .select(`
            id,
            joined_at,
            profile:profiles(id, full_name)
        `)
        .eq('booking_group_id', groupId)
        .order('joined_at', { ascending: true });

    // Ensure the Captain is at least listed visually even if they didn't explicitly "join" the DB table.
    const captainName = booking.renter_name || "Captain";

    // Construct the invite link using the actual group ID
    // Need to use process.env to generate the full URL for the copy button
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${groupId}`;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-white max-w-4xl">
            {/* Header / Back */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <Link href="/dashboard/schedule" className="p-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{booking.facility?.name} Rental</h1>
                    <p className="text-pitch-secondary text-sm flex items-center gap-2 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.facility?.address || 'Location Details'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Col: Details */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-pitch-card border border-white/5 rounded-lg p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-4 border-b border-white/5 pb-2">Booking Info</h3>

                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Resource</span>
                                <div className="font-bold flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-green-400" />
                                    {booking.resource?.title}
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Date</span>
                                <div className="font-medium flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-pitch-accent" />
                                    {new Date(booking.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Time</span>
                                <div className="font-medium flex items-center gap-2 text-gray-300">
                                    <Clock className="w-4 h-4 text-pitch-secondary" />
                                    {new Date(booking.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Status</span>
                                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border bg-green-500/10 text-green-400 border-green-500/20">
                                    {booking.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Roster & Invites */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-pitch-card border border-white/5 rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-4">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-pitch-accent" />
                                    Team Roster
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    All players must join the roster to securely sign the facility waiver.
                                </p>
                            </div>

                            {/* Invite Link Tool */}
                            <div className="shrink-0 flex items-center gap-2 bg-black/40 border border-white/10 rounded-md p-2">
                                <LinkIcon className="w-4 h-4 text-gray-500" />
                                <div className="text-xs font-mono text-gray-400 w-32 sm:w-48 truncate">
                                    {inviteLink}
                                </div>
                                <CopyButton text={inviteLink} />
                            </div>
                        </div>

                        {/* Roster List */}
                        <div className="space-y-2">
                            {/* The Captain */}
                            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-pitch-accent/20 flex items-center justify-center text-pitch-accent font-bold text-sm">
                                        {captainName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold">{captainName}</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-pitch-accent px-2 py-1 bg-pitch-accent/10 border border-pitch-accent/20 rounded">
                                    Captain
                                </span>
                            </div>

                            {/* The Invited Players */}
                            {roster && roster.map((player: any) => (
                                <div key={player.id} className="flex items-center justify-between p-3 bg-transparent border border-white/5 rounded-md hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300 font-bold text-sm">
                                            {player.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <span className="font-medium text-gray-200">{player.profile?.full_name || 'Unknown Player'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-green-400" />
                                        <span className="text-[10px] uppercase font-bold text-green-400 hidden sm:inline">Verified</span>
                                    </div>
                                </div>
                            ))}

                            {(!roster || roster.length === 0) && (
                                <div className="py-8 text-center border border-dashed border-white/10 rounded-md bg-black/20">
                                    <p className="text-sm text-gray-500">No teammates have joined the roster yet.</p>
                                    <p className="text-xs text-gray-600 mt-1">Copy the link above and send it to your team.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
