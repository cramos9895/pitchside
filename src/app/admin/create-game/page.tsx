
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Save, Users, Plus, Trash2, Clock, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

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

export default function NewGamePage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // DISTINCT STATES as requested
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [gameDate, setGameDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [price, setPrice] = useState<number | ''>(10.00);
    const [maxPlayers, setMaxPlayers] = useState<number | ''>(22);
    const [surfaceType, setSurfaceType] = useState('Turf');
    const [hasMvpReward, setHasMvpReward] = useState(false);

    // Payment Methods State
    const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<string[]>(['venmo', 'zelle']);

    const [teams, setTeams] = useState<TeamConfig[]>([
        { name: 'Neon Orange', color: 'Neon Orange', limit: 11 },
        { name: 'White', color: 'White', limit: 11 }
    ]);

    // Smart Duration: Auto-set End Time to Start Time + 60 mins
    useEffect(() => {
        if (startTime) {
            try {
                const [h, m] = startTime.split(':').map(Number);
                const d = new Date();
                d.setHours(h);
                d.setMinutes(m);
                d.setHours(d.getHours() + 1); // Add 1 hour

                const newH = d.getHours().toString().padStart(2, '0');
                const newM = d.getMinutes().toString().padStart(2, '0');
                setEndTime(`${newH}:${newM}`);
            } catch (ignore) { }
        }
    }, [startTime]);

    // Smart Sizing: Auto-calculate limit per team (Distribute remainder)
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
    }, [maxPlayers, teams.length]);

    const handleTeamChange = (index: number, field: keyof TeamConfig, value: string | number) => {
        const newTeams = [...teams];
        const currentTeam = newTeams[index];

        // Smart Naming: If changing color, and name matches old color (or is default), update name
        if (field === 'color') {
            const oldColorLabel = currentTeam.color;
            const newColorLabel = String(value);

            // Check if name is currently just the color or generic "Team X"
            const isGenericName = currentTeam.name === oldColorLabel || currentTeam.name.startsWith('Team ');

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
        // Find first unused color
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

        // 1. Validation
        if (!gameDate || !startTime || !endTime) {
            alert("Please fill in all time fields");
            setLoading(false);
            return;
        }

        // Validate allowed payment methods if price > 0
        if (price !== '' && price > 0 && allowedPaymentMethods.length === 0) {
            alert("You must select at least one payment method for a paid game.");
            setLoading(false);
            return;
        }

        try {
            // 2. Auth Check
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in.");

            // 3. Construct Payload
            // Fix: Combine Date and Time into ISO String for TIMESTAMPTZ columns
            const startDateTime = new Date(`${gameDate}T${startTime}`);
            const endDateTime = new Date(`${gameDate}T${endTime}`);

            // Handle overflows (e.g. game ends next day)
            if (endDateTime < startDateTime) {
                endDateTime.setDate(endDateTime.getDate() + 1);
            }

            // Fallback for TIME column type on end_time
            const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

            const payload = {
                title,
                location,
                start_time: startDateTime.toISOString(), // TIMESTAMPTZ: Full ISO String
                end_time: formattedEndTime,              // TIME: "HH:mm:ss" (Likely column type mismatch in DB)
                price: price === '' ? 0 : price,
                max_players: maxPlayers === '' ? 22 : maxPlayers,
                surface_type: surfaceType,
                current_players: 0,
                teams_config: teams,
                has_mvp_reward: hasMvpReward,
                allowed_payment_methods: allowedPaymentMethods
            };

            console.log('Payload:', payload);

            // 5. Insert
            const { error: insertError } = await supabase
                .from('games')
                .insert([payload]);

            if (insertError) throw insertError;

            // 6. Redirect
            router.push('/admin');
            router.refresh();

        } catch (err: any) {
            console.error('Error creating game:', JSON.stringify(err, null, 2));
            setError(err.message || "Failed to create game.");
            alert("Error: " + (err.message || "Failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-32">
            <div className="max-w-2xl mx-auto">
                <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter mb-8">
                    Create <span className="text-pitch-accent">New Game</span>
                </h1>

                <div className="bg-pitch-card border border-white/10 p-8 rounded-sm shadow-xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">

                        <div className="space-y-6">
                            <h3 className="text-xl font-bold uppercase italic border-b border-white/10 pb-2 flex items-center gap-2">
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

                            {/* Location */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Schaumburg Sport Center"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>

                            {/* SPLIT DATE / TIME INPUTS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Date */}
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
                                {/* Start Time */}
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
                                {/* End Time */}
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
                                {/* Price */}
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
                                {/* Max Players */}
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
                                        className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Payment Methods Configuration */}
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

                            {/* MVP REWARD TOGGLE */}
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
                        </div>

                        {/* Surface Type */}
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


                        {/* TEAM CONFIGURATION SECTION */}
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
                                        {/* Name */}
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
                                        {/* Color */}
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
                                        {/* Limit */}
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Create Match</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
