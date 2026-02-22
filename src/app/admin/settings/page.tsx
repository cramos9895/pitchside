'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Loader2, Settings, Mail, BellOff, Bell, DollarSign, Users } from 'lucide-react';
import { SiteEditor } from '@/components/admin/SiteEditor';
import UserTable from '@/components/admin/UserTable';
import { useToast } from '@/components/ui/Toast';

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
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingPayment, setSavingPayment] = useState(false);
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    const supabase = createClient();
    const { success, error } = useToast();

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

        // Fetch Profiles for User Management
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false });

        if (profilesData) {
            setProfiles(profilesData);
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

    const updateTextSetting = (key: string, newValue: string) => {
        setSettings(prev => prev.map(s =>
            s.key === key ? { ...s, value: newValue } : s
        ));
    };

    const savePaymentSettings = async () => {
        setSavingPayment(true);
        try {
            const paymentSettingsList = settings.filter(s => s.category === 'payment');
            for (const setting of paymentSettingsList) {
                await supabase.from('system_settings').upsert({
                    key: setting.key,
                    value: setting.value,
                    category: setting.category,
                    label: setting.label,
                    description: setting.description,
                    type: setting.type
                });
            }
            success('Payment links updated globally.');
        } catch (err) {
            console.error('Failed to save payment settings:', err);
            error('Failed to update payment links.');
        } finally {
            setSavingPayment(false);
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

                    {paymentSettings.length > 0 && (
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={savePaymentSettings}
                                disabled={savingPayment}
                                className="flex items-center gap-2 px-6 py-2 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                            >
                                {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                {savingPayment ? 'Saving...' : 'Save Current Links'}
                            </button>
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

            {/* User Management */}
            <div className="bg-pitch-card border border-white/5 rounded-lg p-6">
                <h2 className="font-oswald text-xl font-bold uppercase mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-pitch-accent" />
                    User Management
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    Manage roles and enforce system bans.
                </p>

                <UserTable initialProfiles={profiles} />
            </div>

            {/* Dynamic Site Editor (Restricted to Master Admin by Page wrapper) */}
            <SiteEditor />
        </div>
    );
}
