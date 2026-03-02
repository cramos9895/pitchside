'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FacilityCalendar as CalendarUI, BookingEvent } from '@/components/facility/FacilityCalendar';
import { Loader2 } from 'lucide-react';
import { AdminClaimModal } from '@/components/admin/AdminClaimModal';
import { useRouter } from 'next/navigation';

interface SharedCalendarProps {
    initialFacilityId?: string;
    facilityName?: string;
    readOnly?: boolean;
    isMasterView?: boolean;
}

export function FacilityCalendar({
    initialFacilityId,
    facilityName = 'Unknown Facility',
    readOnly = false,
    isMasterView = false
}: SharedCalendarProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [resources, setResources] = useState<any[]>([]);
    const [events, setEvents] = useState<BookingEvent[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const router = useRouter();

    // Context State
    const [activeFacilityId, setActiveFacilityId] = useState<string | undefined>(initialFacilityId);

    // Modal State
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; resourceId?: string } | null>(null);

    // Derive context if not provided (Facility Admin Portal)
    useEffect(() => {
        if (initialFacilityId) {
            setActiveFacilityId(initialFacilityId);
            return;
        }

        async function fetchUserFacility() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('facility_id')
                    .eq('id', user.id)
                    .single();
                if (profile?.facility_id) {
                    setActiveFacilityId(profile.facility_id);
                }
            }
        }
        fetchUserFacility();
    }, [initialFacilityId]);

    useEffect(() => {
        if (!activeFacilityId) return;

        async function fetchFacilityData() {
            setIsLoading(true);
            const supabase = createClient();

            // 1. Fetch facility resources
            const { data: resourcesData, error: resourceError } = await supabase
                .from('resources')
                .select(`id, name, resource_type_id, resource_types (name, default_hourly_rate)`)
                .eq('facility_id', activeFacilityId)
                .order('name');

            if (resourceError) {
                console.error("Error fetching resources:", resourceError);
                setIsLoading(false);
                return;
            }

            const mappedResources = (resourcesData || []).map((r: any) => ({
                id: r.id,
                title: r.name,
                resource_type_id: r.resource_type_id,
                resource_types: r.resource_types
            }));

            // 2. Fetch existing bookings
            const { data: bookingsData, error: bookingError } = await supabase
                .from('resource_bookings')
                .select('*')
                .eq('facility_id', activeFacilityId)
                .neq('status', 'cancelled');

            if (bookingError) {
                console.error("Error fetching bookings:", bookingError);
                setIsLoading(false);
                return;
            }

            const mappedEvents: BookingEvent[] = (bookingsData || []).map((b: any) => ({
                id: b.id,
                title: b.title,
                start: new Date(b.start_time),
                end: new Date(b.end_time),
                resourceId: b.resource_id,
                renterName: b.renter_name,
                status: b.status,
                color: b.color
            }));

            setResources(mappedResources);
            setEvents(mappedEvents);
            setIsLoading(false);
        }

        fetchFacilityData();

        if (!activeFacilityId) return;

        const supabase = createClient();
        const channel = supabase
            .channel('bookings_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resource_bookings',
                    filter: `facility_id=eq.${activeFacilityId}`
                },
                () => {
                    fetchFacilityData();
                    router.refresh();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeFacilityId, refreshKey, router]);

    const handleAdminSlotSelect = (slotInfo: any) => {
        if (!isMasterView) return;
        const resourceId = slotInfo.resourceId;
        setSelectedSlot({
            start: slotInfo.start,
            end: slotInfo.end,
            resourceId: typeof resourceId === 'string' ? resourceId : undefined
        });
        setIsClaimModalOpen(true);
    };

    const refreshFeed = () => {
        setRefreshKey(prev => prev + 1);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-24 bg-black/40 border border-white/5 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
            </div>
        );
    }

    if (resources.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 font-medium bg-black/50 border border-white/5 rounded-lg h-[800px] flex items-center justify-center">
                This facility currently has no active resources (fields, courts, etc) registered in the system.
            </div>
        );
    }

    return (
        <>
            <CalendarUI
                resources={resources}
                initialEvents={events}
                isAdminOverride={isMasterView}
                onAdminSlotSelect={handleAdminSlotSelect}
            />
            {isMasterView && (
                <AdminClaimModal
                    isOpen={isClaimModalOpen}
                    onClose={() => {
                        setIsClaimModalOpen(false);
                        setSelectedSlot(null);
                    }}
                    selectedSlot={selectedSlot}
                    resources={resources}
                    facilityName={facilityName}
                    facilityId={activeFacilityId!}
                    onSuccess={refreshFeed}
                />
            )}
            <style jsx global>{`
                /* Deep UI Overrides for the White Column */
                .rbc-time-view .rbc-time-gutter {
                    background-color: #0f172a !important; /* slate-900 */
                    border-right: 1px solid #1e293b !important; /* slate-800 */
                }
                .rbc-time-view .rbc-time-header-gutter,
                .rbc-header {
                    background-color: transparent !important;
                    background: transparent !important;
                    /* Fix white borders on Resource Headers */
                    border-color: #1e293b !important; /* slate-800 */
                    border-bottom: 1px solid #1e293b !important;
                    color: #e2e8f0 !important; /* slate-200 text */
                }
                .rbc-time-header-content {
                    border-color: #1e293b !important; /* slate-800 */
                    border-bottom: 1px solid #1e293b !important;
                    color: #e2e8f0 !important; /* slate-200 text */
                }
                .rbc-time-header-cell {
                    background-color: #0f172a !important; /* slate-900 */
                }
                .rbc-timeslot-group {
                    background-color: #0f172a !important;
                    border-bottom: 1px solid #1e293b !important;
                }
                .rbc-day-slot .rbc-time-slot {
                    border-top: 1px solid #1e293b !important;
                }
                .rbc-time-view .rbc-header-gutter {
                    background-color: transparent !important;
                    width: auto !important;
                }
            `}</style>
        </>
    );
}
