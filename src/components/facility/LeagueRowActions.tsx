'use client';

import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LeagueRowActions({ leagueId }: { leagueId: string }) {
    const router = useRouter();

    return (
        <td className="p-5 text-right flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
            <button
                type="button"
                onClick={() => router.push(`/facility/leagues/${leagueId}`)}
                className="inline-flex items-center justify-center px-4 py-2 bg-pitch-accent hover:bg-white text-pitch-black text-sm font-bold rounded-sm shadow-sm transition-colors cursor-pointer relative z-10"
            >
                Manage
            </button>
            <button
                type="button"
                onClick={() => router.push(`/facility/leagues/${leagueId}/edit`)}
                className="inline-flex items-center justify-center p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-sm border border-white/10 transition-colors cursor-pointer relative z-10"
                title="Edit League Rules"
            >
                <Settings className="w-5 h-5" />
            </button>
        </td>
    );
}
