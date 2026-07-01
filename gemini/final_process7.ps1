function Fix-DocxExtraction ($path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    $entry = $zip.GetEntry("word/document.xml")
    if (-not $entry) { Write-Host "No document.xml found"; return }
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    $xmlStr = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()

    $xml = [xml]$xmlStr
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

    $paragraphs = $xml.SelectNodes("//w:p", $ns)
    $out = @()
    foreach ($p in $paragraphs) {
        $texts = $p.SelectNodes(".//w:t", $ns)
        if ($texts) {
            $pText = ($texts | ForEach-Object { $_.InnerText }) -join ""
            $out += $pText
        }
    }
    return $out
}

$k1 = Fix-DocxExtraction "$pwd\TRADICIJSKO PUČKO CRKVENO PJEVANJE U FRANJEVAČKOJ PROVINCIJI PRESVETOGA OTKUPITELJA_ KNJIGA 1.docx"
$k2 = Fix-DocxExtraction "$pwd\KNJIGA 2_TRADICIJSKO PUČKO CRKVENO PJEVANJE U FRANJEVAČKOJ PROVINCIJI PRESVETOGA OTKUPITELJA.docx"
$p1 = Fix-DocxExtraction "$pwd\POPIS MJESTA SNIMANJA PO CD-u_Popisni list br. 1.docx"
$p2 = Fix-DocxExtraction "$pwd\Popis 2 (OTOCI BRAČ, HVAR, ŠOLTA i ŠIRE SPLITSKO PODRUČJE).docx"

$global:allData = New-Object System.Collections.ArrayList

function Remove-InvalidChars($text) {
    # Keep only letters, digits, spaces, parens, dash and croatian letters
    $clean = ""
    $chars = $text.ToCharArray()
    foreach ($c in $chars) {
        if ([char]::IsLetterOrDigit($c) -or [char]::IsWhiteSpace($c) -or $c -match '[\(\)\-\.,;:\/]') {
            $clean += $c
        }
    }
    return $clean
}

function DecodeCroatianMojibake($text) {
    $text = Remove-InvalidChars($text)
    
    $text = $text -replace 'BAGALOVI.*', 'BAGALOVIĆ'
    $text = $text -replace 'BAKA', 'BAŠKA'
    $text = $text -replace 'BOGOVII \(DUBANICA\)', 'BOGOVIĆI (DUBAŠNICA)'
    $text = $text -replace 'BOGOVII', 'BOGOVIĆI'
    $text = $text -replace 'DUBANICA', 'DUBAŠNICA'
    $text = $text -replace 'ARA', 'ČARA'
    $text = $text -replace 'RAIE', 'RAČIŠĆE'
    $text = $text -replace 'VRLJEVO', 'ČVRLJEVO'
    $text = $text -replace 'APLJINA', 'ČAPLJINA'
    $text = $text -replace 'DRANICE', 'DRAŠNICE'
    $text = $text -replace 'DUE - ROGA', 'DUĆE - ROGAČ'
    $text = $text -replace 'GORNJE SELO \(OTOK OLTA\)', 'GORNJE SELO (OTOK ŠOLTA)'
    $text = $text -replace 'KATEL', 'KAŠTEL'
    $text = $text -replace 'LUKI', 'LUKŠIĆ'
    $text = $text -replace 'SUURAC', 'SUĆURAC'
    $text = $text -replace 'TAFILI', 'ŠTAFILIĆ'
    $text = $text -replace 'KATELA', 'KAŠTELA'
    $text = $text -replace 'KREEVO', 'KREŠEVO'
    $text = $text -replace 'KOMIA', 'KOMIŽA'
    $text = $text -replace 'KORULA', 'KORČULA'
    $text = $text -replace 'LANIE', 'LANIŠĆE'
    $text = $text -replace 'LIANE OSTROVIKE', 'LIŠANE OSTROVIČKE'
    $text = $text -replace 'LOKVIII', 'LOKVIČIĆI'
    $text = $text -replace 'METKOVI.*', 'METKOVIĆ'
    $text = $text -replace 'MIRLOVI.*', 'MIRLOVIĆ'
    $text = $text -replace 'NEREIA', 'NEREŽIŠĆA'
    $text = $text -replace 'OMIALJ', 'OMIŠALJ'
    $text = $text -replace 'PRVI', 'PRVIĆ'
    $text = $text -replace 'EPURINE', 'ŠEPURINE'
    $text = $text -replace 'PELJEAC', 'PELJEŠAC'
    $text = $text -replace 'PETRANE', 'PETRČANE'
    $text = $text -replace 'PLOE', 'PLOČE'
    $text = $text -replace 'PRANICE', 'PRAŽNICE'
    $text = $text -replace 'PROLOAC', 'PROLOŽAC'
    $text = $text -replace 'PUIA', 'PUČIŠĆA'
    $text = $text -replace 'RADOI', 'RADOŠIĆ'
    $text = $text -replace 'RIICE', 'RIČICE'
    $text = $text -replace 'RUNOVII', 'RUNOVIĆI'
    $text = $text -replace 'RUNOVI.*', 'RUNOVIĆ'
    $text = $text -replace 'SUKOAN', 'SUKOŠAN'
    $text = $text -replace 'SVIRE', 'SVIRČE'
    $text = $text -replace 'KRIP', 'ŠKRIP'
    $text = $text -replace 'VELI VARO.*', 'VELI VAROŠ'
    $text = $text -replace 'ZADARSKO ZALEE', 'ZADARSKO ZALEĐE'
    $text = $text -replace 'IVOGOE', 'ŽIVOGOŠĆE'
    $text = $text -replace 'RNOVO', 'ŽRNOVO'
    $text = $text -replace 'UPA', 'ŽUPA'
    $text = $text -replace 'SKRPII', 'SKRPČIĆI'
    $text = $text -replace 'PRIMOTEN', 'PRIMOŠTEN'
    return $text
}

