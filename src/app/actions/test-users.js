const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env vars in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log("Fetching users from auth.admin...");
    
    // Test pagination logic as written in cleanup-seed.ts
    let allUsers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
        if (error) {
            console.error("Error fetching users:", error);
            break;
        }
        
        let users = data.users;
        console.log(`Page ${page}: Fetched ${users.length} users.`);
        
        if (users.length === 0) {
            hasMore = false;
        } else {
            allUsers.push(...users);
            page++;
        }
        
        // Failsafe
        if (page > 10) break;
    }

    console.log(`Total users explicitly fetched: ${allUsers.length}`);

    const testUsers = allUsers.filter(u => u.email && u.email.includes('@testtournament.com'));
    console.log(`Users matching @testtournament.com: ${testUsers.length}`);
    
    if (testUsers.length > 0) {
        console.log("Sample test user email:", testUsers[0].email);
    } else {
        console.log("Printing ALL emails to see what is actually in the db:");
        allUsers.slice(0, 20).forEach(u => console.log(u.email));
    }
}

checkUsers();
