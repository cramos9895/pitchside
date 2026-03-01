import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Plus, Users, ShieldCheck, Mail, Building } from 'lucide-react';
import { InviteStaffModal } from '@/components/facility/InviteStaffModal';

export const metadata = {
    title: 'Team Management | Pitch Side Facility',
    description: 'Manage facility staff and admins',
};

// Next.js config
export const revalidate = 0;

export default async function FacilityTeamPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // Get Active User Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, system_role, facility_id')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
    const isFacilityAdmin = profile?.system_role === 'facility_admin';

    if (!isSuperAdmin && !isFacilityAdmin) {
        redirect('/');
    }

    // Determine target facility
    let activeFacilityId = profile?.facility_id;

    if (isSuperAdmin) {
        const cookieStore = await cookies();
        const impersonateCookie = cookieStore.get('pitchside_impersonate_facility_id');
        if (impersonateCookie?.value) {
            activeFacilityId = impersonateCookie.value;
        }
    }

    if (!activeFacilityId) {
        return (
            <div className="p-8 text-center bg-red-500/10 text-red-500 rounded border border-red-500/20">
                You must be linked to a facility to view team management.
            </div>
        );
    }

    // Fetch Team Members
    // Note: We use the admin client to ensure we can see all profiles for this facility,
    // regardless of strict Row Level Security (in case RLS blocks peers from seeing each other).
    const adminClient = createAdminClient();
    const { data: teamMembers, error } = await adminClient
        .from('profiles')
        .select('id, full_name, email, role, system_role, verification_status')
        .eq('facility_id', activeFacilityId)
        .order('full_name', { ascending: true });

    if (error) {
        console.error("Error fetching facility team members:", error);
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-pitch-accent/10 border border-pitch-accent/20 text-pitch-accent text-xs font-bold uppercase tracking-widest rounded mb-2">
                        <Users className="w-4 h-4" /> Team Management
                    </div>
                    <h1 className="text-4xl font-heading font-black italic uppercase tracking-tight text-white">
                        Staff & Admins
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">
                        Manage personnel access and roles for your facility.
                    </p>
                </div>

                {/* Client Component: Invite Modal Trigger */}
                <div>
                    <InviteStaffModal />
                </div>
            </div>

            {/* Team Members List */}
            <div className="bg-pitch-card border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                {(!teamMembers || teamMembers.length === 0) ? (
                    <div className="p-16 text-center text-gray-400">
                        No team members found for this facility.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40 border-b border-white/10">
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Staff Member</th>
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">System Role</th>
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Status</th>
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {teamMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-pitch-black border border-white/10 flex items-center justify-center text-gray-400">
                                                    {member.full_name ? member.full_name.charAt(0).toUpperCase() : <Users className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">
                                                        {member.full_name || 'Pending Accept'}
                                                    </div>
                                                    <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                        <Mail className="w-3 h-3" /> {member.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-widest">
                                                <Building className="w-3.5 h-3.5" />
                                                {member.system_role === 'facility_admin' ? 'Facility Admin' : member.system_role || 'Staff'}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            {member.verification_status === 'verified' ? (
                                                <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-bold">
                                                    <ShieldCheck className="w-4 h-4" /> Active
                                                </span>
                                            ) : member.verification_status === 'pending' ? (
                                                <span className="inline-flex items-center gap-1.5 text-orange-400 text-sm font-bold">
                                                    Pending Review
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-red-400 text-sm font-bold">
                                                    Suspended
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-5 text-right">
                                            {/* Future: Edit/Remove controls */}
                                            <button className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white border border-transparent hover:border-white/20 bg-transparent hover:bg-white/5 rounded transition-all">
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
