'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event as CalendarEvent, Views, SlotInfo, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { BookingModal } from './BookingModal';
import { CalendarToolbar } from './CalendarToolbar';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// We need a custom interface to satisfy react-big-calendar's Event Type + our Resource mapping
export interface BookingEvent extends CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resourceId?: string; // Links to the Resource ID
    renterName?: string;
    status: string;
    color: string;
    isListed?: boolean;
    listingPrice?: number | null;
    marketplaceStatus?: string;
}

interface FacilityResource {
    id: string;
    title: string; // The react-big-calendar resource requires 'title' for the column header
    resource_type_id: string;
    resource_types?: { name: string };
}

interface FacilityCalendarProps {
    resources: FacilityResource[];
    initialEvents: BookingEvent[];
    isAdminOverride?: boolean;
    onAdminSlotSelect?: (slotInfo: SlotInfo) => void;
}

export function FacilityCalendar({
    resources,
    initialEvents,
    isAdminOverride = false,
    onAdminSlotSelect
}: FacilityCalendarProps) {
    const [events, setEvents] = useState<BookingEvent[]>(initialEvents);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; resourceId?: string } | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);

    // Navigation Controlled State
    const [view, setView] = useState<View>(Views.DAY);
    const [date, setDate] = useState(new Date());

    const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
    const onView = useCallback((newView: View) => setView(newView), []);

    // Sync events when Server Component pushes new data
    useEffect(() => {
        setEvents(initialEvents);
    }, [initialEvents]);

    const handleSelectSlot = (slotInfo: SlotInfo) => {
        if (isAdminOverride && onAdminSlotSelect) {
            onAdminSlotSelect(slotInfo);
            return;
        }

        // Must cast resourceId because standard SlotInfo typing is sometimes missing it based on view
        const resourceId = (slotInfo as any).resourceId;

        setSelectedSlot({
            start: slotInfo.start,
            end: slotInfo.end,
            resourceId: typeof resourceId === 'string' ? resourceId : undefined
        });
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    const handleSelectEvent = (event: BookingEvent) => {
        if (isAdminOverride) return; // Admins cannot edit facility's internal events from God Mode

        setSelectedSlot(null);
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    // Custom coloring for events based on the DB color
    const eventPropGetter = (event: BookingEvent) => {
        // Highlight slots that PitchSide has claimed via the God View
        if (event.renterName === 'PitchSide HQ') {
            const isPending = event.status === 'pending' || event.status === 'pending_facility_review';
            return {
                style: {
                    backgroundColor: isPending ? 'rgba(234, 179, 8, 0.2)' : 'rgba(204, 255, 0, 0.15)', // yellow-500/20 vs pitch-accent
                    borderLeft: `3px solid ${isPending ? '#eab308' : '#ccff00'}`, // yellow-500 vs pitch-accent
                    color: isPending ? '#eab308' : '#ccff00',
                }
            };
        }

        // If viewed by God Mode, make existing facility bookings "ghosted"
        if (isAdminOverride) {
            return {
                style: {
                    backgroundColor: event.color || '#3B82F6',
                    borderLeft: `3px solid ${event.color || '#3B82F6'}`,
                    opacity: 0.5,
                    filter: 'grayscale(100%)'
                }
            };
        }

        return {
            style: {
                backgroundColor: event.color || '#3B82F6',
                borderLeft: `3px solid ${event.color || '#3B82F6'}`
            }
        };
    };

    return (
        <div className="bg-black/40 border border-white/10 rounded-lg p-6 h-[800px] flex flex-col pt-8">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                resources={resources}
                resourceIdAccessor="id"
                resourceTitleAccessor="title"

                // Controlled Navigation State
                view={view}
                date={date}
                onNavigate={onNavigate}
                onView={onView}
                showMultiDayTimes={false}

                defaultView={Views.DAY}
                views={[Views.DAY, Views.WEEK, Views.MONTH]}
                step={30} // 30 minute chunks
                timeslots={2}  // 2 timeslots per hour
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventPropGetter}
                min={new Date(0, 0, 0, 6, 0, 0)} // Start day at 6 AM
                max={new Date(0, 0, 0, 23, 59, 59)} // End day at midnight
                className="flex-1"
                components={{
                    toolbar: CalendarToolbar,
                    event: (props) => {
                        const isPitchSide = (props.event as BookingEvent).renterName === 'PitchSide HQ';
                        return (
                            <div className={`flex flex-col text-xs md:text-sm h-full overflow-hidden leading-tight p-0.5 ${isPitchSide ? 'items-center justify-center text-center' : ''}`}>
                                <span className="font-bold truncate">{props.title}</span>
                                {(props.event as BookingEvent).renterName && !isPitchSide && (
                                    <span className="opacity-80 truncate text-xs mt-0.5">
                                        {(props.event as BookingEvent).renterName}
                                    </span>
                                )}
                            </div>
                        );
                    }
                }}
            />

            {isModalOpen && (selectedSlot || selectedEvent) && (
                <BookingModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedEvent(null);
                        setSelectedSlot(null);
                    }}
                    selectedSlot={selectedSlot}
                    selectedEvent={selectedEvent}
                    resources={resources}
                />
            )}

            {/* GLOBAL STYLE OVERRIDES for Layout Polish */}
            <style jsx global>{`
                /* Hide the "All Day" Row (The White Line) */
                .rbc-allday-cell {
                    display: none !important;
                }
                
                /* Make Rows Taller (Fix cut-off text) */
                .rbc-timeslot-group {
                    min-height: 80px !important; /* Forces each hour to be taller */
                }
            `}</style>
        </div>
    );
}