function ParseKnjiga($lines, $sourceName) {
    $currentCD = ""
    foreach ($line in $lines) {
        $line = DecodeCroatianMojibake($line.Trim())
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match "^CD\s*(\d+)$") {
            $currentCD = $matches[1]
        } elseif ($line -notmatch "^KNJIGA" -and $line -match "^(.*)\s*\((.*?)\)$") {
            $location = $matches[1].Trim()
            $notes = $matches[2].Trim()
            $null = $global:allData.Add([PSCustomObject]@{
                Source = $sourceName
                CD = $currentCD
                Location = $location
                Notes = $notes
            })
        }
    }
}

function ParsePopis1($lines) {
    foreach ($line in $lines) {
        $line = DecodeCroatianMojibake($line.Trim())
        if ($line -match "^CD\s*(\d+)\s+(.*)$") {
            $cd = $matches[1]
            $locations = $matches[2]
            foreach ($loc in ($locations -split ",")) {
                $null = $global:allData.Add([PSCustomObject]@{
                    Source = "Popis_1"
                    CD = $cd
                    Location = $loc.Trim()
                    Notes = ""
                })
            }
        }
    }
}

function ParsePopis2($lines) {
    foreach ($line in $lines) {
        $line = DecodeCroatianMojibake($line.Trim())
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -notmatch "^OTOK" -and $line -notmatch "^IRE" -and $line -notmatch "PODRUJE") {
            $loc = $line -replace '^\d+[a-z]?\.\s*', ''
            $null = $global:allData.Add([PSCustomObject]@{
                Source = "Popis_2"
                CD = ""
                Location = $loc.Trim()
                Notes = ""
            })
        }
    }
}

ParseKnjiga $k1 "Knjiga_1"
ParseKnjiga $k2 "Knjiga_2"
ParsePopis1 $p1
ParsePopis2 $p2

$locations = @{}

foreach ($row in $global:allData) {
    $loc = $row.Location
    
    $loc = $loc -replace '^\(MJESTO NIJE NAVEDENO\)$', 'Nepoznato'
    $loc = $loc -replace '^\(LOKACIJA NIJE NAVEDENA.*$', 'Nepoznato'
    $loc = $loc -replace '^\(MJESTO SNIMANJA NIJE NAVEDENO\)$', 'Nepoznato'
    $loc = $loc -replace '^\(MJESTO SNIMANJA NIJE NAVEDENO$', 'Nepoznato'
    
    $loc = $loc -replace '^A\s+OTOK\s+', 'OTOK '
    $loc = $loc -replace '^B\s+OTOK\s+', 'OTOK '
    $loc = $loc -replace '^A\s+VRBNIK', 'VRBNIK'
    $loc = $loc -replace '^B\s+VRBNIK', 'VRBNIK'
    $loc = $loc -replace '^C\s+VRBNIK', 'VRBNIK'
    
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

# Ensure standard ascii strings by removing croatian special mapping fallback for CSV to be readable in excel
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

# Output JSON
$json = $uniqueLocations | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllLines("$pwd\glagoljasko_pjevanje_lokacije.json", $json, [System.Text.Encoding]::UTF8)

Write-Host "Ukupno jedinstvenih lokacija: $($uniqueLocations.Count)"
