'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Loader2, Settings, Mail, BellOff, Bell } from 'lucide-react';

interface SystemSetting {
    key: string;
    value: boolean;
    label: string;
    description: string;
    category: string;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        checkRoleAndFetch();
    }, []);

    const checkRoleAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role === 'master_admin') {
            setIsMasterAdmin(true);
            fetchSettings();
        } else {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('category', 'notification')
            .order('key');

        if (data) setSettings(data);
        setLoading(false);
    };

    const toggleSetting = async (key: string, currentValue: boolean) => {
        // Optimistic UI update
        setSettings(prev => prev.map(s =>
            s.key === key ? { ...s, value: !currentValue } : s
        ));

        // DB Update
        const { error } = await supabase
            .from('system_settings')
            .update({ value: !currentValue })
            .eq('key', key);

        if (error) {
            console.error('Update failed:', error);
            // Revert on error
            setSettings(prev => prev.map(s =>
                s.key === key ? { ...s, value: currentValue } : s
            ));
            alert('Failed to update setting.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
            </div>
        );
    }

    if (!isMasterAdmin) {
        return (
            <div className="flex justify-center items-center h-screen flex-col gap-4">
                <BellOff className="w-12 h-12 text-red-500" />
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                <p className="text-gray-400">This page is restricted to Master Administrators.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3">
                <Settings className="w-8 h-8 text-pitch-accent" />
                Admin Settings
            </h1>

            <div className="bg-pitch-card border border-white/5 rounded-lg p-6">
                <h2 className="font-oswald text-xl font-bold uppercase mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    Notification Center
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    Toggle system emails on or off. Disabled emails will be logged but not sent via Resend.
                </p>

                <div className="space-y-4">
                    {settings.map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between p-4 bg-black/20 rounded border border-white/5 hover:border-white/10 transition-colors">
                            <div>
                                <h3 className="font-bold text-white">{setting.label}</h3>
                                <p className="text-sm text-gray-500">{setting.description}</p>
                            </div>

                            <button
                                onClick={() => toggleSetting(setting.key, setting.value)}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pitch-accent focus:ring-offset-2 focus:ring-offset-pitch-black
                                    ${setting.value ? 'bg-pitch-accent' : 'bg-gray-700'}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                        ${setting.value ? 'translate-x-6' : 'translate-x-1'}
                                    `}
                                />
                            </button>
                        </div>
                    ))}
                    {settings.length === 0 && (
                        <div className="text-gray-500 italic text-center py-4">
                            No notification settings found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
