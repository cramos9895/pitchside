'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
    Calendar, 
    Clock, 
    Save, 
    Trophy, 
    MapPin, 
    ChevronRight, 
    Trash2, 
    Plus, 
    Copy,
    Info,
    AlertTriangle,
    DollarSign,
    Zap,
    Users,
    ChevronDown,
    Loader2,
    ShieldCheck
} from 'lucide-react';
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
    // TODO: Standard Pickup Games must be refactored to use the Rolling League UNIQUE(game_id, user_id) 
    // soft-delete and strict upsert architecture to resolve exit/re-entry bugs.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    // Rolling leagues are stored as event_type='league' + league_format='rolling', so must check league_format
    const [activeTab, setActiveTab] = useState<'standard' | 'tournament' | 'league' | 'rolling'>(initialData?.league_format === 'rolling' ? 'rolling' : (initialData?.event_type || 'standard'));
    
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
    const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState<number | ''>(initialData?.max_players_per_team ?? 12);
    const [rosterLockDate, setRosterLockDate] = useState(initialData?.roster_lock_date ? new Date(initialData.roster_lock_date).toISOString().slice(0, 16) : '');
    const [strictWaiverRequired, setStrictWaiverRequired] = useState(initialData?.strict_waiver_required ?? false);
    const [waiverDetails, setWaiverDetails] = useState(initialData?.waiver_details || '');

    // ROLLING LEAGUE Specific State
    const [rollingStartDate, setRollingStartDate] = useState(initialData?.start_time ? new Date(initialData.start_time).toISOString().slice(0, 10) : '');
    const [paymentCollectionType, setPaymentCollectionType] = useState<'stripe' | 'cash'>(initialData?.payment_collection_type || 'stripe');
    const [cashFeeStructure, setCashFeeStructure] = useState<'per_game' | 'upfront'>(initialData?.cash_fee_structure || 'per_game');
    const [cashAmount, setCashAmount] = useState<number | ''>(initialData?.cash_amount ?? '');

    // Phase 3 Game Style State
    const [gameStyle, setGameStyle] = useState<string>(initialData?.game_style || 'Group Stage/Playoffs');
    const [halfLength, setHalfLength] = useState<number | ''>(initialData?.half_length ?? 25);
    const [halftimeLength, setHalftimeLength] = useState<number | ''>(initialData?.halftime_length ?? 5);
    // Rolling League: total match slot duration in minutes — feeds the scheduling engine
    const [totalGameTime, setTotalGameTime] = useState<number | ''>(initialData?.total_game_time ?? 60);

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
    const [rosterFreezeDate, setRosterFreezeDate] = useState(initialData?.roster_freeze_date ? new Date(initialData.roster_freeze_date).toISOString().slice(0, 16) : '');
    const [regularSeasonStart, setRegularSeasonStart] = useState(initialData?.regular_season_start ? new Date(initialData.regular_season_start).toISOString().slice(0, 16) : '');
    const [playoffStartDate, setPlayoffStartDate] = useState(initialData?.playoff_start_date ? new Date(initialData.playoff_start_date).toISOString().slice(0, 16) : '');

    // Micro-Tournament Constraints
    const [tournamentStyle, setTournamentStyle] = useState<'group_stage' | 'single_elimination' | 'double_elimination'>(initialData?.tournament_style || 'group_stage');
    const [minimumGamesPerTeam, setMinimumGamesPerTeam] = useState<number | ''>(initialData?.minimum_games_per_team ?? 3);

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
    
    // Expanded ROLLING LEAGUE State
    const [allowFreeAgents, setAllowFreeAgents] = useState<boolean>(initialData?.allow_free_agents || false);
    const [chargeTeamRegistrationFee, setChargeTeamRegistrationFee] = useState<boolean>(initialData?.charge_team_registration_fee || false);
    const [hasSeasonEndDate, setHasSeasonEndDate] = useState<boolean>(!!initialData?.league_end_date);
    const [seasonEndDate, setSeasonEndDate] = useState<string>(initialData?.league_end_date ? new Date(initialData.league_end_date).toISOString().slice(0, 16) : '');
    const [teamSignupCutoff, setTeamSignupCutoff] = useState<string>(initialData?.team_signup_cutoff ? new Date(initialData.team_signup_cutoff).toISOString().slice(0, 16) : '');
    
    // NEW Payment Overhaul State
    const [teamRegistrationFee, setTeamRegistrationFee] = useState<number | ''>(initialData?.team_registration_fee ?? '');
    const [deductTeamRegFee, setDeductTeamRegFee] = useState<boolean>(initialData?.deduct_team_reg_fee ?? false);
    const [playerRegistrationFee, setPlayerRegistrationFee] = useState<number | ''>(initialData?.player_registration_fee ?? '');
    
    const [hasTeamRegistrationFee, setHasTeamRegistrationFee] = useState<boolean>(!!initialData?.team_registration_fee);
    const [hasPlayerRegistrationFee, setHasPlayerRegistrationFee] = useState<boolean>(!!initialData?.player_registration_fee);

    // ROLLING LEAGUE Lifecycle & Exceptions State
    const [lifecycleStatus, setLifecycleStatus] = useState<'active' | 'paused' | 'completed'>(initialData?.lifecycle_status || 'active');
    const [lifecycleEndDate, setLifecycleEndDate] = useState<string>(initialData?.lifecycle_end_date ? new Date(initialData.lifecycle_end_date).toISOString().slice(0, 16) : '');
    const [skippedDates, setSkippedDates] = useState<string[]>(initialData?.skipped_dates || []);
    const [newSkipDate, setNewSkipDate] = useState<string>('');
    
    // Safety Effect: Force isRefundable to false if Cash is selected
    useEffect(() => {
        if (activeTab === 'rolling' && paymentCollectionType === 'cash') {
            setIsRefundable(false);
        } else if (paymentCollectionType === 'stripe') {
            // Defensive: Clear cash state if switching to stripe
            setCashAmount('');
            setCashFeeStructure('per_game');
        }
    }, [activeTab, paymentCollectionType]);

    // Cleanup Effect: Clear waiver details if strict waiver is disabled
    useEffect(() => {
        if (!strictWaiverRequired) {
            setWaiverDetails('');
        }
    }, [strictWaiverRequired]);

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
        init,
    } = usePlacesAutocomplete({
        requestOptions: {},
        defaultValue: initialData?.location || '',
        initOnMount: false // We will initialize manually when script is loaded
    });

    // Manually initialize when script is loaded
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

        const isLeague = activeTab === 'league';
        const isRolling = activeTab === 'rolling';

        if (!isLeague && !isRolling && (!gameDate || !startTime || !endTime)) {
            alert("Please fill in all time fields");
            setLoading(false);
            return;
        }

        if (price !== '' && price > 0 && allowedPaymentMethods.length === 0 && !isRolling) {
            alert("You must select at least one payment method for a paid game.");
            setLoading(false);
            return;
        }

        try {
            let startDateTime = null;
            let endDateTime = null;

            if (isRolling && rollingStartDate) {
                // Use actual start time from the time picker; fallback to 6 PM if empty
                startDateTime = new Date(`${rollingStartDate}T${startTime || '18:00'}`);
            } else if (isLeague && regularSeasonStart) {
                startDateTime = new Date(regularSeasonStart);
            } else if (!isLeague && !isRolling && gameDate && startTime) {
                startDateTime = new Date(`${gameDate}T${startTime}`);
            }

            if (!isRolling) {
                if (isLeague && playoffStartDate) {
                    endDateTime = new Date(playoffStartDate);
                } else if (!isLeague && gameDate && endTime) {
                    endDateTime = new Date(`${gameDate}T${endTime}`);
                    if (startDateTime && endDateTime < startDateTime) {
                        endDateTime.setDate(endDateTime.getDate() + 1);
                    }
                }
            }

            // Rolling leagues also save end_time as a time string (e.g. "22:00:00")
            const formattedEndTime = (!isLeague && endTime && endTime.length >= 5) 
                ? (endTime.length === 5 ? `${endTime}:00` : endTime) 
                : (isLeague && endDateTime ? endDateTime.toISOString() : null);

            const payload = {
                title,
                rules_description: rulesDescription,
                location: locationName, 
                location_nickname: locationNickname,
                latitude: coords.lat,
                longitude: coords.lng,
                start_time: startDateTime ? startDateTime.toISOString() : null,
                end_time: formattedEndTime,
                
                event_type: activeTab === 'rolling' ? 'league' : activeTab,
                is_league: activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling',
                league_format: activeTab === 'rolling' ? 'rolling' : 'structured',
                match_style: matchStyle,
                game_format_type: gameFormatType,
                surface_type: surfaceType,
                amount_of_fields: amountOfFields === '' ? null : amountOfFields,
                field_size: fieldSize,
                shoe_types: shoeTypes,

                // Metadata for Rolling
                payment_collection_type: activeTab === 'rolling' ? paymentCollectionType : 'stripe',
                cash_fee_structure: activeTab === 'rolling' && paymentCollectionType === 'cash' ? cashFeeStructure : null,
                cash_amount: (activeTab === 'rolling' && paymentCollectionType === 'cash') ? (cashAmount === '' ? null : cashAmount) : null,
                allow_free_agents: activeTab === 'rolling' ? allowFreeAgents : false,
                charge_team_registration_fee: (activeTab === 'rolling') ? hasTeamRegistrationFee : false,
                team_registration_fee: (activeTab === 'rolling' && hasTeamRegistrationFee) ? (teamRegistrationFee === '' ? null : teamRegistrationFee) : null,
                deduct_team_reg_fee: (activeTab === 'rolling' && hasTeamRegistrationFee) ? deductTeamRegFee : false,
                player_registration_fee: (activeTab === 'rolling' && hasPlayerRegistrationFee) ? (playerRegistrationFee === '' ? null : playerRegistrationFee) : null,
                league_end_date: (activeTab === 'rolling' && hasSeasonEndDate) ? (seasonEndDate ? new Date(seasonEndDate).toISOString() : null) : null,
                team_signup_cutoff: activeTab === 'rolling' ? (teamSignupCutoff ? new Date(teamSignupCutoff).toISOString() : null) : null,
                waiver_details: (activeTab === 'rolling' || activeTab === 'tournament' || activeTab === 'league') ? (waiverDetails || null) : null,
                
                // Rolling Lifecycle & Exceptions
                lifecycle_status: activeTab === 'rolling' ? lifecycleStatus : 'active',
                lifecycle_end_date: (activeTab === 'rolling' && lifecycleEndDate) ? new Date(lifecycleEndDate).toISOString() : null,
                skipped_dates: activeTab === 'rolling' ? skippedDates : [],

                // Standard specific payload fields
                price: activeTab === 'standard' ? (price === '' ? 0 : price) : null,
                max_players: (activeTab === 'standard' || activeTab === 'rolling') ? (maxPlayers === '' ? (activeTab === 'rolling' ? null : 22) : maxPlayers) : null,
                teams_config: activeTab === 'standard' ? teams : null,
                is_refundable: (activeTab === 'rolling' && paymentCollectionType === 'cash') ? false : (activeTab === 'standard' ? isRefundable : true),
                refund_cutoff_hours: activeTab === 'standard' && isRefundable ? (refundCutoffHours === '' ? null : refundCutoffHours) : null,
                allowed_payment_methods: activeTab === 'standard' ? allowedPaymentMethods : ['stripe'],

                // Tournament / League specific payload fields
                team_price: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling' ) ? (teamPrice === '' ? null : teamPrice) : null,
                deposit_amount: (activeTab === 'tournament' || activeTab === 'league') && hasRegistrationFee ? (depositAmount === '' ? null : depositAmount) : null,
                has_registration_fee_credit: (activeTab === 'tournament' || activeTab === 'league') && hasRegistrationFee ? hasRegistrationFeeCredit : false,
                free_agent_price: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') 
                    ? (activeTab === 'rolling' && paymentCollectionType === 'cash' && cashFeeStructure === 'per_game' ? null : (freeAgentPrice === '' ? null : freeAgentPrice)) 
                    : null,
                has_free_agent_credit: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') ? hasFreeAgentCredit : false,
                refund_cutoff_date: (activeTab === 'tournament' || activeTab === 'league' || (activeTab === 'standard' && isRefundable)) ? (refundCutoffDate ? new Date(refundCutoffDate).toISOString() : null) : null,
                min_teams: (activeTab === 'tournament' || activeTab === 'league') ? (minTeams === '' ? null : minTeams) : null,
                max_teams: (activeTab === 'tournament' || activeTab === 'league') ? (maxTourneyTeams === '' ? null : maxTourneyTeams) : null,
                min_players_per_team: (activeTab === 'tournament' || activeTab === 'league') ? (minPlayersPerTeam === '' ? null : minPlayersPerTeam) : null,
                max_players_per_team: (activeTab === 'tournament' || activeTab === 'league') ? (maxPlayersPerTeam === '' ? null : maxPlayersPerTeam) : null,
                roster_lock_date: (activeTab === 'tournament' || activeTab === 'league') ? (rosterLockDate ? new Date(rosterLockDate).toISOString() : null) : null,
                roster_freeze_date: activeTab === 'league' ? (rosterFreezeDate ? new Date(rosterFreezeDate).toISOString() : null) : null,
                regular_season_start: activeTab === 'league' ? (regularSeasonStart ? new Date(regularSeasonStart).toISOString() : null) : null,
                playoff_start_date: activeTab === 'league' ? (playoffStartDate ? new Date(playoffStartDate).toISOString() : null) : null,
                strict_waiver_required: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') ? strictWaiverRequired : false,
                tournament_style: activeTab === 'tournament' ? tournamentStyle : null,
                minimum_games_per_team: (activeTab === 'tournament' && tournamentStyle === 'group_stage') ? (minimumGamesPerTeam === '' ? null : minimumGamesPerTeam) : null,
                game_style: activeTab === 'tournament' ? gameStyle : null,
                half_length: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') ? (halfLength === '' ? null : halfLength) : null,
                halftime_length: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') ? (halftimeLength === '' ? null : halftimeLength) : null,
                // Rolling League: persist match slot duration for the scheduling engine
                total_game_time: activeTab === 'rolling' ? (totalGameTime === '' ? 60 : totalGameTime) : null,
                
                // League / Rolling shared fields
                earliest_game_start_time: (activeTab === 'league' || activeTab === 'rolling') ? earliestGameStartTime || null : null,
                latest_game_start_time: (activeTab === 'league' || activeTab === 'rolling') ? latestGameStartTime || null : null,
                field_names: (activeTab === 'league' || activeTab === 'rolling') ? fieldNames : null,
                min_games_guaranteed: activeTab === 'league' ? (minGamesGuaranteed === '' ? null : minGamesGuaranteed) : null,
                teams_into_playoffs: activeTab === 'league' ? teamsIntoPlayoffs : null,
                has_playoff_bye: activeTab === 'league' ? hasPlayoffBye : false,
                break_between_games: (activeTab === 'league' || activeTab === 'rolling') ? (breakBetweenGames === '' ? null : breakBetweenGames) : null,

                prize_type: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') ? prizeType : null,
                prize_pool_percentage: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') && prizeType === 'Percentage Pool (Scaling Pot)' ? (prizePoolPercentage === '' ? null : prizePoolPercentage) : null,
                fixed_prize_amount: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') && prizeType === 'Fixed Cash Bounty' ? (fixedPrizeAmount === '' ? null : fixedPrizeAmount) : null,
                reward: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') && prizeType === 'Physical Item' ? reward : null,
                has_mvp_reward: (activeTab === 'tournament' || activeTab === 'league' || activeTab === 'rolling') ? (prizeType !== 'No Official Prize') : false,
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
            console.error('Error saving game:', {
                message: err.message,
                details: err.details,
                hint: err.hint,
                code: err.code,
                fullError: err
            });
            setError(err.message || "Failed to save game.");
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /> Loading...</div>;

    const tabs = [
        { id: 'standard', label: 'Standard Pickup' },
        { id: 'tournament', label: 'Micro-Tournament' },
        { id: 'league', label: 'Multi-Week League' },
        { id: 'rolling', label: 'Rolling League' }
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="flex justify-between items-center mb-6">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <div className="flex-1 w-full flex flex-col gap-4 animate-in fade-in slide-in-from-left-2">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                            Refund Cutoff (Hours Before)
                                        </label>
                                        <select
                                            value={refundCutoffHours}
                                            onChange={(e) => {
                                                setRefundCutoffHours(e.target.value === '' ? '' : parseInt(e.target.value));
                                                if (e.target.value !== '') setRefundCutoffDate('');
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                        >
                                            <option value="">No Hourly Bound</option>
                                            {[2, 6, 12, 24, 48, 72].map(hours => (
                                                <option key={hours} value={hours}>{hours} Hours</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-3 top-[45%] w-2 h-px bg-white/20"></div>
                                        <span className="text-[10px] font-bold text-pitch-secondary uppercase my-1 block text-center italic opacity-70">Or Explicit Date/Time</span>
                                    </div>
                                    <div>
                                        <input
                                            type="datetime-local"
                                            value={refundCutoffDate}
                                            onChange={(e) => {
                                                setRefundCutoffDate(e.target.value);
                                                if (e.target.value !== '') setRefundCutoffHours('');
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                        />
                                    </div>
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
                                Tournament Format
                            </label>
                            <select
                                value={tournamentStyle}
                                onChange={(e) => setTournamentStyle(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            >
                                <option value="group_stage">Group Stage + Playoffs</option>
                                <option value="single_elimination">Single Elimination Bracket</option>
                                <option value="double_elimination">Double Elimination Bracket</option>
                            </select>
                        </div>

                        {tournamentStyle === 'group_stage' && (
                            <div className="bg-[#cbff00]/10 border border-[#cbff00]/20 p-4 rounded-sm animate-in fade-in zoom-in-95 duration-200">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#cbff00] mb-2">
                                    Minimum Guaranteed Games Per Team
                                </label>
                                <p className="text-[10px] text-gray-400 mb-3 uppercase tracking-wider font-medium">
                                    How many matches will each squad natively play in the Group Stage before elimination?
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={minimumGamesPerTeam}
                                    onChange={(e) => setMinimumGamesPerTeam(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full bg-black/50 border border-[#cbff00]/30 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00]"
                                />
                            </div>
                        )}

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
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Max Players (Per Team)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={maxPlayersPerTeam}
                                    onChange={(e) => setMaxPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
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
                                {activeTab === 'league' ? 'League Name' : 'Tournament Title'}
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
                                Location Nick Name
                            </label>
                            <input
                                type="text"
                                value={locationNickname}
                                onChange={(e) => setLocationNickname(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-[#cbff00]" /> Season Timeline
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                            Roster Lock Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required={activeTab === 'league'}
                                            value={rosterLockDate}
                                            onChange={(e) => setRosterLockDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                        />
                                        <p className="text-[10px] text-pitch-secondary mt-1 uppercase">Payments captured & rosters locked.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                            Regular Season Start
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required={activeTab === 'league'}
                                            value={regularSeasonStart}
                                            onChange={(e) => setRegularSeasonStart(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                        />
                                        <p className="text-[10px] text-pitch-secondary mt-1 uppercase">First day of league play.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                            Roster Freeze Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required={activeTab === 'league'}
                                            value={rosterFreezeDate}
                                            onChange={(e) => setRosterFreezeDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                        />
                                        <p className="text-[10px] text-pitch-secondary mt-1 uppercase">Mid-season transfer cutoff.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                            Playoff Start Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required={activeTab === 'league'}
                                            value={playoffStartDate}
                                            onChange={(e) => setPlayoffStartDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                        />
                                        <p className="text-[10px] text-pitch-secondary mt-1 uppercase">Delineates bracket phase.</p>
                                    </div>
                                </div>

                                {activeTab === 'league' && (
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
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Registration Cutoff Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={gameDate}
                                    onChange={(e) => setGameDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Earliest Game
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
                                        <Clock className="w-3 h-3" /> Latest Game
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

            {activeTab === 'rolling' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-[#cbff00]" /> Rolling League Info
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
                                                // Ensure we don't return an empty array if we have fields
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
                                                    else setShoeTypes(shoeTypes.filter(s => s !== shoe));
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
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Max Teams
                                </label>
                                <input
                                    type="number"
                                    value={maxTourneyTeams}
                                    onChange={(e) => setMaxTourneyTeams(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
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
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Max Players / Team
                                </label>
                                <input
                                    type="number"
                                    value={maxPlayersPerTeam}
                                    onChange={(e) => setMaxPlayersPerTeam(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-[#cbff00]" /> Season Timeline
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Team Sign Up Cut Off Date
                                </label>
                                <input
                                    type="datetime-local"
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
                                            type="datetime-local"
                                            value={seasonEndDate}
                                            onChange={(e) => setSeasonEndDate(e.target.value)}
                                            className="w-full bg-black/40 border border-[#cbff00]/20 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                            Playoff Tournament Start Date
                                        </label>
                                        <input
                                            type="datetime-local"
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
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm border border-white/10">
                                        <div>
                                            <p className="font-bold uppercase text-xs text-white">League Refund Policy</p>
                                            <p className="text-[10px] text-pitch-secondary uppercase font-medium">Standard 24-hour cutoff applies</p>
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

                                    {/* Team Cash Amount Input */}
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

                                     {/* Free Agent Fee Input (Only for upfront or stripe) */}
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

                    {/* NEW: Lifecycle & Schedule Exceptions Section */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-[#cbff00]" /> Lifecycle & Exceptions
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 rounded-sm border border-white/10">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    League Status
                                </label>
                                <select
                                    value={lifecycleStatus}
                                    onChange={(e) => setLifecycleStatus(e.target.value as any)}
                                    className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors"
                                >
                                    <option value="active">🟢 Active (Running)</option>
                                    <option value="paused">🟡 Paused (Halted)</option>
                                    <option value="completed">🔴 Completed (Archived)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Final Season Date (Automatic End)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={lifecycleEndDate}
                                    onChange={(e) => setLifecycleEndDate(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Skip Weeks UI */}
                        <div className="p-6 bg-white/5 rounded-sm border border-white/10 space-y-4">
                            <div>
                                <h4 className="font-bold uppercase text-sm text-white mb-1">Skip Specific Dates</h4>
                                <p className="text-[10px] text-pitch-secondary uppercase font-medium mb-4">Add holidays, snow days, or facility closures. The autopilot will skip these weeks.</p>
                                
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={newSkipDate}
                                        onChange={(e) => setNewSkipDate(e.target.value)}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-[#cbff00] transition-colors [color-scheme:dark]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newSkipDate && !skippedDates.includes(newSkipDate)) {
                                                setSkippedDates([...skippedDates, newSkipDate].sort());
                                                setNewSkipDate('');
                                            }
                                        }}
                                        className="px-6 bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-sm hover:bg-white hover:text-black transition-all"
                                    >
                                        Add Date
                                    </button>
                                </div>
                            </div>

                            {skippedDates.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {skippedDates.map(date => (
                                        <div key={date} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-sm group">
                                            <span className="text-xs font-bold text-white">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            <button
                                                type="button"
                                                onClick={() => setSkippedDates(skippedDates.filter(d => d !== date))}
                                                className="text-red-500 hover:text-white transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
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
                </div>
            )}

            <button
                type="submit"
                disabled={loading || (action === 'create' && !isLoaded)}
                className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2 mt-8"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <><Save className="w-5 h-5 text-black" /> {action === 'create' ? (activeTab === 'league' ? 'Create League' : 'Create Match') : 'Save Changes'}</>}
            </button>
        </form>
    );
}
