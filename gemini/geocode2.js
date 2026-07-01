const axios = require('axios');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function geocode() {
    let data = JSON.parse(fs.readFileSync('glagoljasko_pjevanje_lokacije.json', 'utf8'));
    data = data.filter(d => !d.Name.includes("Nepoznato"));

    let geoData = [];
    if (fs.existsSync('glagoljasko_pjevanje_lokacije_geo.json')) {
        geoData = JSON.parse(fs.readFileSync('glagoljasko_pjevanje_lokacije_geo.json', 'utf8'));
        // merge existing coordinates
        data.forEach(d => {
            let existing = geoData.find(g => g.Name === d.Name);
            if (existing && existing.lat) {
                d.lat = existing.lat;
                d.lng = existing.lng;
            }
        });
    }

    let found = 0;
    
    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        if (item.lat && item.lng) continue; // skip already geocoded

        let cleanName = item.Name.split('(')[0].split('-')[0].split(' I ')[0].replace(/;/g, '').trim(); 
        
        // Custom manual fixes for specific places
        if(cleanName === "DALMACIJA") { item.lat = 43.83; item.lng = 16.27; continue; }
        if(cleanName === "HERCEGOVINA") { item.lat = 43.33; item.lng = 17.80; continue; }
        if(cleanName === "ISTRA") { item.lat = 45.24; item.lng = 13.93; continue; }
        if(cleanName === "HVAR/ZADARSKI OTOCI") { cleanName = "HVAR"; }
        
        let query = `${cleanName}, Croatia`;

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Opencode G-Pjevanje-Map/1.0 (contact@example.com)' }
            });
            
            if (res.data && res.data.length > 0) {
                item.lat = parseFloat(res.data[0].lat);
                item.lng = parseFloat(res.data[0].lon);
                found++;
                console.log(`[${i+1}/${data.length}] Found: ${cleanName}`);
            } else {
                // Default fallback to Split region with slight random scatter if not found to avoid crashing map
                item.lat = 43.5081 + (Math.random() - 0.5) * 0.1;
                item.lng = 16.4401 + (Math.random() - 0.5) * 0.1;
                item.notFound = true;
                console.log(`[${i+1}/${data.length}] NOT FOUND (Defaulted): ${cleanName}`);
            }
        } catch (e) {
            console.error(`Error on ${item.Name}:`, e.message);
            // Default fallback
            item.lat = 43.5081; item.lng = 16.4401;
        }
        
        // Save progressively
        fs.writeFileSync('glagoljasko_pjevanje_lokacije_geo.json', JSON.stringify(data, null, 4), 'utf8');
        
        await sleep(1100); 
    }
    console.log(`Finished geocoding.`);
}

geocode().catch(console.error);
