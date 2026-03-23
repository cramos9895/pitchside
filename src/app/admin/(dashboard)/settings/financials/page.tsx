import { createClient } from '@/lib/supabase/server';
import { FinancialSettingsForm } from '@/components/admin/FinancialSettingsForm';
import { Settings, Receipt, Home } from 'lucide-react';
import Link from 'next/link';

export default async function FinancialsSettingsPage() {
    const supabase = await createClient();

    // The Layout wrapper already handles Auth & Master Admin specific auth,
    // so we can safely query the singleton
    const { data: settings } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .single();

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4">
                <div>
                    <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3 text-white">
                        <Receipt className="w-8 h-8 text-pitch-accent" />
                        Financial Settings
                    </h1>
                    <p className="text-gray-400 mt-2 max-w-2xl">
                        Control the PitchSide marketplace revenue engine. These global parameters dictate the application fees mathematically calculated during every public checkout session.
                    </p>
                </div>
            </div>

            <FinancialSettingsForm initialData={settings} />

            <div className="pt-8 border-t border-white/10 flex items-center gap-4">
                <Link href="/admin/settings" className="flex items-center gap-2 text-pitch-secondary hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">
                    <Settings className="w-4 h-4" />
                    Back to Settings
                </Link>
                <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">
                    <Home className="w-4 h-4" />
                    Admin Dashboard
                </Link>
            </div>
        </div>
    );
}
