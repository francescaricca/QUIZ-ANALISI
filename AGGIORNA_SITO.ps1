$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# ============================================================
# 1. GENERAZIONE ARCHIVIO QUIZ
# ============================================================

Write-Host "`n[1/5] Verifica e rigenerazione archivio quiz..." -ForegroundColor Cyan

python build.py

if ($LASTEXITCODE -ne 0) {
    throw 'Build non riuscita. Nessun aggiornamento pubblicato.'
}

# ============================================================
# 2. COMPILAZIONE PDF PERSONALE
# ============================================================

Write-Host "`n[2/5] Compilazione PDF personale main.pdf..." -ForegroundColor Cyan

$latex = Get-Command pdflatex -ErrorAction SilentlyContinue

if (-not $latex) {
    throw 'pdflatex non trovato. Installa MiKTeX e riavvia VS Code.'
}

# Evita che gli avvisi di MiKTeX blocchino PowerShell.
# L'output viene salvato nel file compilazione.log.
# Il codice di uscita di pdflatex viene comunque controllato.

$latexArgs = @(
    '-interaction=nonstopmode'
    '-halt-on-error'
    '-output-directory'
    '.'
    'main.tex'
)

for ($i = 1; $i -le 2; $i++) {

    Write-Host "Compilazione LaTeX $i/2..." -ForegroundColor Yellow

    $process = Start-Process `
        -FilePath $latex.Source `
        -ArgumentList $latexArgs `
        -WorkingDirectory $PSScriptRoot `
        -RedirectStandardOutput "compilazione_stdout_$i.log" `
        -RedirectStandardError "compilazione_stderr_$i.log" `
        -Wait `
        -PassThru `
        -NoNewWindow

    if ($process.ExitCode -ne 0) {
        throw "Compilazione LaTeX fallita al passaggio $i. Controlla main.log e compilazione_stderr_$i.log."
    }
}

if (-not (Test-Path 'main.pdf')) {
    throw 'Il file main.pdf non e stato generato. Pubblicazione bloccata.'
}

$pdf = Get-Item 'main.pdf'

Write-Host "PDF aggiornato correttamente: $($pdf.FullName)" -ForegroundColor Green

# ============================================================
# 3. CONTROLLO JAVASCRIPT
# ============================================================

Write-Host "`n[3/5] Controllo sintassi JavaScript..." -ForegroundColor Cyan

$node = Get-Command node -ErrorAction SilentlyContinue

if (-not $node) {
    throw 'Node.js non trovato. Installa Node.js per verificare app.js.'
}

node --check app.js

if ($LASTEXITCODE -ne 0) {
    throw 'Errore JavaScript. Pubblicazione bloccata.'
}

Write-Host 'Controllo JavaScript superato.' -ForegroundColor Green

# ============================================================
# 4. CONFERMA PUBBLICAZIONE
# ============================================================

Write-Host "`n[4/5] Generazione completata!" -ForegroundColor Green

Write-Host ''
Write-Host 'RIEPILOGO:' -ForegroundColor Yellow
Write-Host '- Quiz elaborati e archivio JSON aggiornato.'
Write-Host '- main.tex rigenerato.'
Write-Host '- main.pdf compilato e salvato sul PC.'
Write-Host '- Sintassi JavaScript verificata.'
Write-Host '- Nessun file ancora pubblicato in questa esecuzione.'
Write-Host ''

$ok = Read-Host 'Vuoi pubblicare ORA il sito su GitHub? Scrivi SI per confermare'

if ($ok -cne 'SI') {
    Write-Host "`nPubblicazione annullata. Il PDF locale rimane aggiornato." -ForegroundColor Yellow
    exit 0
}

# ============================================================
# 5. PUBBLICAZIONE GITHUB
# ============================================================

Write-Host "`n[5/5] Pubblicazione su GitHub..." -ForegroundColor Cyan

$git = Get-Command git -ErrorAction SilentlyContinue

if (-not $git) {
    throw 'Git non trovato.'
}

git rev-parse --is-inside-work-tree | Out-Null

if ($LASTEXITCODE -ne 0) {
    throw 'La cartella corrente non e collegata a un repository Git.'
}

# Aggiunge solo i file necessari al progetto.
# main.pdf e i log NON vengono aggiunti.

$filesToAdd = @(
    'app.js'
    'index.html'
    'build.py'
    'main.tex'
    'quiz_bank.json'
    'quiz'
    'AGGIORNA_SITO.ps1'
)

foreach ($file in $filesToAdd) {
    if (Test-Path $file) {
        git add -- $file

        if ($LASTEXITCODE -ne 0) {
            throw "Errore Git durante l'aggiunta di $file."
        }
    }
}

# Se il PDF era gia tracciato, lo rimuove dall'indice Git
# senza cancellare il file locale.

git rm --cached --ignore-unmatch -- main.pdf | Out-Null

if ($LASTEXITCODE -ne 0) {
    throw 'Errore durante la rimozione del PDF dall indice Git.'
}

# Controlla se ci sono modifiche da pubblicare.

$changes = git diff --cached --name-only

if (-not $changes) {
    Write-Host 'Nessuna modifica da pubblicare. Il sito e gia aggiornato.' -ForegroundColor Green
    exit 0
}

Write-Host "`nFile che verranno pubblicati:" -ForegroundColor Yellow
$changes | ForEach-Object { Write-Host " - $_" }

git commit -m 'Aggiorna quiz Analisi 1 e archivio del sito'

if ($LASTEXITCODE -ne 0) {
    throw 'Commit Git fallito.'
}

git push

if ($LASTEXITCODE -ne 0) {
    throw 'Push Git fallito. Controlla la connessione o autenticazione.'
}

Write-Host ''
Write-Host '============================================' -ForegroundColor Green
Write-Host ' AGGIORNAMENTO COMPLETATO!' -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Sito pubblicato su GitHub.' -ForegroundColor Green
Write-Host 'PDF personale aggiornato sul computer.' -ForegroundColor Green