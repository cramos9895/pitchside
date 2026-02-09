
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, Lock, Save, Loader2, Shield, Settings, Camera, LogOut, CheckCircle, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';


const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4205/4205634.png"; // Fallback URL if we need an image URL, but we use Lucide icons mostly now.

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form States
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

    // Profile Form
    const [fullName, setFullName] = useState('');
    const [position, setPosition] = useState('Utility');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // Security Form
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');

    // Notifications Form
    const [gameReminders, setGameReminders] = useState(true);
    const [announcements, setAnnouncements] = useState(true);
    const [debugMode, setDebugMode] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getSession().then(({ data }) => ({ data: { user: data.session?.user } }));

            if (!user) {
                router.push('/login');
                return;
            }

            setUser(user);
            setEmail(user.email || '');

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                setProfile(profile);
                setFullName(profile.full_name || '');
                setPosition(profile.position || 'Utility');
                setAvatarUrl(profile.avatar_url || '');
                setJerseyNumber(profile.jersey_number || '');

                // Admin Check
                setIsAdmin(profile.role === 'admin' || profile.role === 'master_admin');

                // Notification Settings (Mock implementation if column missing, or real if present)
                if (profile.notification_settings) {
                    setGameReminders(profile.notification_settings.game_reminders ?? true);
                    setAnnouncements(profile.notification_settings.announcements ?? true);
                }
            }
            setLoading(false);
        };
        fetchUser();
    }, [router, supabase]);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        setUploading(true);
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setAvatarUrl(publicUrl);
            // Auto-save avatar change to profile
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

        } catch (error: any) {
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    position,
                    jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
                    // We also save notification preferences here if they were part of the same table
                    notification_settings: {
                        game_reminders: gameReminders,
                        announcements: announcements
                    }
                })
                .eq('id', user.id);

            if (error) throw error;
            alert('Profile updated successfully!');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert('Error updating profile: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ email });
            if (error) throw error;
            alert('Confirmation email sent to old and new address.');
        } catch (error: any) {
            alert('Error updating email: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            alert('Password updated successfully');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            alert('Error updating password: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-32 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter">
                            Settings
                        </h1>
                    </div>
                    {profile?.role === 'admin' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-500/50 rounded-sm">
                            <Shield className="w-5 h-5 text-red-500" />
                            <span className="text-red-500 font-bold uppercase tracking-wider text-sm">Administrator</span>
                        </div>
                    )}
                    {profile?.role === 'master_admin' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-900/30 border border-yellow-500/50 rounded-sm">
                            <div className="relative">
                                <Shield className="w-5 h-5 text-yellow-500" />
                                <Shield className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 opacity-50 scale-75" />
                            </div>
                            <span className="text-yellow-500 font-bold uppercase tracking-wider text-sm">Master Admin</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar Nav */}
                    <div className="col-span-1 space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-sm font-bold uppercase tracking-wider text-sm transition-colors flex items-center gap-3",
                                activeTab === 'profile' ? "bg-pitch-accent text-pitch-black" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <User className="w-4 h-4" /> Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-sm font-bold uppercase tracking-wider text-sm transition-colors flex items-center gap-3",
                                activeTab === 'security' ? "bg-pitch-accent text-pitch-black" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Lock className="w-4 h-4" /> Security
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-sm font-bold uppercase tracking-wider text-sm transition-colors flex items-center gap-3",
                                activeTab === 'notifications' ? "bg-pitch-accent text-pitch-black" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <User className="w-4 h-4" /> Notifications
                        </button>


                    </div>

                    {/* Content Area */}
                    <div className="col-span-1 md:col-span-3 bg-pitch-card border border-white/10 p-6 md:p-8 rounded-sm shadow-xl min-h-[500px]">

                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-white/5 border-2 border-white/10">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                <User className="w-10 h-10 text-white/20" />
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Camera className="w-6 h-6 text-white" />}
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">Profile Picture</h3>
                                        <p className="text-sm text-pitch-secondary">Click to upload a new photo.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Display Name</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Primary Position</label>
                                        <select
                                            value={position}
                                            onChange={(e) => setPosition(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                        >
                                            <option value="Forward">Forward</option>
                                            <option value="Midfielder">Midfielder</option>
                                            <option value="Defender">Defender</option>
                                            <option value="Goalkeeper">Goalkeeper</option>
                                            <option value="Utility">Utility</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/10 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-pitch-accent text-pitch-black px-6 py-3 rounded-sm font-black uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === 'security' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Email Update */}
                                <form onSubmit={handleUpdateEmail} className="space-y-4">
                                    <h3 className="text-lg font-bold uppercase italic text-white flex items-center gap-2 border-b border-white/10 pb-2">
                                        <Mail className="w-5 h-5 text-pitch-accent" /> Update Email
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Email Address</label>
                                        <div className="flex gap-4">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="flex-1 bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                            />
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="bg-white/10 text-white px-4 py-2 rounded-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                                            >
                                                Update
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">To update your email, you will need to confirm the change via a link sent to your new address.</p>
                                    </div>
                                </form>

                                {/* Password Update */}
                                <form onSubmit={handleUpdatePassword} className="space-y-4">
                                    <h3 className="text-lg font-bold uppercase italic text-white flex items-center gap-2 border-b border-white/10 pb-2">
                                        <Lock className="w-5 h-5 text-pitch-accent" /> Change Password
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Confirm Password</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-black/30 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving || !newPassword}
                                            className="px-6 py-3 bg-white/10 text-white border border-white/10 rounded-sm font-bold uppercase tracking-wider hover:bg-pitch-accent hover:text-pitch-black hover:border-pitch-accent transition-all disabled:opacity-50"
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* NOTIFICATIONS TAB */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-lg font-bold uppercase italic text-white border-b border-white/10 pb-2 mb-6">
                                        Preferences
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-sm">
                                            <div>
                                                <h4 className="font-bold text-white">Game Reminders</h4>
                                                <p className="text-sm text-pitch-secondary">Receive emails about upcoming games you've joined.</p>
                                            </div>
                                            <button
                                                onClick={() => setGameReminders(!gameReminders)}
                                                className={cn(
                                                    "w-12 h-6 rounded-full relative transition-colors duration-300",
                                                    gameReminders ? "bg-pitch-accent" : "bg-gray-600"
                                                )}
                                            >
                                                <span className={cn(
                                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300",
                                                    gameReminders ? "translate-x-6" : "translate-x-0"
                                                )} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-sm">
                                            <div>
                                                <h4 className="font-bold text-white">Announcements</h4>
                                                <p className="text-sm text-pitch-secondary">Receive product updates and community news.</p>
                                            </div>
                                            <button
                                                onClick={() => setAnnouncements(!announcements)}
                                                className={cn(
                                                    "w-12 h-6 rounded-full relative transition-colors duration-300",
                                                    announcements ? "bg-pitch-accent" : "bg-gray-600"
                                                )}
                                            >
                                                <span className={cn(
                                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300",
                                                    announcements ? "translate-x-6" : "translate-x-0"
                                                )} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="flex items-center gap-2 bg-white/10 text-white px-6 py-3 rounded-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Preferences</>}
                                        </button>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="pt-8 border-t border-white/10">
                                        <h3 className="text-lg font-bold uppercase italic text-red-500 border-b border-red-500/30 pb-2 mb-6 flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5" /> Admin Controls
                                        </h3>
                                        <div className="flex items-center justify-between p-4 bg-red-900/10 border border-red-500/20 rounded-sm">
                                            <div>
                                                <h4 className="font-bold text-white">Debug Mode</h4>
                                                <p className="text-sm text-pitch-secondary">Show technical details and raw data logs in dashboard.</p>
                                            </div>
                                            <button
                                                onClick={() => setDebugMode(!debugMode)}
                                                className={cn(
                                                    "w-12 h-6 rounded-full relative transition-colors duration-300",
                                                    debugMode ? "bg-red-500" : "bg-gray-600"
                                                )}
                                            >
                                                <span className={cn(
                                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300",
                                                    debugMode ? "translate-x-6" : "translate-x-0"
                                                )} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
