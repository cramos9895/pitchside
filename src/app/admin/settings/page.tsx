'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Loader2, Settings, Mail, BellOff, Bell, DollarSign } from 'lucide-react';

interface SystemSetting {
    key: string;
    value: boolean | string;
    label: string;
    description: string;
    category: string;

    type: 'boolean' | 'string';
}

const DEFAULT_PAYMENT_SETTINGS: SystemSetting[] = [
    { key: 'payment.venmo_handle', value: '', label: 'Venmo Handle/Link', description: 'Your Venmo @handle or profile link', category: 'payment', type: 'string' },
    { key: 'payment.zelle_info', value: '', label: 'Zelle Information', description: 'Phone number or email associated with Zelle', category: 'payment', type: 'string' }
];

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
            .in('category', ['notification', 'payment'])
            .order('key');

        if (data) {
            // Merge with defaults
            const existingKeys = new Set(data.map(s => s.key));
            const merged = [...data];
            DEFAULT_PAYMENT_SETTINGS.forEach(def => {
                if (!existingKeys.has(def.key)) {
                    merged.push(def);
                }
            });
            setSettings(merged as any);
        } else {
            setSettings(DEFAULT_PAYMENT_SETTINGS);
        }
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

    const updateTextSetting = async (key: string, newValue: string) => {
        setSettings(prev => prev.map(s =>
            s.key === key ? { ...s, value: newValue } : s
        ));

        // Use Upsert to create if missing
        const settingToUpdate = settings.find(s => s.key === key);
        if (settingToUpdate) {
            await supabase.from('system_settings').upsert({
                key,
                value: newValue,
                category: settingToUpdate.category,
                label: settingToUpdate.label,
                description: settingToUpdate.description,
                type: settingToUpdate.type
            });
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

    const notificationSettings = settings.filter(s => s.category === 'notification');
    const paymentSettings = settings.filter(s => s.category === 'payment');

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3">
                <Settings className="w-8 h-8 text-pitch-accent" />
                Admin Settings
            </h1>

            {/* Payment Configuration */}
            <div className="bg-pitch-card border border-white/5 rounded-lg p-6">
                <h2 className="font-oswald text-xl font-bold uppercase mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Payment Configuration
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    Manage Venmo and Zelle details displayed to users when joining games.
                </p>

                <div className="space-y-4">
                    {paymentSettings.map((setting) => (
                        <div key={setting.key} className="p-4 bg-black/20 rounded border border-white/5 space-y-2">
                            <div>
                                <h3 className="font-bold text-white">{setting.label}</h3>
                                <p className="text-sm text-gray-500">{setting.description}</p>
                            </div>
                            <input
                                type="text"
                                value={setting.value as string || ''}
                                onChange={(e) => updateTextSetting(setting.key, e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                placeholder={`Enter ${setting.label}`}
                            />
                        </div>
                    ))}
                    {paymentSettings.length === 0 && (
                        <div className="text-gray-500 italic text-center py-4">
                            No payment settings found in database.
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Center */}
            <div className="bg-pitch-card border border-white/5 rounded-lg p-6">
                <h2 className="font-oswald text-xl font-bold uppercase mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    Notification Center
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    Toggle system emails on or off. Disabled emails will be logged but not sent via Resend.
                </p>

                <div className="space-y-4">
                    {notificationSettings.map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between p-4 bg-black/20 rounded border border-white/5 hover:border-white/10 transition-colors">
                            <div>
                                <h3 className="font-bold text-white">{setting.label}</h3>
                                <p className="text-sm text-gray-500">{setting.description}</p>
                            </div>

                            <button
                                onClick={() => toggleSetting(setting.key, setting.value as boolean)}
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
                    {notificationSettings.length === 0 && (
                        <div className="text-gray-500 italic text-center py-4">
                            No notification settings found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
