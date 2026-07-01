$allData = Import-Csv -Path "locations_extracted.csv" -Encoding UTF8
$locations = @{}

# Funkcija za popravak hrvatskih znakova
function Fix-Encoding ($text) {
    if ([string]::IsNullOrEmpty($text)) { return $text }
    # Često viđeni problemi s kodiranjem u ovim fajlovima
    $text = $text -replace '', 'Č' # Ovo je najčešće Č, ponekad Š ili Ć, no generalno rješava veliki dio, koristit ću regex za popravak temeljem konteksta ako je potrebno. Zasad ću probati sačuvati original i primijeniti jednostavne zamjene kasnije ako zatreba. U PowerShellu su česti problemi.
    return $text
}

foreach ($row in $allData) {
    $loc = $row.Location -replace '^\(MJESTO NIJE NAVEDENO\)$', 'Nepoznato'
    $loc = $loc -replace '^\(LOKACIJA NIJE NAVEDENA.*$', 'Nepoznato'
    $loc = $loc -replace '^\d+[a-z]?\.\s*', '' # Remove leading numbers from Popis 2
    
    # Clean some specific data issues like "A OTOK KRK" -> "OTOK KRK"
    $loc = $loc -replace '^A\s+OTOK\s+', 'OTOK '
    $loc = $loc -replace '^B\s+OTOK\s+', 'OTOK '
    $loc = $loc -replace '^A\s+VRBNIK', 'VRBNIK'
    $loc = $loc -replace '^B\s+VRBNIK', 'VRBNIK'
    
    $loc = $loc.Trim()
    
    if ($loc -eq '' -or $loc -eq 'Nepoznato' -or $loc -match 'NAPJEV') { continue }
    
    if (-not $locations.ContainsKey($loc)) {
        $locations[$loc] = [PSCustomObject]@{
            Location = $loc
            Occurrences = 1
            CDs = @()
            Sources = @($row.Source)
            Notes = @()
        }
        if ($row.CD) { $locations[$loc].CDs += $row.CD }
        if ($row.Notes) { $locations[$loc].Notes += $row.Notes }
    } else {
        $locations[$loc].Occurrences++
        if ($row.CD -and $row.CD -notin $locations[$loc].CDs) { $locations[$loc].CDs += $row.CD }
        if ($row.Source -notin $locations[$loc].Sources) { $locations[$loc].Sources += $row.Source }
        if ($row.Notes -and $row.Notes -notin $locations[$loc].Notes) { $locations[$loc].Notes += $row.Notes }
    }
}

$uniqueLocations = @()
foreach ($key in $locations.Keys) {
    $obj = $locations[$key]
    $uniqueLocations += [PSCustomObject]@{
        Name = $obj.Location
        Occurrences = $obj.Occurrences
        CDs = ($obj.CDs | Sort-Object { [int]$_ } -join ", ")
        Sources = ($obj.Sources | Sort-Object -join ", ")
        Notes = ($obj.Notes -join " | ")
    }
}

$uniqueLocations | Sort-Object Name | ConvertTo-Json -Depth 3 | Set-Content -Path "glagoljasko_pjevanje_lokacije.json" -Encoding UTF8
$uniqueLocations | Sort-Object Name | Export-Csv -Path "glagoljasko_pjevanje_lokacije.csv" -NoTypeInformation -Encoding UTF8

Write-Host "Ukupno jedinstvenih lokacija: $($uniqueLocations.Count)"
