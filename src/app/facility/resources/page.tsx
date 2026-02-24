import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Plus, MapPin, Database } from 'lucide-react';
import { ResourceModal } from '@/components/facility/ResourceModal';

export default async function ResourcesManager() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Fetch Profile to get facility_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role')
        .eq('id', user.id)
        .single();

    if (!profile?.facility_id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Database className="w-16 h-16 text-gray-600 mb-6" />
                <h2 className="text-3xl font-heading font-black italic uppercase tracking-wider mb-2">
                    No Facility Assigned
                </h2>
                <p className="text-gray-400 max-w-md">
                    Your account does not have a physical Facility ID bound to it yet. Please contact the system administrator to link your account before managing resources.
                </p>
            </div>
        );
    }

    // 2. Fetch Resources for this specific Facility (RLS protects this natively, but we make it explicit)
    const { data: resources, error: fetchError } = await supabase
        .from('resources')
        .select('*')
        .eq('facility_id', profile.facility_id)
        .order('created_at', { ascending: false });

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black italic text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                        <MapPin className="w-8 h-8 text-pitch-accent" />
                        Resource Manager
                    </h1>
                    <p className="text-gray-400">Manage courts, fields, and playable areas for your facility.</p>
                </div>

                {/* Embedded Client Modal Trigger */}
                <ResourceModal />
            </div>

            {/* Resources Data Table */}
            <div className="bg-pitch-card border border-white/10 rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                                <th className="p-4 font-bold">Resource Name</th>
                                <th className="p-4 font-bold">Type</th>
                                <th className="p-4 font-bold text-right">Added</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {fetchError || !resources || resources.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                        No resources found. Click "Add Resource" to create your first field or court.
                                    </td>
                                </tr>
                            ) : (
                                resources.map((resource) => (
                                    <tr key={resource.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{resource.name}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-1">{resource.id.substring(0, 8)}...</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-pitch-accent/20 text-pitch-accent px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border border-pitch-accent/30">
                                                {resource.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-sm text-gray-400">
                                            {new Date(resource.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
