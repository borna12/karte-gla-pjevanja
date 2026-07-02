const axios = require('axios');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function geocode() {
    console.log("Počinjem geokodiranje pravih lokacija...");
    let data = JSON.parse(fs.readFileSync('glagoljasko_pjevanje_lokacije.json', 'utf8'));

    // Manual overrides for regions or complex names that geocoders miss
    let manualOverrides = {
        "DALMACIJA": [43.83, 16.27],
        "DALMACIJA; ČAPLJINA": [43.11, 17.70],
        "HERCEGOVINA": [43.33, 17.80],
        "HERCEGOVINA; DESNE I BOROVCI": [43.05, 17.58],
        "ISTRA": [45.24, 13.93],
        "KUKLJICA": [44.032, 15.245],
        "HVAR/ZADARSKI OTOCI": [43.16, 16.44],
        "ZADARSKO ZALEĐE": [44.11, 15.35],
        "POLJICA": [43.43, 16.66],
        "POLJICA IMOTSKA": [43.43, 17.13],
        "BAŠKA DRAGA": [45.000, 14.717], // Draga Bašćanska
        "DOL 5b. POSTIRA": [43.360, 16.634], // Postira
        "JESENICE - SUMPETAR": [43.450, 16.602],
        "KRILO – JESENICE": [43.458, 16.591],
        "DONJE SITNO (POLJICA)": [43.488, 16.607]
    };

    let geocodedCount = 0;

    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        let rawName = item.Name;
        
        if (manualOverrides[rawName]) {
            item.lat = manualOverrides[rawName][0];
            item.lng = manualOverrides[rawName][1];
            console.log(`[MANUAL] ${rawName} -> ${item.lat}, ${item.lng}`);
            continue;
        }

        // Clean the name for better geocoding
        let cleanName = item.Name.split('(')[0]
            .split(' - ')[0]
            .split(' I ')[0]
            .replace(/;/g, '')
            .replace(/^OTOK /g, '')
            .replace(/^GRAD /g, '')
            .trim();
            
        let query = `${cleanName}, Croatia`;
        
        try {
            // 1. Try Open-Meteo (fast, no strict rate limit)
            const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=5`;
            const omRes = await axios.get(omUrl);
            
            let found = false;
            if (omRes.data && omRes.data.results) {
                // Find result in Croatia
                const hrResult = omRes.data.results.find(r => r.country === "Croatia" || r.country === "Bosnia and Herzegovina");
                if (hrResult) {
                    item.lat = hrResult.latitude;
                    item.lng = hrResult.longitude;
                    found = true;
                    console.log(`[OM] Found: ${cleanName} (${item.lat}, ${item.lng})`);
                    geocodedCount++;
                }
            }
            
            if (!found) {
                // 2. Fallback to Nominatim OSM with proper delay
                await sleep(1500); 
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
                const res = await axios.get(url, {
                    headers: { 'User-Agent': 'Opencode G-Pjevanje-Map/3.0 (contact@example.com)' }
                });
                
                if (res.data && res.data.length > 0) {
                    item.lat = parseFloat(res.data[0].lat);
                    item.lng = parseFloat(res.data[0].lon);
                    console.log(`[NOM] Found: ${cleanName} (${item.lat}, ${item.lng})`);
                    geocodedCount++;
                } else {
                    console.log(`[NOT FOUND] ${cleanName}`);
                    item.lat = 43.5081; item.lng = 16.4401; // Split center
                    item.notFound = true;
                }
            }
        } catch (e) {
            console.error(`[ERROR] on ${cleanName}:`, e.message);
            item.lat = 43.5081; item.lng = 16.4401; // default if API crashes completely
        }
        
        // malinska override specifically because there are multiple malinskas
        if (cleanName.toUpperCase() === "MALINSKA") {
            item.lat = 45.12268; item.lng = 14.52737; // Malinska, Krk
        }
    }
    
    // Spremi JSON
    fs.writeFileSync('glagoljasko_pjevanje_lokacije.json', JSON.stringify(data, null, 4), 'utf8');
    
    // Ažuriraj i CSV sa novim koordinatama
    let csv = "\uFEFFName,Occurrences,CDs,Sources,Notes,Latitude,Longitude\n"; 
    data.forEach(ul => {
        let n = `"${ul.Name.replace(/"/g, '""')}"`;
        let o = `"${ul.Occurrences}"`;
        let c = `"${ul.CDs.replace(/"/g, '""')}"`;
        let s = `"${ul.Sources.replace(/"/g, '""')}"`;
        let no = `"${ul.Notes.replace(/"/g, '""')}"`;
        let lat = ul.lat ? ul.lat : "";
        let lng = ul.lng ? ul.lng : "";
        csv += `${n},${o},${c},${s},${no},${lat},${lng}\n`;
    });
    fs.writeFileSync("glagoljasko_pjevanje_lokacije.csv", csv, "utf8");

    console.log(`Završeno! Uspješno mapirano: ${geocodedCount} + overrides.`);
}

geocode().catch(console.error);
