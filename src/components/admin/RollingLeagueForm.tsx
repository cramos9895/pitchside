'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
    Calendar, 
    Clock, 
    Save, 
    Trophy, 
    MapPin, 
    Trash2, 
    DollarSign, 
    Zap, 
    Loader2, 
    ShieldCheck 
} from 'lucide-react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import { updateGame } from '@/app/actions/update-game';
import { Game, Booking, Profile, Match, Team } from "@/types/index";

const LIBRARIES: ("places")[] = ["places"];

interface RollingLeagueFormProps {
    initialData?: unknown;
    action?: 'create' | 'edit';
    onSuccess?: () => void;
}

export function RollingLeagueForm({ initialData, action = 'create', onSuccess }: RollingLeagueFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    // Core Info
    // @ts-expect-error - Requires complex schema extension
    const [title, setTitle] = useState(initialData?.title || '');
    // @ts-expect-error - Requires complex schema extension
    const [rulesDescription, setRulesDescription] = useState(initialData?.rules_description || '');
    // @ts-expect-error - Requires complex schema extension
    const [locationName, setLocationName] = useState(initialData?.location || '');
    const [coords, setCoords] = useState<{ lat: number | null, lng: number | null }>({
        // @ts-expect-error - Requires complex schema extension
        lat: initialData?.latitude || null,
        // @ts-expect-error - Requires complex schema extension
        lng: initialData?.longitude || null
    });
    // @ts-expect-error - Requires complex schema extension
    const [locationNickname, setLocationNickname] = useState(initialData?.location_nickname || '');
    // @ts-expect-error - Requires complex schema extension
    const [surfaceType, setSurfaceType] = useState(initialData?.surface_type || 'Outdoor Turf');
    // @ts-expect-error - Requires complex schema extension
    const [amountOfFields, setAmountOfFields] = useState<number | ''>(initialData?.amount_of_fields ?? 1);
    // @ts-expect-error - Requires complex schema extension
    const [fieldSize, setFieldSize] = useState(initialData?.field_size || 'Standard');
    // @ts-expect-error - Requires complex schema extension
    const [shoeTypes, setShoeTypes] = useState<string[]>(initialData?.shoe_types || ['Turf Shoes', 'FG Cleats']);
    // @ts-expect-error - Requires complex schema extension
    const [fieldNames, setFieldNames] = useState<string[]>(initialData?.field_names || ['']);

    // Rolling League Specific Timing
    // @ts-expect-error - Requires complex schema extension
    const [rollingStartDate, setRollingStartDate] = useState(initialData?.start_time ? new Date(initialData.start_time).toISOString().slice(0, 10) : '');
    // @ts-expect-error - Requires complex schema extension
    const [startTime, setStartTime] = useState(initialData?.start_time ? new Date(initialData.start_time).toTimeString().slice(0, 5) : '');
    // @ts-expect-error - Requires complex schema extension
    const [earliestGameStartTime, setEarliestGameStartTime] = useState<string>(initialData?.earliest_game_start_time || '');
    // @ts-expect-error - Requires complex schema extension
    const [latestGameStartTime, setLatestGameStartTime] = useState<string>(initialData?.latest_game_start_time || '');
    // @ts-expect-error - Requires complex schema extension
    const [teamSignupCutoff, setTeamSignupCutoff] = useState<string>(initialData?.team_signup_cutoff ? new Date(initialData.team_signup_cutoff).toISOString().slice(0, 16) : '');
    // @ts-expect-error - Requires complex schema extension
    const [rosterLockDate, setRosterLockDate] = useState(initialData?.roster_lock_date ? new Date(initialData.roster_lock_date).toISOString().slice(0, 16) : '');
    
    // Formatting & Duration
    // @ts-expect-error - Requires complex schema extension
    const [gameFormatType, setGameFormatType] = useState(initialData?.game_format_type || '7 v 7');
    // @ts-expect-error - Requires complex schema extension
    const [halfLength, setHalfLength] = useState<number | ''>(initialData?.half_length ?? 25);
    // @ts-expect-error - Requires complex schema extension
    const [halftimeLength, setHalftimeLength] = useState<number | ''>(initialData?.halftime_length ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [breakBetweenGames, setBreakBetweenGames] = useState<number | ''>(initialData?.break_between_games ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [totalGameTime, setTotalGameTime] = useState<number | ''>(initialData?.total_game_time ?? 60);

    // Phase 4 Cash & Payment Engine
    // @ts-expect-error - Requires complex schema extension
    const [paymentCollectionType, setPaymentCollectionType] = useState<'stripe' | 'cash'>(initialData?.payment_collection_type || 'stripe');
    // @ts-expect-error - Requires complex schema extension
    const [cashFeeStructure, setCashFeeStructure] = useState<'per_game' | 'upfront'>(initialData?.cash_fee_structure || 'per_game');
    // @ts-expect-error - Requires complex schema extension
    const [cashAmount, setCashAmount] = useState<number | ''>(initialData?.cash_amount ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [allowFreeAgents, setAllowFreeAgents] = useState<boolean>(initialData?.allow_free_agents || false);
    // @ts-expect-error - Requires complex schema extension
    const [hasTeamRegistrationFee, setHasTeamRegistrationFee] = useState<boolean>(!!initialData?.team_registration_fee);
    // @ts-expect-error - Requires complex schema extension
    const [teamRegistrationFee, setTeamRegistrationFee] = useState<number | ''>(initialData?.team_registration_fee ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [deductTeamRegFee, setDeductTeamRegFee] = useState<boolean>(initialData?.deduct_team_reg_fee ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [hasPlayerRegistrationFee, setHasPlayerRegistrationFee] = useState<boolean>(!!initialData?.player_registration_fee);
    // @ts-expect-error - Requires complex schema extension
    const [playerRegistrationFee, setPlayerRegistrationFee] = useState<number | ''>(initialData?.player_registration_fee ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [teamPrice, setTeamPrice] = useState<number | ''>(initialData?.team_price ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [freeAgentPrice, setFreeAgentPrice] = useState<number | ''>(initialData?.free_agent_price ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [hasFreeAgentCredit, setHasFreeAgentCredit] = useState(initialData?.has_free_agent_credit ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [isRefundable, setIsRefundable] = useState(initialData?.is_refundable ?? true);

    // Bracket & Season Transitions
    // @ts-expect-error - Requires complex schema extension
    const [minTeams, setMinTeams] = useState<number | ''>(initialData?.min_teams ?? 4);
    // @ts-expect-error - Requires complex schema extension
    const [maxTourneyTeams, setMaxTourneyTeams] = useState<number | ''>(initialData?.max_teams ?? 8);
    // @ts-expect-error - Requires complex schema extension
    const [minPlayersPerTeam, setMinPlayersPerTeam] = useState<number | ''>(initialData?.min_players_per_team ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState<number | ''>(initialData?.max_players_per_team ?? 12);
    // @ts-expect-error - Requires complex schema extension
    const [hasSeasonEndDate, setHasSeasonEndDate] = useState<boolean>(!!initialData?.league_end_date);
    // @ts-expect-error - Requires complex schema extension
    const [seasonEndDate, setSeasonEndDate] = useState<string>(initialData?.league_end_date ? new Date(initialData.league_end_date).toISOString().slice(0, 10) : '');
    // @ts-expect-error - Requires complex schema extension
    const [playoffStartDate, setPlayoffStartDate] = useState(initialData?.playoff_start_date ? new Date(initialData.playoff_start_date).toISOString().slice(0, 10) : '');
    // @ts-expect-error - Requires complex schema extension
    const [hasPlayoffBye, setHasPlayoffBye] = useState<boolean>(initialData?.has_playoff_bye ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [teamsIntoPlayoffs, setTeamsIntoPlayoffs] = useState<number>(initialData?.teams_into_playoffs ?? 4);

    // Playoff bye logic
    const playoffOptions = hasPlayoffBye ? [5, 9] : [4, 8];
    useEffect(() => {
        if (!playoffOptions.includes(teamsIntoPlayoffs)) {
            setTeamsIntoPlayoffs(playoffOptions[0]);
        }
    }, [hasPlayoffBye, playoffOptions, teamsIntoPlayoffs]);

    // Phase 4 Waivers & Lifecycle Overrides
    // @ts-expect-error - Requires complex schema extension
    const [strictWaiverRequired, setStrictWaiverRequired] = useState(initialData?.strict_waiver_required ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [waiverDetails, setWaiverDetails] = useState(initialData?.waiver_details || '');
    // @ts-expect-error - Requires complex schema extension
    const [skippedDates, setSkippedDates] = useState<string[]>(initialData?.skipped_dates || []);
    const [newSkipDate, setNewSkipDate] = useState<string>('');

    // Prizes
    // @ts-expect-error - Requires complex schema extension
    const [prizeType, setPrizeType] = useState<string>(initialData?.prize_type || 'No Official Prize');
    // @ts-expect-error - Requires complex schema extension
    const [prizePoolPercentage, setPrizePoolPercentage] = useState<number | ''>(initialData?.prize_pool_percentage ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [fixedPrizeAmount, setFixedPrizeAmount] = useState<number | ''>(initialData?.fixed_prize_amount ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [reward, setReward] = useState<string>(initialData?.reward || '');

    useEffect(() => {
        if (paymentCollectionType === 'cash') setIsRefundable(false);
        else { setCashAmount(''); setCashFeeStructure('per_game'); }
    }, [paymentCollectionType]);

    useEffect(() => {
        if (!strictWaiverRequired) setWaiverDetails('');
    }, [strictWaiverRequired]);

    // 🔄 Sync Total Match Slot Time
    useEffect(() => {
        const h = typeof halfLength === 'number' ? halfLength : 0;
        const ht = typeof halftimeLength === 'number' ? halftimeLength : 0;
        const b = typeof breakBetweenGames === 'number' ? breakBetweenGames : 0;
        setTotalGameTime((h * 2) + ht + b);
    }, [halfLength, halftimeLength, breakBetweenGames]);

    const { ready, value, setValue, suggestions: { status, data }, clearSuggestions, init } = usePlacesAutocomplete({
        // @ts-expect-error - Requires complex schema extension
        requestOptions: {}, defaultValue: initialData?.location || '', initOnMount: false
    });

    useEffect(() => { if (isLoaded) init(); }, [isLoaded, init]);

    const handleSelectLocation = async (address: string) => {
        setValue(address, false); setLocationName(address); clearSuggestions();
        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            setCoords({ lat, lng });
        } catch (error) { console.error("Error finding coordinates: ", error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError(null);
        try {
            let startDateTime = rollingStartDate ? new Date(`${rollingStartDate}T${startTime || '18:00'}`) : null;
            const payload = {
                title, rules_description: rulesDescription, location: locationName, location_nickname: locationNickname,
                latitude: coords.lat, longitude: coords.lng, start_time: startDateTime ? startDateTime.toISOString() : null,
                event_type: 'league', is_league: true, league_format: 'rolling', game_format_type: gameFormatType,
                surface_type: surfaceType, amount_of_fields: amountOfFields === '' ? null : amountOfFields, field_size: fieldSize,
                shoe_types: shoeTypes, payment_collection_type: paymentCollectionType,
                cash_fee_structure: paymentCollectionType === 'cash' ? cashFeeStructure : null,
                cash_amount: paymentCollectionType === 'cash' ? (cashAmount === '' ? null : cashAmount) : null,
                allow_free_agents: allowFreeAgents, charge_team_registration_fee: hasTeamRegistrationFee,
                team_registration_fee: hasTeamRegistrationFee ? (teamRegistrationFee === '' ? null : teamRegistrationFee) : null,
                deduct_team_reg_fee: hasTeamRegistrationFee ? deductTeamRegFee : false,
                player_registration_fee: hasPlayerRegistrationFee ? (playerRegistrationFee === '' ? null : playerRegistrationFee) : null,
                league_end_date: hasSeasonEndDate && seasonEndDate ? new Date(seasonEndDate).toISOString() : null,
                team_signup_cutoff: teamSignupCutoff ? new Date(teamSignupCutoff).toISOString() : null,
                waiver_details: waiverDetails || null,
                skipped_dates: skippedDates, max_players: null, is_refundable: paymentCollectionType === 'cash' ? false : isRefundable,
                refund_cutoff_date: teamSignupCutoff ? new Date(teamSignupCutoff).toISOString() : null,
                team_price: teamPrice === '' ? null : teamPrice,
                free_agent_price: paymentCollectionType === 'cash' && cashFeeStructure === 'per_game' ? null : (freeAgentPrice === '' ? null : freeAgentPrice),
                has_free_agent_credit: hasFreeAgentCredit, strict_waiver_required: strictWaiverRequired,
                half_length: halfLength === '' ? null : halfLength, halftime_length: halftimeLength === '' ? null : halftimeLength,
                total_game_time: totalGameTime === '' ? 60 : totalGameTime, earliest_game_start_time: earliestGameStartTime || null,
                latest_game_start_time: latestGameStartTime || null, field_names: fieldNames, break_between_games: breakBetweenGames === '' ? null : breakBetweenGames,
                prize_type: prizeType, prize_pool_percentage: prizeType === 'Percentage Pool (Scaling Pot)' ? (prizePoolPercentage === '' ? null : prizePoolPercentage) : null,
                fixed_prize_amount: prizeType === 'Fixed Cash Bounty' ? (fixedPrizeAmount === '' ? null : fixedPrizeAmount) : null,
                reward: prizeType === 'Physical Item' ? reward : null, has_mvp_reward: prizeType !== 'No Official Prize',
                roster_lock_date: rosterLockDate ? new Date(rosterLockDate).toISOString() : null,
                min_teams: minTeams === '' ? null : minTeams, max_teams: maxTourneyTeams === '' ? null : maxTourneyTeams,
                min_players_per_team: minPlayersPerTeam === '' ? null : minPlayersPerTeam, max_players_per_team: maxPlayersPerTeam === '' ? null : maxPlayersPerTeam,
                has_playoff_bye: hasPlayoffBye, teams_into_playoffs: teamsIntoPlayoffs,
                playoff_start_date: playoffStartDate ? new Date(playoffStartDate).toISOString() : null,
            };

            if (action === 'create') {
                const { data: { user } } = await supabase.auth.getSession().then(({data}) => ({ data: { user: data.session?.user } }));
                if (!user) throw new Error("You must be logged in.");
                const { error: insertError } = await supabase.from('games').insert([{ ...payload, host_ids: [user.id] }]);
                if (insertError) throw insertError;
                router.push('/admin'); router.refresh();
            } else {
                // @ts-expect-error - Requires complex schema extension
                if (!initialData?.id) throw new Error("Missing Game ID for edit.");
                // @ts-expect-error - Requires complex schema extension
                await updateGame(initialData.id, payload);
                if (onSuccess) onSuccess();
            }
        // @ts-expect-error - Requires complex schema extension
        } catch (err: unknown) { setError(err.message || "Failed to save game."); } finally { setLoading(false); }
    };

    if (!isLoaded) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300">
             {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-sm">{error}</div>}
             
             <div className="space-y-6">
                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#cbff00]" /> Rolling League Provisioning
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            League Name / Title
                        </label>
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Wednesday Premier Rolling Open"
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Mandatory Kickoff Date
                        </label>
                        <input
                            type="date"
                            required
                            value={rollingStartDate}
                            onChange={(e) => setRollingStartDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                        Event Rules & Description
                    </label>
                    <textarea
                        value={rulesDescription}
                        onChange={(e) => setRulesDescription(e.target.value)}
                        placeholder="Outline league specific rules, substitution policies, etc."
                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors min-h-[100px]"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Location (Google Search)
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
                                autoComplete="off"
                            />
                            <div className="absolute left-3 top-3.5 text-gray-500">
                                <MapPin className="w-4 h-4" />
                            </div>
                            {status === "OK" && (
                                <ul className="absolute z-[100] w-full bg-gray-900 border border-white/10 shadow-xl rounded-sm mt-1 max-h-60 overflow-auto">
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
                            Location Nick Name (e.g. Field 4)
                        </label>
                        <input
                            value={locationNickname}
                            onChange={(e) => setLocationNickname(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                        const final = next.slice(0, newAmt);
                                        return final;
                                    });
                                }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(amt => (
                                <option key={amt} value={amt}>{amt}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
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
                    <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <h3 className="font-bold uppercase text-[10px] tracking-widest text-[#cbff00] border-b border-white/10 pb-2">Pitch Designations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {fieldNames.map((name, index) => (
                                <div key={index}>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-pitch-secondary mb-1">
                                        Field {index + 1} Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={`e.g. Field ${index + 1}`}
                                        value={name}
                                        onChange={(e) => {
                                            const updatedNames = [...fieldNames];
                                            updatedNames[index] = e.target.value;
                                            setFieldNames(updatedNames);
                                        }}
                                        className="w-full bg-black/30 border border-white/10 rounded-sm p-2 text-white focus:outline-none focus:border-[#cbff00] transition-colors text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
                     <div className="space-y-3">
                        <h3 className="font-bold uppercase text-[10px] tracking-widest text-pitch-secondary">
                             Allowed Shoe Types
                        </h3>
                        <div className="flex gap-1.5 flex-wrap">
                            {['FG Cleats', 'SG Cleats', 'AG Cleats', 'Turf Shoes', 'Court Shoes'].map(shoe => (
                                <label key={shoe} className="flex items-center gap-1.5 cursor-pointer select-none bg-white/5 px-2.5 py-1.5 rounded-sm border border-white/5 hover:border-white/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={shoeTypes.includes(shoe)}
                                        onChange={(e) => {
                                            if (e.target.checked) setShoeTypes([...shoeTypes, shoe]);
                                            else setShoeTypes(shoeTypes.filter((s: unknown) => s !== shoe));
                                        }}
                                        className="w-3.5 h-3.5 accent-[#cbff00] rounded"
                                    />
                                    <span className="uppercase text-[9px] font-black tracking-tight">{shoe}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Half Length (Min)
                        </label>
                        <input
                            type="number"
                            value={halfLength}
                            onChange={(e) => setHalfLength(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Halftime (Min)
                        </label>
                        <input
                            type="number"
                            value={halftimeLength}
                            onChange={(e) => setHalftimeLength(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Break (Min)
                        </label>
                        <input
                            type="number"
                            value={breakBetweenGames}
                            onChange={(e) => setBreakBetweenGames(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#cbff00] mb-2">
                            Total Slot Time
                        </label>
                        <div className="w-full bg-[#cbff00]/10 border border-[#cbff00]/20 rounded-sm p-3 text-[#cbff00] font-black text-center h-[50px] flex items-center justify-center">
                            {((typeof halfLength === 'number' ? halfLength : 0) * 2) + 
                             (typeof halftimeLength === 'number' ? halftimeLength : 0) + 
                             (typeof breakBetweenGames === 'number' ? breakBetweenGames : 0)} MIN
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Min Teams
                        </label>
                        <input
                            type="number"
                            value={minTeams}
                            onChange={(e) => setMinTeams(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary">
                                Max Teams
                            </label>
                            <button
                                type="button"
                                onClick={() => setMaxTourneyTeams(maxTourneyTeams === '' ? 8 : '')}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors border ${maxTourneyTeams === '' ? 'bg-[#cbff00] text-black border-[#cbff00]' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'}`}
                            >
                                Unlimited
                            </button>
                        </div>
                        <input
                            type="number"
                            value={maxTourneyTeams}
                            disabled={maxTourneyTeams === ''}
                            onChange={(e) => setMaxTourneyTeams(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={maxTourneyTeams === '' ? 'Unlimited Teams' : ''}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Min Players / Team
                        </label>
                        <input
                            type="number"
                            value={minPlayersPerTeam}
                            onChange={(e) => setMinPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary">
                                Max Players / Team
                            </label>
                            <button
                                type="button"
                                onClick={() => setMaxPlayersPerTeam(maxPlayersPerTeam === '' ? 12 : '')}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors border ${maxPlayersPerTeam === '' ? 'bg-[#cbff00] text-black border-[#cbff00]' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'}`}
                            >
                                Unlimited
                            </button>
                        </div>
                        <input
                            type="number"
                            value={maxPlayersPerTeam}
                            disabled={maxPlayersPerTeam === ''}
                            onChange={(e) => setMaxPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={maxPlayersPerTeam === '' ? 'Unlimited Roster' : ''}
                        />
                    </div>
                </div>
             </div>

             <div className="space-y-6">
                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#cbff00]" /> Season Timeline
                    </div>
                    {rollingStartDate && (
                        <div className="flex items-center gap-2 text-[10px] font-sans not-italic text-pitch-secondary font-black uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-sm border border-white/10">
                            <span className="text-[#cbff00]">Kickoff:</span> 
                            {new Date(rollingStartDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                        </div>
                    )}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Team Sign Up Cut Off Date
                        </label>
                        <input
                            type="datetime-local"
                            step="60"
                            value={teamSignupCutoff}
                            onChange={(e) => setTeamSignupCutoff(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Roster Lock Date
                        </label>
                        <input
                            type="datetime-local"
                            step="60"
                            value={rosterLockDate}
                            onChange={(e) => setRosterLockDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                        />
                        {teamSignupCutoff && rosterLockDate && new Date(rosterLockDate) < new Date(teamSignupCutoff) && (
                            <p className="text-[10px] text-red-500 mt-1 uppercase font-bold">Warning: Lock date is before signup cutoff</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Earliest Game Start (Daily Window)
                        </label>
                        <input
                            type="time"
                            step="900"
                            value={earliestGameStartTime}
                            onChange={(e) => setEarliestGameStartTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Latest Game Start (Daily Window)
                        </label>
                        <input
                            type="time"
                            step="900"
                            value={latestGameStartTime}
                            onChange={(e) => setLatestGameStartTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-[#cbff00]/5 border border-[#cbff00]/20 rounded-sm w-full">
                    <input
                        type="checkbox"
                        id="setSeasonEnd"
                        checked={hasSeasonEndDate}
                        onChange={(e) => setHasSeasonEndDate(e.target.checked)}
                        className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer"
                    />
                    <label htmlFor="setSeasonEnd" className="flex items-center gap-2 cursor-pointer select-none">
                        <Trophy className="w-4 h-4 text-[#cbff00]" />
                        <div>
                            <p className="font-bold uppercase text-sm text-white">Transition to Closed Playoff Loop</p>
                            <p className="text-[10px] text-pitch-secondary uppercase font-medium">Define an end date to finalize standings and start the bracket</p>
                        </div>
                    </label>
                </div>

                {hasSeasonEndDate && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Regular Season End Date
                                </label>
                                <input
                                    type="date"
                                    value={seasonEndDate}
                                    onChange={(e) => {
                                        const newEndDate = e.target.value;
                                        setSeasonEndDate(newEndDate);
                                        if (newEndDate) {
                                            const dateObj = new Date(newEndDate);
                                            dateObj.setDate(dateObj.getDate() + 7);
                                            setPlayoffStartDate(dateObj.toISOString().slice(0, 10));
                                        }
                                    }}
                                    className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Playoff Tournament Start Date
                                </label>
                                <input
                                    type="date"
                                    value={playoffStartDate}
                                    onChange={(e) => setPlayoffStartDate(e.target.value)}
                                    className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
                            
                            <div className="p-4 bg-[#cbff00]/10 border border-[#cbff00]/20 rounded-sm space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-[#cbff00] border-b border-[#cbff00]/20 pb-2">Season Summary</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase text-pitch-secondary">Regular Season</span>
                                        <span className="text-xs font-black text-white">
                                            {(() => {
                                                if (!rollingStartDate || !seasonEndDate) return 'TBD';
                                                const start = new Date(rollingStartDate);
                                                const end = new Date(seasonEndDate);
                                                const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                                                return `${Math.max(0, diffWeeks)} Prospective Weeks`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase text-pitch-secondary">Post-Season (Max)</span>
                                        <span className="text-xs font-black text-white">
                                            {(() => {
                                                const rounds = Math.ceil(Math.log2(teamsIntoPlayoffs));
                                                return `${rounds} Potential Games`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-[#cbff00]/10 flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase text-[#cbff00]">Max Footprint</span>
                                        <span className="text-sm font-black text-[#cbff00]">
                                            {(() => {
                                                if (!rollingStartDate || !seasonEndDate) return 'TBD';
                                                const start = new Date(rollingStartDate);
                                                const end = new Date(seasonEndDate);
                                                const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                                                const rounds = Math.ceil(Math.log2(teamsIntoPlayoffs));
                                                return `${Math.max(0, diffWeeks) + rounds} Rounds`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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

             <div className="space-y-6">
                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#cbff00]" /> Payment & Collection
                </h3>

                <div className="flex bg-white/5 p-1 rounded-sm border border-white/10">
                    {[
                        { id: 'stripe', label: 'Credit Card (Stripe)' },
                        { id: 'cash', label: 'Cash at Door' }
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => setPaymentCollectionType(mode.id as 'stripe' | 'cash')}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-sm ${
                                paymentCollectionType === mode.id
                                    ? 'bg-white text-black shadow-lg'
                                    : 'text-pitch-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>

                {paymentCollectionType === 'stripe' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-sm border border-white/10">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">
                                    Team League Fee ($)
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={teamPrice}
                                    onChange={(e) => setTeamPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="Total seasonal cost"
                                    className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                                <p className="text-[10px] text-pitch-secondary uppercase font-medium">The main cost for a captain to register a team</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold uppercase text-xs text-white">Team Registration Fee</p>
                                        <p className="text-[10px] text-pitch-secondary uppercase font-medium">Charge an upfront deposit/fee</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHasTeamRegistrationFee(!hasTeamRegistrationFee)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${hasTeamRegistrationFee ? 'bg-[#cbff00]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${hasTeamRegistrationFee ? 'right-1 bg-black' : 'left-1 bg-white'}`} />
                                    </button>
                                </div>

                                {hasTeamRegistrationFee && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="number"
                                            required
                                            value={teamRegistrationFee}
                                            onChange={(e) => setTeamRegistrationFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="Deposit amount ($)"
                                            className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                        />
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={deductTeamRegFee}
                                                onChange={(e) => setDeductTeamRegFee(e.target.checked)}
                                                className="w-4 h-4 accent-[#cbff00] rounded"
                                            />
                                            <span className="text-[10px] font-bold uppercase text-pitch-secondary group-hover:text-white transition-colors">Deduct this fee from the overall cost for the captain</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-sm border border-white/10">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold uppercase text-xs text-white">Allow Free Agents</p>
                                        <p className="text-[10px] text-pitch-secondary uppercase font-medium">Individual players can join without a team</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAllowFreeAgents(!allowFreeAgents)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${allowFreeAgents ? 'bg-[#cbff00]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${allowFreeAgents ? 'right-1 bg-black' : 'left-1 bg-white'}`} />
                                    </button>
                                </div>

                                {allowFreeAgents && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">
                                            Free Agent Fee ($)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={freeAgentPrice}
                                            onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="Price per person"
                                            className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                        />
                                        <div className="mt-4 border-t border-white/10 pt-4">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input type="checkbox" checked={hasFreeAgentCredit} onChange={(e) => setHasFreeAgentCredit(e.target.checked)} className="w-4 h-4 accent-[#cbff00] rounded cursor-pointer" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Deduct Fee From Captain?</span>
                                            </label>
                                            <p className="text-[10px] text-pitch-secondary mt-1 ml-6 uppercase">Credits the team host for free agents placed on their roster</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm border border-white/10 mt-6">
                                <div>
                                    <p className="font-bold uppercase text-xs text-white">League Refund Policy</p>
                                    <p className="text-[10px] text-pitch-secondary uppercase font-medium">Cutoff tied to Team Sign Up deadline</p>
                                </div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={isRefundable}
                                        onChange={(e) => setIsRefundable(e.target.checked)}
                                        className="w-4 h-4 accent-[#cbff00] rounded"
                                    />
                                    <span className="text-[10px] font-bold uppercase">Refundable</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-sm border border-white/10">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-pitch-secondary mb-2">
                                    Cash Collection Structure
                                </label>
                                <select
                                    value={cashFeeStructure}
                                    onChange={(e) => setCashFeeStructure(e.target.value as 'per_game' | 'upfront')}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    <option value="per_game">Collect Per Game</option>
                                    <option value="upfront">One-Time Upfront Fee</option>
                                </select>
                            </div>

                            {cashFeeStructure && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">
                                        Fee Amount ($)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="number"
                                            required
                                            value={cashAmount}
                                            onChange={(e) => setCashAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder={cashFeeStructure === 'per_game' ? "Per player / Match" : "Per player / Season"}
                                            className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 pl-10 text-white font-bold focus:outline-none focus:border-[#cbff00] transition-colors"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between h-full">
                                    <div>
                                        <p className="font-bold uppercase text-xs text-white">Allow Free Agents</p>
                                        <p className="text-[10px] text-pitch-secondary uppercase font-medium">Individuals join without a team</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAllowFreeAgents(!allowFreeAgents)}
                                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${allowFreeAgents ? 'bg-[#cbff00]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${allowFreeAgents ? 'right-1 bg-black' : 'left-1 bg-white'}`} />
                                    </button>
                                </div>
                            </div>

                            {allowFreeAgents && (paymentCollectionType !== 'cash' || cashFeeStructure === 'upfront') && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">
                                        Free Agent Fee ($)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="number"
                                            required
                                            value={freeAgentPrice}
                                            onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder={cashFeeStructure === 'per_game' ? "Match Fee" : "Season Fee"}
                                            className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 pl-10 text-white font-bold focus:outline-none focus:border-[#cbff00] transition-colors"
                                        />
                                        <div className="mt-4 border-t border-white/10 pt-4">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input type="checkbox" checked={hasFreeAgentCredit} onChange={(e) => setHasFreeAgentCredit(e.target.checked)} className="w-4 h-4 accent-[#cbff00] rounded cursor-pointer" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Deduct Fee From Captain?</span>
                                            </label>
                                            <p className="text-[10px] text-pitch-secondary mt-1 ml-6 uppercase">Credits the team host for free agents placed on their roster</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-sm border border-white/10">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold uppercase text-xs text-white">Team Registration Fee</p>
                                        <p className="text-[10px] text-pitch-secondary uppercase font-medium">Charge an upfront cash fee</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHasTeamRegistrationFee(!hasTeamRegistrationFee)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${hasTeamRegistrationFee ? 'bg-[#cbff00]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${hasTeamRegistrationFee ? 'right-1 bg-black' : 'left-1 bg-white'}`} />
                                    </button>
                                </div>
                                {hasTeamRegistrationFee && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="number"
                                            required
                                            value={teamRegistrationFee}
                                            onChange={(e) => setTeamRegistrationFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="Cash registration amount ($)"
                                            className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold uppercase text-xs text-white">Player Registration Fee</p>
                                        <p className="text-[10px] text-pitch-secondary uppercase font-medium">Charge an upfront player fee</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHasPlayerRegistrationFee(!hasPlayerRegistrationFee)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${hasPlayerRegistrationFee ? 'bg-[#cbff00]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${hasPlayerRegistrationFee ? 'right-1 bg-black' : 'left-1 bg-white'}`} />
                                    </button>
                                </div>
                                {hasPlayerRegistrationFee && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="number"
                                            required
                                            value={playerRegistrationFee}
                                            onChange={(e) => setPlayerRegistrationFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="Individual reg. amount ($)"
                                            className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
             </div>

             <div className="space-y-6">
                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#cbff00]" /> Lifecycle & Exceptions
                </h3>
                <div className="p-6 bg-white/5 rounded-sm border border-white/10 space-y-4">
                    <div>
                        <h4 className="font-bold uppercase text-sm text-white mb-1">Skip Specific Dates</h4>
                        <div className="flex gap-2">
                            <input type="date" value={newSkipDate} onChange={(e) => setNewSkipDate(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                            <button type="button" onClick={() => { if (newSkipDate && !skippedDates.includes(newSkipDate)) { setSkippedDates([...skippedDates, newSkipDate].sort()); setNewSkipDate(''); } }} className="px-6 bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-sm hover:bg-white hover:text-black transition-all">Add Date</button>
                        </div>
                    </div>
                    {skippedDates.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {skippedDates.map(date => (
                                <div key={date} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-sm group">
                                    <span className="text-xs font-bold text-white">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <button type="button" onClick={() => setSkippedDates(skippedDates.filter(d => d !== date))} className="text-red-500 hover:text-white transition-colors"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

             <div className="space-y-6">
                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#cbff00]" /> Waiver & Legal
                </h3>
                
                <div className="p-4 bg-white/5 rounded-sm border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-bold uppercase text-xs text-white">Require Digital Waiver</p>
                            <p className="text-[10px] text-pitch-secondary uppercase font-medium">Enforce signature before participation</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStrictWaiverRequired(!strictWaiverRequired)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${strictWaiverRequired ? 'bg-[#cbff00]' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${strictWaiverRequired ? 'right-1 bg-black' : 'left-1 bg-white'}`} />
                        </button>
                    </div>

                    {strictWaiverRequired && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">
                                Custom Waiver Language
                            </label>
                            <textarea
                                required
                                value={waiverDetails}
                                onChange={(e) => setWaiverDetails(e.target.value)}
                                placeholder="Enter full legal terms, liability release, and code of conduct..."
                                className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-4 text-white focus:outline-none focus:border-[#cbff00] transition-colors min-h-[200px] text-xs leading-relaxed"
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <button type="submit" disabled={loading || (action === 'create' && !isLoaded)} className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2 mt-8">
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <><Save className="w-5 h-5 text-black" /> Save Rolling League</>}
            </button>
        </form>
    );
}
