document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Map
    const map = L.map('map').setView([43.8, 16.0], 8); // Centered on Dalmatia
    
    // Add Base Layers
    const osmBase = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const topoBase = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap'
    });

    L.control.layers({
        "OpenStreetMap": osmBase,
        "Topografska karta": topoBase
    }).addTo(map);

    // Initialize MarkerCluster
    const markers = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 30 // Smaller radius so distinct towns are clickable
    });
    
    let allData = [];

    function getAudioLinks(sources, cds) {
        if (!cds) return [];
        const links = [];
        const sourceArray = sources.split(',').map(s => s.trim());
        const cdArray = cds.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));

        sourceArray.forEach(source => {
            if (source === 'Popis_1') {
                cdArray.forEach(cd => {
                    let bucket = "";
                    if (cd >= 1 && cd <= 10) bucket = "1-10";
                    else if (cd >= 11 && cd <= 20) bucket = "11-20";
                    else if (cd >= 21 && cd <= 30) bucket = "21-30";
                    else if (cd >= 31 && cd <= 40) bucket = "31-40";
                    else if (cd >= 41 && cd <= 50) bucket = "41-50";
                    else if (cd >= 51 && cd <= 60) bucket = "51-60";
                    else if (cd >= 61 && cd <= 70) bucket = "61-70";
                    else if (cd >= 71 && cd <= 80) bucket = "71-80";
                    else if (cd >= 81 && cd <= 90) bucket = "81-90";
                    else if (cd >= 91 && cd <= 100) bucket = "91-100";
                    else if (cd >= 101 && cd <= 110) bucket = "101-110";
                    else if (cd >= 111 && cd <= 120) bucket = "111-120";
                    else if (cd >= 121 && cd <= 130) bucket = "121-130";
                    else if (cd >= 131 && cd <= 140) bucket = "131-140";
                    else if (cd >= 141 && cd <= 152) bucket = "141-152";
                    
                    if (bucket) {
                        const url = `https://stin.hr/portfolio-items/cd-${bucket}/`;
                        if (!links.some(l => l.url === url)) {
                            links.push({ text: `Popis 1: Album CD ${bucket}`, url: url });
                        }
                    }
                });
            }
            else if (source === 'Knjiga_1') {
                cdArray.forEach(cd => {
                    if (cd >= 1 && cd <= 4) {
                        let url = `https://stin.hr/portfolio-items/tradicijsko-pucko-crkveno-pjevanje-u-franjevackoj-provinciji-presvetog-otkupitelja-cd-${cd}/`;
                        if (cd === 2) {
                            url = `https://stin.hr/portfolio-items/tradicijsko-pucko-crkveno-pjevanje-franjevacke-provincije-presvetog-otkupitelja-cd-2/`;
                        }
                        if (!links.some(l => l.url === url)) {
                            links.push({ text: `Knjiga 1: CD ${cd}`, url: url });
                        }
                    }
                });
            }
            else if (source === 'Knjiga_2') {
                cdArray.forEach(cd => {
                    if (cd >= 1 && cd <= 3) {
                        const url = `https://stin.hr/portfolio-items/tradicijsko-pucko-crkveno-pjevanje-u-franjevackoj-provinciji-presvetog-otkupitelja-knjiga-2-cd-${cd}/`;
                        if (!links.some(l => l.url === url)) {
                            links.push({ text: `Knjiga 2: CD ${cd}`, url: url });
                        }
                    }
                });
            }
        });

        return links;
    }

    try {
        const response = await fetch('glagoljasko_pjevanje_lokacije.json');
        allData = await response.json();
    } catch (error) {
        console.error("Ne mogu učitati podatke:", error);
        alert("Greška pri učitavanju podataka.");
        return;
    }

    const uniqueSources = new Set();
    allData.forEach(d => {
        d.Sources.split(',').forEach(s => uniqueSources.add(s.trim()));
    });

    const sourcesContainer = document.getElementById('sourcesFilter');
    Array.from(uniqueSources).sort().forEach(source => {
        if (!source) return;
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = source;
        checkbox.checked = true;
        checkbox.addEventListener('change', updateMap);
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(source.replace('_', ' ')));
        sourcesContainer.appendChild(label);
    });

    const searchInput = document.getElementById('searchInput');
    const cdInput = document.getElementById('cdInput');
    
    searchInput.addEventListener('input', updateMap);
    cdInput.addEventListener('input', updateMap);

    function updateMap() {
        markers.clearLayers();

        const activeSources = Array.from(sourcesContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const searchTerm = searchInput.value.toLowerCase();
        const cdTerm = cdInput.value.toLowerCase().trim();

        let count = 0;

        allData.forEach(item => {
            const itemSources = item.Sources.split(',').map(s => s.trim());
            const sourceMatch = itemSources.some(s => activeSources.includes(s));
            if (!sourceMatch) return;

            const searchMatch = item.Name.toLowerCase().includes(searchTerm) || 
                                item.Notes.toLowerCase().includes(searchTerm);
            if (searchTerm && !searchMatch) return;

            let cdMatch = true;
            if (cdTerm) {
                const itemCDs = item.CDs.split(',').map(c => c.trim());
                cdMatch = itemCDs.includes(cdTerm) || item.CDs.includes(cdTerm);
            }
            if (!cdMatch) return;

            // Only add if we have valid coordinates
            if (item.lat && item.lng) {
                count++;
                
                // Add a small jitter (e.g. 0.0001 degrees) if you have exact same coords for different items,
                // although MarkerCluster handles overlap with spiderfy.
                const lat = item.lat + (Math.random() - 0.5) * 0.0005;
                const lng = item.lng + (Math.random() - 0.5) * 0.0005;

                const marker = L.marker([lat, lng]);
                
                const audioLinks = getAudioLinks(item.Sources, item.CDs);
                let linksHtml = '';
                if (audioLinks.length > 0) {
                    linksHtml = `<div class="audio-links">
                        <strong>Audiozapisi u repozitoriju:</strong>
                        <ul>
                            ${audioLinks.map(link => `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">🎵 ${link.text}</a></li>`).join('')}
                        </ul>
                    </div>`;
                }

                let popupHtml = `<div class="popup-content">
                    <h4>${item.Name}</h4>
                    <p><strong>Pojavljivanja:</strong> ${item.Occurrences}</p>
                    <p><strong>Izvori:</strong> ${item.Sources.replace(/_/g, ' ')}</p>
                    ${item.CDs ? `<p><strong>CD brojevi:</strong> ${item.CDs}</p>` : ''}
                    ${item.Notes ? `<p><strong>Napomene:</strong><br/>${item.Notes}</p>` : ''}
                    ${linksHtml}
                </div>`;
                
                marker.bindPopup(popupHtml, { className: 'custom-popup' });
                markers.addLayer(marker);
            }
        });

        map.addLayer(markers);
        document.getElementById('countDisplay').innerText = count;
    }

    updateMap();
});
