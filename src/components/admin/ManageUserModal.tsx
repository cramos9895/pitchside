'use client';

import { useState, useEffect } from 'react';
import { Ban, DollarSign, History, Shield, Loader2, X, Plus, Minus, AlertCircle } from 'lucide-react';
import { getCreditHistory, updateUserCredit } from '@/app/actions/user-crm';
import { useToast } from '@/components/ui/Toast';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: 'player' | 'host' | 'master_admin';
    is_banned?: boolean;
    banned_until?: string | null;
    ban_reason?: string | null;
    credit_balance?: number;
}

interface ManageUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: Profile;
    onSaveBan: (updates: { is_banned: boolean; banned_until: string | null; ban_reason: string | null }) => Promise<void>;
}

export default function ManageUserModal({ isOpen, onClose, user, onSaveBan }: ManageUserModalProps) {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'access' | 'finances'>('access');
    
    // Ban State
    const [isBanned, setIsBanned] = useState(user.is_banned || false);
    const [banReason, setBanReason] = useState(user.ban_reason || '');
    const [bannedUntil, setBannedUntil] = useState(user.banned_until ? new Date(user.banned_until).toISOString().slice(0, 16) : '');
    const [savingBan, setSavingBan] = useState(false);

    // Finance State
    const [amount, setAmount] = useState('');
    const [auditReason, setAuditReason] = useState('');
    const [processingCredit, setProcessingCredit] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'finances') {
            fetchHistory();
        }
    }, [isOpen, activeTab, user.id]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await getCreditHistory(user.id);
            setHistory(data);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleCreditAdjustment = async (type: 'add' | 'deduct') => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }

        setProcessingCredit(true);
        try {
            await updateUserCredit(user.id, val, type, auditReason);
            toast.success(`Successfully ${type === 'add' ? 'added' : 'deducted'} $${val.toFixed(2)}`);
            setAmount('');
            setAuditReason('');
            fetchHistory();
            // We'll rely on router.refresh() in the parent or optimistic update if needed
        } catch (err: any) {
            toast.error(err.message || "Financial update failed");
        } finally {
            setProcessingCredit(false);
        }
    };

    const handleSaveBanSettings = async () => {
        setSavingBan(true);
        try {
            await onSaveBan({
                is_banned: isBanned,
                banned_until: bannedUntil ? new Date(bannedUntil).toISOString() : null,
                ban_reason: banReason || null
            });
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to update ban status");
        } finally {
            setSavingBan(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-pitch-black border border-white/10 rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                {/* Header Container */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-heading font-bold uppercase italic text-white flex items-center gap-2">
                             Manage <span className="text-pitch-accent">{user.full_name}</span>
                        </h2>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-white/5 p-1 mx-6 mt-6 rounded-sm">
                    <button 
                        onClick={() => setActiveTab('access')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${activeTab === 'access' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Ban className="w-3.5 h-3.5" /> Access Control
                    </button>
                    <button 
                        onClick={() => setActiveTab('finances')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${activeTab === 'finances' ? 'bg-pitch-accent text-pitch-black' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <DollarSign className="w-3.5 h-3.5" /> Finances (CRM)
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {activeTab === 'access' ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-sm flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-red-500 text-sm uppercase">Permanent System Ban</div>
                                    <div className="text-xs text-gray-400 mt-1">Block all access to the platform permanently.</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isBanned} onChange={(e) => setIsBanned(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-400">Temporary Ban Expiry</label>
                                    <input
                                        type="datetime-local"
                                        value={bannedUntil}
                                        onChange={(e) => setBannedUntil(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:border-pitch-accent outline-none font-numeric"
                                    />
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tight italic">Leave blank for indefinite ban or no temporary suspension.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-400">Ban Reason (Private Audit Detail)</label>
                                    <textarea
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                        placeholder="Enter reason for administrative action..."
                                        className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:border-pitch-accent outline-none min-h-[100px] text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Adjustment Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-400">Adjustment Amount ($)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full bg-black/40 border border-white/10 rounded-sm pl-8 pr-4 py-3 text-white focus:border-pitch-accent outline-none font-numeric text-lg"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-400">Adjustment Reason</label>
                                        <input
                                            type="text"
                                            value={auditReason}
                                            onChange={(e) => setAuditReason(e.target.value)}
                                            placeholder="e.g. Refund for game cancellation"
                                            className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:border-pitch-accent outline-none text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={() => handleCreditAdjustment('add')}
                                            disabled={processingCredit}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-500 border border-green-500/30 rounded-sm font-bold uppercase text-[10px] tracking-widest hover:bg-green-500 hover:text-black transition-all disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4" /> Add Credit
                                        </button>
                                        <button 
                                            onClick={() => handleCreditAdjustment('deduct')}
                                            disabled={processingCredit}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 text-red-500 border border-red-500/30 rounded-sm font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                        >
                                            <Minus className="w-4 h-4" /> Deduct Credit
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-sm p-6 flex flex-col items-center justify-center">
                                    <div className="text-[10px] font-bold uppercase text-gray-500 tracking-[0.2em] mb-2 text-center">Current Vault Balance</div>
                                    <div className={`text-5xl font-black font-numeric ${user.credit_balance && user.credit_balance > 0 ? 'text-pitch-accent' : 'text-white'}`}>
                                        ${((user.credit_balance || 0) / 100).toFixed(2)}
                                    </div>
                                    {user.credit_balance && user.credit_balance > 0 && (
                                        <div className="mt-4 px-3 py-1 bg-pitch-accent/10 border border-pitch-accent/20 rounded-full text-[10px] font-bold text-pitch-accent uppercase">Active Vault Balance</div>
                                    )}
                                </div>
                            </div>

                            {/* History Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300 tracking-wider">
                                    <History className="w-4 h-4 text-pitch-accent" /> Recent Transaction History
                                </div>
                                <div className="bg-black/40 border border-white/10 rounded-sm overflow-hidden">
                                    {loadingHistory ? (
                                        <div className="py-12 flex flex-col items-center justify-center gap-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
                                            <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Loading Audit Logs...</span>
                                        </div>
                                    ) : history.length > 0 ? (
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/10 text-gray-500 font-bold uppercase">
                                                    <th className="py-2 px-3">Date</th>
                                                    <th className="py-2 px-3">Type</th>
                                                    <th className="py-2 px-3">Amount</th>
                                                    <th className="py-2 px-3">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {history.map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="py-2.5 px-3 text-gray-400 font-numeric whitespace-nowrap">
                                                            {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className={`px-1.5 py-0.5 rounded-[2px] font-black uppercase text-[9px] ${
                                                                tx.type === 'add' ? 'bg-green-500/10 text-green-500' :
                                                                tx.type === 'spend' ? 'bg-orange-500/10 text-orange-500' :
                                                                tx.type === 'refund' ? 'bg-blue-500/10 text-blue-500' :
                                                                'bg-red-500/10 text-red-500'
                                                            }`}>
                                                                {tx.type}
                                                            </span>
                                                        </td>
                                                        <td className={`py-2.5 px-3 font-bold font-numeric ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {tx.amount > 0 ? '+' : ''}${(tx.amount / 100).toFixed(2)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-gray-500 truncate max-w-[150px]">
                                                            {tx.reason || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="py-8 flex flex-col items-center justify-center gap-2 opacity-50">
                                            <AlertCircle className="w-6 h-6 text-gray-500" />
                                            <p className="text-[10px] font-bold uppercase text-gray-500">No recent transactions recorded</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                    <button onClick={onClose} className="px-6 py-2 text-xs font-bold uppercase text-gray-500 hover:text-white transition-colors">
                        Close
                    </button>
                    {activeTab === 'access' && (
                        <button 
                            onClick={handleSaveBanSettings}
                            disabled={savingBan}
                            className="bg-pitch-accent text-pitch-black px-8 py-2 rounded-sm font-black uppercase italic tracking-widest text-xs hover:bg-white transition-all disabled:opacity-50"
                        >
                            {savingBan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Save Settings"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
