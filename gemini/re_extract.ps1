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

[System.IO.File]::WriteAllLines("$pwd\Knjiga_1.txt", $k1, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllLines("$pwd\Knjiga_2.txt", $k2, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllLines("$pwd\Popis_1.txt", $p1, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllLines("$pwd\Popis_2.txt", $p2, [System.Text.Encoding]::UTF8)
