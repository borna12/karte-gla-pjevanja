const data = window.GLAGOLJASKO_DATA || { places: [], records: [], sources: [], issues: [] };

const sourceById = new Map(data.sources.map((source) => [source.source_id, source]));
const issueRecordIds = new Set(data.issues.map((issue) => issue.zapis_id));
const recordsByPlace = new Map();

for (const record of data.records) {
  for (const placeId of splitList(record.place_ids)) {
    if (!recordsByPlace.has(placeId)) recordsByPlace.set(placeId, []);
    recordsByPlace.get(placeId).push(record);
  }
}

const state = {
  search: "",
  context: "",
  onlyGeocoded: data.places.some(hasCoords),
  onlyIssues: false,
  sources: new Set(data.sources.map((source) => source.source_id)),
};

const map = L.map("map", { minZoom: 6 }).setView([44.8, 16.2], 7);

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
});

const carto = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 20,
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
});

osm.addTo(map);
L.control.layers({ "OpenStreetMap": osm, "Svijetla podloga": carto }, {}, { position: "topright" }).addTo(map);

const cluster = L.markerClusterGroup({ showCoverageOnHover: false, spiderfyOnMaxZoom: true });
map.addLayer(cluster);

const markersByPlace = new Map();

initControls();
render();

function splitList(value) {
  return (value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function hasCoords(place) {
  const lat = String(place.lat || "").trim();
  const lon = String(place.lon || "").trim();
  return lat !== "" && lon !== "" && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
}

function placeSources(place) {
  return splitList(place.source_ids);
}

function placeRecords(place) {
  return recordsByPlace.get(place.place_id) || [];
}

function placeHasIssue(place) {
  return place.review_status === "needs_review" || placeRecords(place).some((record) => issueRecordIds.has(record.zapis_id));
}

function visiblePlaces() {
  const query = state.search.trim().toLowerCase();
  return data.places.filter((place) => {
    const sources = placeSources(place);
    const records = placeRecords(place);
    const searchText = [
      place.naziv,
      place.kontekst,
      place.place_id,
      place.napomena,
      sources.map((sourceId) => sourceById.get(sourceId)?.title || sourceId).join(" "),
      records.map((record) => `${record.carrier_label} ${record.raw_location} ${record.track_range}`).join(" "),
    ].join(" ").toLowerCase();

    if (state.onlyGeocoded && !hasCoords(place)) return false;
    if (state.onlyIssues && !placeHasIssue(place)) return false;
    if (state.context && place.kontekst !== state.context) return false;
    if (!sources.some((sourceId) => state.sources.has(sourceId))) return false;
    if (query && !searchText.includes(query)) return false;
    return true;
  });
}

function initControls() {
  document.getElementById("onlyGeocoded").checked = state.onlyGeocoded;

  document.getElementById("searchInput").addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  document.getElementById("onlyGeocoded").addEventListener("change", (event) => {
    state.onlyGeocoded = event.target.checked;
    render();
  });

  document.getElementById("onlyIssues").addEventListener("change", (event) => {
    state.onlyIssues = event.target.checked;
    render();
  });

  const contextSelect = document.getElementById("contextFilter");
  const contexts = Array.from(new Set(data.places.map((place) => place.kontekst).filter(Boolean))).sort((a, b) => a.localeCompare(b, "hr"));
  for (const context of contexts) {
    const option = document.createElement("option");
    option.value = context;
    option.textContent = context;
    contextSelect.appendChild(option);
  }
  contextSelect.addEventListener("change", (event) => {
    state.context = event.target.value;
    render();
  });

  const sourceWrap = document.getElementById("sourceFilters");
  for (const source of data.sources) {
    const count = data.places.filter((place) => placeSources(place).includes(source.source_id)).length;
    const label = document.createElement("label");
    label.className = "filter-row";
    label.innerHTML = `<span><input type="checkbox" checked value="${escapeHtml(source.source_id)}">${escapeHtml(shortSourceTitle(source))}</span><span class="filter-count">${count}</span>`;
    label.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) state.sources.add(source.source_id);
      else state.sources.delete(source.source_id);
      render();
    });
    sourceWrap.appendChild(label);
  }

  document.getElementById("fitButton").addEventListener("click", fitVisibleMarkers);
  document.getElementById("sidebarToggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("is-open"));
}

