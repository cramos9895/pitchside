import { Trophy, RefreshCw, ArrowLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function TournamentHeader({ 
    title, 
    status,
    registeredTeamsCount,
    maxTeams,
    onRefresh, 
    loading 
}: { 
    title: string; 
    status: string;
    registeredTeamsCount: number;
    maxTeams?: number;
    onRefresh: () => void; 
    loading?: boolean; 
}) {
    return (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
            <div>
                <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-2 transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-6 h-6 text-pitch-accent" />
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        {title}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 border border-pitch-accent/30 bg-pitch-accent/10 text-pitch-accent text-[10px] font-black uppercase tracking-widest rounded-sm">
                        Format: Tournament
                    </span>
                    <span className={cn("px-2 py-0.5 border text-[10px] font-black uppercase tracking-widest rounded-sm", 
                        status === 'scheduled' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500' : 
                        status === 'active' ? 'border-blue-500/30 bg-blue-500/10 text-blue-500' :
                        'border-green-500/30 bg-green-500/10 text-green-500'
                    )}>
                        {status === 'scheduled' ? 'Registration Open' : status === 'active' ? 'Tournament Live' : status}
                    </span>
                    <span className="px-2 py-0.5 border border-white/20 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-sm flex items-center gap-1">
                        <Users className="w-3 h-3" /> {registeredTeamsCount} / {maxTeams || '-'} Teams
                    </span>
                </div>
            </div>
            
            <button 
                onClick={onRefresh}
                disabled={loading}
                className={cn(
                    "w-full md:w-auto justify-center flex items-center gap-2 px-4 py-3 md:py-2 border border-white/20 text-white font-black uppercase tracking-widest text-xs md:text-[10px] rounded hover:bg-white/10 transition-colors",
                    loading && "opacity-50 cursor-not-allowed"
                )}
            >
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                Refresh Data
            </button>
        </div>
    );
}
