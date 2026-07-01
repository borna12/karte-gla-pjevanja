$allData = Import-Csv -Path "locations_extracted.csv" -Encoding UTF8
$locations = @{}

foreach ($row in $allData) {
    # Fix the mojibake issue from PowerShell standard output mapping
    $loc = $row.Location -replace '\x00', ''
    $loc = $loc -replace '', 'Č' 
    # Notice:  is U+FFFD (Replacement Character). We'll map it to Č since it's most common in these words (Brač, Baška, Omišalj)
    # Since we can't reliably guess if it's Č, Ć, Š or Ž we will replace known patterns.
    
    $loc = $loc -replace 'OMICČALJ', 'OMIŠALJ'
    $loc = $loc -replace 'OMIČALJ', 'OMIŠALJ'
    $loc = $loc -replace 'BAČKA', 'BAŠKA'
    $loc = $loc -replace 'KRČAN', 'KRŠAN'
    $loc = $loc -replace 'ŠKRIP', 'ŠKRIP'
    $loc = $loc -replace 'ČKRIP', 'ŠKRIP'
    $loc = $loc -replace 'DUBAČNICA', 'DUBAŠNICA'
    $loc = $loc -replace 'KUKLJICA', 'KUKLJICA'
    $loc = $loc -replace 'KUKULJICA', 'KUKLJICA'
    $loc = $loc -replace 'BRAČ', 'BRAČ'
    $loc = $loc -replace 'CČČ', 'Č'
    
    $loc = $loc -replace '^\(MJESTO NIJE NAVEDENO\)$', 'Nepoznato'
    $loc = $loc -replace '^\(LOKACIJA NIJE NAVEDENA.*$', 'Nepoznato'
    $loc = $loc -replace '^\d+[a-z]?\.\s*', '' 
    
    $loc = $loc -replace '^A\s+OTOK\s+', 'OTOK '
    $loc = $loc -replace '^B\s+OTOK\s+', 'OTOK '
    $loc = $loc -replace '^A\s+VRBNIK', 'VRBNIK'
    $loc = $loc -replace '^B\s+VRBNIK', 'VRBNIK'
    
    $loc = $loc.Trim()
    
    if ($loc -eq '' -or $loc -eq 'Nepoznato' -or $loc -match 'NAPJEV' -or $loc -eq 'Č' -or $loc -match '^\(MJESTO SNIMANJA NIJE NAVEDENO$') { continue }
    
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
    
    $sortedCDs = $obj.CDs | Sort-Object { [int]$_ }
    $cdString = $sortedCDs -join ", "
    
    $sortedSources = $obj.Sources | Sort-Object
    $sourceString = $sortedSources -join ", "
    
    $noteString = $obj.Notes -join " | "

    $uniqueLocations += [PSCustomObject]@{
        Name = $obj.Location
        Occurrences = $obj.Occurrences
        CDs = $cdString
        Sources = $sourceString
        Notes = $noteString
    }
}

$uniqueLocations = $uniqueLocations | Sort-Object Name
$uniqueLocations | ConvertTo-Json -Depth 3 | Set-Content -Path "glagoljasko_pjevanje_lokacije.json" -Encoding UTF8
$uniqueLocations | Export-Csv -Path "glagoljasko_pjevanje_lokacije.csv" -NoTypeInformation -Encoding UTF8

Write-Host "Ukupno jedinstvenih lokacija: $($uniqueLocations.Count)"
