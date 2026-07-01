$books = @("Knjiga_1", "Knjiga_2", "Popis_1", "Popis_2")
$allData = @()

foreach ($book in $books) {
    $file = "${book}.txt"
    if (Test-Path $file) {
        $content = Get-Content $file -Encoding UTF8
        $currentCD = ""
        
        foreach ($line in $content) {
            $line = $line.Trim()
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            
            if ($book -eq "Knjiga_1" -or $book -eq "Knjiga_2") {
                if ($line -match "^CD\s*(\d+)$") {
                    $currentCD = $matches[1]
                } elseif ($line -notmatch "^KNJIGA" -and $line -match "^(.*)\s*\((.*?)\)$") {
                    $location = $matches[1].Trim()
                    $notes = $matches[2].Trim()
                    $allData += [PSCustomObject]@{
                        Source = $book
                        CD = $currentCD
                        Location = $location
                        Notes = $notes
                        Raw = $line
                    }
                }
            } elseif ($book -eq "Popis_1") {
                if ($line -match "^CD\s*(\d+)\s+(.*)$") {
                    $cd = $matches[1]
                    $locations = $matches[2]
                    foreach ($loc in ($locations -split ",")) {
                        $allData += [PSCustomObject]@{
                            Source = $book
                            CD = $cd
                            Location = $loc.Trim()
                            Notes = ""
                            Raw = $line
                        }
                    }
                }
            } elseif ($book -eq "Popis_2") {
                if ($line -notmatch "^OTOK" -and $line -notmatch "^ŠIRE" -and $line -notmatch "PODRUČJE") {
                    $allData += [PSCustomObject]@{
                        Source = $book
                        CD = ""
                        Location = $line -replace '^\d+[a-z]?\.\s*', ''
                        Notes = ""
                        Raw = $line
                    }
                }
            }
        }
    }
}

$allData | Export-Csv -Path "locations_extracted.csv" -NoTypeInformation -Encoding UTF8
