const fetch = require('node-fetch');

async function testHolidays() {
    for (const year of [2024, 2025, 2026]) {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/IN`;
        console.log(`Testing URL: ${url}`);
        
        try {
            const response = await fetch(url);
            console.log(`Status for ${year}: ${response.status}`);
            if (response.status === 200) {
                const data = await response.json();
                console.log(`Found ${data.length} holidays for ${year}.`);
            } else {
                console.log(`No data found for ${year}.`);
            }
        } catch (err) {
            console.error(`Error for ${year}:`, err.message);
        }
    }
}

testHolidays();
