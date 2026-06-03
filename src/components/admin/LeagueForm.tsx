'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Calendar, Clock, Save, Trophy, MapPin, DollarSign, Loader2, ShieldCheck } from 'lucide-react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import { updateGame } from '@/app/actions/update-game';
import { Game, Booking, Profile, Match, Team } from "@/types/index";

const LIBRARIES: ("places")[] = ["places"];

interface LeagueFormProps {
    initialData?: unknown;
    action?: 'create' | 'edit';
    onSuccess?: () => void;
}

export function LeagueForm({ initialData, action = 'create', onSuccess }: LeagueFormProps) {
    const router = useRouter();

    const getLocalDatetimeString = (utcString?: string | null) => {
        if (!utcString) return '';
        const date = new Date(utcString);
        if (isNaN(date.getTime())) return '';
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    // Core Match Info
    // @ts-expect-error - Requires complex schema extension
    const [title, setTitle] = useState(initialData?.title || '');
        // @ts-expect-error - Requires complex schema extension
    const [requiresOfficials, setRequiresOfficials] = useState(initialData?.requires_officials || false);
    // @ts-expect-error - Complex schema extension
    const [basePay, setBasePay] = useState<number>(initialData?.base_pay || 0);
    // @ts-expect-error - Complex schema extension
    const [paymentMethod, setPaymentMethod] = useState<'digital' | 'manual'>(initialData?.payment_method || 'digital');
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

    // Season Timeline State
    // @ts-expect-error - Requires complex schema extension
    const [rosterLockDate, setRosterLockDate] = useState(getLocalDatetimeString(initialData?.roster_lock_date));
    // @ts-expect-error - Requires complex schema extension
    const [regularSeasonStart, setRegularSeasonStart] = useState(getLocalDatetimeString(initialData?.regular_season_start));
    // @ts-expect-error - Requires complex schema extension
    const [rosterFreezeDate, setRosterFreezeDate] = useState(getLocalDatetimeString(initialData?.roster_freeze_date));
    // @ts-expect-error - Requires complex schema extension
    const [playoffStartDate, setPlayoffStartDate] = useState(getLocalDatetimeString(initialData?.playoff_start_date));

    // Game Windows & Duration
    // @ts-expect-error - Requires complex schema extension
    const [earliestGameStartTime, setEarliestGameStartTime] = useState<string>(initialData?.earliest_game_start_time || '');
    // @ts-expect-error - Requires complex schema extension
    const [latestGameStartTime, setLatestGameStartTime] = useState<string>(initialData?.latest_game_start_time || '');
    // @ts-expect-error - Requires complex schema extension
    const [halfLength, setHalfLength] = useState<number | ''>(initialData?.half_length ?? 25);
    // @ts-expect-error - Requires complex schema extension
    const [halftimeLength, setHalftimeLength] = useState<number | ''>(initialData?.halftime_length ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [breakBetweenGames, setBreakBetweenGames] = useState<number | ''>(initialData?.break_between_games ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [totalGameTime, setTotalGameTime] = useState<number | ''>(initialData?.total_game_time ?? 60);
    // @ts-expect-error - Requires complex schema extension
    const [gameFormatType, setGameFormatType] = useState(initialData?.game_format_type || '7 v 7');

    // Field Logistics
    // @ts-expect-error - Requires complex schema extension
    const [amountOfFields, setAmountOfFields] = useState<number | ''>(initialData?.amount_of_fields ?? 1);
    // @ts-expect-error - Requires complex schema extension
    const [fieldNames, setFieldNames] = useState<string[]>(initialData?.field_names || ['']);
    // @ts-expect-error - Requires complex schema extension
    const [surfaceType, setSurfaceType] = useState(initialData?.surface_type || 'Outdoor Turf');
    // @ts-expect-error - Requires complex schema extension
    const [fieldSize, setFieldSize] = useState(initialData?.field_size || 'Standard');
    // @ts-expect-error - Requires complex schema extension
    const [shoeTypes, setShoeTypes] = useState<string[]>(initialData?.shoe_types || ['Turf Shoes', 'FG Cleats']);

    // Pricing & Fees
    // @ts-expect-error - Requires complex schema extension
    const [teamPrice, setTeamPrice] = useState<number | ''>(initialData?.team_price ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [hasRegistrationFee, setHasRegistrationFee] = useState(initialData?.deposit_amount !== null && initialData?.deposit_amount !== undefined);
    // @ts-expect-error - Requires complex schema extension
    const [depositAmount, setDepositAmount] = useState<number | ''>(initialData?.deposit_amount ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [hasRegistrationFeeCredit, setHasRegistrationFeeCredit] = useState(initialData?.has_registration_fee_credit ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [freeAgentPrice, setFreeAgentPrice] = useState<number | ''>(initialData?.free_agent_price ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [hasFreeAgentCredit, setHasFreeAgentCredit] = useState(initialData?.has_free_agent_credit ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [allowFreeAgents, setAllowFreeAgents] = useState<boolean>(initialData?.allow_free_agents ?? true);
    // @ts-expect-error - Requires complex schema extension
    const [refundCutoffDate, setRefundCutoffDate] = useState(getLocalDatetimeString(initialData?.refund_cutoff_date));

    // Teams & Playoffs
    // @ts-expect-error - Requires complex schema extension
    const [minTeams, setMinTeams] = useState<number | ''>(initialData?.min_teams ?? 4);
    // @ts-expect-error - Requires complex schema extension
    const [maxTourneyTeams, setMaxTourneyTeams] = useState<number | ''>(initialData?.max_teams ?? 8);
    // @ts-expect-error - Requires complex schema extension
    const [minPlayersPerTeam, setMinPlayersPerTeam] = useState<number | ''>(initialData?.min_players_per_team ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState<number | ''>(initialData?.max_players_per_team ?? 12);
    // @ts-expect-error - Requires complex schema extension
    const [minGamesGuaranteed, setMinGamesGuaranteed] = useState<number | ''>(initialData?.min_games_guaranteed ?? 8);
    // @ts-expect-error - Requires complex schema extension
    const [teamsIntoPlayoffs, setTeamsIntoPlayoffs] = useState<number>(initialData?.teams_into_playoffs ?? 4);
    // @ts-expect-error - Requires complex schema extension
    const [hasPlayoffBye, setHasPlayoffBye] = useState<boolean>(initialData?.has_playoff_bye ?? false);

    // Waivers
    // @ts-expect-error - Requires complex schema extension
    const [strictWaiverRequired, setStrictWaiverRequired] = useState(initialData?.strict_waiver_required ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [waiverDetails, setWaiverDetails] = useState(initialData?.waiver_details || '');

    // Prize Structure
    // @ts-expect-error - Requires complex schema extension
    const [prizeType, setPrizeType] = useState<string>(initialData?.prize_type || 'No Official Prize');
    // @ts-expect-error - Requires complex schema extension
    const [prizePoolPercentage, setPrizePoolPercentage] = useState<number | ''>(initialData?.prize_pool_percentage ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [fixedPrizeAmount, setFixedPrizeAmount] = useState<number | ''>(initialData?.fixed_prize_amount ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [reward, setReward] = useState<string>(initialData?.reward || '');

    const groupStageOptions = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const maxGroupStageOptions = Array.from({ length: 29 }, (_, i) => i + 4);
    const playoffOptions = hasPlayoffBye ? [5, 9] : [4, 8];

    useEffect(() => {
        const options = hasPlayoffBye ? [5, 9] : [4, 8];
        if (!options.includes(Number(teamsIntoPlayoffs))) {
            setTeamsIntoPlayoffs(options[0]);
        }
    }, [hasPlayoffBye, teamsIntoPlayoffs]);

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

    // 🔄 Sync Min Games Guaranteed
    useEffect(() => {
        if (!regularSeasonStart || !playoffStartDate) {
            setMinGamesGuaranteed(0);
            return;
        }
        const start = new Date(regularSeasonStart);
        const end = new Date(playoffStartDate);
        const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        setMinGamesGuaranteed(Math.max(0, diffWeeks));
    }, [regularSeasonStart, playoffStartDate]);

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
            let startDateTime = regularSeasonStart ? new Date(regularSeasonStart) : null;
            let endDateTime = playoffStartDate ? new Date(playoffStartDate) : null;

            const payload = {
                title, requires_officials: requiresOfficials, base_pay: basePay, payment_method: paymentMethod, rules_description: rulesDescription, location: locationName, location_nickname: locationNickname,
                latitude: coords.lat, longitude: coords.lng,
                start_time: startDateTime ? startDateTime.toISOString() : null,
                end_time: null,
                event_type: 'league',
                is_league: true,
                league_format: 'structured',
                game_format_type: gameFormatType,
                surface_type: surfaceType, 
                amount_of_fields: amountOfFields === '' ? null : amountOfFields,
                field_size: fieldSize, shoe_types: shoeTypes,
                team_price: teamPrice === '' ? null : teamPrice,
                deposit_amount: hasRegistrationFee ? (depositAmount === '' ? null : depositAmount) : null,
                has_registration_fee_credit: hasRegistrationFee ? hasRegistrationFeeCredit : false,
                free_agent_price: allowFreeAgents ? (freeAgentPrice === '' ? null : freeAgentPrice) : null,
                has_free_agent_credit: allowFreeAgents ? hasFreeAgentCredit : false,
                allow_free_agents: allowFreeAgents,
                refund_cutoff_date: refundCutoffDate ? new Date(refundCutoffDate).toISOString() : null,
                min_teams: minTeams === '' ? null : minTeams,
                max_teams: maxTourneyTeams === '' ? null : maxTourneyTeams,
                min_players_per_team: minPlayersPerTeam === '' ? null : minPlayersPerTeam,
                max_players_per_team: maxPlayersPerTeam === '' ? null : maxPlayersPerTeam,
                roster_lock_date: rosterLockDate ? new Date(rosterLockDate).toISOString() : null,
                roster_freeze_date: rosterFreezeDate ? new Date(rosterFreezeDate).toISOString() : null,
                regular_season_start: regularSeasonStart ? new Date(regularSeasonStart).toISOString() : null,
                playoff_start_date: playoffStartDate ? new Date(playoffStartDate).toISOString() : null,
                strict_waiver_required: strictWaiverRequired, waiver_details: waiverDetails || null,
                half_length: halfLength === '' ? null : halfLength,
                halftime_length: halftimeLength === '' ? null : halftimeLength,
                earliest_game_start_time: earliestGameStartTime || null,
                latest_game_start_time: latestGameStartTime || null,
                field_names: fieldNames,
                min_games_guaranteed: minGamesGuaranteed === '' ? null : minGamesGuaranteed,
                teams_into_playoffs: teamsIntoPlayoffs,
                has_playoff_bye: hasPlayoffBye,
                break_between_games: breakBetweenGames === '' ? null : breakBetweenGames,
                total_game_time: totalGameTime === '' ? null : totalGameTime,
                prize_type: prizeType,
                prize_pool_percentage: prizeType === 'Percentage Pool (Scaling Pot)' ? (prizePoolPercentage === '' ? null : prizePoolPercentage) : null,
                fixed_prize_amount: prizeType === 'Fixed Cash Bounty' ? (fixedPrizeAmount === '' ? null : fixedPrizeAmount) : null,
                reward: prizeType === 'Physical Item' ? reward : null,
                has_mvp_reward: prizeType !== 'No Official Prize'
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

    if (!isLoaded) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#cbff00]" /></div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in duration-300">
            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-sm">{error}</div>}

            <div className="space-y-6">
                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#cbff00]" /> Multi-Week League Configurator
                </h3>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">League Name</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Event Rules & Description</label>
                    <textarea value={rulesDescription} onChange={(e) => setRulesDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" rows={4} />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-2"><MapPin className="w-3 h-3" /> Location</label>
                    <div className="relative">
                        <input value={value} onChange={(e) => { setValue(e.target.value); setLocationName(e.target.value); }} disabled={!ready} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors pl-10" autoComplete="off" />
                        <div className="absolute left-3 top-3.5 text-gray-500"><MapPin className="w-4 h-4" /></div>
                        {status === "OK" && (
                            <ul className="absolute z-[100] w-full bg-gray-900 border border-white/10 shadow-xl rounded-sm mt-1 max-h-60 overflow-auto">
                                {data.map(({ place_id, description: desc }) => (
                                    <li key={place_id} onClick={() => handleSelectLocation(desc)} className="p-3 hover:bg-white/10 cursor-pointer text-sm text-gray-300 border-b border-white/5 last:border-0">{desc}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Location Nick Name</label>
                    <input type="text" value={locationNickname} onChange={(e) => setLocationNickname(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-[#cbff00]" /> Season Timeline
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Regular Season Start</label>
                                <input type="datetime-local" required value={regularSeasonStart} onChange={(e) => setRegularSeasonStart(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                                <p className="text-[10px] text-pitch-secondary mt-1 uppercase">First day of league play.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Roster Lock Date</label>
                                <input type="datetime-local" required value={rosterLockDate} onChange={(e) => setRosterLockDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                                <p className="text-[10px] text-pitch-secondary mt-1 uppercase">Payments captured & rosters locked.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Roster Freeze Date</label>
                                <input type="datetime-local" required value={rosterFreezeDate} onChange={(e) => setRosterFreezeDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                                <p className="text-[10px] text-pitch-secondary mt-1 uppercase">Mid-season transfer cutoff.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Playoff Start Date</label>
                                <input type="datetime-local" required value={playoffStartDate} onChange={(e) => setPlayoffStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                                <p className="text-[10px] text-pitch-secondary mt-1 uppercase">Delineates bracket phase.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Refund Cutoff Date</label>
                                <input type="datetime-local" value={refundCutoffDate} onChange={(e) => setRefundCutoffDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                                <p className="text-[10px] text-pitch-secondary mt-1 uppercase">Deadline for player withdrawal.</p>
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm h-[50px]">
                                    <input type="checkbox" checked={true} disabled className="w-5 h-5 accent-[#cbff00] rounded" />
                                    <span className="text-xl mr-1">💳</span>
                                    <span className="font-bold uppercase text-[10px] text-white">Allow Individual Player Refunds?</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                            <div className="text-xs font-bold text-pitch-secondary uppercase flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    (rosterLockDate && regularSeasonStart && rosterFreezeDate && playoffStartDate) &&
                                    (new Date(rosterLockDate) < new Date(regularSeasonStart)) &&
                                    (new Date(regularSeasonStart) < new Date(rosterFreezeDate)) &&
                                    (new Date(rosterFreezeDate) < new Date(playoffStartDate))
                                    ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                Timeline Validation: Chronological Order Required
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Earliest Game</label>
                        <input type="time" required value={earliestGameStartTime} onChange={(e) => setEarliestGameStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Latest Game</label>
                        <input type="time" required value={latestGameStartTime} onChange={(e) => setLatestGameStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Amount of Fields</label>
                        <select value={amountOfFields} onChange={(e) => {
                            const newAmt = e.target.value === '' ? '' : parseInt(e.target.value);
                            setAmountOfFields(newAmt);
                            if (typeof newAmt === 'number') {
                                setFieldNames(prev => {
                                    const next = [...prev];
                                    while (next.length < newAmt) next.push('');
                                    return next.slice(0, newAmt);
                                });
                            }
                        }} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {[1, 2, 3, 4, 5, 6].map(amt => <option key={amt} value={amt}>{amt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Field Size</label>
                        <select value={fieldSize} onChange={(e) => setFieldSize(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {['Small', 'Medium', 'Standard', 'Large', 'Full Pitch'].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                </div>

                {fieldNames.length > 0 && typeof amountOfFields === 'number' && (
                    <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                        <h3 className="font-bold uppercase text-sm text-white border-b border-white/10 pb-2">Field Names</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {fieldNames.map((name, index) => (
                                <div key={index}>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Field {index + 1}</label>
                                    <input type="text" required placeholder={`e.g. Court ${index + 1}`} value={name} onChange={(e) => {
                                        const updatedNames = [...fieldNames];
                                        updatedNames[index] = e.target.value;
                                        setFieldNames(updatedNames);
                                    }} className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Total Team Fee ($)</label>
                            <input type="number" required min="0" step="0.01" value={teamPrice} onChange={(e) => setTeamPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                        </div>
                        <div className="border border-white/10 p-4 rounded-sm bg-white/5 space-y-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#cbff00] transition-colors">Registration Fee?</span>
                                <input type="checkbox" checked={hasRegistrationFee} onChange={(e) => setHasRegistrationFee(e.target.checked)} className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer" />
                            </label>
                            {hasRegistrationFee && (
                                <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Team Registration Fee ($)</label>
                                        <input type="number" required min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={hasRegistrationFeeCredit} onChange={(e) => setHasRegistrationFeeCredit(e.target.checked)} className="w-4 h-4 accent-[#cbff00] rounded cursor-pointer" />
                                        <span className="text-xs font-bold uppercase text-pitch-secondary">Registration Fee Credit?</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border border-white/10 p-4 rounded-sm bg-white/5 space-y-4">
                            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setAllowFreeAgents(!allowFreeAgents)}>
                                <div>
                                    <span className="text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#cbff00] transition-colors">Allow Free Agents?</span>
                                    <p className="text-[10px] text-pitch-secondary uppercase font-medium mt-1">Individual players can join without a team</p>
                                </div>
                                <button
                                    type="button"
                                    className={`w-12 h-6 rounded-full transition-colors relative ${allowFreeAgents ? 'bg-[#cbff00]' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${allowFreeAgents ? 'right-1 bg-black' : 'left-1 bg-white'}`} />
                                </button>
                            </div>
                            
                            {allowFreeAgents && (
                                <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Free Agent Sign Up Fee ($)</label>
                                        <input type="number" required min="0" step="0.01" value={freeAgentPrice} onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={hasFreeAgentCredit} onChange={(e) => setHasFreeAgentCredit(e.target.checked)} className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer" />
                                        <span className="text-sm font-bold uppercase tracking-wider text-white">Free Agent Credit?</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Half Length (Min)</label>
                        <input type="number" min="1" required value={halfLength} onChange={(e) => setHalfLength(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Halftime Length (Min)</label>
                        <input type="number" min="0" required value={halftimeLength} onChange={(e) => setHalftimeLength(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                    </div>
                    <div className="pt-6">
                        <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm">
                            <span className="text-xl">⏱️</span>
                            <span className="font-bold uppercase text-sm text-white flex-1 text-center">Total Slot Time: {totalGameTime} Min</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Break Between Games (Min)</label>
                        <input type="number" min="0" required value={breakBetweenGames} onChange={(e) => setBreakBetweenGames(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Min Games Guaranteed</label>
                        <div className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors opacity-50 cursor-not-allowed h-[50px] flex items-center">
                            {minGamesGuaranteed} Games (Regular Season)
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Min Teams</label>
                        <select required value={minTeams} onChange={(e) => setMinTeams(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {groupStageOptions.map(opt => <option key={opt} value={opt}>{opt} Teams</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Max Teams</label>
                        <select required value={maxTourneyTeams} onChange={(e) => setMaxTourneyTeams(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {maxGroupStageOptions.map(opt => <option key={opt} value={opt} disabled={opt < Number(minTeams)}>{opt} Teams</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Min Players / Team</label>
                        <input type="number" min="1" required value={minPlayersPerTeam} onChange={(e) => setMinPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Max Players / Team</label>
                        <input type="number" min="1" required value={maxPlayersPerTeam} onChange={(e) => setMaxPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Game Format</label>
                        <select value={gameFormatType} onChange={(e) => setGameFormatType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {['1 v 1', '2 v 2', '3 v 3', '4 v 4', '5 v 5', '6 v 6', '7 v 7', '8 v 8', '9 v 9', '10 v 10', '11 v 11'].map(format => <option key={format} value={format}>{format}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm w-full h-[72px]">
                        <input type="checkbox" id="strictWaiverLeague" checked={strictWaiverRequired} onChange={(e) => setStrictWaiverRequired(e.target.checked)} className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer" />
                        <label htmlFor="strictWaiverLeague" className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-xl">📋</span>
                            <div><p className="font-bold uppercase text-sm text-white">Strict event waiver (No Play without signature)</p></div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="border border-white/10 p-4 rounded-sm bg-white/5 space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={hasPlayoffBye} onChange={(e) => setHasPlayoffBye(e.target.checked)} className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer" />
                            <span className="text-sm font-bold uppercase tracking-wider text-white">First Place Bye</span>
                        </label>
                        <div className="pt-2 border-t border-white/10">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Teams into Playoffs</label>
                            <select required value={teamsIntoPlayoffs} onChange={(e) => setTeamsIntoPlayoffs(Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                                {playoffOptions.map(opt => <option key={opt} value={opt}>{opt} Teams</option>)}
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
                                        if (!regularSeasonStart || !playoffStartDate) return 'TBD';
                                        const start = new Date(regularSeasonStart);
                                        const end = new Date(playoffStartDate);
                                        const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                                        return `${Math.max(0, diffWeeks)} Games / Weeks`;
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
                                <span className="text-[10px] font-black uppercase text-[#cbff00]">Total Potential Games</span>
                                <span className="text-sm font-black text-[#cbff00]">
                                    {(() => {
                                        if (!regularSeasonStart || !playoffStartDate) return 'TBD';
                                        const start = new Date(regularSeasonStart);
                                        const end = new Date(playoffStartDate);
                                        const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                                        const rounds = Math.ceil(Math.log2(teamsIntoPlayoffs));
                                        return Math.max(0, diffWeeks) + rounds;
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                
                {strictWaiverRequired && (
                    <div className="p-4 bg-white/5 rounded-sm border border-white/10 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">Custom Waiver Language</label>
                        <textarea required value={waiverDetails} onChange={(e) => setWaiverDetails(e.target.value)} placeholder="Enter full legal terms, liability release, and code of conduct..." className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-4 text-white focus:outline-none focus:border-[#cbff00] transition-colors min-h-[200px] text-xs leading-relaxed" />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                     <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Surface Type</label>
                        <select value={surfaceType} onChange={(e) => setSurfaceType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {['Outdoor Turf', 'Grass', 'Indoor Court', 'Outdoor Court', 'Sand', 'Indoor Turf', 'Indoor Carpet'].map(surface => <option key={surface} value={surface}>{surface}</option>)}
                        </select>
                    </div>
                     <div className="space-y-3">
                        <h3 className="font-bold uppercase text-[10px] tracking-widest text-pitch-secondary">Allowed Shoe Types</h3>
                        <div className="flex gap-1.5 flex-wrap">
                            {['FG Cleats', 'SG Cleats', 'AG Cleats', 'Turf Shoes', 'Court Shoes'].map(shoe => (
                                <label key={shoe} className="flex items-center gap-1.5 cursor-pointer select-none bg-white/5 px-2.5 py-1.5 rounded-sm border border-white/5 hover:border-white/10 transition-colors">
                                    <input type="checkbox" checked={shoeTypes.includes(shoe)} onChange={(e) => { if (e.target.checked) setShoeTypes([...shoeTypes, shoe]); else setShoeTypes(shoeTypes.filter((s: unknown) => s !== shoe)); }} className="w-3.5 h-3.5 accent-[#cbff00] rounded" />
                                    <span className="uppercase text-[9px] font-black tracking-tight">{shoe}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-6">
                    <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-[#cbff00]" /> Prize Structure
                    </h3>
                    
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Prize Format Logic</label>
                        <select value={prizeType} onChange={(e) => setPrizeType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            <option value="No Official Prize">No Official Prize</option>
                            <option value="Percentage Pool (Scaling Pot)">Percentage Pool (Scaling Pot)</option>
                            <option value="Fixed Cash Bounty">Fixed Cash Bounty</option>
                            <option value="Physical Item">Physical Item</option>
                        </select>
                    </div>

                    {prizeType === 'Percentage Pool (Scaling Pot)' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Prize Pool Percentage (%)</label>
                            <input type="number" min="1" max="100" required value={prizePoolPercentage} onChange={(e) => setPrizePoolPercentage(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                            <p className="text-xs text-pitch-secondary mt-2 italic">What percentage of the total registration pot goes to the winner?</p>
                        </div>
                    )}

                    {prizeType === 'Fixed Cash Bounty' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Fixed Prize Amount ($)</label>
                            <input type="number" min="1" required value={fixedPrizeAmount} onChange={(e) => setFixedPrizeAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                            <p className="text-xs text-pitch-secondary mt-2 italic">A guaranteed payout regardless of team count.</p>
                        </div>
                    )}

                    {prizeType === 'Physical Item' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Reward Details</label>
                            <textarea required value={reward} onChange={(e) => setReward(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" placeholder="e.g. Free Jerseys, Trophy, Sponsor Swag Box" />
                        </div>
                    )}
                </div>
            </div>

            
            <div className="bg-black/40 border border-white/10 p-6 space-y-6 mt-8">
                <h3 className="text-xl font-black italic uppercase tracking-widest text-[#cbff00] mb-4">Referee Configuration</h3>
                <div className="flex flex-col md:flex-row gap-6 mt-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="requires_officials"
                            checked={requiresOfficials}
                            onChange={(e) => setRequiresOfficials(e.target.checked)}
                            className="w-5 h-5 accent-[#cbff00] cursor-pointer"
                        />
                        <label htmlFor="requires_officials" className="text-white font-bold tracking-wide cursor-pointer select-none">
                            Requires Pitchside Officials?
                        </label>
                    </div>
                    {requiresOfficials && (
                        <div className="flex flex-col md:flex-row gap-4 border-l border-white/10 pl-6 w-full">
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">Base Pay Rate ($)</label>
                                <input type="number" value={basePay} onChange={(e) => setBasePay(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-sm p-2 text-white focus:outline-none focus:border-[#cbff00] transition-colors font-bold" min={0} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">Payment Method</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-black border border-white/10 rounded-sm p-2 text-white focus:outline-none focus:border-[#cbff00] transition-colors font-bold">
                                    <option value="digital">Digital (Stripe Connect)</option>
                                    <option value="manual">Manual (Zelle/Cash)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" disabled={loading || (action === 'create' && !isLoaded)} className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2 mt-8">
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <><Save className="w-5 h-5 text-black" /> {action === 'create' ? 'Create League' : 'Save Changes'}</>}
            </button>
        </form>
    );
}
