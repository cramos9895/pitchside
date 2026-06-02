import re

ui_elements = """
            <div className="bg-black/40 border border-white/10 p-6 space-y-6 mt-8">
                <h3 className="text-xl font-black italic uppercase tracking-widest text-[#cbff00] mb-4">Referee Configuration</h3>
                <div className="flex flex-col md:flex-row gap-6 mt-4 p-4 bg-white/5 border border-white/10 rounded-sm">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="requires_officials"
                            checked={requiresOfficials}
                            onChange={(e) => setRequiresOfficials(e.target.checked)}
                            className="w-5 h-5 accent-[#cbff00] cursor-pointer"
                        />
                        <label htmlFor="requires_officials" className="text-white font-bold tracking-wide cursor-pointer select-none">
                            Requires Pitchside Officials?
                        </label>
                    </div>
                    {requiresOfficials && (
                        <div className="flex flex-col md:flex-row gap-4 border-l border-white/10 pl-6 w-full">
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">Base Pay Rate ($)</label>
                                <input type="number" value={basePay} onChange={(e) => setBasePay(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-sm p-2 text-white focus:outline-none focus:border-[#cbff00] transition-colors font-bold" min={0} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">Payment Method</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-black border border-white/10 rounded-sm p-2 text-white focus:outline-none focus:border-[#cbff00] transition-colors font-bold">
                                    <option value="digital">Digital (Stripe Connect)</option>
                                    <option value="manual">Manual (Zelle/Cash)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
"""

def inject(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    if "Requires Pitchside Officials?" not in content:
        content = content.replace('<button type="submit"', ui_elements + '\n            <button type="submit"')
    
    with open(file_path, 'w') as f:
        f.write(content)

inject('src/components/admin/LeagueForm.tsx')
inject('src/components/admin/RollingLeagueForm.tsx')
print("Patched missing forms")
