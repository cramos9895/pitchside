import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { ShieldAlert, Building2, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function AdminFacilitiesList() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Verify Super Access
    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <ShieldAlert className="w-16 h-16 text-red-600 mb-6" />
                <h2 className="text-3xl font-heading font-black italic uppercase tracking-wider mb-2 text-white">
                    Access Denied
                </h2>
                <p className="text-gray-400 max-w-md">
                    The Global Facilities Directory is strictly reserved for System Administrators.
                </p>
            </div>
        );
    }

    // 2. Fetch all facilities bypassing RLS using Service Role
    const adminClient = createAdminClient();
    const { data: facilities, error } = await adminClient
        .from('facilities')
        .select(`
            id,
            name,
            address,
            created_at,
            resources (count)
        `)
        .order('name');

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black italic text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-pitch-accent" />
                        Facility Directory
                    </h1>
                    <p className="text-gray-400">Global hub of all registered B2B partner venues.</p>
                </div>
            </div>

            {/* Global Directory List */}
            <div className="bg-pitch-card border border-white/10 rounded-sm overflow-hidden flex flex-col">
                {/* Header Row */}
                <div className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 flex p-4 font-bold">
                    <div className="flex-1 min-w-[200px]">Facility Name</div>
                    <div className="flex-1 min-w-[200px] hidden md:block">Location</div>
                    <div className="w-32 text-center">Resources</div>
                    <div className="w-16"></div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5 flex flex-col">
                    {error || !facilities || facilities.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 italic">
                            No facilities registered in the global directory yet.
                        </div>
                    ) : (
                        facilities.map((facility: any) => (
                            <Link
                                key={facility.id}
                                href={`/admin/facilities/${facility.id}`}
                                className="flex p-4 items-center hover:bg-white/[0.02] transition-colors group cursor-pointer"
                            >
                                <div className="flex-1 min-w-[200px]">
                                    <div className="font-bold text-white group-hover:text-pitch-accent transition-colors">{facility.name}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">ID: {facility.id.substring(0, 8)}...</div>
                                </div>
                                <div className="flex-1 min-w-[200px] hidden md:flex items-center gap-2 text-gray-400 text-sm">
                                    <MapPin className="w-4 h-4 text-pitch-secondary" />
                                    {facility.address || 'No address stored'}
                                </div>
                                <div className="w-32 text-center">
                                    <span className="bg-pitch-accent/10 border border-pitch-accent/30 text-pitch-accent font-black py-1 px-3 rounded-full text-xs">
                                        {facility.resources?.[0]?.count || 0}
                                    </span>
                                </div>
                                <div className="w-16 flex justify-end text-gray-600 group-hover:text-white transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
