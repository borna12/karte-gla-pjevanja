# Struktura podataka za kartu glagoljaškog pjevanja

## Pregled

Ova mapa sadrži strukturirane JSON datoteke s podacima o lokacijama snimanja tradicijskog pučkog crkvenog pjevanja u Franjevačkoj provinciji Presvetoga Otkupitelja. Podaci su ekstrahirani iz četiri izvorna .docx dokumenta.

## Datoteke

| Datoteka | Opis |
|---|---|
| `locations.json` | **Glavna datoteka** - 119 jedinstvenih lokacija s pripadajućim CD-ovima, regijama i detaljima snimanja |
| `regions.json` | Hijerarhija regija/otoka s pripadajućim lokacijama (ID reference) |
| `recordings.json` | Detaljni popis napjeva po knjigama (Knjiga 1 i 2) i CD-ovima, uključujući izvođače |

## Struktura `locations.json`

Svaka lokacija ima sljedeća polja:

```
{
  "id": "omisalj",              // jedinstveni slug identifikator
  "name": "Omišalj",            // naziv mjesta
  "region": "Otok Krk",         // geografska regija
  "county": "...",              // županija
  "lat": null,                  // geografska širina (za popuniti)
  "lng": null,                  // geografska dužina (za popuniti)
  "sources": {
    "popis1": { "cds": [...] }, // reference na izvorne dokumente
    "popis2": { ... },
    "knjiga1": { ... },
    "knjiga2": { ... }
  }
}
```

## Struktura `regions.json`

Regije grupiraju lokacije prema geografskim cjelinama. Svaka regija sadrži popis `location` ID-ova koji odgovaraju lokacijama u `locations.json`.

## Struktura `recordings.json`

Detaljan popis napjeva organiziran po knjigama:
- **Knjiga 1**: 4 CD-a s detaljnim track listama
- **Knjiga 2**: 3 CD-a s detaljnim track listama
- **Popis 1**: Mapiranje svih 152 CD-a na lokacije

## Izvorni dokumenti

1. `POPIS MJESTA SNIMANJA PO CD-u_Popisni list br. 1.docx` - popis svih CD-ova (1-152) s lokacijama
2. `Popis 2 (OTOCI BRAČ, HVAR, ŠOLTA i ŠIRE SPLITSKO PODRUČJE).docx` - popis lokacija na otocima
3. `TRADICIJSKO PUČKO CRKVENO PJEVANJE ... KNJIGA 1.docx` - Knjiga 1 s napjevima
4. `KNJIGA 2_TRADICIJSKO PUČKO CRKVENO PJEVANJE ... .docx` - Knjiga 2 s napjevima

## Korištenje za kartu

1. Učitaj `locations.json` za prikaz svih točaka na karti
2. Koristi `lat`/`lng` polja za pozicioniranje markera (trenutno `null` - potrebno geokodiranje)
3. Grupiraj lokacije po `region` polju za filtriranje
4. Za prikaz detalja o snimkama, referenciraj `recordings.json` koristeći `id` lokacije

## Napomene

- Neke lokacije nemaju navedene točne koordinate - potrebno ih je geokodirati
- Pojedini CD-ovi (npr. 100A, 100B, 100C) imaju slovne oznake
- Neki napjevi u Knjizi 1 i 2 nemaju navedenu lokaciju (samo izvođača)
- CD 142 nema navedeno mjesto snimanja, samo oznaku "IZBOR: JERKO BEZIĆ"
- Lokacije iz Popisa 2 (Brač, Hvar, Šolta) nemaju pridružene CD brojeve
