'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, Users, Plus, Trash2, Clock, Calendar, DollarSign, MapPin, Trophy } from 'lucide-react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import { updateGame } from '@/app/actions/update-game';

// Define Libraries as static constant to avoid re-renders
const LIBRARIES: ("places")[] = ["places"];

interface TeamConfig {
    name: string;
    color: string;
    limit: number;
}

const COLORS = [
    { name: 'Neon Orange', value: '#ff4f00', label: 'Neon Orange' },
    { name: 'Neon Blue', value: '#00ccff', label: 'Neon Blue' },
    { name: 'Neon Green', value: '#ccff00', label: 'Neon Green' },
    { name: 'White', value: '#ffffff', label: 'White' },
    { name: 'Black', value: '#000000', label: 'Black' },
    { name: 'Red', value: '#ef4444', label: 'Red' },
    { name: 'Yellow', value: '#eab308', label: 'Yellow' },
    { name: 'Light Blue', value: '#3b82f6', label: 'Light Blue' },
    { name: 'Pink', value: '#ec4899', label: 'Pink' },
    { name: 'Purple', value: '#a855f7', label: 'Purple' },
    { name: 'Blue', value: '#2563eb', label: 'Blue' },
    { name: 'Grey', value: '#6b7280', label: 'Grey' }
];

interface GameFormProps {
    initialData?: any;
    action?: 'create' | 'edit';
    onSuccess?: () => void;
}

