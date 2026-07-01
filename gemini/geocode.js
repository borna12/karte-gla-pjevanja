const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function geocode() {
    console.log("Starting geocoding process...");
    let data = JSON.parse(fs.readFileSync('glagoljasko_pjevanje_lokacije.json', 'utf8'));
    
    // Filter out "Nepoznato"
    data = data.filter(d => d.Name !== "Nepoznato");

    let found = 0;
    let notFound = 0;

    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        
        // Clean query for better geocoding results
        // Remove text in parentheses, e.g., "BOGOVIĆI (DUBAŠNICA)" -> "BOGOVIĆI"
        let cleanName = item.Name.split('(')[0].split('-')[0].split(' I ')[0].replace(/;/g, '').trim(); 
        let query = `${cleanName}, Croatia`;

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Opencode G-Pjevanje-Map/1.0' }
            });
            const result = await res.json();
            
            if (result && result.length > 0) {
                item.lat = parseFloat(result[0].lat);
                item.lng = parseFloat(result[0].lon);
                found++;
                if (i % 10 === 0) console.log(`[${i+1}/${data.length}] Found: ${item.Name}`);
            } else {
                notFound++;
                console.log(`[${i+1}/${data.length}] NOT FOUND: ${item.Name} (Query: ${query})`);
            }
        } catch (e) {
            console.error(`Error on ${item.Name}`);
        }
        await sleep(500); // Max ~2 requests per second
    }

    fs.writeFileSync('glagoljasko_pjevanje_lokacije_geo.json', JSON.stringify(data, null, 4), 'utf8');
    console.log(`Geocoding complete. Found: ${found}, Not found: ${notFound}`);
}

geocode().catch(console.error);
