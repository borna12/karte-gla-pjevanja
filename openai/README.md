# Leaflet karta

Ova mapa koristi podatke iz `03_strukturirani_podatci` i lokalni bundle `data.js`, tako da se može otvoriti bez dodatnog backend sustava.

## Pokretanje

Najpouzdanije je pokrenuti lokalni server iz korijena projekta:

```powershell
python -m http.server 8765
```

Zatim otvoriti:

```text
http://127.0.0.1:8765/karta/
```

## Ažuriranje podataka

Nakon izmjene `03_strukturirani_podatci/mjesta.csv`, posebno polja `lat` i `lon`, pokrenuti:

```powershell
python tools\build_leaflet_data.py
```

Ako se mijenjaju izvorni Markdown dokumenti, prvo ponovno izgraditi strukturirane podatke:

```powershell
python tools\structure_glagoljasko_data.py
python tools\build_leaflet_data.py
```

## Filteri

Karta podržava pretragu po mjestu, izvoru, CD-u i raw zapisima, filtriranje po izvoru, prostornom kontekstu, koordinatama i zapisima za provjeru.

## Audio poveznice

`tools\build_leaflet_data.py` dodaje `audio_url` zapisima koji imaju CD oznaku. U popupu karte CD oznaka postaje poveznica na odgovarajuću stranicu STIN fonoteke.

Isto mapiranje se zapisuje u `03_strukturirani_podatci/audio_poveznice.csv`.
