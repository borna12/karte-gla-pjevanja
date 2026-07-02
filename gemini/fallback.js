const axios = require('axios');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fallbackGeocode() {
    let data = JSON.parse(fs.readFileSync('glagoljasko_pjevanje_lokacije.json', 'utf8'));

    // Fix remaining edgecases
    const customFixes = {
        "BRELA DONJA": [43.366, 16.924], // Brela
        "BRUSJA": [43.19278, 16.49083], // Brusje
        "DUBAŠNICA": [45.109, 14.526],
        "KATUNI-KREŠEVO": [43.468, 16.852],
        "KORČULA; STON": [42.838, 17.696], // Ston
        "NERETVANSKA KRAJINA": [43.05, 17.65],
        "PAG NOVI VINODOLSKI": [44.445, 15.057],
        "PRVIĆ VODICE": [43.760, 15.782],
        "VIS LUKA": [43.061, 16.183],
        "PELJEŠAC": [42.88, 17.43],
        "ROGOZNICA – LOKVA": [43.534, 15.968],
        "SKRPČIĆI (ŽUPA LINARDIĆI)": [45.068, 14.509],
        "SLIVNO-RAVNO": [42.993, 17.519],
        "SREDIŠNA": [43.430, 17.200], // Unknown exactly, approximate Imotski
        "SUPETAR 7b. SELCA": [43.297, 16.851], // Selca, Brač
        "SV. VID": [45.127, 14.516], // Sv Vid Miholjice
        "VELI VAROŠ": [43.508, 16.433], // Split
        "VELJACI-GRAB-SINAC": [43.24, 17.45],
        "ZADARSKI OTOCI": [44.115, 15.0],
        "ŽUPA BIOKOVSKA": [43.284, 17.067]
    };

    let count = 0;
    data.forEach(item => {
        let rawName = item.Name;
        if (customFixes[rawName] && item.lat === 43.5081 && item.lng === 16.4401) {
            item.lat = customFixes[rawName][0];
            item.lng = customFixes[rawName][1];
            console.log(`[MANUAL FALLBACK] fixed ${rawName}`);
            count++;
        }
    });

    fs.writeFileSync('glagoljasko_pjevanje_lokacije.json', JSON.stringify(data, null, 4), 'utf8');

    // Ažuriraj i CSV
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

    console.log(`Popravljeno još: ${count}`);
}

fallbackGeocode();
