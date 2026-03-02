'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, List } from 'lucide-react';

export function CalendarToolbar({
    date,
    view,
    onNavigate,
    onView
}: any) {

    // Label for the center based on view (Week = date range, Month = Month Year)
    const renderLabel = () => {
        if (view === 'month') {
            return format(date, 'MMMM yyyy');
        }
        if (view === 'week' || view === 'day') {
            return format(date, 'MMMM do, yyyy'); // We could make this smarter to show range for week, but keeping it simple for now
        }
        return format(date, 'MMMM yyyy');
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">

            {/* Left: Navigation Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onNavigate('PREV')}
                    className="p-2 rounded-md hover:bg-white/10 text-white transition-colors border border-white/10"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={() => onNavigate('TODAY')}
                    className="px-4 py-2 rounded-md hover:bg-white/10 text-white font-bold uppercase tracking-wider text-xs transition-colors border border-white/10"
                >
                    Today
                </button>
                <button
                    onClick={() => onNavigate('NEXT')}
                    className="p-2 rounded-md hover:bg-white/10 text-white transition-colors border border-white/10"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Center: Active Date Label */}
            <h2 className="text-xl md:text-2xl font-black font-heading uppercase tracking-widest text-white">
                {renderLabel()}
            </h2>

            {/* Right: View Switcher (Segmented Control) */}
            <div className="flex bg-black/50 p-1 rounded-lg border border-white/10">
                <button
                    onClick={() => onView('month')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'month'
                        ? 'bg-pitch-accent text-black shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <LayoutGrid className="w-4 h-4" /> Month
                </button>
                <button
                    onClick={() => onView('week')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'week'
                        ? 'bg-pitch-accent text-black shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <CalendarDays className="w-4 h-4" /> Week
                </button>
                <button
                    onClick={() => onView('day')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'day'
                        ? 'bg-pitch-accent text-black shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <List className="w-4 h-4" /> Day
                </button>
            </div>
        </div>
    );
}
