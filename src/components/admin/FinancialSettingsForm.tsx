'use client';

import { useState } from 'react';
import { updatePlatformFees } from '@/app/actions/admin';
import { Loader2, DollarSign, Percent, Plus, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface FinancialSettingsFormProps {
    initialData: {
        id: number;
        fee_type: 'percent' | 'fixed' | 'both';
        fee_percent: number;
        fee_fixed: number;
    } | null;
}

export function FinancialSettingsForm({ initialData }: FinancialSettingsFormProps) {
    const [isPending, setIsPending] = useState(false);
    const { success, error } = useToast();

    // Default to 'percent' and '5.0' if no initial data (though DB seed should guarantee it)
    const [feeType, setFeeType] = useState(initialData?.fee_type || 'percent');

    // Convert cents to dollars for the UI
    const initialFixedDollars = initialData?.fee_fixed ? (initialData.fee_fixed / 100).toFixed(2) : '1.00';

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        try {
            const result = await updatePlatformFees(formData);
            if (result.error) {
                error(result.error);
            } else if (result.success) {
                success('Global financial settings successfully updated!');
            }
        } catch (err: any) {
            error(err.message || 'An unexpected error occurred.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form action={handleSubmit} className="bg-pitch-card border border-white/10 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 space-y-8">

                {/* Fee Model Selector */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">Fee Model</h3>
                        <p className="text-sm text-gray-400">Select how the PitchSide marketplace calculates its application fee per checkout session.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className={`
                            relative cursor-pointer p-4 border rounded-sm transition-all text-center flex flex-col items-center justify-center gap-2
                            ${feeType === 'percent' ? 'bg-pitch-accent/10 border-pitch-accent text-white' : 'bg-black/50 border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'}
                        `}>
                            <input type="radio" name="fee_type" value="percent" checked={feeType === 'percent'} onChange={() => setFeeType('percent')} className="sr-only" />
                            <Percent className={`w-6 h-6 ${feeType === 'percent' ? 'text-pitch-accent' : ''}`} />
                            <span className="font-bold uppercase tracking-wider text-sm">Percentage</span>
                        </label>

                        <label className={`
                            relative cursor-pointer p-4 border rounded-sm transition-all text-center flex flex-col items-center justify-center gap-2
                            ${feeType === 'fixed' ? 'bg-pitch-accent/10 border-pitch-accent text-white' : 'bg-black/50 border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'}
                        `}>
                            <input type="radio" name="fee_type" value="fixed" checked={feeType === 'fixed'} onChange={() => setFeeType('fixed')} className="sr-only" />
                            <DollarSign className={`w-6 h-6 ${feeType === 'fixed' ? 'text-pitch-accent' : ''}`} />
                            <span className="font-bold uppercase tracking-wider text-sm">Fixed Amount</span>
                        </label>

                        <label className={`
                            relative cursor-pointer p-4 border rounded-sm transition-all text-center flex flex-col items-center justify-center gap-2
                            ${feeType === 'both' ? 'bg-pitch-accent/10 border-pitch-accent text-white' : 'bg-black/50 border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'}
                        `}>
                            <input type="radio" name="fee_type" value="both" checked={feeType === 'both'} onChange={() => setFeeType('both')} className="sr-only" />
                            <div className="flex items-center gap-1">
                                <Percent className={`w-4 h-4 ${feeType === 'both' ? 'text-pitch-accent' : ''}`} />
                                <Plus className={`w-3 h-3 ${feeType === 'both' ? 'text-pitch-accent' : ''}`} />
                                <DollarSign className={`w-4 h-4 ${feeType === 'both' ? 'text-pitch-accent' : ''}`} />
                            </div>
                            <span className="font-bold uppercase tracking-wider text-sm">Hybrid</span>
                        </label>
                    </div>
                </div>

                {/* Values Input Group */}
                <div className="space-y-4 pt-6 border-t border-white/5">
                    <div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">Configuration</h3>
                        <p className="text-sm text-gray-400">Set the specific values for the selected model. These changes instantly affect all new checkouts.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Percentage Input */}
                        <div className={`space-y-2 transition-opacity duration-300 ${feeType === 'fixed' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Percentage Cut (%)
                            </label>
                            <div className="relative">
                                <input
                                    name="fee_percent"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    defaultValue={initialData?.fee_percent || '5.0'}
                                    disabled={isPending || feeType === 'fixed'}
                                    className="w-full bg-black/60 border border-white/10 rounded-sm pr-10 pl-4 py-3 text-white focus:outline-none focus:border-pitch-accent text-sm transition-colors text-right font-mono"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                            </div>
                        </div>

                        {/* Fixed Input */}
                        <div className={`space-y-2 transition-opacity duration-300 ${feeType === 'percent' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Fixed Surcharge ($)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                <input
                                    name="fee_fixed"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    defaultValue={initialFixedDollars}
                                    disabled={isPending || feeType === 'percent'}
                                    className="w-full bg-black/60 border border-white/10 rounded-sm pl-8 pr-4 py-3 text-white focus:outline-none focus:border-pitch-accent text-sm transition-colors font-mono"
                                />
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Form Footer */}
            <div className="p-6 bg-black/60 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs text-gray-500 max-w-sm">
                    Stripe standard processing fees (e.g., 2.9% + 30¢) are deducted independently by Stripe from the main transaction.
                </p>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-2 bg-pitch-accent text-pitch-black px-8 py-3 rounded-sm font-black uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Save Settings
                </button>
            </div>
        </form>
    );
}
