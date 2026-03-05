'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Loader2, Shield, User, Ban, ArrowUp, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
}

interface UserTableProps {
    initialProfiles: Profile[];
}

export default function UserTable({ initialProfiles }: UserTableProps) {
    const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
    const [search, setSearch] = useState('');
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [sortRole, setSortRole] = useState<'asc' | 'desc' | null>(null);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Ban Modal State
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [banReason, setBanReason] = useState('');
    const [bannedUntil, setBannedUntil] = useState('');
    const [isBanned, setIsBanned] = useState(false);
    const [savingBan, setSavingBan] = useState(false);

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

    const updateRole = async (userId: string, newRole: 'player' | 'host' | 'master_admin') => {
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

        setLoadingMap(prev => ({ ...prev, [userId]: true }));

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
            router.refresh();
        } catch (err: any) {
            alert('Failed to update role: ' + err.message);
        } finally {
            setLoadingMap(prev => ({ ...prev, [userId]: false }));
        }
    };

    const toggleSort = () => {
        setSortRole(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const openManageModal = (user: Profile) => {
        setSelectedUser(user);
        setIsBanned(user.is_banned || false);
        setBanReason(user.ban_reason || '');
        // Format datetime-local string if exists
        if (user.banned_until) {
            const d = new Date(user.banned_until);
            // adjust for local timezone offset for input
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            setBannedUntil(d.toISOString().slice(0, 16));
        } else {
            setBannedUntil('');
        }
        setIsManageModalOpen(true);
    };

    const handleSaveBan = async () => {
        if (!selectedUser) return;
        setSavingBan(true);

        try {
            const updates = {
                is_banned: isBanned,
                banned_until: bannedUntil ? new Date(bannedUntil).toISOString() : null,
                ban_reason: banReason || null
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', selectedUser.id);

            if (error) throw error;

            // Optimistic Update
            setProfiles(prev => prev.map(p => p.id === selectedUser.id ? { ...p, ...updates } : p));
            setIsManageModalOpen(false);
            router.refresh(); // Sync server state
        } catch (err: any) {
            alert("Failed to update user ban status: " + err.message);
        } finally {
            setSavingBan(false);
        }
    };

    return (
        <div className="bg-pitch-card border border-white/10 rounded-sm p-6 shadow-xl">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
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
            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-pitch-card z-10">
                        <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-pitch-secondary">
                            <th className="py-3 px-4">User</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Waiver (Global)</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredProfiles.map(profile => (
                            <tr key={profile.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden shrink-0">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    {profile.system_role === 'super_admin' ? 'SYSTEM'
                                                        : profile.role === 'host'
                                                            ? 'HOST'
                                                            : profile.role === 'master_admin'
                                                                ? 'MASTER'
                                                                : <User className="w-5 h-5" />}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{profile.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-400">{profile.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${profile.system_role === 'super_admin'
                                        ? 'bg-red-500/10 border-red-500 text-red-500'
                                        : profile.role === 'master_admin'
                                            ? 'bg-purple-500/10 border-purple-500 text-purple-500'
                                            : profile.role === 'host'
                                                ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                                : 'bg-green-500/10 border-green-500 text-green-500'
                                        }`}>
                                        {profile.system_role === 'super_admin' && <Shield className="w-3 h-3" />}
                                        {profile.system_role === 'super_admin' ? 'Super Admin' : profile.role}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    {profile.waiver_signatures && profile.waiver_signatures.length > 0 ? (
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase">
                                            <Shield className="w-3.5 h-3.5" />
                                            Signed {new Date(profile.waiver_signatures[0].agreed_at).toLocaleDateString()}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 text-xs uppercase tracking-wider italic">Pending</span>
                                    )}
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {loadingMap[profile.id] ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-pitch-accent" />
                                        ) : (
                                            <select
                                                disabled={profile.id === currentUserId}
                                                value={profile.role}
                                                onChange={(e) => updateRole(profile.id, e.target.value as any)}
                                                className={`bg-black/30 border border-white/10 text-xs rounded px-2 py-1 outline-none focus:border-pitch-accent transition-colors
                                                    ${profile.id === currentUserId ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/30 cursor-pointer'}
                                                    ${profile.system_role === 'super_admin' ? 'text-red-500 font-bold' :
                                                        profile.role === 'master_admin' ? 'text-purple-400 font-bold' :
                                                            profile.role === 'host' ? 'text-orange-400 font-bold' : 'text-gray-300'}
                                                `}
                                            >
                                                {profile.system_role === 'super_admin' ? <option value="super_admin">Super Admin</option> : null}
                                                <option value="player">Player</option>
                                                <option value="host">Host</option>
                                                <option value="master_admin">Master Admin</option>
                                            </select>
                                        )}
                                        <button
                                            onClick={() => openManageModal(profile)}
                                            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors ${profile.is_banned || (profile.banned_until && new Date(profile.banned_until) > new Date())
                                                ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30'
                                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            Manage
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProfiles.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-gray-500 italic">
                                    No users found matching "{search}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Manage Player Modal */}
            {isManageModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsManageModalOpen(false)} />
                    <div className="relative bg-pitch-black border border-white/10 rounded-sm shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                        <h2 className="text-xl font-heading font-bold uppercase italic text-white mb-2 flex items-center gap-2">
                            <Ban className="w-5 h-5 text-red-500" /> Manage <span className="text-pitch-accent">Player</span>
                        </h2>
                        <p className="text-gray-400 text-sm mb-6">Enforce hard or soft bans for <span className="text-white font-bold">{selectedUser.full_name}</span>.</p>

                        <div className="space-y-4">
                            {/* Hard Ban Toggle */}
                            <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-sm">
                                <div>
                                    <div className="font-bold text-red-500">Permanent Ban</div>
                                    <div className="text-xs text-gray-400 mt-1">Block user from joining any games permanently.</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isBanned} onChange={(e) => setIsBanned(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                            </div>

                            {/* Soft Ban Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase text-gray-400">Temporary Ban (Until)</label>
                                <input
                                    type="datetime-local"
                                    value={bannedUntil}
                                    onChange={(e) => setBannedUntil(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:border-pitch-accent outline-none"
                                />
                                <p className="text-xs text-gray-500">Leave blank for no temporary ban.</p>
                            </div>

                            {/* Ban Reason */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase text-gray-400">Ban Reason (Private)</label>
                                <textarea
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    placeholder="Reason for suspension..."
                                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:border-pitch-accent outline-none min-h-[80px]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setIsManageModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold uppercase text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveBan}
                                disabled={savingBan}
                                className="flex items-center gap-2 px-6 py-2 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                            >
                                {savingBan ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {savingBan ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
