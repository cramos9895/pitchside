'use client';

import { useState } from 'react';
import { Loader2, Save, FileText } from 'lucide-react';
import { updateFacilityWaiver } from '@/app/actions/facility';
import { useToast } from '@/components/ui/Toast';

interface LegalSettingsFormProps {
    initialWaiverText: string | null;
}

export function LegalSettingsForm({ initialWaiverText }: LegalSettingsFormProps) {
    const [waiverText, setWaiverText] = useState(initialWaiverText || '');
    const [isSaving, setIsSaving] = useState(false);
    const { success, error: toastError } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData();
        formData.append('waiverText', waiverText);

        try {
            const result = await updateFacilityWaiver(formData);
            if (result.error) {
                toastError(result.error);
            } else {
                success('Liability waiver updated successfully.');
            }
        } catch (error) {
            toastError('An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-pitch-card border border-white/5 rounded-lg p-6 animate-in fade-in duration-300">
            <h2 className="font-oswald text-xl font-bold uppercase mb-4 flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-pitch-accent" />
                Liability Waiver Text
            </h2>
            <p className="text-gray-400 text-sm mb-6">
                Paste your facility's custom liability waiver here. Players will be required to agree to these terms before they can checkout or request a rental.
                <br /><br />
                <span className="italic text-gray-500">Leave this completely blank to skip the waiver check entirely during checkout.</span>
            </p>

            <div className="mb-6">
                <textarea
                    value={waiverText}
                    onChange={(e) => setWaiverText(e.target.value)}
                    placeholder="By clicking 'I Agree' and participating in events at this facility..."
                    className="w-full h-96 bg-black/40 border border-white/10 rounded-sm p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-pitch-accent transition-colors font-sans text-sm leading-relaxed form-scrollbar"
                />
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Saving...' : 'Save Waiver'}
                </button>
            </div>
        </form>
    );
}
