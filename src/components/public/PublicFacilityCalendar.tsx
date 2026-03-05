'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event as CalendarEvent, Views, SlotInfo, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { CalendarToolbar } from '@/components/facility/CalendarToolbar';
import { PublicBookingModal } from './PublicBookingModal';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export interface AnonymousBookingEvent extends CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resourceId?: string;
    status: string;
    color: string;
}

interface FacilityResource {
    id: string;
    title: string;
    resource_type_id: string;
    default_hourly_rate?: number;
    resource_types?: { name: string };
}

interface PublicFacilityCalendarProps {
    facilityId: string;
    facilityName: string;
    isAuthenticated: boolean;
}

export function PublicFacilityCalendar({ facilityId, facilityName, isAuthenticated }: PublicFacilityCalendarProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [resources, setResources] = useState<FacilityResource[]>([]);
    const [events, setEvents] = useState<AnonymousBookingEvent[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; resourceId?: string } | null>(null);

    // Navigation Controlled State
    const [view, setView] = useState<View>(Views.DAY);
    const [date, setDate] = useState(new Date());

    const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
    const onView = useCallback((newView: View) => setView(newView), []);

    // 1. Fetch Resources and Confirmed Events
    useEffect(() => {
        let isMounted = true;

        async function fetchPublicData() {
            setIsLoading(true);
            const supabase = createClient();

            // Resources
            const { data: resourcesData, error: resourceError } = await supabase
                .from('resources')
                .select(`id, name, default_hourly_rate, resource_type_id, resource_types (name)`)
                .eq('facility_id', facilityId)
                .order('name');

            if (resourceError) {
                console.error("Error fetching resources:", resourceError);
                if (isMounted) setIsLoading(false);
                return;
            }

            const mappedResources: FacilityResource[] = (resourcesData || []).map((r: any) => ({
                id: r.id,
                title: r.name,
                default_hourly_rate: r.default_hourly_rate,
                resource_type_id: r.resource_type_id,
                resource_types: Array.isArray(r.resource_types) ? r.resource_types[0] : r.resource_types
            }));

            // Only fetch confirmed bookings to show what is occupied. Pending requests should technically stay invisible to the public until locked.
            const { data: bookingsData, error: bookingError } = await supabase
                .from('resource_bookings')
                .select('id, start_time, end_time, resource_id, color')
                .eq('facility_id', facilityId)
                .in('status', ['confirmed']); // Note: Depending on rules, you might want to show pending as blocked too.

            if (bookingError) {
                console.error("Error fetching bookings:", bookingError);
                if (isMounted) setIsLoading(false);
                return;
            }

            // Anonymize all events
            const mappedEvents: AnonymousBookingEvent[] = (bookingsData || []).map((b: any) => ({
                id: b.id,
                title: 'Booked', // Strict Anonymity
                start: new Date(b.start_time),
                end: new Date(b.end_time),
                resourceId: b.resource_id,
                status: 'confirmed',
                color: '#3B82F6' // Use generic blue, or inherit b.color
            }));

            if (isMounted) {
                setResources(mappedResources);
                setEvents(mappedEvents);
                setIsLoading(false);
            }
        }

        fetchPublicData();

        // Setup Realtime for the public view (Keep it fully up to date)
        const supabase = createClient();
        const channel = supabase
            .channel('public_bookings_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resource_bookings',
                    filter: `facility_id=eq.${facilityId}`
                },
                () => {
                    fetchPublicData();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [facilityId, refreshKey]);

    const handleSelectSlot = (slotInfo: SlotInfo) => {
        const resourceId = (slotInfo as any).resourceId;
        setSelectedSlot({
            start: slotInfo.start,
            end: slotInfo.end,
            resourceId: typeof resourceId === 'string' ? resourceId : undefined
        });
        setIsModalOpen(true);
    };

    // Prevent selecting existing events
    const handleSelectEvent = () => {
        // No-op for public. They cannot edit or see details of existing events.
    };

    const eventPropGetter = () => {
        return {
            style: {
                backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red transparent
                borderLeft: '3px solid #ef4444', // Red border
                color: '#ef4444' // Red text
            }
        };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-black/40 border border-white/5 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
            </div>
        );
    }

    if (resources.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 font-medium bg-black/50 border border-white/5 rounded-lg h-[600px] flex items-center justify-center">
                This facility has not listed any public resources yet.
            </div>
        );
    }

    return (
        <div className="bg-black/40 border border-white/10 rounded-lg p-6 h-[800px] flex flex-col pt-8 relative z-20">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                resources={resources}
                resourceIdAccessor="id"
                resourceTitleAccessor="title"

                view={view}
                date={date}
                onNavigate={onNavigate}
                onView={onView}
                showMultiDayTimes={false}

                defaultView={Views.DAY}
                views={[Views.DAY, Views.WEEK, Views.MONTH]}
                step={30}
                timeslots={2}
                selectable={true}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventPropGetter}
                min={new Date(0, 0, 0, 6, 0, 0)}
                max={new Date(0, 0, 0, 23, 59, 59)}
                className="flex-1"
                components={{
                    toolbar: CalendarToolbar,
                    event: (props) => (
                        <div className="flex flex-col text-xs md:text-sm h-full overflow-hidden leading-tight p-0.5 items-center justify-center text-center opacity-80 cursor-not-allowed">
                            <span className="font-bold truncate text-red-400">Unavailable</span>
                        </div>
                    )
                }}
            />

            {/* Injected CSS from Scorched Earth Fix to ensure alignment */}
            <style jsx global>{`
                .rbc-time-view .rbc-time-gutter {
                    background-color: #0f172a !important; 
                    border-right: 1px solid #1e293b !important; 
                }
                .rbc-time-header,
                .rbc-time-header-content,
                .rbc-time-header-cell,
                .rbc-header,
                .rbc-header + .rbc-header,
                .rbc-row {
                    border-color: #1e293b !important;
                    border-bottom-color: #1e293b !important;
                    border-right-color: #1e293b !important;
                    border-left-color: #1e293b !important;
                    border-top-color: #1e293b !important;
                    color: #e2e8f0 !important;
                }
                .rbc-header {
                    border-bottom: 1px solid #1e293b !important;
                }
                .rbc-time-header-cell {
                    background-color: #0f172a !important;
                }
                .rbc-timeslot-group {
                    background-color: #0f172a !important;
                    border-bottom: 1px solid #1e293b !important;
                    min-height: 80px !important;
                }
                .rbc-day-slot .rbc-time-slot {
                    border-top: 1px solid #1e293b !important;
                }
                .rbc-time-view .rbc-header-gutter {
                    background-color: transparent !important;
                    width: auto !important;
                }
                .rbc-allday-cell {
                    display: none !important;
                }
            `}</style>

            <PublicBookingModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedSlot(null);
                }}
                selectedSlot={selectedSlot}
                resources={resources}
                facilityId={facilityId}
                facilityName={facilityName}
                isAuthenticated={isAuthenticated}
            />
        </div>
    );
}
