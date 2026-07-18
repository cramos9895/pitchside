'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AdminTournamentDashboard } from './AdminTournamentDashboard';
import { AdminPickupDashboard } from './AdminPickupDashboard';
import { AdminLeagueDashboard } from './AdminLeagueDashboard';
import { Loader2 } from 'lucide-react';

export default function AdminGameDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const gameId = resolvedParams.id;
    
    const [eventType, setEventType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGameType = async () => {
            const { data, error } = await supabase
                .from('games')
                .select('event_type')
                .eq('id', gameId)
                .single();
                
            if (data && !error) {
                setEventType(data.event_type || 'pickup');
            }
            setLoading(false);
        };
        fetchGameType();
    }, [gameId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (eventType === 'tournament') {
        return <AdminTournamentDashboard params={params} />;
    } else if (eventType === 'league') {
        return <AdminLeagueDashboard params={params} />;
    } else {
        return <AdminPickupDashboard params={params} />;
    }
}
