const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

async function parseAll() {
    let allData = [];

    // Parse Knjiga 1
    const k1 = await mammoth.extractRawText({path: "TRADICIJSKO PUČKO CRKVENO PJEVANJE U FRANJEVAČKOJ PROVINCIJI PRESVETOGA OTKUPITELJA_ KNJIGA 1.docx"});
    let currentCD = "";
    k1.value.split("\n").forEach(line => {
        line = line.trim();
        if (!line) return;
        const cdMatch = line.match(/^CD\s*(\d+)$/i);
        if (cdMatch) {
            currentCD = cdMatch[1];
        } else if (!line.startsWith("KNJIGA") && line.match(/^(.*?)\s*\((.*?)\)$/)) {
            const match = line.match(/^(.*?)\s*\((.*?)\)$/);
            allData.push({ Source: "Knjiga_1", CD: currentCD, Location: match[1].trim(), Notes: match[2].trim() });
        }
    });

    // Parse Knjiga 2
    const k2 = await mammoth.extractRawText({path: "KNJIGA 2_TRADICIJSKO PUČKO CRKVENO PJEVANJE U FRANJEVAČKOJ PROVINCIJI PRESVETOGA OTKUPITELJA.docx"});
    currentCD = "";
    k2.value.split("\n").forEach(line => {
        line = line.trim();
        if (!line) return;
        const cdMatch = line.match(/^CD\s*(\d+)$/i);
        if (cdMatch) {
            currentCD = cdMatch[1];
        } else if (!line.startsWith("KNJIGA") && line.match(/^(.*?)\s*\((.*?)\)$/)) {
            const match = line.match(/^(.*?)\s*\((.*?)\)$/);
            allData.push({ Source: "Knjiga_2", CD: currentCD, Location: match[1].trim(), Notes: match[2].trim() });
        }
    });

    // Parse Popis 1
    const p1 = await mammoth.extractRawText({path: "POPIS MJESTA SNIMANJA PO CD-u_Popisni list br. 1.docx"});
    p1.value.split("\n").forEach(line => {
        line = line.trim();
        if (!line) return;
        const cdMatch = line.match(/^CD\s*(\d+)\s+(.*)$/i);
        if (cdMatch) {
            const cd = cdMatch[1];
            const locs = cdMatch[2].split(",");
            locs.forEach(l => {
                allData.push({ Source: "Popis_1", CD: cd, Location: l.trim(), Notes: "" });
            });
        }
    });

    // Parse Popis 2
    const p2 = await mammoth.extractRawText({path: "Popis 2 (OTOCI BRAČ, HVAR, ŠOLTA i ŠIRE SPLITSKO PODRUČJE).docx"});
    p2.value.split("\n").forEach(line => {
        line = line.trim();
        if (!line) return;
        if (!line.startsWith("OTOK") && !line.startsWith("ŠIRE") && !line.startsWith("PODRUČJE") && !line.startsWith("SPLITSKO")) {
            let loc = line.replace(/^\d+[a-z]?\.\s*/i, "").trim();
            allData.push({ Source: "Popis_2", CD: "", Location: loc, Notes: "" });
        }
    });

    // Aggregate
    let locations = {};

    allData.forEach(row => {
        let loc = row.Location;
        
        // Clean
        loc = loc.replace(/^\(MJESTO NIJE NAVEDENO\)$/i, "Nepoznato");
        loc = loc.replace(/^\(LOKACIJA NIJE NAVEDENA.*/i, "Nepoznato");
        loc = loc.replace(/^\(MJESTO SNIMANJA NIJE NAVEDENO\)$/i, "Nepoznato");
        loc = loc.replace(/^\(MJESTO SNIMANJA NIJE NAVEDENO$/i, "Nepoznato");
        
        loc = loc.replace(/^A\s+OTOK\s+/i, "OTOK ");
        loc = loc.replace(/^B\s+OTOK\s+/i, "OTOK ");
        loc = loc.replace(/^A\s+VRBNIK/i, "VRBNIK");
        loc = loc.replace(/^B\s+VRBNIK/i, "VRBNIK");
        loc = loc.replace(/^C\s+VRBNIK/i, "VRBNIK");
        
        loc = loc.trim();
        
        if (!loc || loc === "Nepoznato" || loc.match(/NAPJEV/i) || loc.match(/IZBOR:/i)) return;
        
        if (!locations[loc]) {
            locations[loc] = { Occurrences: 1, CDs: new Set(), Sources: new Set(), Notes: new Set() };
        } else {
            locations[loc].Occurrences++;
        }
        
        if (row.CD) locations[loc].CDs.add(row.CD);
        if (row.Source) locations[loc].Sources.add(row.Source);
        if (row.Notes) locations[loc].Notes.add(row.Notes);
    });

    let uniqueLocations = [];
    for (const [key, value] of Object.entries(locations)) {
        let cds = Array.from(value.CDs).map(Number).sort((a,b)=>a-b).join(", ");
        let sources = Array.from(value.Sources).sort().join(", ");
        let notes = Array.from(value.Notes).filter(n=>n).join(" | ");
        
        uniqueLocations.push({
            Name: key,
            Occurrences: value.Occurrences,
            CDs: cds,
            Sources: sources,
            Notes: notes
        });
    }

    uniqueLocations.sort((a,b) => a.Name.localeCompare(b.Name));
    
    // Write JSON
    fs.writeFileSync("glagoljasko_pjevanje_lokacije.json", JSON.stringify(uniqueLocations, null, 4), "utf8");
    
    // Write CSV
    let csv = "\uFEFFName,Occurrences,CDs,Sources,Notes\n"; // add BOM for Excel
    uniqueLocations.forEach(ul => {
        let n = `"${ul.Name.replace(/"/g, '""')}"`;
        let o = `"${ul.Occurrences}"`;
        let c = `"${ul.CDs.replace(/"/g, '""')}"`;
        let s = `"${ul.Sources.replace(/"/g, '""')}"`;
        let no = `"${ul.Notes.replace(/"/g, '""')}"`;
        csv += `${n},${o},${c},${s},${no}\n`;
    });
    fs.writeFileSync("glagoljasko_pjevanje_lokacije.csv", csv, "utf8");
    
    console.log(`Ukupno jedinstvenih lokacija: ${uniqueLocations.length}`);
}

parseAll().catch(console.error);
