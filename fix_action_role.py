with open('src/app/actions/match-reviews.ts', 'r') as f:
    content = f.read()

content = content.replace("    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();\n    if (!profile || profile.role !== 'admin') throw new Error('Unauthorized');",
"""    const { data: profile } = await supabase.from('profiles').select('system_role, role').eq('id', user.id).single();
    if (!profile) throw new Error('Unauthorized');
    
    const isMasterAdmin = profile.role === 'master_admin';
    const isSuperAdmin = profile.system_role === 'super_admin';
    const isRegularAdmin = profile.role === 'host';
    
    if (!isMasterAdmin && !isSuperAdmin && !isRegularAdmin) {
        throw new Error('Unauthorized');
    }""")

with open('src/app/actions/match-reviews.ts', 'w') as f:
    f.write(content)

print("Fixed action role")
