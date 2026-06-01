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

interface TournamentFormProps {
    initialData?: unknown;
    action?: 'create' | 'edit';
    onSuccess?: () => void;
}

export function TournamentForm({ initialData, action = 'create', onSuccess }: TournamentFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    // Match Info State
    // @ts-expect-error - Requires complex schema extension
    const [title, setTitle] = useState(initialData?.title || '');
        // @ts-expect-error - Requires complex schema extension
    const [requiresOfficials, setRequiresOfficials] = useState(initialData?.requires_officials || false);
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
    const [gameDate, setGameDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Field Logistics
    // @ts-expect-error - Requires complex schema extension
    const [surfaceType, setSurfaceType] = useState(initialData?.surface_type || 'Outdoor Turf');
    // @ts-expect-error - Requires complex schema extension
    const [amountOfFields, setAmountOfFields] = useState<number | ''>(initialData?.amount_of_fields ?? 1);
    // @ts-expect-error - Requires complex schema extension
    const [fieldSize, setFieldSize] = useState(initialData?.field_size || 'Standard');
    // @ts-expect-error - Requires complex schema extension
    const [shoeTypes, setShoeTypes] = useState<string[]>(initialData?.shoe_types || ['Turf Shoes', 'FG Cleats']);
    // @ts-expect-error - Requires complex schema extension
    const [gameFormatType, setGameFormatType] = useState(initialData?.game_format_type || '7 v 7');

    // Tournament Specific Formatting
    // @ts-expect-error - Requires complex schema extension
    const [tournamentStyle, setTournamentStyle] = useState<'group_stage' | 'single_elimination' | 'double_elimination'>(initialData?.tournament_style || 'group_stage');
    // @ts-expect-error - Requires complex schema extension
    const [gameStyle, setGameStyle] = useState<string>(initialData?.game_style || 'Group Stage/Playoffs');
    // @ts-expect-error - Requires complex schema extension
    const [minimumGamesPerTeam, setMinimumGamesPerTeam] = useState<number | ''>(initialData?.minimum_games_per_team ?? 3);
    // @ts-expect-error - Requires complex schema extension
    const [halfLength, setHalfLength] = useState<number | ''>(initialData?.half_length ?? 25);
    // @ts-expect-error - Requires complex schema extension
    const [halftimeLength, setHalftimeLength] = useState<number | ''>(initialData?.halftime_length ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [breakBetweenGames, setBreakBetweenGames] = useState<number | ''>(initialData?.break_between_games ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [totalGameTime, setTotalGameTime] = useState<number | ''>(initialData?.total_game_time ?? 60);

    // Registration & Pricing
    // @ts-expect-error - Requires complex schema extension
    const [teamPrice, setTeamPrice] = useState<number | ''>(initialData?.team_price ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [hasRegistrationFee, setHasRegistrationFee] = useState(initialData?.team_price !== null && initialData?.team_price !== undefined);
    // @ts-expect-error - Requires complex schema extension
    const [depositAmount, setDepositAmount] = useState<number | ''>(initialData?.deposit_amount ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [hasRegistrationFeeCredit, setHasRegistrationFeeCredit] = useState(initialData?.has_registration_fee_credit ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [freeAgentPrice, setFreeAgentPrice] = useState<number | ''>(initialData?.free_agent_price ?? '');
    // @ts-expect-error - Requires complex schema extension
    const [hasFreeAgentCredit, setHasFreeAgentCredit] = useState(initialData?.has_free_agent_credit ?? false);
    // @ts-expect-error - Requires complex schema extension
    const [refundCutoffDate, setRefundCutoffDate] = useState(initialData?.refund_cutoff_date ? new Date(initialData.refund_cutoff_date).toISOString().slice(0, 16) : '');

    // Brackets & Teams
    // @ts-expect-error - Requires complex schema extension
    const [minTeams, setMinTeams] = useState<number | ''>(initialData?.min_teams ?? 4);
    // @ts-expect-error - Requires complex schema extension
    const [maxTourneyTeams, setMaxTourneyTeams] = useState<number | ''>(initialData?.max_teams ?? 8);
    // @ts-expect-error - Requires complex schema extension
    const [minPlayersPerTeam, setMinPlayersPerTeam] = useState<number | ''>(initialData?.min_players_per_team ?? 5);
    // @ts-expect-error - Requires complex schema extension
    const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState<number | ''>(initialData?.max_players_per_team ?? 12);
    // @ts-expect-error - Requires complex schema extension
    const [rosterLockDate, setRosterLockDate] = useState(initialData?.roster_lock_date ? new Date(initialData.roster_lock_date).toISOString().slice(0, 16) : '');

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

    // Bracket Calculation Logic (from Phase 3)
    const groupStageOptions = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const bracketOptions = [4, 8, 16, 32];
    const maxGroupStageOptions = Array.from({ length: 29 }, (_, i) => i + 4);
    const minTeamOptions = tournamentStyle !== 'group_stage' ? bracketOptions : groupStageOptions;
    const maxTeamOptions = tournamentStyle !== 'group_stage' ? bracketOptions : maxGroupStageOptions;

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

    useEffect(() => {
        // @ts-expect-error - Requires complex schema extension
        if (initialData?.start_time) {
            // @ts-expect-error - Requires complex schema extension
            const start = new Date(initialData.start_time);
            setGameDate(start.toISOString().split('T')[0]);
            setStartTime(start.toTimeString().slice(0, 5));
        }
        // @ts-expect-error - Requires complex schema extension
        if (initialData?.end_time) {
            // @ts-expect-error - Requires complex schema extension
            if (initialData.end_time.includes('T')) {
                // @ts-expect-error - Requires complex schema extension
                setEndTime(new Date(initialData.end_time).toTimeString().slice(0, 5));
            } else {
                // @ts-expect-error - Requires complex schema extension
                setEndTime(initialData.end_time.slice(0, 5));
            }
        }
    }, [initialData]);

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

        if (!gameDate || !startTime || !endTime) {
            alert("Please fill in all time fields"); setLoading(false); return;
        }

        try {
            let startDateTime = new Date(`${gameDate}T${startTime}`);
            let endDateTime = new Date(`${gameDate}T${endTime}`);
            if (endDateTime < startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);

            const formattedEndTime = (endTime && endTime.length >= 5) 
                ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null;

            const payload = {
                title, requires_officials: requiresOfficials, rules_description: rulesDescription, location: locationName, location_nickname: locationNickname,
                latitude: coords.lat, longitude: coords.lng,
                start_time: startDateTime ? startDateTime.toISOString() : null,
                end_time: formattedEndTime,
                event_type: 'tournament',
                is_league: true,
                league_format: 'structured',
                game_format_type: gameFormatType,
                surface_type: surfaceType, amount_of_fields: amountOfFields === '' ? null : amountOfFields,
                field_size: fieldSize, shoe_types: shoeTypes,
                team_price: teamPrice === '' ? null : teamPrice,
                deposit_amount: hasRegistrationFee ? (depositAmount === '' ? null : depositAmount) : null,
                has_registration_fee_credit: hasRegistrationFee ? hasRegistrationFeeCredit : false,
                free_agent_price: freeAgentPrice === '' ? null : freeAgentPrice,
                has_free_agent_credit: hasFreeAgentCredit,
                refund_cutoff_date: refundCutoffDate ? new Date(refundCutoffDate).toISOString() : null,
                min_teams: minTeams === '' ? null : minTeams,
                max_teams: maxTourneyTeams === '' ? null : maxTourneyTeams,
                min_players_per_team: minPlayersPerTeam === '' ? null : minPlayersPerTeam,
                max_players_per_team: maxPlayersPerTeam === '' ? null : maxPlayersPerTeam,
                roster_lock_date: rosterLockDate ? new Date(rosterLockDate).toISOString() : null,
                strict_waiver_required: strictWaiverRequired, waiver_details: waiverDetails || null,
                tournament_style: tournamentStyle,
                minimum_games_per_team: tournamentStyle === 'group_stage' ? (minimumGamesPerTeam === '' ? null : minimumGamesPerTeam) : null,
                game_style: gameStyle,
                half_length: halfLength === '' ? null : halfLength,
                halftime_length: halftimeLength === '' ? null : halftimeLength,
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
                    <Trophy className="w-5 h-5 text-[#cbff00]" /> Tournament Configurator
                </h3>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Tournament Format</label>
                    <select value={tournamentStyle} onChange={(e) => {
                        // @ts-expect-error - Requires complex schema extension
                        setTournamentStyle(e.target.value as unknown);
                        setGameStyle(e.target.value === 'group_stage' ? 'Group Stage/Playoffs' : 'Bracket');
                    }} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                        <option value="group_stage">Group Stage + Playoffs</option>
                        <option value="single_elimination">Single Elimination Bracket</option>
                        <option value="double_elimination">Double Elimination Bracket</option>
                    </select>
                </div>

                {tournamentStyle === 'group_stage' && (
                    <div className="bg-[#cbff00]/10 border border-[#cbff00]/20 p-4 rounded-sm animate-in fade-in zoom-in-95 duration-200">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#cbff00] mb-2">Minimum Guaranteed Games Per Team</label>
                        <p className="text-[10px] text-gray-400 mb-3 uppercase tracking-wider font-medium">How many matches will each squad natively play in the Group Stage before elimination?</p>
                        <input type="number" min="1" required value={minimumGamesPerTeam} onChange={(e) => setMinimumGamesPerTeam(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-black/50 border border-[#cbff00]/30 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00]" />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Tournament Title</label>
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

                
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-sm">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
                        <input type="date" required value={gameDate} onChange={(e) => setGameDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Start</label>
                        <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> End</label>
                        <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                    </div>
                </div>

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
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Free Agent Sign Up Fee ($)</label>
                            <input type="number" required min="0" step="0.01" value={freeAgentPrice} onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                        </div>
                        <div className="border border-white/10 p-4 rounded-sm bg-white/5 pt-[22px] pb-[22px]">
                            <br/>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={hasFreeAgentCredit} onChange={(e) => setHasFreeAgentCredit(e.target.checked)} className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer" />
                                <span className="text-sm font-bold uppercase tracking-wider text-white">Free Agent Credit?</span>
                            </label>
                            <br/><br/>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Refund Cutoff Date</label>
                        <input type="datetime-local" value={refundCutoffDate} onChange={(e) => setRefundCutoffDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                    </div>
                    <div className="w-full h-full flex items-center pt-6">
                        <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm">
                            <input type="checkbox" checked={true} disabled className="w-5 h-5 accent-[#cbff00] rounded" />
                            <span className="text-xl mr-1">💳</span>
                            <span className="font-bold uppercase text-sm text-white">Allow Individual Player Refunds?</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                    <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2"><DollarSign className="w-4 h-4 text-[#cbff00]" /> Payment Methods</h3>
                    <div className="flex gap-4 flex-wrap">
                        {['venmo', 'zelle', 'stripe'].map(method => (
                            <label key={method} className={`flex items-center gap-2 select-none bg-black/20 px-3 py-2 rounded border border-white/5 transition-colors ${method === 'stripe' ? 'opacity-50 cursor-not-allowed border-white/20' : 'opacity-30 cursor-not-allowed'}`}>
                                <input type="checkbox" checked={method === 'stripe'} disabled className="w-4 h-4 accent-[#cbff00] rounded" />
                                <span className="uppercase text-xs font-bold">{method === 'stripe' ? 'Credit Card (Stripe)' : method}</span>
                            </label>
                        ))}
                    </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                     <div>
                         <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Half Length (Min)</label>
                         <input type="number" min="1" required value={halfLength} onChange={(e) => setHalfLength(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Halftime Length (Min)</label>
                         <input type="number" min="0" required value={halftimeLength} onChange={(e) => setHalftimeLength(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Break (Min)</label>
                         <input type="number" min="0" required value={breakBetweenGames} onChange={(e) => setBreakBetweenGames(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                     </div>
                     <div className="pt-6">
                         <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed w-full p-3 bg-black/20 border border-white/5 rounded-sm">
                             <span className="text-xl">⏱️</span>
                             <span className="font-bold uppercase text-sm text-white flex-1 text-center">Total Slot: {totalGameTime} Min</span>
                         </label>
                     </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Minimum Teams</label>
                        <select required value={minTeams} onChange={(e) => setMinTeams(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {minTeamOptions.map(opt => <option key={opt} value={opt}>{opt} Teams</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Maximum Teams</label>
                        <select required value={maxTourneyTeams} onChange={(e) => setMaxTourneyTeams(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {maxTeamOptions.map(opt => <option key={opt} value={opt} disabled={opt < Number(minTeams)}>{opt} Teams</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Min Players (Per Team)</label>
                        <input type="number" min="1" required value={minPlayersPerTeam} onChange={(e) => setMinPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Max Players (Per Team)</label>
                        <input type="number" min="1" required value={maxPlayersPerTeam} onChange={(e) => setMaxPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Roster Lock Date</label>
                        <input type="datetime-local" value={rosterLockDate} onChange={(e) => setRosterLockDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Game Format</label>
                        <select value={gameFormatType} onChange={(e) => setGameFormatType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {['1 v 1', '2 v 2', '3 v 3', '4 v 4', '5 v 5', '6 v 6', '7 v 7', '8 v 8', '9 v 9', '10 v 10', '11 v 11'].map(format => <option key={format} value={format}>{format}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm w-full">
                    <input type="checkbox" id="strictWaiver" checked={strictWaiverRequired} onChange={(e) => setStrictWaiverRequired(e.target.checked)} className="w-5 h-5 accent-[#cbff00] rounded cursor-pointer" />
                    <label htmlFor="strictWaiver" className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-xl">📋</span>
                        <div><p className="font-bold uppercase text-sm text-white">Strict event waiver (No Play without signature)</p></div>
                    </label>
                </div>

                {strictWaiverRequired && (
                    <div className="p-4 bg-white/5 rounded-sm border border-white/10 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">Custom Waiver Language</label>
                        <textarea required value={waiverDetails} onChange={(e) => setWaiverDetails(e.target.value)} placeholder="Enter full legal terms, liability release, and code of conduct..." className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-4 text-white focus:outline-none focus:border-[#cbff00] transition-colors min-h-[200px] text-xs leading-relaxed" />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Surface Type</label>
                        <select value={surfaceType} onChange={(e) => setSurfaceType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
                            {['Outdoor Turf', 'Grass', 'Indoor Court', 'Outdoor Court', 'Sand', 'Indoor Turf', 'Indoor Carpet'].map(surface => <option key={surface} value={surface}>{surface}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Amount of Fields</label>
                        <select value={amountOfFields} onChange={(e) => setAmountOfFields(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors">
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

                <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                    <h3 className="font-bold uppercase text-sm text-white flex items-center gap-2"><span className="text-xl">👟</span> Allowed Shoe Types</h3>
                    <div className="flex gap-4 flex-wrap">
                        {['FG Cleats', 'SG Cleats', 'AG Cleats', 'Turf Shoes', 'Court Shoes'].map(shoe => (
                            <label key={shoe} className="flex items-center gap-2 cursor-pointer select-none bg-black/20 px-3 py-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                <input type="checkbox" checked={shoeTypes.includes(shoe)} onChange={(e) => { if (e.target.checked) setShoeTypes([...shoeTypes, shoe]); else setShoeTypes(shoeTypes.filter((s: unknown) => s !== shoe)); }} className="w-4 h-4 accent-[#cbff00] rounded" />
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

            <button type="submit" disabled={loading || (action === 'create' && !isLoaded)} className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2 mt-8">
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <><Save className="w-5 h-5 text-black" /> {action === 'create' ? 'Provision Tournament' : 'Save Changes'}</>}
            </button>
        </form>
    );
}
