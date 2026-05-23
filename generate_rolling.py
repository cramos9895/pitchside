import os

code = """'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
    Calendar, 
    Save, 
    MapPin, 
    DollarSign,
    Loader2,
    ShieldAlert
} from 'lucide-react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import { updateGame } from '@/app/actions/update-game';

const LIBRARIES: ("places")[] = ["places"];

interface RollingLeagueFormProps {
    initialData?: any;
    action?: 'create' | 'edit';
    onSuccess?: () => void;
}

export function RollingLeagueForm({ initialData, action = 'create', onSuccess }: RollingLeagueFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    // Match Info State
    const [title, setTitle] = useState(initialData?.title || '');
    const [rulesDescription, setRulesDescription] = useState(initialData?.rules_description || '');
    const [locationName, setLocationName] = useState(initialData?.location || '');
    const [coords, setCoords] = useState<{ lat: number | null, lng: number | null }>({
        lat: initialData?.latitude || null,
        lng: initialData?.longitude || null
    });
    
    // Field / Location Specifics
    const [surfaceType, setSurfaceType] = useState(initialData?.surface_type || 'Outdoor Turf');
    const [amountOfFields, setAmountOfFields] = useState<number | ''>(initialData?.amount_of_fields ?? 1);
    const [fieldSize, setFieldSize] = useState(initialData?.field_size || 'Standard');
    const [shoeTypes, setShoeTypes] = useState<string[]>(initialData?.shoe_types || ['Turf Shoes', 'FG Cleats']);

    // Schedule & Duration
    const [gameDate, setGameDate] = useState(initialData?.start_time ? new Date(initialData.start_time).toISOString().slice(0, 16) : '');
    const [gameDurationMins, setGameDurationMins] = useState<number | ''>(
        initialData?.start_time && initialData?.end_time 
            ? Math.round((new Date(initialData.end_time).getTime() - new Date(initialData.start_time).getTime()) / 60000) 
            : 90
    );
    const [regularSeasonStart, setRegularSeasonStart] = useState(initialData?.regular_season_start ? new Date(initialData.regular_season_start).toISOString().slice(0, 16) : '');

    // Subscription Pricing State
    const [teamPrice, setTeamPrice] = useState<number | ''>(initialData?.team_price ?? '');
    const [freeAgentPrice, setFreeAgentPrice] = useState<number | ''>(initialData?.free_agent_price ?? '');
    
    // Payments & Credits (Bypass)
    const [paymentCollectionType, setPaymentCollectionType] = useState(initialData?.payment_collection_type || 'stripe');
    const [cashFeeStructure, setCashFeeStructure] = useState(initialData?.cash_fee_structure || 'per_game');
    const [cashAmount, setCashAmount] = useState<number | ''>(initialData?.cash_amount ?? '');
    const [hasFreeAgentCredit, setHasFreeAgentCredit] = useState(initialData?.has_free_agent_credit ?? false);
    const [hasRegistrationFeeCredit, setHasRegistrationFeeCredit] = useState(initialData?.has_registration_fee_credit ?? false);
    
    // Limits
    const [maxPlayers, setMaxPlayers] = useState<number | ''>(initialData?.max_players ?? 24);
    const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState<number | ''>(initialData?.max_players_per_team ?? 12);
    
    // Dynamic Roster Toggles
    const [allowFreeAgents, setAllowFreeAgents] = useState(initialData?.allow_free_agents ?? true);

    // Waivers
    const [strictWaiverRequired, setStrictWaiverRequired] = useState(initialData?.strict_waiver_required ?? false);
    const [waiverDetails, setWaiverDetails] = useState(initialData?.waiver_details || '');

    useEffect(() => {
        if (!strictWaiverRequired) {
            setWaiverDetails('');
        }
    }, [strictWaiverRequired]);

    const {
        ready,
        value,
        setValue,
        suggestions: { status, data },
        clearSuggestions,
        init,
    } = usePlacesAutocomplete({
        requestOptions: {},
        defaultValue: initialData?.location || '',
        initOnMount: false
    });

    useEffect(() => {
        if (isLoaded) {
            init();
        }
    }, [isLoaded, init]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let startDateTime = null;
            let endDateTime = null;
            let seasonStartDateTime = null;

            if (gameDate) {
                startDateTime = new Date(gameDate);
                if (typeof gameDurationMins === 'number') {
                    endDateTime = new Date(startDateTime.getTime() + gameDurationMins * 60000);
                }
            }

            if (regularSeasonStart) {
                seasonStartDateTime = new Date(regularSeasonStart);
            }

            const allowedMethods = paymentCollectionType === 'both' ? ['stripe', 'cash', 'venmo'] : 
                                   paymentCollectionType === 'cash' ? ['cash', 'venmo'] : ['stripe'];

            const payload = {
                title,
                rules_description: rulesDescription,
                location: locationName, 
                latitude: coords.lat,
                longitude: coords.lng,
                
                start_time: startDateTime ? startDateTime.toISOString() : null,
                end_time: endDateTime ? endDateTime.toISOString() : null,
                regular_season_start: seasonStartDateTime ? seasonStartDateTime.toISOString() : null,
                
                surface_type: surfaceType,
                amount_of_fields: amountOfFields === '' ? null : amountOfFields,
                field_size: fieldSize,
                shoe_types: shoeTypes,

                // Hardcoded specifically for Rolling Leagues
                event_type: 'league',
                is_league: true,
                league_format: 'rolling',
                
                team_price: teamPrice === '' ? null : teamPrice,
                free_agent_price: freeAgentPrice === '' ? null : freeAgentPrice,
                
                payment_collection_type: paymentCollectionType,
                allowed_payment_methods: allowedMethods,
                cash_fee_structure: paymentCollectionType !== 'stripe' ? cashFeeStructure : null,
                cash_amount: paymentCollectionType !== 'stripe' ? (cashAmount === '' ? null : cashAmount) : null,
                has_free_agent_credit: hasFreeAgentCredit,
                has_registration_fee_credit: hasRegistrationFeeCredit,
                
                max_players: maxPlayers === '' ? null : maxPlayers,
                max_players_per_team: maxPlayersPerTeam === '' ? null : maxPlayersPerTeam,
                allow_free_agents: allowFreeAgents,
                
                strict_waiver_required: strictWaiverRequired,
                waiver_details: waiverDetails || null,
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
            console.error('Error saving rolling league:', err);
            setError(err.message || "Failed to save rolling league.");
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /> Loading...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300">
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-sm">
                    {error}
                </div>
            )}

            <div className="space-y-6">
                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                    <Save className="w-5 h-5 text-[#cbff00]" /> Rolling League Info
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
                        Rules & Description
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Standard Game Start Time
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={gameDate}
                            onChange={(e) => setGameDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                            Duration (Minutes)
                        </label>
                        <input
                            type="number"
                            required
                            min="30"
                            value={gameDurationMins}
                            onChange={(e) => setGameDurationMins(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Initial Kickoff (Season Start)
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={regularSeasonStart}
                            onChange={(e) => setRegularSeasonStart(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Total League Capacity (Max Players)
                        </label>
                        <input
                            type="number"
                            min="2"
                            required
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary">
                                Team Subscription Fee ($/week)
                            </label>
                        </div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={teamPrice}
                            onChange={(e) => setTeamPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Free Agent Subscription Fee ($/week)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={freeAgentPrice}
                            onChange={(e) => setFreeAgentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-sm flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-bold uppercase tracking-wider text-sm">Dynamic Weekly Rosters</h4>
                            <p className="text-pitch-secondary text-xs mt-1">Allow Free Agents to join open slots.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={allowFreeAgents}
                                onChange={(e) => setAllowFreeAgents(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pitch-accent"></div>
                        </label>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Max Players Per Team
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={maxPlayersPerTeam}
                            onChange={(e) => setMaxPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                    <h4 className="text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-[#cbff00]" /> Payment & Credits Collection</h4>
                    
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                            Collection Method
                        </label>
                        <select
                            value={paymentCollectionType}
                            onChange={(e) => setPaymentCollectionType(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                        >
                            <option value="stripe">Stripe Only (Card/Apple Pay)</option>
                            <option value="cash">Cash/Venmo Only (In Person)</option>
                            <option value="both">Both (Stripe + Cash/Venmo Options)</option>
                        </select>
                    </div>

                    {paymentCollectionType !== 'stripe' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 border border-white/10 rounded-sm">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Cash/Venmo Fee Structure
                                </label>
                                <select
                                    value={cashFeeStructure}
                                    onChange={(e) => setCashFeeStructure(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    <option value="upfront">Single Upfront Fee</option>
                                    <option value="per_game">Pay Per Game</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Cash Amount ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 border border-white/10 rounded-sm hover:border-[#cbff00]/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={hasFreeAgentCredit}
                                onChange={(e) => setHasFreeAgentCredit(e.target.checked)}
                                className="w-5 h-5 accent-[#cbff00] rounded-sm bg-pitch-black border-white/20"
                            />
                            <div>
                                <span className="block text-sm font-bold text-white uppercase tracking-wider">Free Agent Credits</span>
                                <span className="block text-[10px] text-pitch-secondary">Players can use game credits to register</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 border border-white/10 rounded-sm hover:border-[#cbff00]/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={hasRegistrationFeeCredit}
                                onChange={(e) => setHasRegistrationFeeCredit(e.target.checked)}
                                className="w-5 h-5 accent-[#cbff00] rounded-sm bg-pitch-black border-white/20"
                            />
                            <div>
                                <span className="block text-sm font-bold text-white uppercase tracking-wider">Team Fee Credits</span>
                                <span className="block text-[10px] text-pitch-secondary">Teams can use credits for reg fees</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                    <h4 className="text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-[#cbff00]" /> Check-in & Waivers</h4>
                    
                    <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 border border-white/10 rounded-sm hover:border-[#cbff00]/50 transition-colors">
                        <input
                            type="checkbox"
                            checked={strictWaiverRequired}
                            onChange={(e) => setStrictWaiverRequired(e.target.checked)}
                            className="w-5 h-5 accent-[#cbff00] rounded-sm bg-pitch-black border-white/20"
                        />
                        <div>
                            <span className="block text-sm font-bold text-white uppercase tracking-wider">Strict Check-in Required</span>
                            <span className="block text-[10px] text-pitch-secondary">Players MUST sign a waiver / scan QR code</span>
                        </div>
                    </label>

                    {strictWaiverRequired && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                Waiver Text / Terms
                            </label>
                            <textarea
                                value={waiverDetails}
                                onChange={(e) => setWaiverDetails(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                rows={3}
                                placeholder="e.g. By checking in, you agree to our injury liability policy..."
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-white/10">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-lg hover:bg-white transition-all rounded-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <><Loader2 className="w-6 h-6 animate-spin" /> Provisioning Rolling League...</>
                    ) : (
                        <><Save className="w-6 h-6" /> {action === 'create' ? 'Create Rolling League' : 'Save Changes'}</>
                    )}
                </button>
            </div>
        </form>
    );
}
"""

with open("src/components/admin/RollingLeagueForm.tsx", "w") as f:
    f.write(code)