export function GameForm({ initialData, action = 'create', onSuccess }: GameFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Google Maps Script
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    // Form States
    const [title, setTitle] = useState(initialData?.title || '');
    const [gameDate, setGameDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [price, setPrice] = useState<number | ''>(initialData?.price ?? 10.00);
    const [maxPlayers, setMaxPlayers] = useState<number | ''>(initialData?.max_players ?? 22);
    const [surfaceType, setSurfaceType] = useState(initialData?.surface_type || 'Turf');
    const [eventType, setEventType] = useState(initialData?.event_type || 'standard');
    const [hasMvpReward, setHasMvpReward] = useState(initialData?.has_mvp_reward || false);
    const [isRefundable, setIsRefundable] = useState(initialData?.is_refundable || false);
    const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<string[]>(initialData?.allowed_payment_methods || ['venmo', 'zelle']);

    // Capacity Constraints & Multi-Team Prices
    const [minTeams, setMinTeams] = useState<number | ''>(initialData?.min_teams ?? '');
    const [maxTeams, setMaxTeams] = useState<number | ''>(initialData?.max_teams ?? '');
    const [teamPrice, setTeamPrice] = useState<number | ''>(initialData?.team_price ?? '');
    const [freeAgentPrice, setFreeAgentPrice] = useState<number | ''>(initialData?.free_agent_price ?? '');
    const [amountOfFields, setAmountOfFields] = useState<number | ''>(initialData?.amount_of_fields ?? '');

    // League Engine States
    const [isLeague, setIsLeague] = useState(initialData?.is_league || false);
    const [totalWeeks, setTotalWeeks] = useState<number | ''>(initialData?.total_weeks ?? '');
    const [isPlayoffIncluded, setIsPlayoffIncluded] = useState(initialData?.is_playoff_included || false);
    const [teamRosterFee, setTeamRosterFee] = useState<number | ''>(initialData?.team_roster_fee ?? '');
    const [depositAmount, setDepositAmount] = useState<number | ''>(initialData?.deposit_amount ?? '');
    const [minPlayersPerTeam, setMinPlayersPerTeam] = useState<number | ''>(initialData?.min_players_per_team ?? '');

    // Tournament Ops States
    const [description, setDescription] = useState(initialData?.description || '');
    const [reward, setReward] = useState(initialData?.reward || '');
    const [prizeType, setPrizeType] = useState(initialData?.prize_type || 'none');
    const [fixedPrizeAmount, setFixedPrizeAmount] = useState<number | ''>(initialData?.fixed_prize_amount ?? '');
    const [prizePoolPercentage, setPrizePoolPercentage] = useState<number | ''>(initialData?.prize_pool_percentage ?? '');
    const [refundCutoffDate, setRefundCutoffDate] = useState<string>(initialData?.refund_cutoff_date ? new Date(initialData.refund_cutoff_date).toISOString().slice(0, 16) : '');
    const [rosterLockDate, setRosterLockDate] = useState<string>(initialData?.roster_lock_date ? new Date(initialData.roster_lock_date).toISOString().slice(0, 16) : '');
    const [strictWaiverRequired, setStrictWaiverRequired] = useState(initialData?.strict_waiver_required || false);
    const [mercyRuleCap, setMercyRuleCap] = useState<number | ''>(initialData?.mercy_rule_cap ?? '');

    // Location State
    const [locationName, setLocationName] = useState(initialData?.location || '');
    const [coords, setCoords] = useState<{ lat: number | null, lng: number | null }>({
        lat: initialData?.latitude || null,
        lng: initialData?.longitude || null
    });

    const [teams, setTeams] = useState<TeamConfig[]>(initialData?.teams_config || [
        { name: 'Neon Orange', color: 'Neon Orange', limit: 11 },
        { name: 'White', color: 'White', limit: 11 }
    ]);

    // Initialize Date/Time from initialData
    useEffect(() => {
        if (initialData?.start_time) {
            const start = new Date(initialData.start_time);
            setGameDate(start.toISOString().split('T')[0]);
            setStartTime(start.toTimeString().slice(0, 5));
        }
        if (initialData?.end_time) {
            // End time might be full date or just time string depending on how it was saved/fetched
            // Assuming full ISO or similar
            const end = new Date(initialData.start_time); // Use start to get date base
            // If end_time is HH:mm:ss, parse it
            if (initialData.end_time.includes('T')) {
                setEndTime(new Date(initialData.end_time).toTimeString().slice(0, 5));
            } else {
                setEndTime(initialData.end_time.slice(0, 5));
            }
        }
    }, [initialData]);

    // --- Places Autocomplete Logic ---
    const {
        ready,
        value,
        setValue,
        suggestions: { status, data },
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here if needed */
        },
        defaultValue: initialData?.location || '',
        initOnMount: isLoaded
    });

    // Keep local location input in sync with Places value
    useEffect(() => {
        if (action === 'create' && !initialData) {
            // For create, we just use the 'value' from hook
        } else if (value === '' && locationName) {
            // If manually editing, update hook value
            setValue(locationName, false);
        }
    }, [locationName, setValue]);

    const handleSelectLocation = async (address: string) => {
        setValue(address, false);
        setLocationName(address);
        clearSuggestions();

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            setCoords({ lat, lng });
            console.log("📍 Coordinates:", lat, lng);
        } catch (error) {
            console.error("Error finding coordinates: ", error);
        }
    };

    // --- Logic Reuse ---
    useEffect(() => {
        if (startTime && !initialData) { // Only auto-set end time on fresh create or manual change if desired
            try {
                const [h, m] = startTime.split(':').map(Number);
                const d = new Date();
                d.setHours(h);
                d.setMinutes(m);
                d.setHours(d.getHours() + 1);
                const newH = d.getHours().toString().padStart(2, '0');
                const newM = d.getMinutes().toString().padStart(2, '0');
                setEndTime(`${newH}:${newM}`);
            } catch (ignore) { }
        }
    }, [startTime, initialData]);

    // Smart Sizing
    useEffect(() => {
        if (maxPlayers && teams.length > 0) {
            // Only auto-resize if creating? Or always? Let's do always for consistency but be careful not to override custom logic too aggressively.
            // For now, keep as is.
            const total = Number(maxPlayers);
            const count = teams.length;
            const baseSize = Math.floor(total / count);
            const remainder = total % count;

            setTeams(prev => prev.map((t, i) => ({
                ...t,
                limit: i < remainder ? baseSize + 1 : baseSize
            })));
        }
    }, [maxPlayers, teams.length]);


    const handleTeamChange = (index: number, field: keyof TeamConfig, value: string | number) => {
        const newTeams = [...teams];
        const currentTeam = newTeams[index];
        if (field === 'color') {
            const newColorLabel = String(value);
            const isGenericName = currentTeam.name === currentTeam.color || currentTeam.name.startsWith('Team ');
            if (isGenericName) {
                newTeams[index] = { ...newTeams[index], [field as string]: value, name: newColorLabel };
            } else {
                newTeams[index] = { ...newTeams[index], [field as string]: value };
            }
        } else {
            newTeams[index] = { ...newTeams[index], [field as string]: value };
        }
        setTeams(newTeams);
    };

    const addTeam = () => {
        const usedColors = teams.map(t => t.color);
        const availableColor = COLORS.find(c => !usedColors.includes(c.label))?.label || 'White';
        setTeams([...teams, { name: availableColor, color: availableColor, limit: 5 }]);
    };

    const removeTeam = (index: number) => {
        if (teams.length <= 1) return;
        setTeams(teams.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!gameDate || !startTime || !endTime) {
            alert("Please fill in all time fields");
            setLoading(false);
            return;
        }

        if (price !== '' && price > 0 && allowedPaymentMethods.length === 0) {
            alert("You must select at least one payment method for a paid game.");
            setLoading(false);
            return;
        }

        try {
            const startDateTime = new Date(`${gameDate}T${startTime}`);
            const endDateTime = new Date(`${gameDate}T${endTime}`);
            if (endDateTime < startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);
            const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime; // Fallback

            const payload = {
                title,
                location: locationName, // Use the smart location name
                latitude: coords.lat,
                longitude: coords.lng,
                start_time: startDateTime.toISOString(),
                end_time: formattedEndTime,
                price: (eventType === 'tournament' || eventType === 'league') ? null : (price === '' ? 0 : price),
                max_players: (eventType === 'tournament' || eventType === 'league') ? null : (maxPlayers === '' ? 22 : maxPlayers),
                surface_type: surfaceType,
                event_type: eventType,
                description: description || null,
                reward: reward || null,
                prize_type: prizeType,
                fixed_prize_amount: fixedPrizeAmount === '' ? null : fixedPrizeAmount,
                prize_pool_percentage: prizePoolPercentage === '' ? null : prizePoolPercentage,
                refund_cutoff_date: refundCutoffDate ? new Date(refundCutoffDate).toISOString() : null,
                roster_lock_date: rosterLockDate ? new Date(rosterLockDate).toISOString() : null,
                strict_waiver_required: strictWaiverRequired,
                mercy_rule_cap: mercyRuleCap === '' ? null : mercyRuleCap,
                teams_config: (eventType === 'tournament' || eventType === 'league') ? null : teams,
                has_mvp_reward: hasMvpReward,
                is_refundable: isRefundable,
                allowed_payment_methods: allowedPaymentMethods,
                is_league: isLeague,
                total_weeks: totalWeeks === '' ? null : totalWeeks,
                is_playoff_included: isPlayoffIncluded,
                team_roster_fee: teamRosterFee === '' ? null : teamRosterFee,
                deposit_amount: depositAmount === '' ? null : depositAmount,
                min_players_per_team: minPlayersPerTeam === '' ? null : minPlayersPerTeam,
                min_teams: minTeams === '' ? null : minTeams,
                max_teams: maxTeams === '' ? null : maxTeams,
                team_price: teamPrice === '' ? null : teamPrice,
                free_agent_price: freeAgentPrice === '' ? null : freeAgentPrice,
                amount_of_fields: amountOfFields === '' ? null : amountOfFields
            };

            if (action === 'create') {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("You must be logged in.");

                const { error: insertError } = await supabase.from('games').insert([{
                    ...payload,
                    host_ids: [user.id] // Automatically add creator as a host
                }]);
                if (insertError) throw insertError;

                // Redirect done by successful submit
                router.push('/admin');
                router.refresh();

            } else {
                // UPDATE action
                if (!initialData?.id) throw new Error("Missing Game ID for edit.");
                await updateGame(initialData.id, payload);
                if (onSuccess) onSuccess();
            }

        } catch (err: any) {
            console.error('Error saving game:', err);
            setError(err.message || "Failed to save game.");
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /> Loading Maps...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-sm">
                    {error}
                </div>
            )}

            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 text-pitch-accent">
                        Event Type
                    </label>
                    <select
                        value={eventType}
                        onChange={(e) => {
                            setEventType(e.target.value);
                            if (e.target.value === 'league') setIsLeague(true);
                            else setIsLeague(false);
                        }}
                        className="w-full bg-white/5 border border-pitch-accent/30 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                    >
                        <option value="standard">Standard Pickup</option>
                        <option value="tournament">Micro-Tournament</option>
                        <option value="league">Multi-Week League</option>
                    </select>
                </div>

                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2 mt-8">
                    <Save className="w-5 h-5 text-pitch-accent" /> Match Info
                </h3>

                {/* Title */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                        Game Title
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Friday Night Lights"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                    />
                </div>

                {/* Smart Location Input */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Location
                    </label>
                    <div className="relative">
                        <input
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                setLocationName(e.target.value);
                            }}
                            disabled={!ready}
                            placeholder="Search places..."
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors pl-10"
                        />
                        <div className="absolute left-3 top-3.5 text-gray-500">
                            <MapPin className="w-4 h-4" />
                        </div>
                        {coords.lat && <div className="absolute right-3 top-3.5 text-green-500" title="Coordinates Set">✓</div>}

                        {/* Auto-complete Suggestions Dropdown */}
                        {status === "OK" && (
                            <ul className="absolute z-50 w-full bg-gray-900 border border-white/10 shadow-xl rounded-sm mt-1 max-h-60 overflow-auto">
                                {data.map(({ place_id, description }) => (
                                    <li
                                        key={place_id}
                                        onClick={() => handleSelectLocation(description)}
                                        className="p-3 hover:bg-white/10 cursor-pointer text-sm text-gray-300 border-b border-white/5 last:border-0"
                                    >
                                        {description}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Date
                        </label>
                        <input
                            type="date"
                            required
                            value={gameDate}
                            onChange={(e) => setGameDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors [color-scheme:dark]"
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Start
                        </label>
                        <input
                            type="time"
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors [color-scheme:dark]"
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> End
                        </label>
                        <input
                            type="time"
                            required
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors [color-scheme:dark]"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {eventType === 'standard' ? (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary">
                                    Price ($)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setPrice(0)}
                                    className="text-[10px] bg-pitch-accent text-pitch-black px-2 py-0.5 rounded uppercase font-black hover:bg-white transition-colors"
                                >
                                    Make Free
                                </button>
                            </div>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>
                    ) : (
                        <div>
                            {/* Empty div to preserve grid spacing or just output a quick explainer */}
                            <p className="text-xs text-gray-500 italic mt-6">Single-day price is disabled for multi-team formats. Entry fees are managed by Capacity restrictions below.</p>
                        </div>
                    )}
                    <div>
                        {eventType === 'standard' && (
                            <>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Max Players
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="2"
                                    value={maxPlayers}
                                    onChange={(e) => setMaxPlayers(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </>
                        )}
                        {(isLeague || eventType === 'tournament') && (
                            <p className="text-xs text-gray-500 italic mt-6">Global player capacity and standard single-player price are disabled for multi-team events. Subscriptions will be managed securely through team capacities.</p>
                        )}
                    </div>
                </div>

                {price !== '' && price > 0 && (
                    <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                        <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" /> Payment Methods
                        </h3>
                        <div className="flex gap-4 flex-wrap">
                            {['venmo', 'zelle', 'stripe'].map(method => (
                                <label key={method} className="flex items-center gap-2 cursor-pointer select-none bg-black/20 px-3 py-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={allowedPaymentMethods.includes(method)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setAllowedPaymentMethods([...allowedPaymentMethods, method]);
                                            } else {
                                                setAllowedPaymentMethods(allowedPaymentMethods.filter(m => m !== method));
                                            }
                                        }}
                                        className="w-4 h-4 accent-pitch-accent rounded"
                                    />
                                    <span className="uppercase text-xs font-bold">
                                        {method === 'stripe' ? 'Credit Card (Stripe)' : method}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {allowedPaymentMethods.length === 0 && (
                            <p className="text-red-500 text-xs italic">At least one method is required.</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm">
                        <input
                            type="checkbox"
                            id="mvpReward"
                            checked={hasMvpReward}
                            onChange={(e) => setHasMvpReward(e.target.checked)}
                            className="w-5 h-5 accent-pitch-accent rounded cursor-pointer"
                        />
                        <label htmlFor="mvpReward" className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-xl">🏆</span>
                            <div>
                                <p className="font-bold uppercase text-sm text-white">Prize Game?</p>
                                <p className="text-xs text-pitch-secondary">MVP receives a Free Game Credit</p>
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm">
                        <input
                            type="checkbox"
                            id="isRefundable"
                            checked={isRefundable}
                            onChange={(e) => setIsRefundable(e.target.checked)}
                            className="w-5 h-5 accent-pitch-accent rounded cursor-pointer"
                        />
                        <label htmlFor="isRefundable" className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-xl">💳</span>
                            <div>
                                <p className="font-bold uppercase text-sm text-white">Allow Player Refunds?</p>
                                <p className="text-xs text-pitch-secondary">Players can drop out and auto-refund</p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                        Surface Type
                    </label>
                    <select
                        value={surfaceType}
                        onChange={(e) => setSurfaceType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                    >
                        <option value="Turf">Turf</option>
                        <option value="Grass">Grass</option>
                        <option value="Indoor">Indoor Court</option>
                    </select>
                </div>
                {/* Event Type select has moved to the top of the form */}
            </div>

            {(isLeague || eventType === 'tournament') && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 bg-blue-500/5 border border-blue-500/20 p-6 rounded-sm">
                    <h3 className="text-xl font-bold uppercase italic border-b border-blue-500/20 pb-2 flex items-center gap-2 text-blue-400">
                        <Trophy className="w-5 h-5" /> {isLeague ? 'Multi-Week League' : 'Micro-Tournament'} Operations
                    </h3>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Event Rules & Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={`Detail your ${isLeague ? 'league' : 'micro-tournament'} format, rules, and expectations here.`}
                            className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            rows={4}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {isLeague && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Total Schedule Length (Weeks)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={totalWeeks}
                                    onChange={(e) => setTotalWeeks(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    placeholder="e.g. 10"
                                    className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Amount of Fields</label>
                            <input
                                type="number"
                                min="1"
                                value={amountOfFields}
                                onChange={(e) => setAmountOfFields(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="e.g. 2"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-black/20 border border-white/10 rounded-sm mt-6">
                            <input
                                type="checkbox"
                                id="playoffIncluded"
                                checked={isPlayoffIncluded}
                                onChange={(e) => setIsPlayoffIncluded(e.target.checked)}
                                className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                            />
                            <label htmlFor="playoffIncluded" className="flex items-center gap-2 cursor-pointer select-none">
                                <div>
                                    <p className="font-bold uppercase text-sm text-white">Includes Playoffs?</p>
                                    <p className="text-xs text-pitch-secondary">Are the final games knockout phase?</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Total Team Fee ($)</label>
                            <input
                                type="number"
                                min="0" step="0.01"
                                value={teamRosterFee}
                                onChange={(e) => setTeamRosterFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                placeholder="e.g. 1000.00"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Team Registration Fee ($)</label>
                            <input
                                type="number"
                                min="0" step="0.01"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                placeholder="e.g. 150.00"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Free Agent Sign Up Fee ($)</label>
                            <input
                                type="number"
                                min="0" step="0.01"
                                value={freeAgentPrice}
                                onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                placeholder="e.g. 85.00"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Minimum Players (Per Team)</label>
                            <input
                                type="number"
                                min="1"
                                value={minPlayersPerTeam}
                                onChange={(e) => setMinPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="e.g. 11 (For Suggested Splits)"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Minimum Teams</label>
                            <input
                                type="number"
                                min="2"
                                value={minTeams}
                                onChange={(e) => setMinTeams(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="e.g. 6"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Maximum Teams</label>
                            <input
                                type="number"
                                min="2"
                                value={maxTeams}
                                onChange={(e) => setMaxTeams(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="e.g. 12"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Refund Cutoff Date</label>
                            <input
                                type="datetime-local"
                                value={refundCutoffDate}
                                onChange={(e) => setRefundCutoffDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Roster Lock Date</label>
                            <input
                                type="datetime-local"
                                value={rosterLockDate}
                                onChange={(e) => setRosterLockDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3 p-4 bg-black/20 border border-white/10 rounded-sm">
                            <input
                                type="checkbox"
                                id="strictWaiver"
                                checked={strictWaiverRequired}
                                onChange={(e) => setStrictWaiverRequired(e.target.checked)}
                                className="w-5 h-5 accent-pitch-accent rounded cursor-pointer"
                            />
                            <label htmlFor="strictWaiver" className="flex items-center gap-2 cursor-pointer select-none">
                                <div>
                                    <p className="font-bold uppercase text-sm text-white">Strict Event Waiver</p>
                                    <p className="text-xs text-pitch-secondary">Require localized signing</p>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Mercy Rule Cap (GD limit)</label>
                            <input
                                type="number"
                                min="1"
                                value={mercyRuleCap}
                                onChange={(e) => setMercyRuleCap(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="e.g. 5"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>
                    </div>
                </div>
            )}

            {(eventType === 'tournament' || eventType === 'league') && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 bg-yellow-500/5 border border-yellow-500/20 p-6 rounded-sm">
                    <h3 className="text-xl font-bold uppercase italic border-b border-yellow-500/20 pb-2 flex items-center gap-2 text-yellow-500">
                        <Trophy className="w-5 h-5" /> Prize Structure
                    </h3>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-2">Prize Format</label>
                        <select
                            value={prizeType}
                            onChange={(e) => {
                                setPrizeType(e.target.value);
                                // Clear irrelevant inputs on switch
                                if (e.target.value !== 'pool') setPrizePoolPercentage('');
                                if (e.target.value !== 'fixed') setFixedPrizeAmount('');
                                if (e.target.value !== 'physical') setReward('');
                            }}
                            className="w-full bg-black/40 border border-yellow-500/30 rounded-sm p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        >
                            <option value="none">No Official Prize</option>
                            <option value="pool">Percentage Pool (Scaling Pot)</option>
                            <option value="fixed">Fixed Cash Bounty</option>
                            <option value="physical">Physical Item / Trophy</option>
                        </select>
                    </div>

                    {prizeType === 'pool' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Percentage of Total Revenue Pot (%)</label>
                            <input
                                type="number"
                                min="1" max="100"
                                value={prizePoolPercentage}
                                onChange={(e) => setPrizePoolPercentage(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="e.g. 20 for a 20% pot"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                            <p className="text-xs text-gray-500 mt-2 italic">Automatically calculates from (Players Joined * Game Price).</p>
                        </div>
                    )}

                    {prizeType === 'fixed' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Fixed Cash Bounty Amount ($)</label>
                            <input
                                type="number"
                                min="1" step="0.01"
                                value={fixedPrizeAmount}
                                onChange={(e) => setFixedPrizeAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                placeholder="e.g. 500.00"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>
                    )}

                    {prizeType === 'physical' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Describe the Reward</label>
                            <input
                                type="text"
                                value={reward}
                                onChange={(e) => setReward(e.target.value)}
                                placeholder="e.g. Branded Championship Jerseys & Trophy"
                                className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                            />
                        </div>
                    )}
                </div>
            )}

            {eventType !== 'league' && eventType !== 'tournament' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2 justify-between">
                        <span className="flex items-center gap-2"><Users className="w-5 h-5 text-pitch-accent" /> Team Config</span>
                        <button
                            type="button"
                            onClick={addTeam}
                            className="text-xs flex items-center gap-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add Team
                        </button>
                    </h3>

                    {teams.map((team, index) => (
                        <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-sm relative">
                            {teams.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeTeam(index)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-400 p-1"
                                    title="Remove Team"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}

                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-1">
                                        Team Name
                                    </label>
                                    <input
                                        type="text"
                                        value={team.name}
                                        onChange={(e) => handleTeamChange(index, 'name', e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-sm p-2 text-sm text-white"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-1">
                                        Bib Color
                                    </label>
                                    <select
                                        value={team.color}
                                        onChange={(e) => handleTeamChange(index, 'color', e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-sm p-2 text-sm text-white"
                                    >
                                        {COLORS.map(c => (
                                            <option key={c.value} value={c.label} style={{ color: c.value === '#ffffff' ? '#000' : c.value }}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-1">
                                        Limit
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={team.limit}
                                        onChange={(e) => handleTeamChange(index, 'limit', e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="w-full bg-black/30 border border-white/10 rounded-sm p-2 text-sm text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || (action === 'create' && !isLoaded)}
                className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {action === 'create' ? 'Create Match' : 'Save Changes'}</>}
            </button>
        </form>
    );
}
