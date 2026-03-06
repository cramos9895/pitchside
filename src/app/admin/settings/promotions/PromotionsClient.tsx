'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Tag, Percent, DollarSign, Calendar, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { generateRandomPromoCode } from '@/lib/utils';

interface PromoCode {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    max_uses: number | null;
    current_uses: number;
    expires_at: string | null;
    created_at: string;
}

interface Props {
    initialPromos: PromoCode[];
    facilityId?: string; // If undefined, this is the Global Dashboard
    isGlobal: boolean;
}

export default function PromotionsClient({ initialPromos, facilityId, isGlobal }: Props) {
    const [promos, setPromos] = useState<PromoCode[]>(initialPromos);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isGeneratedCode, setIsGeneratedCode] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage' as 'percentage' | 'fixed_amount',
        discount_value: '',
        max_uses: '',
        expires_at: '',
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg(null);

        const val = parseInt(formData.discount_value);
        if (isNaN(val) || val <= 0) {
            setErrorMsg("Discount value must be a positive number.");
            setIsSubmitting(false);
            return;
        }

        if (formData.discount_type === 'percentage' && val > 100) {
            setErrorMsg("Percentage cannot exceed 100.");
            setIsSubmitting(false);
            return;
        }

        const payload: any = {
            code: formData.code.toUpperCase().replace(/\s+/g, ''),
            discount_type: formData.discount_type,
            discount_value: val,
        };

        if (facilityId && !isGlobal) {
            payload.facility_id = facilityId;
        }

        if (formData.max_uses) {
            payload.max_uses = parseInt(formData.max_uses);
        }

        if (formData.expires_at) {
            // End of selected day
            const date = new Date(formData.expires_at);
            date.setHours(23, 59, 59, 999);
            payload.expires_at = date.toISOString();
        }

        const { data, error } = await supabase
            .from('promo_codes')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error(error);
            if (error.code === '23505') {
                setErrorMsg("This code already exists.");
            } else {
                setErrorMsg("Failed to create promo code.");
            }
        } else if (data) {
            setPromos([data, ...promos]);
            setIsCreating(false);
            setFormData({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' });
            setIsGeneratedCode(false);
            router.refresh();
        }

        setIsSubmitting(false);
    };

    const handleGenerateRandom = () => {
        setFormData(prev => ({
            ...prev,
            code: generateRandomPromoCode(8),
            max_uses: '1'
        }));
        setIsGeneratedCode(true);
    };

    const handleDelete = async (id: string, codeStr: string) => {
        if (!confirm(`Are you sure you want to delete code ${codeStr}?`)) return;

        const { error } = await supabase
            .from('promo_codes')
            .delete()
            .eq('id', id);

        if (!error) {
            setPromos(promos.filter(p => p.id !== id));
            router.refresh();
        } else {
            alert("Failed to delete code.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Active Codes</h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 bg-pitch-accent text-black px-4 py-2 font-black italic uppercase tracking-wider text-sm rounded-sm hover:bg-white transition-colors"
                >
                    {isCreating ? 'Cancel' : <><Plus className="w-4 h-4" /> New Code</>}
                </button>
            </div>

            {isCreating && (
                <div className="bg-pitch-card p-6 border border-pitch-accent/30 rounded-lg shadow-xl animate-in slide-in-from-top-2">
                    <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Generate Promo Code</h3>
                    {errorMsg && <div className="text-red-400 bg-red-500/10 p-3 rounded mb-4 text-sm font-bold border border-red-500/30">{errorMsg}</div>}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Code String</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateRandom}
                                        className="text-[10px] bg-pitch-accent/10 text-pitch-accent hover:bg-pitch-accent/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-colors border border-pitch-accent/30"
                                    >
                                        Random VIP Code
                                    </button>
                                </div>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. SUMMER26"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full bg-black/60 border border-white/10 rounded px-4 py-2.5 text-white uppercase focus:ring-1 focus:ring-pitch-accent focus:border-pitch-accent outline-none font-bold"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Type</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={e => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed_amount' })}
                                        className="w-full bg-black/60 border border-white/10 rounded px-4 py-3 text-white focus:ring-1 focus:ring-pitch-accent focus:border-pitch-accent outline-none text-sm appearance-none"
                                    >
                                        <option value="percentage">% Percentage</option>
                                        <option value="fixed_amount">$ Fixed Amount</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Value</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        placeholder={formData.discount_type === 'percentage' ? "20" : "1500"}
                                        value={formData.discount_value}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                        className="w-full bg-black/60 border border-white/10 rounded px-4 py-2.5 text-white focus:ring-1 focus:ring-pitch-accent focus:border-pitch-accent outline-none"
                                    />
                                    <div className="text-[10px] text-gray-500 mt-1">
                                        {formData.discount_type === 'fixed_amount' && '(Enter value in cents. e.g. 1000 = $10.00)'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Max Uses (Optional)</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Leave blank for infinite"
                                    value={formData.max_uses}
                                    disabled={isGeneratedCode}
                                    onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                    className={`w-full bg-black/60 border border-white/10 rounded px-4 py-2.5 text-white focus:ring-1 focus:ring-pitch-accent focus:border-pitch-accent outline-none ${isGeneratedCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Expiration Date (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.expires_at}
                                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                    className="w-full bg-black/60 border border-white/10 rounded px-4 py-2.5 text-white focus:ring-1 focus:ring-pitch-accent focus:border-pitch-accent outline-none shrink"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-pitch-accent hover:bg-white text-black px-6 py-3 font-black italic uppercase tracking-wider text-sm rounded-sm transition-colors shadow-lg disabled:opacity-50"
                            >
                                {isSubmitting ? 'Generating...' : 'Create Code'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {promos.length === 0 ? (
                <div className="text-center py-12 p-6 border border-dashed border-white/10 rounded-lg text-gray-500 font-medium">
                    No active promo codes found. Click "New Code" to generate one.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {promos.map(promo => {
                        const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                        const isMaxedOut = promo.max_uses !== null && promo.current_uses >= promo.max_uses;
                        const isInvalid = isExpired || isMaxedOut;

                        return (
                            <div key={promo.id} className={`p-5 rounded-lg border flex flex-col justify-between transition-colors ${isInvalid ? 'bg-red-950/20 border-red-500/20 opacity-75' : 'bg-pitch-card border-white/10 hover:border-white/20'}`}>
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-2xl font-black italic tracking-wider text-white bg-black/50 px-3 py-1 rounded inline-block">
                                            {promo.code}
                                        </h3>
                                        {isInvalid && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-500 px-2 py-0.5 rounded-sm">
                                                {isExpired ? 'Expired' : 'Depleted'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2 mt-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            {promo.discount_type === 'percentage' ? (
                                                <Percent className="w-4 h-4 text-pitch-accent" />
                                            ) : (
                                                <DollarSign className="w-4 h-4 text-green-400" />
                                            )}
                                            <span className="font-bold text-white">
                                                {promo.discount_type === 'percentage'
                                                    ? `${promo.discount_value}% OFF`
                                                    : `$${(promo.discount_value / 100).toFixed(2)} OFF`}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Tag className="w-4 h-4" />
                                            Uses: <span className="text-white font-medium">{promo.current_uses}</span>
                                            <span className="text-gray-500">/ {promo.max_uses || '∞'}</span>
                                        </div>

                                        {promo.expires_at && (
                                            <div className={`flex items-center gap-2 text-sm ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                                                <Clock className="w-4 h-4" />
                                                Expires: {format(new Date(promo.expires_at), 'MMM do, yyyy')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(promo.id, promo.code)}
                                    className="mt-6 flex items-center justify-center gap-2 w-full py-2 bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-red-500 transition-colors uppercase font-bold text-xs tracking-wider rounded-sm border border-red-500/10 hover:border-red-500/30"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
