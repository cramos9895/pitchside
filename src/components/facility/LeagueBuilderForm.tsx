'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, DollarSign, Users, Info, Settings, CalendarCheck2, AlertTriangle, XCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { cancelLeague, deleteLeague } from '@/app/actions/facility';

function SubmitButton({ hasActivities }: { hasActivities: boolean }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={!hasActivities || pending}
            className="bg-pitch-accent hover:bg-white text-pitch-black font-bold uppercase tracking-wider px-8 py-3 rounded-sm transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0"
        >
            {pending ? "Initializing..." : "Initialize League"}
        </button>
    );
}

interface LeagueBuilderFormProps {
    activityTypes: { id: string; name: string }[];
    resources: { id: string; name: string; resource_types?: { name: string } }[];
    action: (formData: FormData) => void;
    initialData?: any; // For edit mode later
}

export function LeagueBuilderForm({ activityTypes, resources, action, initialData }: LeagueBuilderFormProps) {
    const [startDate, setStartDate] = useState<string>(initialData?.start_date || '');
    const [endDate, setEndDate] = useState<string>(initialData?.end_date || '');
    const [startTime, setStartTime] = useState<string>(initialData?.time_range_start || '18:00');
    const [endTime, setEndTime] = useState<string>(initialData?.time_range_end || '22:00');

    const [hasPlayoffs, setHasPlayoffs] = useState<boolean>(initialData?.has_playoffs || false);
    const [playoffSpots, setPlayoffSpots] = useState<string>(initialData?.playoff_spots?.toString() || '4');
    const [leagueFormat, setLeagueFormat] = useState<'structured' | 'rolling'>(initialData?.league_format || 'structured');

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();

    const isEditing = !!initialData;

    // Parse initial game days
    const initialDays = initialData?.game_days ? initialData.game_days.split(',').map((d: string) => d.trim()) : [];
    const [selectedDays, setSelectedDays] = useState<string[]>(initialDays);
    const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Parse initial resources
    const initialResources = initialData?.league_resources?.map((lr: any) => lr.resource_id) || [];
    const [selectedResources, setSelectedResources] = useState<string[]>(initialResources);

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const toggleResource = (id: string) => {
        if (selectedResources.includes(id)) {
            setSelectedResources(selectedResources.filter(r => r !== id));
        } else {
            setSelectedResources([...selectedResources, id]);
        }
    };

    // Derived Mock Schedule state
    let totalWeeks = 0;
    let regularSeasonWeeks = 0;
    let playoffWeeks = 0;
    let calculationError = null;
    let scheduleEvents: { label: string; date: Date; type: 'regular' | 'playoff' }[] = [];

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Next.js hydration fix: handle tz offsets carefully or just use UTC-like dates.
        // For visual mock, we just add days to the start date object.
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalWeeks = Math.floor(diffDays / 7) + 1;

        if (totalWeeks < 2) {
            calculationError = "End date must be at least 1 week after start date.";
        } else {
            if (hasPlayoffs) {
                const spots = parseInt(playoffSpots);
                if (spots === 2) playoffWeeks = 1;
                else if (spots === 4) playoffWeeks = 2;
                else if (spots === 8) playoffWeeks = 3;
                else if (spots === 16) playoffWeeks = 4;

                regularSeasonWeeks = totalWeeks - playoffWeeks;

                if (regularSeasonWeeks < 1) {
                    calculationError = "Not enough time for the selected playoff format. Extend the end date.";
                }
            } else {
                regularSeasonWeeks = totalWeeks;
            }

            // Generate the exact dates
            if (!calculationError) {
                let currentDate = new Date(start);

                // 1. Regular Season
                for (let i = 1; i <= regularSeasonWeeks; i++) {
                    scheduleEvents.push({
                        label: `Week ${i} (Game ${i})`,
                        date: new Date(currentDate),
                        type: 'regular'
                    });
                    currentDate.setDate(currentDate.getDate() + 7);
                }

                // 2. Playoffs
                if (hasPlayoffs) {
                    const spots = parseInt(playoffSpots);

                    if (spots === 16) {
                        scheduleEvents.push({ label: 'Round of 16', date: new Date(currentDate), type: 'playoff' });
                        currentDate.setDate(currentDate.getDate() + 7);
                    }
                    if (spots >= 8) {
                        scheduleEvents.push({ label: 'Quarter-Finals', date: new Date(currentDate), type: 'playoff' });
                        currentDate.setDate(currentDate.getDate() + 7);
                    }
                    if (spots >= 4) {
                        scheduleEvents.push({ label: 'Semi-Finals', date: new Date(currentDate), type: 'playoff' });
                        currentDate.setDate(currentDate.getDate() + 7);
                    }
                    if (spots >= 2) {
                        scheduleEvents.push({ label: 'Championship Final', date: new Date(currentDate), type: 'playoff' });
                    }
                }
            }
        }
    }

    return (
        <div className="bg-pitch-card border border-white/10 rounded-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pitch-accent to-blue-500 opacity-50"></div>

            <form action={action} className="p-8 space-y-8">
                {/* 1. Core Information */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                        <Trophy className="w-5 h-5 text-pitch-accent" />
                        Core Information
                    </h2>

                    <input type="hidden" name="league_format" value={leagueFormat} />
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <button
                            type="button"
                            onClick={() => setLeagueFormat('structured')}
                            className={`flex-1 p-4 rounded-sm border transition-all text-left ${
                                leagueFormat === 'structured' 
                                ? 'bg-pitch-accent/10 border-pitch-accent text-pitch-accent' 
                                : 'bg-black/50 border-white/10 text-gray-400 hover:text-white'
                            }`}
                        >
                            <div className="font-bold uppercase tracking-wider text-sm mb-1">Structured Season</div>
                            <div className="text-xs opacity-70">Fixed schedule with defined end dates and playoffs.</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setLeagueFormat('rolling')}
                            className={`flex-1 p-4 rounded-sm border transition-all text-left ${
                                leagueFormat === 'rolling' 
                                ? 'bg-[#cbff00]/10 border-[#cbff00] text-[#cbff00]' 
                                : 'bg-black/50 border-white/10 text-gray-400 hover:text-white'
                            }`}
                        >
                            <div className="font-bold uppercase tracking-wider text-sm mb-1">Rolling / Flexible</div>
                            <div className="text-xs opacity-70">Open-ended schedule with ongoing matchmaking.</div>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-gray-400">League Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                defaultValue={initialData?.name}
                                placeholder="e.g. Wednesday Night Men's Draft"
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="season" className="text-sm font-bold uppercase tracking-wider text-gray-400">Season Name</label>
                            <input
                                type="text"
                                id="season"
                                name="season"
                                defaultValue={initialData?.season}
                                placeholder="e.g. Fall 2026"
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="activity_id" className="text-sm font-bold uppercase tracking-wider text-gray-400">Sport / Activity Type *</label>
                            {(!activityTypes || activityTypes.length === 0) ? (
                                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-sm flex items-center gap-3 font-medium">
                                    <Info className="w-5 h-5 flex-shrink-0" />
                                    You haven't created any Activity Types yet. Please create one in Settings or Resources first.
                                </div>
                            ) : (
                                <select
                                    id="activity_id"
                                    name="activity_id"
                                    required
                                    defaultValue={initialData?.activity_id || ''}
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors appearance-none"
                                >
                                    <option value="" disabled>Select an activity type...</option>
                                    {activityTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Format & Rules */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                        <Settings className="w-5 h-5 text-purple-400" />
                        Format & Rules
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 flex flex-col justify-end">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Match Format</label>
                            <select
                                id="format"
                                name="format"
                                defaultValue={initialData?.format || ''}
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors appearance-none"
                            >
                                <option value="" disabled>Select format...</option>
                                <option value="11v11">11 v 11</option>
                                <option value="9v9">9 v 9</option>
                                <option value="8v8">8 v 8</option>
                                <option value="7v7">7 v 7</option>
                                <option value="6v6">6 v 6</option>
                                <option value="5v5">5 v 5</option>
                                <option value="4v4">4 v 4</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-2 flex flex-col justify-end col-span-1 md:col-span-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Game Days</label>
                            <input type="hidden" name="game_days" value={selectedDays.join(', ')} />
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-sm transition-all border ${selectedDays.includes(day)
                                            ? 'bg-pitch-accent border-pitch-accent text-pitch-black'
                                            : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 flex flex-col justify-end">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Length (Mins)</label>
                            <input
                                type="number"
                                id="game_length"
                                name="game_length"
                                min="1"
                                defaultValue={initialData?.game_length}
                                placeholder="e.g. 60"
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>

                        <div className="space-y-2 flex flex-col justify-end">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Periods</label>
                            <select
                                id="game_periods"
                                name="game_periods"
                                defaultValue={initialData?.game_periods || ''}
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors appearance-none"
                            >
                                <option value="" disabled>Select periods...</option>
                                <option value="Halves">Halves</option>
                                <option value="Quarters">Quarters</option>
                                <option value="Periods">Periods</option>
                                <option value="None">None (Continuous)</option>
                            </select>
                        </div>

                        <div className="space-y-2 flex flex-col justify-end">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Min Roster Size
                            </label>
                            <input
                                type="number"
                                id="min_roster"
                                name="min_roster"
                                min="1"
                                defaultValue={initialData?.min_roster}
                                placeholder="e.g. 7"
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>

                        <div className="space-y-2 flex flex-col justify-end">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Max Roster Size
                            </label>
                            <input
                                type="number"
                                id="max_roster"
                                name="max_roster"
                                min="1"
                                defaultValue={initialData?.max_roster}
                                placeholder="e.g. 15 (Optional)"
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>

                        <div className="space-y-2 flex flex-col justify-end">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Max Teams (Quantity)
                            </label>
                            <input
                                type="number"
                                id="max_teams"
                                name="max_teams"
                                min="2"
                                defaultValue={initialData?.max_teams}
                                placeholder={leagueFormat === 'rolling' ? "Infinite (Optional)" : "e.g. 8"}
                                className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>

                        <div className="space-y-2 flex flex-col justify-end">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Team Fee
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    min="0"
                                    step="0.01"
                                    defaultValue={initialData?.price}
                                    placeholder="500.00"
                                    className="w-full bg-black/50 border border-white/10 rounded-sm pl-8 pr-4 py-3 text-white font-numeric focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>
                        </div>

                        {/* Assigned Resources List */}
                        <div className="space-y-3 md:col-span-3 pt-4 border-t border-white/5">
                            <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Assigned Resources (Fields/Courts)</label>
                            <input type="hidden" name="resource_ids" value={JSON.stringify(selectedResources)} />

                            {resources.length === 0 ? (
                                <div className="text-sm text-gray-500 italic bg-black/30 p-4 rounded border border-white/5">
                                    No resources configured. Add Fields or Courts in Facility Settings to assign them here.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {resources.map(resource => {
                                        const isSelected = selectedResources.includes(resource.id);
                                        return (
                                            <button
                                                key={resource.id}
                                                type="button"
                                                onClick={() => toggleResource(resource.id)}
                                                className={`p-3 text-left rounded-sm border transition-all ${isSelected
                                                    ? 'bg-pitch-accent/10 border-pitch-accent text-pitch-accent'
                                                    : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                                    }`}
                                            >
                                                <div className="font-bold text-sm">{resource.name}</div>
                                                <div className="text-xs opacity-70 mt-1 uppercase tracking-wider">{resource.resource_types?.name || 'Resource'}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Schedule Context & Playoff Setup */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        Schedule & Playoffs
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Regular Season Start</label>
                                <input
                                    type="date"
                                    id="start_date"
                                    name="start_date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors cursor-pointer"
                                />
                            </div>

                            {leagueFormat === 'structured' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Target End Date</label>
                                    <input
                                        type="date"
                                        id="end_date"
                                        name="end_date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors cursor-pointer"
                                    />
                                </div>
                            )}

                            {/* Time Boundary Configuration */}
                            <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Games Start From</label>
                                    <input
                                        type="time"
                                        id="time_range_start"
                                        name="time_range_start"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Games End By</label>
                                    <input
                                        type="time"
                                        id="time_range_end"
                                        name="time_range_end"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Playoff Configuration */}
                            {leagueFormat === 'structured' && (
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer group w-max">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                name="has_playoffs"
                                                checked={hasPlayoffs}
                                                onChange={(e) => setHasPlayoffs(e.target.checked)}
                                                className="sr-only"
                                            />
                                        <div className={`w-6 h-6 border-2 rounded-sm transition-all flex items-center justify-center ${hasPlayoffs ? 'bg-pitch-accent border-pitch-accent' : 'bg-black/50 border-white/20 group-hover:border-white/40'}`}>
                                            {hasPlayoffs && (
                                                <svg className="w-4 h-4 text-pitch-black font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-wider text-gray-300 group-hover:text-white transition-colors">Has End-of-Season Playoffs?</span>
                                </label>

                                {hasPlayoffs && (
                                    <div className="space-y-2 pl-8 border-l-2 border-pitch-accent">
                                        <label className="text-xs font-bold uppercase tracking-wider text-pitch-accent">Playoff Spots (Teams)</label>
                                        <select
                                            name="playoff_spots"
                                            value={playoffSpots}
                                            onChange={(e) => setPlayoffSpots(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-2 text-white focus:outline-none focus:border-pitch-accent transition-colors appearance-none"
                                        >
                                            <option value="2">2 Teams (Final Only - 1 Week)</option>
                                            <option value="4">4 Teams (Semis & Final - 2 Weeks)</option>
                                            <option value="8">8 Teams (Quarters, Semis, Final - 3 Weeks)</option>
                                            <option value="16">16 Teams (4 Weeks)</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>

                        {/* MOCK SCHEDULE RENDERER */}
                        {leagueFormat === 'rolling' ? (
                            <div className="bg-[#cbff00]/5 border border-[#cbff00]/20 rounded-lg p-6 flex flex-col h-full items-center justify-center text-center space-y-4">
                                <CalendarCheck2 className="w-12 h-12 text-[#cbff00] opacity-50" />
                                <h3 className="text-lg font-bold uppercase tracking-widest text-[#cbff00]">Rolling Schedule</h3>
                                <p className="text-sm text-gray-400 max-w-xs">
                                    Matches will be generated logically without a strict end date. Admins trigger new rounds weekly.
                                </p>
                            </div>
                        ) : (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-6 flex flex-col h-full">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-6 border-b border-blue-500/20 pb-2 flex items-center gap-2">
                                <CalendarCheck2 className="w-4 h-4" />
                                Interactive Schedule Preview
                            </h3>

                            {(!startDate || !endDate) ? (
                                <div className="text-gray-500 text-sm italic m-auto text-center px-4">
                                    Select a start and end date to generate the blueprint of your season timeline.
                                </div>
                            ) : calculationError ? (
                                <div className="bg-red-500/10 text-red-400 p-4 border border-red-500/20 rounded-sm text-sm font-medium">
                                    {calculationError}
                                </div>
                            ) : (
                                <div className="space-y-4 flex flex-col h-full">
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded border border-white/5 flex-shrink-0">
                                        <span className="text-gray-400 font-medium">Expected Timeline</span>
                                        <span className="text-xl font-bold font-numeric text-white">{totalWeeks} Weeks</span>
                                    </div>

                                    {/* Scrollable list of generated dates */}
                                    <ul className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[250px] max-h-[350px]">
                                        {scheduleEvents.map((event, index) => (
                                            <li
                                                key={index}
                                                className={`flex justify-between items-center p-3 rounded border-l-4 ${event.type === 'regular'
                                                    ? 'bg-green-500/10 border-green-500'
                                                    : 'bg-pitch-accent/10 border-pitch-accent'
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`font-bold uppercase tracking-wider text-xs ${event.type === 'regular' ? 'text-green-400' : 'text-pitch-accent'
                                                        }`}>
                                                        {event.label}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-white flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {event.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="text-center pt-4 border-t border-white/10 flex-shrink-0 flex flex-col gap-1">
                                        <p className="text-xs text-gray-500">
                                            <strong className="text-gray-400">Target Season End:</strong> {new Date(endDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            <strong className="text-gray-400">Scheduled Daily Between:</strong> {(() => {
                                                if (!startTime || !endTime) return "Not Set";
                                                const formatTime = (time: string) => {
                                                    const [h, m] = time.split(':');
                                                    const d = new Date();
                                                    d.setHours(parseInt(h), parseInt(m));
                                                    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                                                };
                                                return `${formatTime(startTime)} - ${formatTime(endTime)}`;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
                    <Link
                        href="/facility/leagues"
                        className="px-6 py-3 font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors flex items-center"
                    >
                        Back to Leagues
                    </Link>
                    <SubmitButton hasActivities={activityTypes && activityTypes.length > 0} />
                </div>
            </form>

            {/* DANGER ZONE (Edit Mode Only) */}
            {isEditing && (
                <div className="mt-12 bg-red-950/20 border border-red-500/20 rounded-lg p-6 lg:p-8">
                    <h3 className="text-red-500 font-heading italic uppercase font-black text-xl mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-2xl">
                        These actions are irreversible. Destroying a league will permanently erase its data, schedule, and team standings. Cancelling a league preserves history but locks it permanently.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <button
                            type="button"
                            onClick={() => setShowCancelModal(true)}
                            disabled={initialData.status === 'cancelled'}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-sm font-bold uppercase tracking-wider text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel League
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 px-6 py-3 rounded-sm font-bold uppercase tracking-wider text-sm transition-all hover:-translate-y-0.5"
                        >
                            Delete League
                        </button>
                    </div>
                </div>
            )}

            {/* CANCEL MODAL */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-pitch-card border border-red-500/30 p-8 rounded-lg max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 text-red-500 mb-6">
                            <XCircle className="w-12 h-12" />
                            <div>
                                <h3 className="text-2xl font-black italic uppercase">Cancel League</h3>
                                <p className="text-sm font-bold uppercase tracking-wider opacity-80">Lock this season?</p>
                            </div>
                        </div>
                        <p className="text-gray-300 mb-8 leading-relaxed">
                            Are you sure you want to cancel <strong className="text-white">{initialData?.name}</strong>? This will permanently lock the league preventing any further modifications. Historical matches and schedules will be preserved.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(false)}
                                disabled={isProcessing}
                                className="px-6 py-3 font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 rounded-sm transition-colors text-sm"
                            >
                                Nevermind
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsProcessing(true);
                                    await cancelLeague(initialData.id);
                                    router.push('/facility/leagues');
                                }}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold uppercase tracking-wider rounded-sm transition-colors text-sm flex items-center justify-center min-w-[120px]"
                            >
                                {isProcessing ? 'Cancelling...' : 'Yes, Cancel It'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-red-950/40 border border-red-500 p-8 rounded-lg max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 text-red-500 mb-6">
                            <AlertTriangle className="w-12 h-12 animate-pulse" />
                            <div>
                                <h3 className="text-2xl font-black italic uppercase">Destroy League</h3>
                                <p className="text-sm font-bold uppercase tracking-wider opacity-80 text-red-400">Total Data Loss</p>
                            </div>
                        </div>
                        <p className="text-red-200 mb-8 leading-relaxed">
                            Are you absolutely sure you want to permanently delete <strong className="text-white bg-red-500/20 px-2 py-0.5 rounded">{initialData?.name}</strong>? This action will instantly wipe all matchups, results, and settings from the database. <span className="underline font-bold decoration-red-500">This cannot be undone.</span>
                        </p>
                        <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isProcessing}
                                className="px-6 py-3 font-bold uppercase tracking-wider text-red-300 hover:text-white hover:bg-white/10 rounded-sm transition-colors text-sm"
                            >
                                Abort
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsProcessing(true);
                                    await deleteLeague(initialData.id);
                                    router.push('/facility/leagues');
                                }}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider rounded-sm transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)] text-sm flex items-center justify-center min-w-[140px]"
                            >
                                {isProcessing ? 'Destroying...' : 'Yes, Delete Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
