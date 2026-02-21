const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://dtksceimduutjrvlcmnm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0a3NjZWltZHV1dGpydmxjbW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM5OTIxNCwiZXhwIjoyMDg1OTc1MjE0fQ.ammhPHbIqImPnXaUzfH7sW9zPSDeMOlzkyQLLdkjE_0'
);

async function checkSchema() {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching bookings:', error);
    } else {
        console.log('Bookings row sample (to infer columns):', data);
    }
}

checkSchema();
