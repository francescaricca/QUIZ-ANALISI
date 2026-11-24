ECOSISTEMA QUIZ ANALISI 1 — MORANDOTTI

CONTENUTO
- quiz/quiz_pagine_001_010.tex, 011_020.tex, 021_030.tex: sorgenti disponibili.
- build.py: legge tutti i quiz/quiz_pagine_*.tex, verifica il numero di alternative,
  produce quiz_bank.json (sito) e main.tex (eserciziario).
- index.html e app.js: sito, con caricamento AUTOMATICO di quiz_bank.json.
- main.pdf: PDF di prova compilato da LaTeX.
- AGGIORNA_SITO.ps1: rigenera e chiede conferma prima di commit/push.

INSTALLAZIONE IN VS CODE (UNA SOLA VOLTA)
1. Apri in VS Code la cartella LOCALE gia' collegata al repository GitHub.
2. Copia QUI dentro i file index.html, app.js, build.py, main.tex,
   quiz_bank.json, AGGIORNA_SITO.ps1 e l'intera cartella quiz/.
   NON sostituire la cartella .git.
3. Controlla in GitHub Settings > Pages che la pubblicazione usi la root
   del branch corretto (di norma main). La homepage e' index.html.
4. Apri terminale PowerShell in VS Code ed esegui:
   powershell -ExecutionPolicy Bypass -File .\AGGIORNA_SITO.ps1
   Il comando chiede SI prima di pubblicare.
5. Verifica il sito dopo la pubblicazione e fai Ctrl+F5 se necessario.

AGGIORNAMENTI SUCCESSIVI (OGNI BLOCCO DI 10 PAGINE)
1. Ricevi il nuovo file quiz_pagine_031_040.tex da ChatGPT.
2. Copialo nella cartella quiz/ del progetto VS Code.
3. Esegui AGGIORNA_SITO.ps1 e scrivi SI quando sei pronta.
4. Il sito carica da solo il nuovo archivio, senza importare manualmente i .tex.

METADATI PER QUIZ NEI .TEX
Dopo \\end{quiz} e prima del prossimo quiz:
% SOLUZIONE: B
% SPIEGAZIONE: $...$ ragionamento matematico.
% SEZIONE_AM1: 4.2
Per casi senza opzione corretta: % SOLUZIONE: nessuna

IMPORTANTI LIMITI DEL MATERIALE ESISTENTE
- 112 quiz rilevati (40+36+36). Le prime 40 domande non hanno spiegazioni
  matematiche nel sorgente disponibile: il sito le segnala come mancanti.
- Le sezioni non ancora indicate con % SEZIONE_AM1 sono SOLO PROPOSTE
  automaticamente: sono marcate 'da verificare' nell'archivio.
- Alcune risposte dei file 011_020 e 021_030 sono dubbie o mancanti;
  prima di considerare definitivo il database serve verifica sul PDF.
- Non si deve considerare una compilazione LaTeX prova di fedelta' al PDF.
- Il caricamento automatico del sito richiede HTTP(S) (GitHub Pages),
  non aprire index.html tramite file:// per provarlo.
- I progressi sono salvati nel browser: esporta il backup dal sito prima
  di cancellare dati di navigazione o cambiare dispositivo.

AGGIORNAMENTO PDF LOCALE (versione aggiornata):
- Installa MiKTeX e assicurati che pdflatex sia riconosciuto dal terminale VS Code.
- AGGIORNA_SITO.ps1 rigenera main.tex e compila main.pdf (due passate) PRIMA di chiedere SI.
- Se la compilazione fallisce, il sito NON viene pubblicato.
- main.pdf resta sul PC e viene escluso dal repository (anche se era gia tracciato).
- Se rispondi diversamente da SI, il PDF locale e gia aggiornato ma non viene eseguito il push.
- Le classificazioni automatiche marcate 'da verificare' NON sono equivalenti a una revisione matematica.
