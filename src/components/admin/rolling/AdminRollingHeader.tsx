import { Shield, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminRollingHeader({ 
    leagueTitle, 
    onRefresh, 
    loading 
}: { 
    leagueTitle: string; 
    onRefresh: () => void; 
    loading?: boolean; 
}) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-6 h-6 text-pitch-accent" />
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        {leagueTitle}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 border border-pitch-accent/30 bg-pitch-accent/10 text-pitch-accent text-[10px] font-black uppercase tracking-widest rounded-sm">
                        Format: Continuous Rolling League
                    </span>
                </div>
            </div>
            
            <button 
                onClick={onRefresh}
                disabled={loading}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 border border-white/20 text-white font-black uppercase tracking-widest text-[10px] rounded hover:bg-white/10 transition-colors",
                    loading && "opacity-50 cursor-not-allowed"
                )}
            >
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                Refresh Data
            </button>
        </div>
    );
}
