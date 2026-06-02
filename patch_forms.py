import re
import os

def patch_form(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # 1. Add state for base_pay and payment_method
    if "setBasePay" not in content:
        content = content.replace("const [requiresOfficials, setRequiresOfficials] = useState(initialData?.requires_officials || false);",
            "const [requiresOfficials, setRequiresOfficials] = useState(initialData?.requires_officials || false);\n    const [basePay, setBasePay] = useState<number>(initialData?.base_pay || 0);\n    const [paymentMethod, setPaymentMethod] = useState<'digital' | 'manual'>(initialData?.payment_method || 'digital');")

    # 2. Add base_pay and payment_method to payload
    if "base_pay: basePay" not in content:
        content = content.replace("requires_officials: requiresOfficials,", "requires_officials: requiresOfficials, base_pay: basePay, payment_method: paymentMethod,")

    # 3. Add UI elements if missing
    ui_elements = """
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
"""

    if "Requires Pitchside Officials?" not in content:
        # Inject right before the submit button or gameDate inputs, depending on the form
        # For LeagueForm and RollingLeagueForm, there's usually a price section or submit button
        content = content.replace('<div className="border-t border-white/10 pt-6 mt-8 flex justify-end">', ui_elements + '\n                <div className="border-t border-white/10 pt-6 mt-8 flex justify-end">')
    else:
        # TournamentForm already has requires_officials checkbox. Let's replace it with the enhanced block
        old_checkbox = r'<div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-sm">.*?Requires Pitchside Officials\?.*?</label>\s*</div>'
        content = re.sub(old_checkbox, ui_elements, content, flags=re.DOTALL)

    with open(file_path, 'w') as f:
        f.write(content)

patch_form('src/components/admin/LeagueForm.tsx')
patch_form('src/components/admin/RollingLeagueForm.tsx')
patch_form('src/components/admin/TournamentForm.tsx')
print("Patched all forms.")
