import { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { updateLeagueSettings } from '@/app/actions/rolling-god-mode';
import { useToast } from '@/components/ui/Toast';

export function SettingsTab({ game, onRefresh }: any) {
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);

    const [formState, setFormState] = useState({
        accepting_registrations: game.accepting_registrations ?? true,
        allow_free_agents: game.allow_free_agents ?? false,
        team_registration_fee: game.team_registration_fee || 0,
        player_registration_fee: game.player_registration_fee || 0,
        cash_amount: game.cash_amount || 0,
        payment_collection_type: game.payment_collection_type || 'cash',
        ref_fee_per_game: game.ref_fee_per_game || 0,
        weekly_field_rental_cost: game.weekly_field_rental_cost || 0
    });

    const handleSave = async () => {
        setProcessing(true);
        try {
            await updateLeagueSettings(game.id, {
                accepting_registrations: formState.accepting_registrations,
                allow_free_agents: formState.allow_free_agents,
                team_registration_fee: parseFloat(formState.team_registration_fee.toString()),
                player_registration_fee: parseFloat(formState.player_registration_fee.toString()),
                cash_amount: parseFloat(formState.cash_amount.toString()),
                payment_collection_type: formState.payment_collection_type,
                ref_fee_per_game: parseFloat(formState.ref_fee_per_game.toString()),
                weekly_field_rental_cost: parseFloat(formState.weekly_field_rental_cost.toString())
            });
            success("Settings saved successfully.");
            // Re-fetch game data so sibling tabs (Financials, Game Day) pick up updated costs
            if (onRefresh) await onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-pitch-accent" /> League Settings
                </h3>
                <button
                    onClick={handleSave}
                    disabled={processing}
                    className="px-4 py-2 bg-pitch-accent text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors flex items-center gap-2 rounded disabled:opacity-50"
                >
                    <Save className="w-4 h-4" /> Save Configuration
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Registration Locks */}
                <div className="bg-pitch-card border border-white/10 p-6 rounded-lg space-y-6">
                    <h4 className="text-white font-black uppercase italic tracking-wider text-sm mb-4 border-b border-white/10 pb-2">Registration Locks</h4>
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-white uppercase tracking-widest mb-1">Accepting New Teams</div>
                            <div className="text-[10px] text-gray-500">Toggles the global registration lock.</div>
                        </div>
                        <label className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={formState.accepting_registrations}
                                    onChange={(e) => setFormState({...formState, accepting_registrations: e.target.checked})}
                                />
                                <div className={`block w-12 h-6 rounded-full transition-colors ${formState.accepting_registrations ? 'bg-pitch-accent' : 'bg-white/20'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${formState.accepting_registrations ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-white uppercase tracking-widest mb-1">Accepting Free Agents</div>
                            <div className="text-[10px] text-gray-500">Allows solo players to register.</div>
                        </div>
                        <label className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={formState.allow_free_agents}
                                    onChange={(e) => setFormState({...formState, allow_free_agents: e.target.checked})}
                                />
                                <div className={`block w-12 h-6 rounded-full transition-colors ${formState.allow_free_agents ? 'bg-pitch-accent' : 'bg-white/20'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${formState.allow_free_agents ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Financial Constants */}
                <div className="bg-pitch-card border border-white/10 p-6 rounded-lg space-y-4">
                    <h4 className="text-white font-black uppercase italic tracking-wider text-sm mb-4 border-b border-white/10 pb-2">Financial Setup</h4>
                    
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Collection Mode</label>
                        <select 
                            className="w-full bg-black border border-white/20 p-3 text-white text-sm font-bold focus:border-pitch-accent outline-none rounded uppercase tracking-wider"
                            value={formState.payment_collection_type}
                            onChange={(e) => setFormState({...formState, payment_collection_type: e.target.value})}
                        >
                            <option value="stripe">Online (Stripe)</option>
                            <option value="cash">In-Person (Cash)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Team Registration Fee ($)</label>
                        <input 
                            type="number"
                            min="0"
                            className="w-full bg-black border border-white/20 p-3 text-white text-sm font-bold focus:border-pitch-accent outline-none rounded"
                            value={formState.team_registration_fee}
                            onChange={(e) => setFormState({...formState, team_registration_fee: e.target.value as any})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Individual Roster Fee/Free Agent Fee ($)</label>
                        <input 
                            type="number"
                            min="0"
                            className="w-full bg-black border border-white/20 p-3 text-white text-sm font-bold focus:border-pitch-accent outline-none rounded"
                            value={formState.player_registration_fee}
                            onChange={(e) => setFormState({...formState, player_registration_fee: e.target.value as any})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Cash Door Fee ($)</label>
                        <input 
                            type="number"
                            min="0"
                            className="w-full bg-black border border-white/20 p-3 text-white text-sm font-bold focus:border-pitch-accent outline-none rounded"
                            value={formState.cash_amount}
                            onChange={(e) => setFormState({...formState, cash_amount: e.target.value as any})}
                        />
                    </div>
                </div>

                {/* Operational Costs */}
                <div className="bg-pitch-card border border-white/10 p-6 rounded-lg space-y-4 md:col-span-2">
                    <h4 className="text-white font-black uppercase italic tracking-wider text-sm mb-4 border-b border-white/10 pb-2 flex items-center justify-between">
                        Operational Cost Inputs
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest non-italic">Used for Net Profit Analytics</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Ref Fee (Per Game) ($)</label>
                            <input 
                                type="number"
                                min="0"
                                className="w-full bg-black border border-white/20 p-3 text-white text-sm font-bold focus:border-pitch-accent outline-none rounded"
                                value={formState.ref_fee_per_game}
                                onChange={(e) => setFormState({...formState, ref_fee_per_game: e.target.value as any})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Weekly Field Rental Total ($)</label>
                            <input 
                                type="number"
                                min="0"
                                className="w-full bg-black border border-white/20 p-3 text-white text-sm font-bold focus:border-pitch-accent outline-none rounded"
                                value={formState.weekly_field_rental_cost}
                                onChange={(e) => setFormState({...formState, weekly_field_rental_cost: e.target.value as any})}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
