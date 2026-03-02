'use client';

import { useState } from 'react';
import { FacilityCalendar } from '@/components/calendar/FacilityCalendar';
import { MapPin } from 'lucide-react';

interface Facility {
    id: string;
    name: string;
    city: string;
    state: string;
}

export function LiveCalendarLoader({ facilities }: { facilities: Facility[] }) {
    const [selectedFacilityId, setSelectedFacilityId] = useState<string>(facilities[0]?.id || '');
    const [refreshKey, setRefreshKey] = useState(0);

    const activeFacility = facilities.find(f => f.id === selectedFacilityId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 p-4 border border-white/5 rounded-lg">
                <div className="flex items-center gap-3 text-white">
                    <MapPin className="w-5 h-5 text-pitch-accent" />
                    <span className="font-bold uppercase tracking-wider text-sm text-gray-400">Target Facility:</span>
                </div>
                <div className="flex-1 w-full relative">
                    <select
                        value={selectedFacilityId}
                        onChange={(e) => setSelectedFacilityId(e.target.value)}
                        className="w-full bg-black border border-white/20 rounded-md py-2.5 px-4 text-white font-bold appearance-none hover:border-white/40 focus:outline-none focus:border-pitch-accent transition-colors"
                    >
                        {facilities.map(f => (
                            <option key={f.id} value={f.id}>
                                {f.name} ({f.city}, {f.state})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="relative">
                <FacilityCalendar
                    key={selectedFacilityId}
                    initialFacilityId={selectedFacilityId}
                    facilityName={activeFacility?.name}
                    isMasterView={true}
                />
            </div>

            <div className="text-sm font-bold uppercase tracking-wider text-gray-500 text-center flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pitch-accent animate-pulse"></span>
                Live God View Feed
            </div>
        </div>
    );
}
