import { Settings, Users, Activity } from 'lucide-react';
import Link from 'next/link';

export default function FacilitySettingsPage() {
    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3 text-white">
                <Settings className="w-8 h-8 text-pitch-accent" />
                Facility Settings
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/facility/settings/activities" className="block p-6 bg-pitch-card border border-white/5 hover:border-pitch-accent transition-colors rounded group">
                    <Activity className="w-8 h-8 text-pitch-secondary mb-4 group-hover:text-pitch-accent transition-colors" />
                    <h2 className="font-oswald text-xl font-bold uppercase text-white mb-2">Activities Available</h2>
                    <p className="text-sm text-gray-400">
                        Choose which standardized sports and activities are offered at your facility.
                    </p>
                </Link>

                <Link href="/facility/settings/team" className="block p-6 bg-pitch-card border border-white/5 hover:border-pitch-accent transition-colors rounded group">
                    <Users className="w-8 h-8 text-pitch-secondary mb-4 group-hover:text-pitch-accent transition-colors" />
                    <h2 className="font-oswald text-xl font-bold uppercase text-white mb-2">Team Management</h2>
                    <p className="text-sm text-gray-400">
                        Invite staff members to help manage your facility, leagues, and bookings.
                    </p>
                </Link>
            </div>
        </div>
    );
}
