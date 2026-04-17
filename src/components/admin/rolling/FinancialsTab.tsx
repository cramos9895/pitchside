import { Trophy, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FinancialsTab({
    game,
    registrations,
    matches,
    teams
}: any) {
    const isCashMode = game?.payment_collection_type === 'cash';

    // GROSS CALCULATION
    let grossRevenue = 0;

    if (isCashMode) {
        // Cash: total_cash_collected mapping, plus standard upfront
        grossRevenue = registrations.reduce((sum: number, r: any) => sum + (r.total_cash_collected || 0), 0);
    } else {
        // Stripe: sum of payment_amount roughly or assume flat rate per active registration
        // Registrations from Stripe are stored as 'verified'. Assume team_registration_fee + individual if free agent.
        // For simplicity, aggregate via paid bookings.
        // Since we didn't inject payment_amount explicitly on tournament_registrations unless we query booking, 
        // we can estimate based on Settings constants.
        grossRevenue = registrations.reduce((sum: number, r: any) => {
            if (r.payment_status === 'verified') {
                return sum + (r.role === 'captain' ? (game.team_registration_fee || 0) : (game.player_registration_fee || 0));
            }
            return sum;
        }, 0);
    }

    // EXPENSE CALCULATION
    const completedMatches = matches.filter((m: any) => m.status === 'completed');
    const refFeeTotal = (game.ref_fee_per_game || 0) * completedMatches.length;

    // Estimate weeks elapsed by calculating unique match days
    const activeDates = new Set(matches.filter((m:any) => m.status === 'completed' || m.status === 'active').map((m: any) => {
        return new Date(m.start_time).toISOString().split('T')[0];
    }));
    const weeksElapsed = Math.max(1, activeDates.size); // Rough proxy for "weeks" if one rolling day per week
    const rentalTotal = (game.weekly_field_rental_cost || 0) * weeksElapsed;

    const totalExpenses = refFeeTotal + rentalTotal;

    // NET PROFIT
    const netProfit = grossRevenue - totalExpenses;
    const isProfitable = netProfit >= 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HERO P&L METRIC */}
            <div className={cn(
                "border rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden",
                isProfitable ? "bg-pitch-card border-pitch-accent/30" : "bg-red-950/20 border-red-500/30"
            )}>
                {/* Glow layer */}
                {isProfitable && <div className="absolute inset-0 bg-pitch-accent/5 blur-3xl pointer-events-none" />}
                
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-2 relative z-10">Net Lifetime Profit</h2>
                <div className={cn(
                    "text-6xl md:text-8xl font-black italic uppercase tracking-tighter relative z-10",
                    isProfitable ? "text-pitch-accent drop-shadow-[0_0_15px_rgba(204,255,0,0.3)]" : "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                )}>
                    {netProfit < 0 ? '-' : ''}${Math.abs(netProfit).toLocaleString()}
                </div>
                
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 relative z-10">
                    {isProfitable ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    <span>{isCashMode ? 'Cash Ledger Active' : 'Stripe Ledger Active'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GROSS COLUMN */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-black italic uppercase text-xl mb-6 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-green-500" /> Gross Revenue
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Collected</div>
                                <div className="text-[10px] text-gray-600">From {registrations.length} registered players</div>
                            </div>
                            <div className="text-2xl font-black text-white">${grossRevenue.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* EXPENSES COLUMN */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-white font-black italic uppercase text-xl mb-6 flex items-center gap-2">
                        <TrendingDown className="w-6 h-6 text-red-500" /> Operational Costs
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Referee Fees</div>
                                <div className="text-[10px] text-gray-600">{completedMatches.length} matches @ ${game.ref_fee_per_game || 0}/ea</div>
                            </div>
                            <div className="text-lg font-black text-red-400">-${refFeeTotal.toLocaleString()}</div>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Pitch Rentals</div>
                                <div className="text-[10px] text-gray-600">{weeksElapsed} game days @ ${game.weekly_field_rental_cost || 0}/ea</div>
                            </div>
                            <div className="text-lg font-black text-red-400">-${rentalTotal.toLocaleString()}</div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <div className="text-xs font-black uppercase tracking-widest text-white">Total Expenses</div>
                            <div className="text-xl font-black text-red-500">-${totalExpenses.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
