[System.IO.File]::ReadAllLines("locations_extracted.csv", [System.Text.Encoding]::UTF8) | Select-Object -First 10
