'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Loader2, Shield, User, Ban, ArrowUp, ArrowDown, DollarSign, Trophy, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ManageUserModal from './ManageUserModal';
import OTPVerificationModal from './OTPVerificationModal';
import { requestRoleElevation, verifyRoleElevation, updateUserRole } from '@/app/actions/user-crm';
import { useToast } from '@/components/ui/Toast';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    role: 'player' | 'host' | 'master_admin';
    system_role?: string;
    facility_id?: string | null;
    zip_code?: string | null;
    created_at?: string;
    is_banned?: boolean;
    banned_until?: string | null;
    ban_reason?: string | null;
    verification_status?: 'verified' | 'pending' | 'rejected';
    waiver_signatures?: { id: string; agreed_at: string }[];
    credit_balance?: number;
    bookings?: { id: string; status: string }[];
    tournament_registrations?: { id: string; status: string }[];
}

interface UserTableProps {
    initialProfiles: Profile[];
}

export default function UserTable({ initialProfiles }: UserTableProps) {
    const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
    const [search, setSearch] = useState('');
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [sortRole, setSortRole] = useState<'asc' | 'desc' | null>(null);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Modal States
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

    const toast = useToast();
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id);
        });
    }, []);

    const filteredProfiles = useMemo(() => {
        let result = profiles.filter(p =>
            (p.full_name?.toLowerCase().includes(search.toLowerCase()) || '') ||
            (p.email?.toLowerCase().includes(search.toLowerCase()) || '')
        );

        if (sortRole) {
            result.sort((a, b) => {
                const roleOrder = { master_admin: 3, host: 2, player: 1 };
                const orderA = roleOrder[a.role] || 0;
                const orderB = roleOrder[b.role] || 0;
                return sortRole === 'asc' ? orderA - orderB : orderB - orderA;
            });
        }

        return result;
    }, [profiles, search, sortRole]);

    const handleRoleChange = async (userId: string, newRole: 'player' | 'host' | 'master_admin') => {
        const user = profiles.find(p => p.id === userId);
        if (!user) return;

        if (newRole === 'master_admin') {
            setSelectedUser(user);
            setLoadingMap(prev => ({ ...prev, [userId]: true }));
            try {
                await requestRoleElevation(userId);
                setIsOTPModalOpen(true);
            } catch (err: any) {
                toast.error(err.message || "Failed to initiate role elevation");
            } finally {
                setLoadingMap(prev => ({ ...prev, [userId]: false }));
            }
            return;
        }

        // Regular role update
        setLoadingMap(prev => ({ ...prev, [userId]: true }));
        try {
            await updateUserRole(userId, newRole);
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
            setEditingRoleId(null);
            toast.success(`Role updated to ${newRole}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to update role");
        } finally {
            setLoadingMap(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleOTPVerify = async (code: string) => {
        if (!selectedUser) return;
        try {
            await verifyRoleElevation(selectedUser.id, code);
            setProfiles(prev => prev.map(p => p.id === selectedUser.id ? { ...p, role: 'master_admin' } : p));
            setIsOTPModalOpen(false);
            setEditingRoleId(null);
            toast.success("Role elevated to Master Admin successfully.");
        } catch (err: any) {
            throw err; // Re-throw to be handled by the modal
        }
    };

    const toggleSort = () => {
        setSortRole(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const handleSaveBan = async (updates: { is_banned: boolean; banned_until: string | null; ban_reason: string | null }) => {
        if (!selectedUser) return;
        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', selectedUser.id);
            if (error) throw error;
            setProfiles(prev => prev.map(p => p.id === selectedUser.id ? { ...p, ...updates } : p));
            toast.success("Account status updated.");
            router.refresh();
        } catch (err: any) {
            throw err;
        }
    };

    const getEngagementCount = (profile: Profile) => {
        const activeBookings = (profile.bookings || []).filter(b => 
            ['paid', 'active', 'confirmed'].includes(b.status)
        ).length;
        const activeRegs = (profile.tournament_registrations || []).filter(r => 
            ['registered', 'active', 'paid'].includes(r.status)
        ).length;
        return activeBookings + activeRegs;
    };

    return (
        <div className="bg-pitch-card border border-white/10 rounded-sm p-6 shadow-xl">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search CRM Directory..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-sm pl-10 pr-4 py-2 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                    />
                </div>

                <button
                    onClick={toggleSort}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pitch-secondary hover:text-white transition-colors"
                >
                    Sort by Role
                    {sortRole === 'asc' && <ArrowUp className="w-3 h-3" />}
                    {sortRole === 'desc' && <ArrowDown className="w-3 h-3" />}
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[650px] custom-scrollbar">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-pitch-card z-10">
                        <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-pitch-secondary">
                            <th className="py-4 px-4">User Identity</th>
                            <th className="py-4 px-4">Role System</th>
                            <th className="py-4 px-4">Total Engagement</th>
                            <th className="py-4 px-4">Credit Vault</th>
                            <th className="py-4 px-4">Waiver</th>
                            <th className="py-4 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredProfiles.map(profile => {
                            const engagement = getEngagementCount(profile);
                            return (
                                <tr key={profile.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-sm bg-gray-700 overflow-hidden shrink-0 border border-white/5">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm leading-tight">{profile.full_name || 'Anonymous User'}</div>
                                                <div className="text-[11px] text-gray-500 font-numeric">{profile.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        {editingRoleId === profile.id && profile.id !== currentUserId ? (
                                            <select
                                                autoFocus
                                                value={profile.role}
                                                onBlur={() => setEditingRoleId(null)}
                                                onChange={(e) => handleRoleChange(profile.id, e.target.value as any)}
                                                className="bg-black border border-pitch-accent text-white text-xs rounded px-2 py-1 outline-none"
                                            >
                                                <option value="player">Player</option>
                                                <option value="host">Host</option>
                                                <option value="master_admin">Master Admin (OTP Required)</option>
                                            </select>
                                        ) : (
                                            <button 
                                                onClick={() => profile.id !== currentUserId && setEditingRoleId(profile.id)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all ${
                                                    profile.system_role === 'super_admin' ? 'bg-red-500/10 border-red-500/50 text-red-500' :
                                                    profile.role === 'master_admin' ? 'bg-purple-500/10 border-purple-500/50 text-purple-500' :
                                                    profile.role === 'host' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' :
                                                    'bg-green-500/20 border-green-500/50 text-green-400'
                                                } ${profile.id !== currentUserId ? 'hover:scale-105 cursor-pointer' : 'cursor-default opacity-80'}`}
                                            >
                                                {profile.system_role === 'super_admin' ? <Shield className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                                                {profile.system_role === 'super_admin' ? 'Super Admin' : profile.role}
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <Trophy className={`w-4 h-4 ${engagement > 5 ? 'text-pitch-accent' : 'text-gray-600'}`} />
                                            <span className="font-numeric font-bold text-white">{engagement}</span>
                                            <span className="text-[10px] text-gray-500 uppercase font-black">Events</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm border font-numeric font-bold text-xs ${
                                            (profile.credit_balance || 0) > 0 
                                            ? 'bg-pitch-accent/10 border-pitch-accent text-pitch-accent font-black' 
                                            : 'bg-white/5 border-white/10 text-gray-500'
                                        }`}>
                                            <DollarSign className="w-3 h-3" />
                                            {((profile.credit_balance || 0) / 100).toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 whitespace-nowrap">
                                        {profile.waiver_signatures && profile.waiver_signatures.length > 0 ? (
                                            <div className="text-green-500 text-[10px] font-black uppercase flex items-center gap-1">
                                                <Shield className="w-3.5 h-3.5" /> SECURE
                                            </div>
                                        ) : (
                                            <span className="text-gray-700 text-[10px] font-bold uppercase italic tracking-tighter">Unverified</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <button
                                            onClick={() => {
                                                setSelectedUser(profile);
                                                setIsManageModalOpen(true);
                                            }}
                                            className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${
                                                profile.is_banned ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white hover:text-black hover:border-white'
                                            }`}
                                        >
                                            {profile.is_banned ? 'Banned' : 'Manage'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modals Integration */}
            {isManageModalOpen && selectedUser && (
                <ManageUserModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    user={selectedUser}
                    onSaveBan={handleSaveBan}
                />
            )}

            {isOTPModalOpen && selectedUser && (
                <OTPVerificationModal 
                    isOpen={isOTPModalOpen}
                    onClose={() => setIsOTPModalOpen(false)}
                    onVerify={handleOTPVerify}
                    userName={selectedUser.full_name}
                />
            )}

            {loadingMap && Object.values(loadingMap).some(Boolean) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 pointer-events-none">
                    <Loader2 className="w-10 h-10 text-pitch-accent animate-spin" />
                </div>
            )}
        </div>
    );
}
