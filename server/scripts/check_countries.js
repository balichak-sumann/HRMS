const fetch = require('node-fetch');

async function checkCountries() {
    const url = 'https://date.nager.at/api/v3/AvailableCountries';
    try {
        const response = await fetch(url);
        const data = await response.json();
        const inCountry = data.find(c => c.key === 'IN');
        console.log('India found:', !!inCountry);
        if (inCountry) console.log(JSON.stringify(inCountry, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkCountries();
