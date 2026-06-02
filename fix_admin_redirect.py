with open('src/app/admin/(dashboard)/match-reviews/page.tsx', 'r') as f:
    content = f.read()

# Remove the explicit admin check since layout handles it
content = content.replace("""    // Verify Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') redirect('/dashboard');""", "")

with open('src/app/admin/(dashboard)/match-reviews/page.tsx', 'w') as f:
    f.write(content)

print("Fixed redirect")
