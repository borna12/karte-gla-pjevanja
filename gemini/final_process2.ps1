$allData = New-Object System.Collections.ArrayList

function ParseKnjiga($file, $sourceName) {
    global $allData
    $lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
    $currentCD = ""
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match "^CD\s*(\d+)$") {
            $currentCD = $matches[1]
        } elseif ($line -notmatch "^KNJIGA" -and $line -match "^(.*)\s*\((.*?)\)$") {
            $location = $matches[1].Trim()
            $notes = $matches[2].Trim()
            $null = $allData.Add([PSCustomObject]@{
                Source = $sourceName
                CD = $currentCD
                Location = $location
                Notes = $notes
            })
        }
    }
}

function ParsePopis1($file) {
    global $allData
    $lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ($line -match "^CD\s*(\d+)\s+(.*)$") {
            $cd = $matches[1]
            $locations = $matches[2]
            foreach ($loc in ($locations -split ",")) {
                $null = $allData.Add([PSCustomObject]@{
                    Source = "Popis_1"
                    CD = $cd
                    Location = $loc.Trim()
                    Notes = ""
                })
            }
        }
    }
}

function ParsePopis2($file) {
    global $allData
    $lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -notmatch "^OTOK" -and $line -notmatch "^ŠIRE" -and $line -notmatch "PODRUČJE") {
            $loc = $line -replace '^\d+[a-z]?\.\s*', ''
            $null = $allData.Add([PSCustomObject]@{
                Source = "Popis_2"
                CD = ""
                Location = $loc.Trim()
                Notes = ""
            })
        }
    }
}

ParseKnjiga "$pwd\Knjiga_1.txt" "Knjiga_1"
ParseKnjiga "$pwd\Knjiga_2.txt" "Knjiga_2"
ParsePopis1 "$pwd\Popis_1.txt"
ParsePopis2 "$pwd\Popis_2.txt"

$locations = @{}

foreach ($row in $allData) {
    # Fix the missing letters
    $loc = $row.Location -replace '\x00|', 'Č'
    $loc = $loc -replace 'OMIČALJ', 'OMIŠALJ'
    $loc = $loc -replace 'BAČKA', 'BAŠKA'
    $loc = $loc -replace 'KRČAN', 'KRŠAN'
    $loc = $loc -replace 'ŠKRIP', 'ŠKRIP'
    $loc = $loc -replace 'ČKRIP', 'ŠKRIP'
    $loc = $loc -replace 'DUBAČNICA', 'DUBAŠNICA'
    $loc = $loc -replace 'KUKLJICA', 'KUKLJICA'
    $loc = $loc -replace 'KUKULJICA', 'KUKLJICA'
    
    $loc = $loc -replace '^\(MJESTO NIJE NAVEDENO\)$', 'Nepoznato'
    $loc = $loc -replace '^\(LOKACIJA NIJE NAVEDENA.*$', 'Nepoznato'
    
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
$json = $uniqueLocations | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText("$pwd\glagoljasko_pjevanje_lokacije.json", $json, [System.Text.Encoding]::UTF8)

# custom CSV format to bypass weird export-csv issues
$csv = @("Name,Occurrences,CDs,Sources,Notes")
foreach ($ul in $uniqueLocations) {
    $n = "`"$($ul.Name -replace '"', '""')`""
    $o = "`"$($ul.Occurrences)`""
    $c = "`"$($ul.CDs -replace '"', '""')`""
    $s = "`"$($ul.Sources -replace '"', '""')`""
    $no = "`"$($ul.Notes -replace '"', '""')`""
    $csv += "$n,$o,$c,$s,$no"
}
[System.IO.File]::WriteAllLines("$pwd\glagoljasko_pjevanje_lokacije.csv", $csv, [System.Text.Encoding]::UTF8)

Write-Host "Ukupno jedinstvenih lokacija: $($uniqueLocations.Count)"
