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
    role: 'player' | 'admin' | 'master_admin';
    created_at?: string;
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
                const roleOrder = { master_admin: 3, admin: 2, player: 1 };
                const orderA = roleOrder[a.role] || 0;
                const orderB = roleOrder[b.role] || 0;
                return sortRole === 'asc' ? orderA - orderB : orderB - orderA;
            });
        }

        return result;
    }, [profiles, search, sortRole]);

    const updateRole = async (userId: string, newRole: 'player' | 'admin' | 'master_admin') => {
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
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-pitch-secondary">
                            <th className="py-3 px-4">User</th>
                            <th className="py-3 px-4">Role</th>
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
                                                    <User className="w-5 h-5" />
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
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${profile.role === 'master_admin'
                                        ? 'bg-purple-500/10 border-purple-500 text-purple-500'
                                        : profile.role === 'admin'
                                            ? 'bg-red-500/10 border-red-500 text-red-500'
                                            : 'bg-green-500/10 border-green-500 text-green-500'
                                        }`}>
                                        {profile.role === 'master_admin' && <Shield className="w-3 h-3" />}
                                        {profile.role}
                                    </span>
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
                                                    ${profile.role === 'master_admin' ? 'text-purple-400 font-bold' :
                                                        profile.role === 'admin' ? 'text-red-400 font-bold' : 'text-gray-300'}
                                                `}
                                            >
                                                <option value="player">Player</option>
                                                <option value="admin">Admin</option>
                                                <option value="master_admin">Master Admin</option>
                                            </select>
                                        )}
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
        </div>
    );
}
