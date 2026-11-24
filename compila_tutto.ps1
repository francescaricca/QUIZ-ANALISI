# Eseguire dalla cartella del progetto: .\compila_tutto.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$tectonic = 'C:\Tools\Tectonic\tectonic.exe'
if (-not (Test-Path $tectonic)) {
    $found = Get-Command tectonic -ErrorAction SilentlyContinue
    if ($found) { $tectonic = $found.Source } else { throw 'Tectonic non trovato. Verifica C:\Tools\Tectonic\tectonic.exe' }
}
& $tectonic --keep-logs --keep-intermediates main.tex
if ($LASTEXITCODE -ne 0) { throw 'Compilazione main.tex non riuscita' }
& $tectonic --keep-logs --keep-intermediates soluzioni.tex
if ($LASTEXITCODE -ne 0) { throw 'Compilazione soluzioni.tex non riuscita' }
Write-Host 'Aggiornati main.pdf e soluzioni.pdf' -ForegroundColor Green
