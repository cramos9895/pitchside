'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, ChevronRight, X, UserCheck, UserX, QrCode } from 'lucide-react';
import { toggleCheckIn } from '@/app/actions/facility';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

interface OperationsCheckInProps {
    bookings: any[];
    facilityId: string;
}

export default function OperationsCheckIn({ bookings, facilityId }: OperationsCheckInProps) {
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [roster, setRoster] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (!selectedEvent) return;

        const fetchRoster = async () => {
            setIsLoading(true);

            // Note: recurrings might use recurring_group_id, singles use id.
            const groupId = selectedEvent.recurring_group_id || selectedEvent.id;

            const { data: rosterData } = await supabase
                .from('booking_rosters')
                .select(`
                    id,
                    user_id,
                    is_checked_in,
                    profiles:user_id ( full_name, email )
                `)
                .eq('booking_group_id', groupId);

            if (rosterData) {
                // Fetch waiver status for these users across the facility
                const userIds = rosterData.map(r => r.user_id);
                const { data: waiverData } = await supabase
                    .from('waiver_signatures')
                    .select('user_id')
                    .eq('facility_id', facilityId)
                    .in('user_id', userIds);

                const signedIds = new Set(waiverData?.map(w => w.user_id) || []);

                // Add Captain if they aren't explicitly in the roster data yet
                const enrichedRoster = rosterData.map(r => ({
                    ...r,
                    has_signed: signedIds.has(r.user_id)
                }));

                setRoster(enrichedRoster);
            }
            setIsLoading(false);
        };

        fetchRoster();

        // Setup realtime listener for walk-ups
        const groupId = selectedEvent.recurring_group_id || selectedEvent.id;
        const channel = supabase.channel(`roster_${groupId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_rosters', filter: `booking_group_id=eq.${groupId}` }, () => {
                fetchRoster(); // Reload on any changes (like walk up finishing)
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedEvent, facilityId, supabase]);

    const handleToggleCheckIn = async (rosterId: string, currentStatus: boolean) => {
        // Optimistic UI Update
        setRoster(prev => prev.map(p => p.id === rosterId ? { ...p, is_checked_in: !currentStatus } : p));
        await toggleCheckIn(rosterId, currentStatus);
    };

    if (selectedEvent) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pitchside.io';
        const inviteUrl = `${origin}/invite/${selectedEvent.recurring_group_id || selectedEvent.id}`;

        return (
            <div className="fixed inset-0 z-[100] bg-pitch-black flex flex-col md:relative md:inset-auto md:bg-transparent md:block md:z-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Mobile Header */}
                <div className="bg-pitch-card border-b border-white/10 p-4 sticky top-0 z-10 flex items-center justify-between shadow-xl">
                    <button onClick={() => { setSelectedEvent(null); setShowQR(false); }} className="text-gray-400 p-2 -ml-2 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-white font-black italic uppercase truncate px-4 flex-1 text-center text-lg">
                        {selectedEvent.title}
                    </h2>
                    <div className="w-10"></div> {/* Spacer for centering */}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 md:mt-4 pb-24 md:pb-6 relative bg-pitch-card/50 md:bg-transparent md:border md:border-white/10 md:rounded-lg">

                    {!showQR ? (
                        <>
                            <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider text-gray-400 mb-6 bg-black/60 p-4 rounded-lg border border-white/5 shadow-inner">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-pitch-accent" />
                                    {format(new Date(selectedEvent.start_time), 'h:mm a')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-400" />
                                    {selectedEvent.resource?.name || 'Facility'}
                                </div>
                            </div>

                            <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-4">Player Check-In Roster</h3>

                            {isLoading ? (
                                <div className="animate-pulse space-y-3">
                                    {[1, 2, 3].map(i => <div key={i} className="h-[72px] bg-white/5 rounded-lg border border-white/10"></div>)}
                                </div>
                            ) : roster.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 italic border border-dashed border-white/10 rounded-lg">No players have joined this specific roster yet.</div>
                            ) : (
                                <div className="space-y-3">
                                    {roster.map(player => (
                                        <div key={player.id} className={`p-4 rounded-lg flex items-center justify-between shadow-md transition-colors border ${player.is_checked_in ? 'bg-pitch-accent/10 border-pitch-accent/30' : 'bg-pitch-card border-white/10'}`}>
                                            <div>
                                                <div className="text-white font-bold text-lg">{player.profiles?.full_name || 'Unknown Player'}</div>
                                                <div className="text-[10px] uppercase font-bold tracking-wider mt-1">
                                                    {player.has_signed ? (
                                                        <span className="text-green-400 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Waiver Verified</span>
                                                    ) : (
                                                        <span className="text-red-400 flex items-center gap-1.5"><UserX className="w-3.5 h-3.5" /> Action Required</span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleToggleCheckIn(player.id, player.is_checked_in)}
                                                className={`w-14 h-8 rounded-full transition-colors relative shadow-inner flex shrink-0 ${player.is_checked_in ? 'bg-pitch-accent' : 'bg-black/60 border border-white/20'}`}
                                            >
                                                <div className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white transition-all shadow-md ${player.is_checked_in ? 'right-1' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Walk-Up Button */}
                            <button
                                onClick={() => setShowQR(true)}
                                className="w-full mt-8 flex items-center justify-center gap-3 bg-gradient-to-r from-pitch-accent/80 to-pitch-accent hover:from-pitch-accent hover:to-pitch-accent/90 text-black font-black italic uppercase tracking-wider py-4 rounded-lg shadow-lg shadow-pitch-accent/20 transition-all hover:scale-[1.02]"
                            >
                                <QrCode className="w-5 h-5" /> Walk-Up Scan
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6 h-[80vh] md:h-auto text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                                <QrCode className="w-8 h-8 text-pitch-accent" />
                            </div>
                            <h3 className="text-2xl font-black italic uppercase text-white mb-3">Scan to Play</h3>
                            <p className="text-gray-400 mb-10 max-w-xs text-sm leading-relaxed">
                                Point your camera at this code to securely sign the facility waiver and join the game instantly.
                            </p>

                            <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(235,255,0,0.2)] ring-1 ring-white/20 mb-12">
                                <QRCodeSVG value={inviteUrl} size={240} level={"H"} includeMargin={false} />
                            </div>

                            <button
                                onClick={() => setShowQR(false)}
                                className="text-gray-400 font-bold uppercase tracking-widest text-sm hover:text-white flex items-center gap-2 transition-colors px-6 py-3 rounded-full hover:bg-white/10"
                            >
                                ← Return to Roster
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {bookings.map((booking) => (
                <div
                    key={booking.id}
                    onClick={() => setSelectedEvent(booking)}
                    className="bg-pitch-card border-l-4 border-l-pitch-accent border-y border-r border-white/5 p-5 rounded-r-lg shadow-md cursor-pointer hover:bg-white/5 transition-all group flex items-center justify-between hover:translate-x-1"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pitch-accent mb-1.5">
                            <Clock className="w-3.5 h-3.5" /> {format(new Date(booking.start_time), 'h:mm a')}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-pitch-accent transition-colors">{booking.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <MapPin className="w-4 h-4 text-blue-400/80" />
                            {booking.resource?.name || 'Facility Resource'}
                            {booking.renter_name && <span className="text-gray-600 truncate max-w-[120px]"> • {booking.renter_name}</span>}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center group-hover:bg-pitch-accent/20 transition-colors">
                        <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-pitch-accent transition-colors" />
                    </div>
                </div>
            ))}
        </div>
    );
}
