'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, Users, Plus, Trash2, Clock, Calendar, DollarSign, MapPin, Trophy } from 'lucide-react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import { updateGame } from '@/app/actions/update-game';

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

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    const [activeTab, setActiveTab] = useState<'standard' | 'tournament' | 'league'>(initialData?.event_type || 'standard');
    
    // Legacy mapping
    const eventType = activeTab;

    // SECTION A: Match Info State
    const [title, setTitle] = useState(initialData?.title || '');
    const [rulesDescription, setRulesDescription] = useState(initialData?.rules_description || '');
    const [locationName, setLocationName] = useState(initialData?.location || '');
    const [coords, setCoords] = useState<{ lat: number | null, lng: number | null }>({
        lat: initialData?.latitude || null,
        lng: initialData?.longitude || null
    });
    const [locationNickname, setLocationNickname] = useState(initialData?.location_nickname || '');
    const [gameDate, setGameDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [price, setPrice] = useState<number | ''>(initialData?.price ?? 10.00);
    const [maxPlayers, setMaxPlayers] = useState<number | ''>(initialData?.max_players ?? 22);
    const [gameFormatType, setGameFormatType] = useState(initialData?.game_format_type || '7 v 7');
    const [matchStyle, setMatchStyle] = useState(initialData?.match_style || 'Full Length');
    const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<string[]>(initialData?.allowed_payment_methods || ['venmo', 'zelle']);
    const [isRefundable, setIsRefundable] = useState(initialData?.is_refundable || false);
    const [refundCutoffHours, setRefundCutoffHours] = useState<number | ''>(initialData?.refund_cutoff_hours ?? 24);
    const [surfaceType, setSurfaceType] = useState(initialData?.surface_type || 'Outdoor Turf');
    const [amountOfFields, setAmountOfFields] = useState<number | ''>(initialData?.amount_of_fields ?? 1);
    const [fieldSize, setFieldSize] = useState(initialData?.field_size || 'Standard');
    const [shoeTypes, setShoeTypes] = useState<string[]>(initialData?.shoe_types || ['Turf Shoes', 'FG Cleats']);

    // SECTION B: Team Configurator State
    const [teams, setTeams] = useState<TeamConfig[]>(initialData?.teams_config || [
        { name: 'Neon Orange', color: 'Neon Orange', limit: 11 },
        { name: 'White', color: 'White', limit: 11 }
    ]);
    const [teamGeneratorCount, setTeamGeneratorCount] = useState<number | ''>('');

    // MICRO-TOURNAMENT State
    const [hasRegistrationFee, setHasRegistrationFee] = useState(initialData?.team_price !== null && initialData?.team_price !== undefined);
    const [teamPrice, setTeamPrice] = useState<number | ''>(initialData?.team_price ?? '');
    const [depositAmount, setDepositAmount] = useState<number | ''>(initialData?.deposit_amount ?? '');
    const [hasRegistrationFeeCredit, setHasRegistrationFeeCredit] = useState(initialData?.has_registration_fee_credit ?? false);
    
    const [freeAgentPrice, setFreeAgentPrice] = useState<number | ''>(initialData?.free_agent_price ?? '');
    const [hasFreeAgentCredit, setHasFreeAgentCredit] = useState(initialData?.has_free_agent_credit ?? false);

    const [refundCutoffDate, setRefundCutoffDate] = useState(initialData?.refund_cutoff_date ? new Date(initialData.refund_cutoff_date).toISOString().slice(0, 16) : '');
    const [minTeams, setMinTeams] = useState<number | ''>(initialData?.min_teams ?? 4);
    const [maxTourneyTeams, setMaxTourneyTeams] = useState<number | ''>(initialData?.max_teams ?? 8);
    const [minPlayersPerTeam, setMinPlayersPerTeam] = useState<number | ''>(initialData?.min_players_per_team ?? 5);
    const [rosterLockDate, setRosterLockDate] = useState(initialData?.roster_lock_date ? new Date(initialData.roster_lock_date).toISOString().slice(0, 16) : '');
    const [strictWaiverRequired, setStrictWaiverRequired] = useState(initialData?.strict_waiver_required ?? false);

    // Phase 3 Game Style State
    const [gameStyle, setGameStyle] = useState<string>(initialData?.game_style || 'Group Stage/Playoffs');
    const [halfLength, setHalfLength] = useState<number | ''>(initialData?.half_length ?? 25);
    const [halftimeLength, setHalftimeLength] = useState<number | ''>(initialData?.halftime_length ?? 5);

    const groupStageOptions = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const bracketOptions = [4, 8, 16, 32];
    const maxGroupStageOptions = Array.from({ length: 29 }, (_, i) => i + 4); // 4 to 32

    const minTeamOptions = gameStyle === 'Bracket' ? bracketOptions : groupStageOptions;
    const maxTeamOptions = gameStyle === 'Bracket' ? bracketOptions : maxGroupStageOptions;

    const handleGameStyleChange = (style: string) => {
        setGameStyle(style);
        if (style === 'Bracket') {
            setMinTeams(4);
            setMaxTourneyTeams(8);
        } else {
            setMinTeams(4);
            setMaxTourneyTeams(8);
        }
    };

    // Phase 4 Multi-Week League State
    const [earliestGameStartTime, setEarliestGameStartTime] = useState<string>(initialData?.earliest_game_start_time || '');
    const [latestGameStartTime, setLatestGameStartTime] = useState<string>(initialData?.latest_game_start_time || '');
    const [fieldNames, setFieldNames] = useState<string[]>(initialData?.field_names || ['']);
    const [minGamesGuaranteed, setMinGamesGuaranteed] = useState<number | ''>(initialData?.min_games_guaranteed ?? 8);
    const [teamsIntoPlayoffs, setTeamsIntoPlayoffs] = useState<number>(initialData?.teams_into_playoffs ?? 4);
    const [hasPlayoffBye, setHasPlayoffBye] = useState<boolean>(initialData?.has_playoff_bye ?? false);
    const [breakBetweenGames, setBreakBetweenGames] = useState<number | ''>(initialData?.break_between_games ?? 5);

    // Playoff bye logic
    const playoffOptions = hasPlayoffBye ? [5, 9] : [4, 8];
    useEffect(() => {
        if (!playoffOptions.includes(teamsIntoPlayoffs)) {
            setTeamsIntoPlayoffs(playoffOptions[0]);
        }
    }, [hasPlayoffBye, playoffOptions, teamsIntoPlayoffs]);

    // Prize Structure State
    const [prizeType, setPrizeType] = useState<string>(initialData?.prize_type || 'No Official Prize');
    const [prizePoolPercentage, setPrizePoolPercentage] = useState<number | ''>(initialData?.prize_pool_percentage ?? '');
    const [fixedPrizeAmount, setFixedPrizeAmount] = useState<number | ''>(initialData?.fixed_prize_amount ?? '');
    const [reward, setReward] = useState<string>(initialData?.reward || '');

    useEffect(() => {
        if (initialData?.start_time) {
            const start = new Date(initialData.start_time);
            setGameDate(start.toISOString().split('T')[0]);
            setStartTime(start.toTimeString().slice(0, 5));
        }
        if (initialData?.end_time) {
            if (initialData.end_time.includes('T')) {
                setEndTime(new Date(initialData.end_time).toTimeString().slice(0, 5));
            } else {
                setEndTime(initialData.end_time.slice(0, 5));
            }
        }
    }, [initialData]);

    const {
        ready,
        value,
        setValue,
        suggestions: { status, data },
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {},
        defaultValue: initialData?.location || '',
        initOnMount: isLoaded
    });

    useEffect(() => {
        if (action !== 'create' && value === '' && locationName) {
            setValue(locationName, false);
        }
    }, [locationName, setValue, action, value]);

    const handleSelectLocation = async (address: string) => {
        setValue(address, false);
        setLocationName(address);
        clearSuggestions();
        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            setCoords({ lat, lng });
        } catch (error) {
            console.error("Error finding coordinates: ", error);
        }
    };

    useEffect(() => {
        if (startTime && !initialData) { 
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

    useEffect(() => {
        if (maxPlayers && teams.length > 0) {
            const total = Number(maxPlayers);
            const count = teams.length;
            const baseSize = Math.floor(total / count);
            const remainder = total % count;
            setTeams(prev => prev.map((t, i) => ({
                ...t,
                limit: i < remainder ? baseSize + 1 : baseSize
            })));
        }
    }, [maxPlayers, teams.length]); // Intentionally auto-adjusting limits based on max capacity

    const handleTeamChange = (index: number, field: keyof TeamConfig, val: string | number) => {
        const newTeams = [...teams];
        const currentTeam = newTeams[index];
        if (field === 'color') {
            const newColorLabel = String(val);
            const isGenericName = currentTeam.name === currentTeam.color || currentTeam.name.startsWith('Team ');
            if (isGenericName) {
                newTeams[index] = { ...newTeams[index], [field as string]: val, name: newColorLabel };
            } else {
                newTeams[index] = { ...newTeams[index], [field as string]: val };
            }
        } else {
            newTeams[index] = { ...newTeams[index], [field as string]: val };
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

    const generateTeams = () => {
        if (!teamGeneratorCount || teamGeneratorCount <= 0) return;
        const newTeams: TeamConfig[] = [];
        for (let i = 0; i < teamGeneratorCount; i++) {
            const colorOption = COLORS[i % COLORS.length];
            newTeams.push({
                name: colorOption.label,
                color: colorOption.label,
                limit: maxPlayers ? Math.floor(Number(maxPlayers) / teamGeneratorCount) : 11
            });
        }
        setTeams(newTeams);
        setTeamGeneratorCount('');
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
            const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

            const payload = {
                title,
                rules_description: rulesDescription,
                location: locationName, 
                location_nickname: locationNickname,
                latitude: coords.lat,
                longitude: coords.lng,
                start_time: startDateTime.toISOString(),
                end_time: formattedEndTime,
                // Standard specific payload fields
                price: activeTab === 'standard' ? (price === '' ? 0 : price) : null,
                max_players: activeTab === 'standard' ? (maxPlayers === '' ? 22 : maxPlayers) : null,
                teams_config: activeTab === 'standard' ? teams : null,
                is_refundable: activeTab === 'standard' ? isRefundable : true, // Tournaments are always refundable individually (Stripe)
                refund_cutoff_hours: activeTab === 'standard' && isRefundable ? (refundCutoffHours === '' ? null : refundCutoffHours) : null,
                allowed_payment_methods: activeTab === 'standard' ? allowedPaymentMethods : ['stripe'], // Tournaments enforce stripe

                // Tournament / League specific payload fields
                team_price: (activeTab === 'tournament' || activeTab === 'league') ? (teamPrice === '' ? null : teamPrice) : null,
                deposit_amount: (activeTab === 'tournament' || activeTab === 'league') && hasRegistrationFee ? (depositAmount === '' ? null : depositAmount) : null,
                has_registration_fee_credit: (activeTab === 'tournament' || activeTab === 'league') && hasRegistrationFee ? hasRegistrationFeeCredit : false,
                free_agent_price: (activeTab === 'tournament' || activeTab === 'league') ? (freeAgentPrice === '' ? null : freeAgentPrice) : null,
                has_free_agent_credit: (activeTab === 'tournament' || activeTab === 'league') ? hasFreeAgentCredit : false,
                refund_cutoff_date: (activeTab === 'tournament' || activeTab === 'league') ? (refundCutoffDate ? new Date(refundCutoffDate).toISOString() : null) : null,
                min_teams: (activeTab === 'tournament' || activeTab === 'league') ? (minTeams === '' ? null : minTeams) : null,
                max_teams: (activeTab === 'tournament' || activeTab === 'league') ? (maxTourneyTeams === '' ? null : maxTourneyTeams) : null,
                min_players_per_team: (activeTab === 'tournament' || activeTab === 'league') ? (minPlayersPerTeam === '' ? null : minPlayersPerTeam) : null,
                roster_lock_date: (activeTab === 'tournament' || activeTab === 'league') ? (rosterLockDate ? new Date(rosterLockDate).toISOString() : null) : null,
                strict_waiver_required: (activeTab === 'tournament' || activeTab === 'league') ? strictWaiverRequired : false,
                game_style: activeTab === 'tournament' ? gameStyle : null,
                half_length: (activeTab === 'tournament' || activeTab === 'league') ? (halfLength === '' ? null : halfLength) : null,
                halftime_length: (activeTab === 'tournament' || activeTab === 'league') ? (halftimeLength === '' ? null : halftimeLength) : null,
                
                // League only fields
                earliest_game_start_time: activeTab === 'league' ? earliestGameStartTime || null : null,
                latest_game_start_time: activeTab === 'league' ? latestGameStartTime || null : null,
                field_names: activeTab === 'league' ? fieldNames : null,
                min_games_guaranteed: activeTab === 'league' ? (minGamesGuaranteed === '' ? null : minGamesGuaranteed) : null,
                teams_into_playoffs: activeTab === 'league' ? teamsIntoPlayoffs : null,
                has_playoff_bye: activeTab === 'league' ? hasPlayoffBye : false,
                break_between_games: activeTab === 'league' ? (breakBetweenGames === '' ? null : breakBetweenGames) : null,

                prize_type: (activeTab === 'tournament' || activeTab === 'league') ? prizeType : null,
                prize_pool_percentage: (activeTab === 'tournament' || activeTab === 'league') && prizeType === 'Percentage Pool (Scaling Pot)' ? (prizePoolPercentage === '' ? null : prizePoolPercentage) : null,
                fixed_prize_amount: (activeTab === 'tournament' || activeTab === 'league') && prizeType === 'Fixed Cash Bounty' ? (fixedPrizeAmount === '' ? null : fixedPrizeAmount) : null,
                reward: (activeTab === 'tournament' || activeTab === 'league') && prizeType === 'Physical Item' ? reward : null,
                has_mvp_reward: (activeTab === 'tournament' || activeTab === 'league') ? (prizeType !== 'No Official Prize') : false,
            };

            if (action === 'create') {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("You must be logged in.");

                const { error: insertError } = await supabase.from('games').insert([{
                    ...payload,
                    host_ids: [user.id] 
                }]);
                if (insertError) throw insertError;

                router.push('/admin');
                router.refresh();

            } else {
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

    if (!isLoaded) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /> Loading...</div>;

    const tabs = [
        { id: 'standard', label: 'Standard Pickup' },
        { id: 'tournament', label: 'Micro-Tournament' },
        { id: 'league', label: 'Multi-Week League' }
    ] as const;

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-sm">
                    {error}
                </div>
            )}

            <div className="flex bg-white/5 p-1 rounded-sm border border-white/10 overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[150px] py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-sm ${
                            activeTab === tab.id
                                ? 'bg-[#cbff00] text-black shadow-lg'
                                : 'text-pitch-secondary hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'standard' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                    
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Save className="w-5 h-5 text-[#cbff00]" /> Match Info
                        </h3>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Game Title
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Event Rules & Description
                            </label>
                            <textarea
                                value={rulesDescription}
                                onChange={(e) => setRulesDescription(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                rows={4}
                            />
                        </div>

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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors pl-10"
                                />
                                <div className="absolute left-3 top-3.5 text-gray-500">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                {status === "OK" && (
                                    <ul className="absolute z-50 w-full bg-gray-900 border border-white/10 shadow-xl rounded-sm mt-1 max-h-60 overflow-auto">
                                        {data.map(({ place_id, description: desc }) => (
                                            <li
                                                key={place_id}
                                                onClick={() => handleSelectLocation(desc)}
                                                className="p-3 hover:bg-white/10 cursor-pointer text-sm text-gray-300 border-b border-white/5 last:border-0"
                                            >
                                                {desc}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Location Nick Name
                            </label>
                            <input
                                type="text"
                                value={locationNickname}
                                onChange={(e) => setLocationNickname(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            />
                        </div>

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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary">
                                        Price ($)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setPrice(0)}
                                        className="text-[10px] bg-[#cbff00] text-black px-2 py-0.5 rounded uppercase font-black hover:bg-white transition-colors"
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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Max Players
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="2"
                                    value={maxPlayers}
                                    onChange={(e) => setMaxPlayers(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Game Format
                                </label>
                                <select
                                    value={gameFormatType}
                                    onChange={(e) => setGameFormatType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['1 v 1', '2 v 2', '3 v 3', '4 v 4', '5 v 5', '6 v 6', '7 v 7', '8 v 8', '9 v 9', '10 v 10', '11 v 11'].map(format => (
                                        <option key={format} value={format}>{format}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Match Style
                                </label>
                                <select
                                    value={matchStyle}
                                    onChange={(e) => setMatchStyle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['Full Length', 'King', 'Tourney'].map(style => (
                                        <option key={style} value={style}>{style}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                            <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-[#cbff00]" /> Payment Methods
                            </h3>
                            <div className="flex gap-4 flex-wrap">
                                {['venmo', 'zelle', 'stripe'].map(method => (
                                    <label key={method} className="flex items-center gap-2 cursor-pointer select-none bg-black/20 px-3 py-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={allowedPaymentMethods.includes(method)}
                                            onChange={(e) => {
                                                if (e.target.checked) setAllowedPaymentMethods([...allowedPaymentMethods, method]);
                                                else setAllowedPaymentMethods(allowedPaymentMethods.filter(m => m !== method));
                                            }}
                                            className="w-4 h-4 accent-[#cbff00] rounded"
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

                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Refunds
                                </label>
                                <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm w-full">
                                    <input
                                        type="checkbox"
                                        id="isRefundable"
                                        checked={isRefundable}
                                        onChange={(e) => setIsRefundable(e.target.checked)}
                                        className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                                    />
                                    <label htmlFor="isRefundable" className="flex items-center gap-2 cursor-pointer select-none">
                                        <span className="text-xl">💳</span>
                                        <div>
                                            <p className="font-bold uppercase text-sm text-white">Allow Player Refunds?</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                            {isRefundable && (
                                <div className="flex-1 w-full animate-in fade-in slide-in-from-left-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                        Refund Cutoff (Hours Before)
                                    </label>
                                    <select
                                        value={refundCutoffHours}
                                        onChange={(e) => setRefundCutoffHours(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    >
                                        {[2, 6, 12, 24, 48, 72].map(hours => (
                                            <option key={hours} value={hours}>{hours} Hours</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Surface Type
                                </label>
                                <select
                                    value={surfaceType}
                                    onChange={(e) => setSurfaceType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['Outdoor Turf', 'Grass', 'Indoor Court', 'Outdoor Court', 'Sand', 'Indoor Turf', 'Indoor Carpet'].map(surface => (
                                        <option key={surface} value={surface}>{surface}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Amount of Fields
                                </label>
                                <select
                                    value={amountOfFields}
                                    onChange={(e) => setAmountOfFields(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(amt => (
                                        <option key={amt} value={amt}>{amt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Field Size
                                </label>
                                <select
                                    value={fieldSize}
                                    onChange={(e) => setFieldSize(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['Small', 'Medium', 'Standard', 'Large', 'Full Pitch'].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                            <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2">
                                <span className="text-xl">👟</span> Allowed Shoe Types
                            </h3>
                            <div className="flex gap-4 flex-wrap">
                                {['FG Cleats', 'SG Cleats', 'AG Cleats', 'Turf Shoes', 'Court Shoes'].map(shoe => (
                                    <label key={shoe} className="flex items-center gap-2 cursor-pointer select-none bg-black/20 px-3 py-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={shoeTypes.includes(shoe)}
                                            onChange={(e) => {
                                                if (e.target.checked) setShoeTypes([...shoeTypes, shoe]);
                                                else setShoeTypes(shoeTypes.filter(s => s !== shoe));
                                            }}
                                            className="w-4 h-4 accent-[#cbff00] rounded"
                                        />
                                        <span className="uppercase text-xs font-bold">{shoe}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Users className="w-5 h-5 text-[#cbff00]" /> Team Config</span>
                            
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="1"
                                    placeholder="Qty"
                                    value={teamGeneratorCount}
                                    onChange={(e) => setTeamGeneratorCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-16 bg-black/30 border border-white/10 rounded-sm p-1 text-sm text-center text-white focus:border-[#cbff00] outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={generateTeams}
                                    className="text-xs flex items-center gap-1 bg-white/10 px-2 py-1.5 rounded hover:bg-white/20 transition-colors border border-white/5"
                                >
                                    Auto-Gen
                                </button>
                                <button
                                    type="button"
                                    onClick={addTeam}
                                    className="text-xs flex items-center gap-1 bg-[#cbff00]/10 text-[#cbff00] border border-[#cbff00]/30 px-2 py-1.5 rounded hover:bg-[#cbff00] hover:text-black transition-colors font-bold"
                                >
                                    <Plus className="w-3 h-3" /> Add Team
                                </button>
                            </div>
                        </h3>

                        {teams.map((team, index) => (
                            <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-sm relative group">
                                {teams.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTeam(index)}
                                        className="absolute top-2 right-2 text-red-500 hover:text-red-400 p-1 opacity-50 group-hover:opacity-100 transition-opacity"
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
                                            Player Limit
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={team.limit}
                                            onChange={(e) => handleTeamChange(index, 'limit', e.target.value === '' ? '' : parseInt(e.target.value))}
                                            className="w-full bg-black/30 border border-white/10 rounded-sm p-2 text-sm text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            )}

            {activeTab === 'tournament' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-[#cbff00]" /> Micro-Tournament Configurator
                        </h3>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Game Style
                            </label>
                            <select
                                value={gameStyle}
                                onChange={(e) => handleGameStyleChange(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            >
                                <option value="Group Stage/Playoffs">Group Stage/Playoffs</option>
                                <option value="Bracket">Bracket</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Tournament Title
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Event Rules & Description
                            </label>
                            <textarea
                                value={rulesDescription}
                                onChange={(e) => setRulesDescription(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                rows={4}
                            />
                        </div>

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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors pl-10"
                                />
                                <div className="absolute left-3 top-3.5 text-gray-500">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                {status === "OK" && (
                                    <ul className="absolute z-50 w-full bg-gray-900 border border-white/10 shadow-xl rounded-sm mt-1 max-h-60 overflow-auto">
                                        {data.map(({ place_id, description: desc }) => (
                                            <li
                                                key={place_id}
                                                onClick={() => handleSelectLocation(desc)}
                                                className="p-3 hover:bg-white/10 cursor-pointer text-sm text-gray-300 border-b border-white/5 last:border-0"
                                            >
                                                {desc}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Location Nick Name
                            </label>
                            <input
                                type="text"
                                value={locationNickname}
                                onChange={(e) => setLocationNickname(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            />
                        </div>

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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                        Total Team Fee ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={teamPrice}
                                        onChange={(e) => setTeamPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    />
                                </div>
                                <div className="border border-white/10 p-4 rounded-sm bg-white/5 space-y-4">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#cbff00] transition-colors">Registration Fee?</span>
                                        <input
                                            type="checkbox"
                                            checked={hasRegistrationFee}
                                            onChange={(e) => setHasRegistrationFee(e.target.checked)}
                                            className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                                        />
                                    </label>
                                    
                                    {hasRegistrationFee && (
                                        <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                                    Team Registration Fee ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={depositAmount}
                                                    onChange={(e) => setDepositAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                    className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={hasRegistrationFeeCredit}
                                                    onChange={(e) => setHasRegistrationFeeCredit(e.target.checked)}
                                                    className="w-4 h-4 accent-[#cbff00] rounded cursor-pointer"
                                                />
                                                <span className="text-xs font-bold uppercase text-pitch-secondary">Registration Fee Credit?</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                        Free Agent Sign Up Fee ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={freeAgentPrice}
                                        onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    />
                                </div>
                                <div className="border border-white/10 p-4 rounded-sm bg-white/5 pt-[22px] pb-[#22px]">
                                    <br/>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={hasFreeAgentCredit}
                                            onChange={(e) => setHasFreeAgentCredit(e.target.checked)}
                                            className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                                        />
                                        <span className="text-sm font-bold uppercase tracking-wider text-white">Free Agent Credit?</span>
                                    </label>
                                    <br/><br/>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Refund Cutoff Date
                                </label>
                                <input
                                    type="datetime-local"
                                    value={refundCutoffDate}
                                    onChange={(e) => setRefundCutoffDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div className="w-full h-full flex items-center pt-6">
                                <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm">
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        disabled
                                        className="w-5 h-5 accent-[#cbff00] rounded"
                                    />
                                    <span className="text-sm text-xl mr-1">💳</span>
                                    <span className="font-bold uppercase text-sm text-white">Allow Individual Player Refunds?</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                            <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-[#cbff00]" /> Payment Methods
                            </h3>
                            <div className="flex gap-4 flex-wrap">
                                {['venmo', 'zelle', 'stripe'].map(method => (
                                    <label key={method} className={`flex items-center gap-2 select-none bg-black/20 px-3 py-2 rounded border border-white/5 transition-colors ${method === 'stripe' ? 'opacity-50 cursor-not-allowed border-white/20' : 'opacity-30 cursor-not-allowed'}`}>
                                        <input
                                            type="checkbox"
                                            checked={method === 'stripe'}
                                            disabled
                                            className="w-4 h-4 accent-[#cbff00] rounded"
                                        />
                                        <span className="uppercase text-xs font-bold">
                                            {method === 'stripe' ? 'Credit Card (Stripe)' : method}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Half Length (Min)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={halfLength}
                                    onChange={(e) => setHalfLength(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Halftime Length (Min)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={halftimeLength}
                                    onChange={(e) => setHalftimeLength(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                            <div className="pt-6">
                                <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm">
                                    <span className="text-xl">⏱️</span>
                                    <span className="font-bold uppercase text-sm text-white flex-1 text-center">
                                        Total: {(typeof halfLength === 'number' ? halfLength : 0) * 2 + (typeof halftimeLength === 'number' ? halftimeLength : 0)} Min
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Minimum Teams
                                </label>
                                <select
                                    required
                                    value={minTeams}
                                    onChange={(e) => setMinTeams(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {minTeamOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt} Teams</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Maximum Teams
                                </label>
                                <select
                                    required
                                    value={maxTourneyTeams}
                                    onChange={(e) => setMaxTourneyTeams(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {maxTeamOptions.map(opt => (
                                        <option 
                                            key={opt} 
                                            value={opt} 
                                            disabled={opt < Number(minTeams)}
                                        >
                                            {opt} Teams
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Min Players (Per Team)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={minPlayersPerTeam}
                                    onChange={(e) => setMinPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Roster Lock Date
                                </label>
                                <input
                                    type="datetime-local"
                                    value={rosterLockDate}
                                    onChange={(e) => setRosterLockDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Game Format
                                </label>
                                <select
                                    value={gameFormatType}
                                    onChange={(e) => setGameFormatType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['1 v 1', '2 v 2', '3 v 3', '4 v 4', '5 v 5', '6 v 6', '7 v 7', '8 v 8', '9 v 9', '10 v 10', '11 v 11'].map(format => (
                                        <option key={format} value={format}>{format}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm w-full">
                            <input
                                type="checkbox"
                                id="strictWaiver"
                                checked={strictWaiverRequired}
                                onChange={(e) => setStrictWaiverRequired(e.target.checked)}
                                className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                            />
                            <label htmlFor="strictWaiver" className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-xl">📋</span>
                                <div>
                                    <p className="font-bold uppercase text-sm text-white">Strict event waiver (No Play without signature)</p>
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Surface Type
                                </label>
                                <select
                                    value={surfaceType}
                                    onChange={(e) => setSurfaceType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['Outdoor Turf', 'Grass', 'Indoor Court', 'Outdoor Court', 'Sand', 'Indoor Turf', 'Indoor Carpet'].map(surface => (
                                        <option key={surface} value={surface}>{surface}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Amount of Fields
                                </label>
                                <select
                                    value={amountOfFields}
                                    onChange={(e) => setAmountOfFields(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(amt => (
                                        <option key={amt} value={amt}>{amt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Field Size
                                </label>
                                <select
                                    value={fieldSize}
                                    onChange={(e) => setFieldSize(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['Small', 'Medium', 'Standard', 'Large', 'Full Pitch'].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                            <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2">
                                <span className="text-xl">👟</span> Allowed Shoe Types
                            </h3>
                            <div className="flex gap-4 flex-wrap">
                                {['FG Cleats', 'SG Cleats', 'AG Cleats', 'Turf Shoes', 'Court Shoes'].map(shoe => (
                                    <label key={shoe} className="flex items-center gap-2 cursor-pointer select-none bg-black/20 px-3 py-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={shoeTypes.includes(shoe)}
                                            onChange={(e) => {
                                                if (e.target.checked) setShoeTypes([...shoeTypes, shoe]);
                                                else setShoeTypes(shoeTypes.filter(s => s !== shoe));
                                            }}
                                            className="w-4 h-4 accent-[#cbff00] rounded"
                                        />
                                        <span className="uppercase text-xs font-bold">{shoe}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-[#cbff00]" /> Prize Structure
                        </h3>
                        
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Prize Format Logic
                            </label>
                            <select
                                value={prizeType}
                                onChange={(e) => setPrizeType(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            >
                                <option value="No Official Prize">No Official Prize</option>
                                <option value="Percentage Pool (Scaling Pot)">Percentage Pool (Scaling Pot)</option>
                                <option value="Fixed Cash Bounty">Fixed Cash Bounty</option>
                                <option value="Physical Item">Physical Item</option>
                            </select>
                        </div>

                        {prizeType === 'Percentage Pool (Scaling Pot)' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Prize Pool Percentage (%)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    required
                                    value={prizePoolPercentage}
                                    onChange={(e) => setPrizePoolPercentage(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                                <p className="text-xs text-pitch-secondary mt-2 italic">What percentage of the total registration pot goes to the winner?</p>
                            </div>
                        )}

                        {prizeType === 'Fixed Cash Bounty' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Fixed Prize Amount ($)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={fixedPrizeAmount}
                                    onChange={(e) => setFixedPrizeAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                                <p className="text-xs text-pitch-secondary mt-2 italic">A guaranteed payout regardless of team count.</p>
                            </div>
                        )}

                        {prizeType === 'Physical Item' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Reward Details
                                </label>
                                <textarea
                                    required
                                    value={reward}
                                    onChange={(e) => setReward(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    placeholder="e.g. Free Jerseys, Trophy, Sponsor Swag Box"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'league' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-[#cbff00]" /> Multi-Week League Configurator
                        </h3>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                League Title
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Event Rules & Description
                            </label>
                            <textarea
                                value={rulesDescription}
                                onChange={(e) => setRulesDescription(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                rows={4}
                            />
                        </div>

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
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors pl-10"
                                />
                                <div className="absolute left-3 top-3.5 text-gray-500">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                {status === "OK" && (
                                    <ul className="absolute z-50 w-full bg-gray-900 border border-white/10 shadow-xl rounded-sm mt-1 max-h-60 overflow-auto">
                                        {data.map(({ place_id, description: desc }) => (
                                            <li
                                                key={place_id}
                                                onClick={() => handleSelectLocation(desc)}
                                                className="p-3 hover:bg-white/10 cursor-pointer text-sm text-gray-300 border-b border-white/5 last:border-0"
                                            >
                                                {desc}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Location Nick Name
                            </label>
                            <input
                                type="text"
                                value={locationNickname}
                                onChange={(e) => setLocationNickname(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Start Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={gameDate}
                                    onChange={(e) => setGameDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Earliest Game Start Time
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={earliestGameStartTime}
                                    onChange={(e) => setEarliestGameStartTime(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Latest Game Start Time
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={latestGameStartTime}
                                    onChange={(e) => setLatestGameStartTime(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Amount of Fields
                                </label>
                                <select
                                    value={amountOfFields}
                                    onChange={(e) => {
                                        const newAmt = e.target.value === '' ? '' : parseInt(e.target.value);
                                        setAmountOfFields(newAmt);
                                        if (typeof newAmt === 'number') {
                                            setFieldNames(prev => {
                                                const next = [...prev];
                                                while (next.length < newAmt) next.push('');
                                                return next.slice(0, newAmt);
                                            });
                                        }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(amt => (
                                        <option key={amt} value={amt}>{amt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Field Size
                                </label>
                                <select
                                    value={fieldSize}
                                    onChange={(e) => setFieldSize(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['Small', 'Medium', 'Standard', 'Large', 'Full Pitch'].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {fieldNames.length > 0 && typeof amountOfFields === 'number' && (
                            <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                                <h3 className="font-bold uppercase text-sm text-white border-b border-white/10 pb-2">Field Names</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {fieldNames.map((name, index) => (
                                        <div key={index}>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                                Field {index + 1}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder={`e.g. Court ${index + 1}`}
                                                value={name}
                                                onChange={(e) => {
                                                    const updatedNames = [...fieldNames];
                                                    updatedNames[index] = e.target.value;
                                                    setFieldNames(updatedNames);
                                                }}
                                                className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                        Total Team Fee ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={teamPrice}
                                        onChange={(e) => setTeamPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    />
                                </div>
                                <div className="border border-white/10 p-4 rounded-sm bg-white/5 space-y-4">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#cbff00] transition-colors">Registration Fee?</span>
                                        <input
                                            type="checkbox"
                                            checked={hasRegistrationFee}
                                            onChange={(e) => setHasRegistrationFee(e.target.checked)}
                                            className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                                        />
                                    </label>
                                    
                                    {hasRegistrationFee && (
                                        <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                                    Team Registration Fee ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={depositAmount}
                                                    onChange={(e) => setDepositAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                    className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={hasRegistrationFeeCredit}
                                                    onChange={(e) => setHasRegistrationFeeCredit(e.target.checked)}
                                                    className="w-4 h-4 accent-[#cbff00] rounded cursor-pointer"
                                                />
                                                <span className="text-xs font-bold uppercase text-pitch-secondary">Registration Fee Credit?</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                        Free Agent Sign Up Fee ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={freeAgentPrice}
                                        onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    />
                                </div>
                                <div className="border border-white/10 p-4 rounded-sm bg-white/5 pt-[22px] pb-[#22px]">
                                    <br/>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={hasFreeAgentCredit}
                                            onChange={(e) => setHasFreeAgentCredit(e.target.checked)}
                                            className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                                        />
                                        <span className="text-sm font-bold uppercase tracking-wider text-white">Free Agent Credit?</span>
                                    </label>
                                    <br/><br/>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Refund Cutoff Date
                                </label>
                                <input
                                    type="datetime-local"
                                    value={refundCutoffDate}
                                    onChange={(e) => setRefundCutoffDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div className="w-full h-full flex items-center pt-6">
                                <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm">
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        disabled
                                        className="w-5 h-5 accent-[#cbff00] rounded"
                                    />
                                    <span className="text-sm text-xl mr-1">💳</span>
                                    <span className="font-bold uppercase text-sm text-white">Allow Individual Player Refunds?</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                            <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-[#cbff00]" /> Payment Methods
                            </h3>
                            <div className="flex gap-4 flex-wrap">
                                {['venmo', 'zelle', 'stripe'].map(method => (
                                    <label key={method} className={`flex items-center gap-2 select-none bg-black/20 px-3 py-2 rounded border border-white/5 transition-colors ${method === 'stripe' ? 'opacity-50 cursor-not-allowed border-white/20' : 'opacity-30 cursor-not-allowed'}`}>
                                        <input
                                            type="checkbox"
                                            checked={method === 'stripe'}
                                            disabled
                                            className="w-4 h-4 accent-[#cbff00] rounded"
                                        />
                                        <span className="uppercase text-xs font-bold">
                                            {method === 'stripe' ? 'Credit Card (Stripe)' : method}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Minimum Teams
                                </label>
                                <select
                                    required
                                    value={minTeams}
                                    onChange={(e) => setMinTeams(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {groupStageOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt} Teams</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Maximum Teams
                                </label>
                                <select
                                    required
                                    value={maxTourneyTeams}
                                    onChange={(e) => setMaxTourneyTeams(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {maxGroupStageOptions.map(opt => (
                                        <option 
                                            key={opt} 
                                            value={opt} 
                                            disabled={opt < Number(minTeams)}
                                        >
                                            {opt} Teams
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Minimum Games Guaranteed
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={minGamesGuaranteed}
                                    onChange={(e) => setMinGamesGuaranteed(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                            <div className="border border-white/10 p-4 rounded-sm bg-white/5 space-y-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={hasPlayoffBye}
                                        onChange={(e) => setHasPlayoffBye(e.target.checked)}
                                        className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                                    />
                                    <span className="text-sm font-bold uppercase tracking-wider text-white">First Place Bye</span>
                                </label>
                                
                                <div className="pt-2 border-t border-white/10">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                        Teams into Playoffs
                                    </label>
                                    <select
                                        required
                                        value={teamsIntoPlayoffs}
                                        onChange={(e) => setTeamsIntoPlayoffs(Number(e.target.value))}
                                        className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    >
                                        {playoffOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt} Teams</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Half Length (Min)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={halfLength}
                                    onChange={(e) => setHalfLength(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Halftime Length (Min)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={halftimeLength}
                                    onChange={(e) => setHalftimeLength(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                            <div className="pt-6">
                                <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm">
                                    <span className="text-xl">⏱️</span>
                                    <span className="font-bold uppercase text-sm text-white flex-1 text-center">
                                        Total: {(typeof halfLength === 'number' ? halfLength : 0) * 2 + (typeof halftimeLength === 'number' ? halftimeLength : 0)} Min
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Break Between Games (Min)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={breakBetweenGames}
                                    onChange={(e) => setBreakBetweenGames(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Min Players (Per Team)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={minPlayersPerTeam}
                                    onChange={(e) => setMinPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Roster Lock Date
                                </label>
                                <input
                                    type="datetime-local"
                                    value={rosterLockDate}
                                    onChange={(e) => setRosterLockDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Game Format
                                </label>
                                <select
                                    value={gameFormatType}
                                    onChange={(e) => setGameFormatType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['1 v 1', '2 v 2', '3 v 3', '4 v 4', '5 v 5', '6 v 6', '7 v 7', '8 v 8', '9 v 9', '10 v 10', '11 v 11'].map(format => (
                                        <option key={format} value={format}>{format}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm w-full">
                            <input
                                type="checkbox"
                                id="strictWaiverLeague"
                                checked={strictWaiverRequired}
                                onChange={(e) => setStrictWaiverRequired(e.target.checked)}
                                className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                            />
                            <label htmlFor="strictWaiverLeague" className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-xl">📋</span>
                                <div>
                                    <p className="font-bold uppercase text-sm text-white">Strict event waiver (No Play without signature)</p>
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Surface Type
                                </label>
                                <select
                                    value={surfaceType}
                                    onChange={(e) => setSurfaceType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    {['Outdoor Turf', 'Grass', 'Indoor Court', 'Outdoor Court', 'Sand', 'Indoor Turf', 'Indoor Carpet'].map(surface => (
                                        <option key={surface} value={surface}>{surface}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="space-y-4 pt-1">
                                    <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2">
                                        <span className="text-xl">👟</span> Allowed Shoe Types
                                    </h3>
                                    <div className="flex gap-4 flex-wrap">
                                        {['FG Cleats', 'SG Cleats', 'AG Cleats', 'Turf Shoes', 'Court Shoes'].map(shoe => (
                                            <label key={shoe} className="flex items-center gap-2 cursor-pointer select-none bg-black/20 px-3 py-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={shoeTypes.includes(shoe)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setShoeTypes([...shoeTypes, shoe]);
                                                        else setShoeTypes(shoeTypes.filter(s => s !== shoe));
                                                    }}
                                                    className="w-4 h-4 accent-[#cbff00] rounded"
                                                />
                                                <span className="uppercase text-xs font-bold">{shoe}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-[#cbff00]" /> Prize Structure
                        </h3>
                        
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Prize Format Logic
                            </label>
                            <select
                                value={prizeType}
                                onChange={(e) => setPrizeType(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            >
                                <option value="No Official Prize">No Official Prize</option>
                                <option value="Percentage Pool (Scaling Pot)">Percentage Pool (Scaling Pot)</option>
                                <option value="Fixed Cash Bounty">Fixed Cash Bounty</option>
                                <option value="Physical Item">Physical Item</option>
                            </select>
                        </div>

                        {prizeType === 'Percentage Pool (Scaling Pot)' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Prize Pool Percentage (%)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    required
                                    value={prizePoolPercentage}
                                    onChange={(e) => setPrizePoolPercentage(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                                <p className="text-xs text-pitch-secondary mt-2 italic">What percentage of the total registration pot goes to the winner?</p>
                            </div>
                        )}

                        {prizeType === 'Fixed Cash Bounty' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Fixed Prize Amount ($)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={fixedPrizeAmount}
                                    onChange={(e) => setFixedPrizeAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                                <p className="text-xs text-pitch-secondary mt-2 italic">A guaranteed payout regardless of team count.</p>
                            </div>
                        )}

                        {prizeType === 'Physical Item' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Reward Details
                                </label>
                                <textarea
                                    required
                                    value={reward}
                                    onChange={(e) => setReward(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                    placeholder="e.g. Free Jerseys, Trophy, Sponsor Swag Box"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={loading || (action === 'create' && !isLoaded)}
                className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2 mt-8"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <><Save className="w-5 h-5 text-black" /> {action === 'create' ? 'Create Match' : 'Save Changes'}</>}
            </button>
        </form>
    );
}