function render() {
  const visible = visiblePlaces();
  renderSummary(visible);
  renderMarkers(visible);
  renderList(visible);
}

function renderSummary(visible) {
  const geocoded = data.places.filter(hasCoords).length;
  const visibleGeocoded = visible.filter(hasCoords).length;
  document.getElementById("summary").textContent = `${data.places.length} mjesta, ${data.records.length} zapisa, ${geocoded} mjesta s koordinatama.`;
  document.getElementById("listCount").textContent = `${visible.length} prikazano, ${visibleGeocoded} na karti`;
  document.getElementById("emptyState").hidden = visibleGeocoded > 0;
}

function renderMarkers(visible) {
  cluster.clearLayers();
  markersByPlace.clear();
  for (const place of visible.filter(hasCoords)) {
    const marker = L.marker([Number(place.lat), Number(place.lon)], { icon: markerIcon(place) });
    marker.bindPopup(popupHtml(place), { maxWidth: 380, className: "popup" });
    markersByPlace.set(place.place_id, marker);
    cluster.addLayer(marker);
  }
}

function renderList(visible) {
  const list = document.getElementById("placeList");
  list.innerHTML = "";
  const sorted = visible.slice().sort((a, b) => a.naziv.localeCompare(b.naziv, "hr"));
  for (const place of sorted) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-item";
    const status = hasCoords(place) ? "ima koordinate" : "bez koordinata";
    const issue = placeHasIssue(place) ? " · provjeriti" : "";
    button.innerHTML = `<strong>${escapeHtml(place.naziv)}</strong><span>${escapeHtml(place.kontekst || "bez konteksta")} · ${status}${issue}</span>`;
    button.addEventListener("click", () => openPlace(place));
    list.appendChild(button);
  }
}

function openPlace(place) {
  const marker = markersByPlace.get(place.place_id);
  if (marker) {
    map.setView(marker.getLatLng(), 13);
    marker.openPopup();
    document.getElementById("sidebar").classList.remove("is-open");
    return;
  }
  L.popup()
    .setLatLng(map.getCenter())
    .setContent(popupHtml(place))
    .openOn(map);
}

function fitVisibleMarkers() {
  const markers = Array.from(markersByPlace.values());
  if (!markers.length) return;
  const group = L.featureGroup(markers);
  map.fitBounds(group.getBounds().pad(0.18));
}

function markerIcon(place) {
  const first = (place.naziv || "?").trim().slice(0, 1).toUpperCase();
  const reviewClass = placeHasIssue(place) ? "marker-review" : `marker-${place.geocode_status || "default"}`;
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -28],
    html: `<div class="custom-marker ${reviewClass}"><span>${escapeHtml(first)}</span></div>`,
  });
}

function popupHtml(place) {
  const records = placeRecords(place).slice(0, 12);
  const sources = placeSources(place).map((sourceId) => sourceById.get(sourceId)?.title || sourceId).join("; ");
  return `
    <h2>${escapeHtml(place.naziv)}</h2>
    <dl>
      <dt>Kontekst</dt><dd>${escapeHtml(place.kontekst || "-")}</dd>
      <dt>Status</dt><dd>${escapeHtml(place.geocode_status || "-")} / ${escapeHtml(place.review_status || "-")}</dd>
      <dt>Izvori</dt><dd>${escapeHtml(sources || "-")}</dd>
      <dt>Zapisa</dt><dd>${placeRecords(place).length}</dd>
    </dl>
    ${place.napomena ? `<p>${escapeHtml(place.napomena)}</p>` : ""}
    <ol class="popup-records">
      ${records.map((record) => `<li>${recordLineHtml(record)}</li>`).join("")}
    </ol>
  `;
}

function recordLineHtml(record) {
  const carrier = record.audio_url
    ? `<a href="${escapeHtml(record.audio_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.carrier_label)}</a>`
    : escapeHtml(record.carrier_label);
  return [carrier, escapeHtml(record.track_range), escapeHtml(record.raw_location)].filter(Boolean).join(" · ");
}

function shortSourceTitle(source) {
  if (source.source_id === "knjiga_1") return "Knjiga 1";
  if (source.source_id === "knjiga_2") return "Knjiga 2";
  if (source.source_id === "popis_cd_1") return "Popis CD-a";
  if (source.source_id === "popis_mjesta_2") return "Popis mjesta 2";
  return source.title || source.source_id;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
