// ============================================================
// ANALISI 1 — QUIZ
// ============================================================

const CHAPTERS = [
  ['1', 'Concetti di base', [
    ['1.1', 'Insiemi'],
    ['1.2', 'Logica delle proposizioni e dei predicati'],
    ['1.3', 'Relazioni'],
    ['1.4', 'Funzioni'],
    ['1.5', 'Insiemi numerici'],
    ['1.6', 'Il principio di induzione']
  ]],

  ['2', 'Successioni', [
    ['2.1', 'Successioni reali e loro proprietà'],
    ['2.2', 'Limiti di successioni']
  ]],

  ['3', 'Funzioni reali di variabile reale: limiti e continuità', [
    ['3.1', 'Definizioni e prime proprietà. Limiti'],
    ['3.2', 'Continuità di una funzione'],
    ['3.3', 'La continuità uniforme'],
    ['3.4', 'Confronto tra funzioni: infinitesimi e infiniti']
  ]],

  ['4', 'Calcolo differenziale', [
    ['4.1', 'Derivate'],
    ['4.2', 'I teoremi fondamentali del calcolo differenziale'],
    ['4.3', 'Proprietà delle funzioni: monotonia e punti estremali'],
    ['4.4', 'Lo studio di funzione']
  ]],

  ['5', 'Integrazione', [
    ['5.1', 'L’integrale di Riemann'],
    ['5.2', 'Proprietà dell’integrale'],
    ['5.3', 'Integrali indefiniti e regole di integrazione'],
    ['5.4', 'Tecniche di integrazione'],
    ['5.5', 'Integrali impropri'],
    ['5.6', 'Alcune applicazioni degli integrali'],
    ['5.7', 'Alcuni esercizi svolti e alcuni da svolgere']
  ]],

  ['6', 'Introduzione alle equazioni differenziali ordinarie', [
    ['6.1', 'Metodi risolutivi di alcune equazioni differenziali ordinarie'],
    ['6.2', 'Buona positura del problema di Cauchy'],
    ['6.3', 'Studi qualitativi']
  ]],

  ['7', 'Approfondimenti', [
    ['7.1', 'Concetti di base'],
    ['7.2', 'Successioni'],
    ['7.3', 'Funzioni reali di variabile reale'],
    ['7.4', 'Calcolo differenziale'],
    ['7.5', 'Integrazione'],
    ['7.6', 'Equazioni differenziali ordinarie']
  ]]
];

const $ = id => document.getElementById(id);

const KEY = 'am1_v3_bank';
const PK = 'am1_v3_progress';

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn('Errore lettura dati:', error);
    return fallback;
  }
}

let bank = load(KEY, []);
let progress = load(PK, {});

let pending = [];
let queue = [];
let idx = 0;
let selected = -1;
let graded = false;
let sessionName = '';
let sessionStates = [];

const errorNotes = load('am1_error_notes', {});
const errorHistory = load('am1_error_history', {});

// ============================================================
// SALVATAGGIO
// ============================================================

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(bank));
    localStorage.setItem(PK, JSON.stringify(progress));
    return true;
  } catch (error) {
    console.error('Impossibile salvare:', error);

    const status = $('status');

    if (status) {
      status.textContent =
        'Attenzione: memoria del browser piena o non disponibile. ' +
        'Esporta un backup dei quiz.';
    }

    return false;
  }
}

function saveErrors() {
  try {
    localStorage.setItem(
      'am1_error_notes',
      JSON.stringify(errorNotes)
    );

    localStorage.setItem(
      'am1_error_history',
      JSON.stringify(errorHistory)
    );

    return true;
  } catch (error) {
    console.error('Errore salvataggio errori:', error);
    return false;
  }
}

function day(n = 0) {
  const d = new Date();

  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${date}`;
}

function due(q) {
  return progress[q.id]?.attempts > 0 &&
         progress[q.id]?.due <= day();
}

// ============================================================
// CORREZIONE TESTO E FORMULE
// ============================================================

function cleanApostrophes(value) {
  return String(value ?? '')
    .replace(/\\`e\b/g, 'è')
    .replace(/\\'e\b/g, 'è')
    .replace(/\\`a\b/g, 'à')
    .replace(/\\'a\b/g, 'à')
    .replace(/\\`i\b/g, 'ì')
    .replace(/\\`o\b/g, 'ò')
    .replace(/\\`u\b/g, 'ù')
    .replace(/\\(?=['’])/g, '');
}

function mathText(value) {
  let text = cleanApostrophes(value);

  // Converte $formula$ in \(formula\).
  // MathJax riconosce normalmente \( ... \).

  text = text.replace(
    /(?<!\\)\$([^$\n]+)\$/g,
    (_, formula) => '\\(' + formula + '\\)'
  );

  return text;
}

function texClean(value) {
  return cleanApostrophes(
    String(value ?? '')
      .trim()
      .replace(
        /\\(?:par|smallskip|medskip|noindent)\b/g,
        ' '
      )
  );
}

// ============================================================
// MATHJAX
// ============================================================

let mathJaxLoading = null;
let mathJaxQueue = Promise.resolve();

function ensureMathJax() {
  if (window.MathJax?.typesetPromise) {
    return Promise.resolve();
  }

  if (mathJaxLoading) {
    return mathJaxLoading;
  }

  mathJaxLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');

    script.src =
      'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';

    script.async = true;

    script.onload = resolve;
    script.onerror = reject;

    // Se MathJax non è già presente, lo carichiamo.
    // Manteniamo i delimitatori standard \( ... \).

    document.head.appendChild(script);
  });

  return mathJaxLoading;
}

function typeset() {
  mathJaxQueue = mathJaxQueue
    .catch(() => {})
    .then(async () => {
      try {
        await ensureMathJax();

        if (window.MathJax?.startup?.promise) {
          await window.MathJax.startup.promise;
        }

        if (window.MathJax?.typesetPromise) {
          await window.MathJax.typesetPromise();
        }
      } catch (error) {
        console.warn('Errore visualizzazione formule:', error);
      }
    });

  return mathJaxQueue;
}

// ============================================================
// STILE LEGGIBILE
// ============================================================

function installReadableStyles() {
  if (document.getElementById('am1-readable-fix')) {
    return;
  }

  const style = document.createElement('style');

  style.id = 'am1-readable-fix';

  style.textContent = `
    #options .option {
      text-align: left !important;
      line-height: 1.7 !important;
      opacity: 1 !important;
    }

    #options .option:disabled {
      opacity: 1 !important;
      color: #253044 !important;
      -webkit-text-fill-color: #253044 !important;
      cursor: default !important;
    }

    #options .option.correct,
    #options .option.correct:disabled {
      background: #e8f5e9 !important;
      border: 2px solid #43a047 !important;
      color: #173b20 !important;
      -webkit-text-fill-color: #173b20 !important;
      opacity: 1 !important;
    }

    #options .option.wrong,
    #options .option.wrong:disabled {
      background: #ffebee !important;
      border: 2px solid #e57373 !important;
      color: #641c1c !important;
      -webkit-text-fill-color: #641c1c !important;
      opacity: 1 !important;
    }

    #options .option mjx-container {
      color: inherit !important;
      opacity: 1 !important;
    }

    #question {
      line-height: 1.8 !important;
    }

    #correction textarea {
      width: 100%;
      min-height: 110px;
      box-sizing: border-box;
    }

    #feedback {
      font-weight: 600;
    }
  `;

  document.head.appendChild(style);
}

// ============================================================
// CLASSIFICAZIONE AUTOMATICA
// ============================================================

function classify(question) {
  const s = String(question).toLowerCase();

  const rules = [
    [
      '6.1',
      /equazion.{0,30}differenzial|problema di cauchy|y''|y'''/
    ],
    [
      '5.5',
      /integral.{0,15}impropr|\\int.{0,35}infty/
    ],
    [
      '5.4',
      /\\int|integral|primitiv/
    ],
    [
      '4.4',
      /asintot|studio di funzione/
    ],
    [
      '4.3',
      /massim|minim|monoton|estrem|zeri della funzione/
    ],
    [
      '4.1',
      /derivat|f'|\\frac\{d|tangente/
    ],
    [
      '3.4',
      /infinitesim|equivalent|parte principale|\\sim/
    ],
    [
      '2.2',
      /\\lim_\{?n|succession.*limit/
    ],
    [
      '3.1',
      /\\lim|limite/
    ],
    [
      '3.2',
      /continu|discontinu/
    ],
    [
      '1.5',
      /numeri compless|\\overline|insieme|\\mathbb|suprem|infim/
    ],
    [
      '1.4',
      /funzion|invers/
    ]
  ];

  return (
    rules.find(([id, regex]) => regex.test(s)) ||
    ['1.4']
  )[0];
}

// ============================================================
// LETTURA FILE LATEX
// ============================================================

function parseTex(raw, filename) {
  const noComments = raw.replace(
    /(^|[^\\])%[^\r\n]*/gm,
    '$1'
  );

  const answers = new Map();

  for (const match of noComments.matchAll(
    /\\registraSoluzione\s*\{\s*(\d+)\s*\}\s*\{\s*([A-Ea-e])\s*\}/g
  )) {
    answers.set(
      Number(match[1]),
      match[2].toUpperCase().charCodeAt(0) - 65
    );
  }

  const rawBlocks = [
    ...raw.matchAll(
      /\\begin\{quiz\}([\s\S]*?)\\end\{quiz\}/g
    )
  ];

  const pageMarkers = [
    ...raw.matchAll(
      /Pag\.\s*originale\s*(\d+)\s*\/\s*\d+/gi
    )
  ].map(match => ({
    offset: match.index,
    page: Number(match[1])
  }));

  const result = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];

    const body = block[1];

    const enumeration = body.match(
      /\\begin\{enumerate\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{enumerate\}/
    );

    if (!enumeration) {
      continue;
    }

    const question = texClean(
      body.slice(0, enumeration.index)
    );

    const options = enumeration[1]
      .split(/\\item(?:\s*\[[^\]]*\])?/)
      .slice(1)
      .map(texClean);

    if (
      !question ||
      options.length < 2 ||
      options.some(option => !option)
    ) {
      continue;
    }

    const rawEnd = block.index + block[0].length;

    const rawNext =
      rawBlocks[i + 1]?.index ?? raw.length;

    const comments = raw.slice(rawEnd, rawNext);

    const solution = (
      comments.match(
        /^% SOLUZIONE:\s*([A-Ea-e])\s*$/m
      ) || []
    )[1];

    const section = (
      comments.match(
        /^% SEZIONE_AM1:\s*(\d+\.\d+)\s*$/m
      ) || []
    )[1];

    const page = pageMarkers
      .filter(marker => marker.offset < block.index)
      .slice(-1)[0]?.page || null;

    const correct = answers.get(i + 1);

    result.push({
      id:
        filename.replace(/\.tex$/i, '') +
        '_' +
        String(i + 1).padStart(3, '0'),

      question,
      options,

      correct: solution
        ? solution.toUpperCase().charCodeAt(0) - 65
        : correct === undefined
          ? null
          : correct,

      section: section || classify(question),
      source: filename,
      page
    });
  }

  return {
    result,
    blocks: rawBlocks.length,
    solutions: answers.size
  };
}

// ============================================================
// IMPORTAZIONE QUIZ
// ============================================================

function importBank(items) {
  if (!Array.isArray(items)) {
    throw new Error('Formato JSON non valido');
  }

  const validSections = new Set(
    CHAPTERS.flatMap(chapter =>
      chapter[2].map(section => section[0])
    )
  );

  const map = new Map(
    bank.map(quiz => [String(quiz.id), quiz])
  );

  let imported = 0;

  for (const original of items) {
    if (
      !original ||
      original.id === undefined ||
      original.id === null ||
      typeof original.question !== 'string' ||
      !Array.isArray(original.options) ||
      original.options.length < 2
    ) {
      console.warn('Quiz non valido:', original);
      continue;
    }

    const quiz = {
      ...original,
      id: String(original.id),
      question: cleanApostrophes(original.question),
      options: original.options.map(cleanApostrophes),

      section: validSections.has(original.section)
        ? original.section
        : classify(original.question)
    };

    // Le spiegazioni automatiche non sono utilizzate.
    delete quiz.explanation;

    map.set(quiz.id, quiz);

    imported++;
  }

  // Mantiene i quiz precedenti.
  bank = [...map.values()];

  refreshUniqueBank();
  save();
  saveErrors();
  render();

  return imported;
}

// ============================================================
// VISTA UNICA E STATISTICHE (archivio originale intatto)
// ============================================================
const STATS_KEY = 'am1_stats_v1';
let stats = load(STATS_KEY, {sessions: [], attempts: []});
if (!Array.isArray(stats.sessions)) stats.sessions = [];
if (!Array.isArray(stats.attempts)) stats.attempts = [];
let activeSession = null;
let canonicalById = new Map();
let uniqueQuizBank = [];
let duplicateWarnings = 0;

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function answerText(q) {
  return Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length
    ? normalizedText(q.options[q.correct]) : null;
}
function refreshUniqueBank() {
  const groups = new Map();
  canonicalById = new Map();
  uniqueQuizBank = [];
  duplicateWarnings = 0;
  for (const q of bank) {
    // Le alternative possono avere un ordine differente; il testo della soluzione deve coincidere.
    const key = JSON.stringify([q.section, normalizedText(q.question),
      q.options.map(normalizedText).sort()]);
    const previous = groups.get(key);
    if (previous && answerText(previous) === answerText(q)) {
      canonicalById.set(q.id, previous.id);
    } else if (previous) {
      // Non nascondere quiz con chiavi discordanti.
      duplicateWarnings++;
      canonicalById.set(q.id, q.id);
      uniqueQuizBank.push(q);
    } else {
      groups.set(key, q);
      canonicalById.set(q.id, q.id);
      uniqueQuizBank.push(q);
    }
  }
  // Migrazione non distruttiva: non cancelliamo i vecchi record dei duplicati.
  // La vista usa il progresso aggregato, scegliendo il massimo storico noto.
  for (const q of bank) {
    const canonical = canonicalById.get(q.id);
    if (canonical === q.id || !progress[q.id]) continue;
    const old = progress[q.id];
    const current = progress[canonical] || {};
    progress[canonical] = {
      ...current,
      attempts: Math.max(current.attempts || 0, old.attempts || 0),
      correct: Math.max(current.correct || 0, old.correct || 0),
      hard: !!(current.hard || old.hard),
      streak: Math.max(current.streak || 0, old.streak || 0)
    };
    const e = errorHistory[q.id];
    if (e) {
      const c = errorHistory[canonical] || {};
      errorHistory[canonical] = {
        ...c, wrong: Math.max(c.wrong || 0, e.wrong || 0),
        lastWrong: [c.lastWrong || '', e.lastWrong || ''].sort().pop(),
        recoveryDays: c.recoveryDays || e.recoveryDays || [],
        recovered: !!(c.recovered && e.recovered)
      };
    }
    if (!errorNotes[canonical] && errorNotes[q.id]) errorNotes[canonical] = errorNotes[q.id];
  }
}
function visibleBank() { return uniqueQuizBank; }
function isUnresolved(q) {
  const h = errorHistory[q.id];
  return !!(h && h.wrong > 0 && !h.recovered);
}
function recordResult(q, outcome) {
  const today = day();
  const h = errorHistory[q.id] || {wrong: 0, recoveryDays: [], recovered: false};
  if (outcome === 'wrong' || outcome === 'unsure') {
    if (outcome === 'wrong') h.wrong = (h.wrong || 0) + 1;
    else h.wrong = Math.max(1, h.wrong || 0);
    h.lastWrong = today;
    h.recoveryDays = [];
    h.recovered = false;
  } else if (outcome === 'correct' && h.wrong && !h.recovered) {
    if (!Array.isArray(h.recoveryDays)) h.recoveryDays = [];
    if (today > (h.lastWrong || '') && !h.recoveryDays.includes(today)) {
      h.recoveryDays.push(today);
      if (h.recoveryDays.length >= 2) h.recovered = true;
    }
  }
  errorHistory[q.id] = h;
  if (activeSession) {
    activeSession.results.push({id:q.id, section:q.section, outcome, at:new Date().toISOString()});
  }
  stats.attempts.push({id:q.id, section:q.section, outcome, at:new Date().toISOString()});
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  saveErrors();
}
function finishSession(showSummary = true) {
  if (!activeSession) return;
  const results = activeSession.results;
  const good = results.filter(r => r.outcome === 'correct').length;
  const bad = results.filter(r => r.outcome === 'wrong').length;
  const total = good + bad;
  const summary = {...activeSession, ended:new Date().toISOString(), correct:good, wrong:bad,
    percentage:total ? Math.round(1000 * good / total) / 10 : null};
  stats.sessions.push(summary);
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  activeSession = null;
  if (showSummary) {
    alert('Sessione terminata\nRisposte corrette: ' + good + '\nErrori: ' + bad +
      '\nPercentuale corrette: ' + (summary.percentage === null ? '—' : summary.percentage + '%') +
      '\nRisposte non sicure/non valutabili: ' + (results.length - total));
  }
  render();
}
function updateStatsPanel() {
  const box = $('statsPanel');
  if (!box) return;
  const qs = visibleBank();
  const total = stats.attempts.filter(x => x.outcome === 'correct' || x.outcome === 'wrong');
  const good = total.filter(x => x.outcome === 'correct').length;
  const rate = total.length ? (100 * good / total.length).toFixed(1) + '%' : '—';
  const last = stats.sessions.at(-1);
  const sections = [...new Set(qs.map(q => q.section))].sort();
  const lines = sections.map(section => {
    const entries = total.filter(x => x.section === section);
    if (!entries.length) return '';
    const ok = entries.filter(x => x.outcome === 'correct').length;
    return '<tr><td>' + section + '</td><td>' + entries.length + '</td><td>' +
      (100 * ok / entries.length).toFixed(1) + '%</td><td>' +
      qs.filter(q => q.section === section && isUnresolved(q)).length + '</td></tr>';
  }).join('');
  box.innerHTML = '<h2>📊 Le mie statistiche</h2><p><strong>Risposte corrette:</strong> ' + rate +
    ' · <strong>Errori:</strong> ' + (total.length ? (100 * (total.length-good)/total.length).toFixed(1) + '%' : '—') +
    ' · <strong>Da recuperare:</strong> ' + qs.filter(isUnresolved).length +
    '</p><p><strong>Ultima sessione:</strong> ' + (last ? (last.percentage === null ? 'Nessuna risposta valutabile' : last.percentage + '% corrette') : 'Nessuna sessione conclusa') +
    ' · <strong>Quiz unici:</strong> ' + qs.length + ' su ' + bank.length +
    ' originali</p><div style="overflow-x:auto"><table class="stats-table"><thead><tr><th>Sezione</th><th>Tentativi</th><th>Corrette</th><th>Errori aperti</th></tr></thead><tbody>' +
    lines + '</tbody></table></div>';
}
// Ripristino della sessione precedente, se il browser era stato chiuso.
const interrupted = load('am1_active_session_v1', null);
if (interrupted && Array.isArray(interrupted.results)) {
  stats.sessions.push({...interrupted, ended:new Date().toISOString(), interrupted:true,
    correct:interrupted.results.filter(r => r.outcome === 'correct').length,
    wrong:interrupted.results.filter(r => r.outcome === 'wrong').length,
    percentage:(() => {const c=interrupted.results.filter(r=>r.outcome==='correct').length;
      const w=interrupted.results.filter(r=>r.outcome==='wrong').length;
      return c+w ? Math.round(1000*c/(c+w))/10 : null;})()});
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  localStorage.removeItem('am1_active_session_v1');
}
function persistActiveSession() {
  if (activeSession) localStorage.setItem('am1_active_session_v1', JSON.stringify(activeSession));
  else localStorage.removeItem('am1_active_session_v1');
}

// ============================================================
// DASHBOARD
// ============================================================

function render() {
  const attempted = visibleBank().filter(
    quiz => progress[quiz.id]?.attempts > 0
  );

  const attempts = attempted.reduce(
    (total, quiz) =>
      total + progress[quiz.id].attempts,
    0
  );

  const correct = attempted.reduce(
    (total, quiz) =>
      total + progress[quiz.id].correct,
    0
  );

  $('total').textContent = visibleBank().length;

  $('done').textContent = attempted.length;

  $('due').textContent = visibleBank().filter(due).length;

  $('accuracy').textContent = attempts
    ? Math.round(100 * correct / attempts) + '%'
    : '—';

  $('review').disabled = !visibleBank().some(due);

  $('simulateAll').disabled = !visibleBank().length;

  $('simulateWrong').disabled = !visibleBank().some(
    quiz => isUnresolved(quiz)
  );

  $('errorCount').textContent =
    visibleBank().filter(quiz =>
      isUnresolved(quiz) ||
      (errorNotes[quiz.id] || '').trim()
    ).length + ' domande da rivedere';

  $('chapters').replaceChildren();
  updateStatsPanel();

  for (const [id, title, sections] of CHAPTERS) {
    const group = document.createElement('div');

    const head = document.createElement('div');

    head.className = 'chapter';

    const chapterCount = visibleBank().filter(
      quiz => quiz.section.startsWith(id + '.')
    ).length;

    head.textContent =
      id + '. ' + title + ' (' + chapterCount + ')';

    group.append(head);

    for (const [sid, name] of sections) {
      const qs = visibleBank().filter(
        quiz => quiz.section === sid
      );

      const line = document.createElement('div');

      line.className = 'section';

      const info = document.createElement('div');

      const strong = document.createElement('strong');

      strong.textContent = sid + ' · ' + name;

      info.append(strong);

      const small = document.createElement('small');

      small.textContent =
        qs.length + ' quiz · ' +
        qs.filter(
          quiz => progress[quiz.id]?.attempts > 0
        ).length + ' svolti · ' +
        qs.filter(due).length + ' da ripassare';

      info.append(small);

      line.append(info);

      const acts = document.createElement('div');

      acts.className = 'sectionbuttons';

      const actions = [
        ['▶ Inizia test', quiz => true],
        [
          'Solo nuovi',
          quiz => !progress[quiz.id]?.attempts
        ],
        ['Errori', isUnresolved]
      ];

      for (const [label, filter] of actions) {
        const subset = qs.filter(filter);

        const button = document.createElement('button');

        button.textContent =
          label + ' (' + subset.length + ')';

        button.disabled = !subset.length;

        button.className =
          label === '▶ Inizia test'
            ? ''
            : 'secondary';

        button.onclick = () => {
          start(subset, sid + ' · ' + name);
        };

        acts.append(button);
      }

      line.append(acts);

      group.append(line);
    }

    $('chapters').append(group);
  }
}

// ============================================================
// NAVIGAZIONE
// ============================================================

let previousButton = $('previous');

if (!previousButton) {
  previousButton = document.createElement('button');

  previousButton.id = 'previous';
  previousButton.textContent = '← Precedente';
  previousButton.className = 'secondary';

  $('next').parentNode.insertBefore(
    previousButton,
    $('next')
  );
}

// ============================================================
// AVVIO SESSIONE
// ============================================================

function start(items, title, shuffle = false) {
  if (activeSession) finishSession(false);
  queue = [...items];
  activeSession = {title, started:new Date().toISOString(), results:[]};
  persistActiveSession();

  if (!queue.length) {
    alert('Non ci sono quiz disponibili.');
    return;
  }

  if (shuffle) {
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [queue[i], queue[j]] = [
        queue[j],
        queue[i]
      ];
    }
  }

  idx = 0;

  sessionStates = queue.map(() => ({
    selected: -1,
    graded: false
  }));

  sessionName = title;

  $('home').classList.add('hidden');
  $('errorsPage').classList.add('hidden');
  $('session').classList.remove('hidden');

  show();
}

// ============================================================
// VISUALIZZAZIONE DOMANDA
// ============================================================

function show() {
  const quiz = queue[idx];

  if (!quiz) return;

  const state = sessionStates[idx];

  selected = state.selected;
  graded = state.graded;

  $('sessionTitle').textContent = sessionName;

  if ($('counterTop')) $('counterTop').textContent = (idx + 1) + ' / ' + queue.length;
  if ($('previousTop')) $('previousTop').disabled = idx === 0;
  if ($('nextTop')) $('nextTop').textContent = idx === queue.length - 1 ? 'Termina sessione' : 'Successiva →';
  $('counter').textContent =
    (idx + 1) + ' / ' + queue.length;

  $('source').textContent =
    (quiz.source || 'Quiz') +
    (quiz.page ? ' · pag. ' + quiz.page : '');

  $('question').textContent = mathText(quiz.question);

  $('options').replaceChildren();

  quiz.options.forEach((value, i) => {
    const button = document.createElement('button');

    button.className = 'option';

    button.textContent =
      String.fromCharCode(65 + i) +
      ') ' +
      mathText(value);

    button.onclick = () => {
      if (graded) return;

      selected = i;
      sessionStates[idx].selected = i;

      [...$('options').children].forEach(
        (element, j) => {
          element.classList.toggle(
            'selected',
            j === i
          );
        }
      );
    };

    $('options').append(button);
  });

  $('feedback').textContent = '';

  $('correction').replaceChildren();
  $('correction').classList.add('hidden');

  $('check').classList.toggle('hidden', graded);
  $('next').classList.remove('hidden');
  $('next').textContent =
    idx === queue.length - 1
      ? 'Termina sessione'
      : 'Successiva →';

  previousButton.disabled = idx === 0;

  $('unsure').disabled = !graded || !Number.isInteger(quiz.correct);
  $('unsure').textContent = 'Non ero sicura';
  $('hard').textContent =
    progress[quiz.id]?.hard
      ? '★ Difficile'
      : '☆ Segna difficile';

  if (
    selected >= 0 &&
    $('options').children[selected]
  ) {
    $('options').children[selected]
      .classList.add('selected');
  }

  if (graded) {
    displayCorrection(quiz);
  }

  window.scrollTo({top:0, behavior:'instant'});
  typeset();
}

// ============================================================
// MOSTRA CORREZIONE
// ============================================================

function displayCorrection(quiz) {
  const hasKey =
    Number.isInteger(quiz.correct) &&
    quiz.correct >= 0 &&
    quiz.correct < quiz.options.length;

  const ok =
    hasKey &&
    selected === quiz.correct;

  [...$('options').children].forEach(
    (element, i) => {
      element.disabled = true;

      if (hasKey && i === quiz.correct) {
        element.classList.add('correct');
      } else if (
        hasKey &&
        i === selected
      ) {
        element.classList.add('wrong');
      }
    }
  );

  $('feedback').textContent = hasKey
    ? ok
      ? '✓ Corretto'
      : '✗ Errato. Risposta corretta: ' +
        String.fromCharCode(65 + quiz.correct)
    : 'Risposta registrata. Soluzione non verificata.';

  $('check').classList.add('hidden');
  $('next').classList.remove('hidden');

showCorrection(quiz);
}

// ============================================================
// VERIFICA RISPOSTA
// ============================================================

function grade() {
  if (selected < 0) {
    alert('Seleziona una risposta.');
    return;
  }

  if (graded) return;

  const quiz = queue[idx];

  const p = progress[quiz.id] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    hard: false
  };

  const hasKey =
    Number.isInteger(quiz.correct) &&
    quiz.correct >= 0 &&
    quiz.correct < quiz.options.length;

  const ok =
    hasKey &&
    selected === quiz.correct;

  p.attempts++;

  if (hasKey && ok) {
    p.correct++;
    p.streak++;
  } else {
    p.streak = 0;
  }

  recordResult(quiz, !hasKey ? 'ungraded' : ok ? 'correct' : 'wrong');
  persistActiveSession();

  p.due = day(
    ok
      ? p.hard
        ? 1
        : [1, 3, 7, 14, 30][
            Math.min(p.streak - 1, 4)
          ]
      : 1
  );

  progress[quiz.id] = p;

  save();

  graded = true;
  sessionStates[idx].graded = true;

  displayCorrection(quiz);
  $('unsure').disabled = !Number.isInteger(quiz.correct);
  typeset();
}

// ============================================================
// I MIEI ERRORI
// ============================================================

function showCorrection(quiz) {
  const box = $('correction');

  box.replaceChildren();
  box.classList.remove('hidden');

  const title = document.createElement('h3');

  title.textContent = 'I miei errori';

  box.append(title);

  const field = document.createElement('textarea');

  field.placeholder =
    'Scrivi cosa hai sbagliato o cosa vuoi ricordare...';

  field.value = errorNotes[quiz.id] || '';

  field.setAttribute(
    'aria-label',
    'I miei errori'
  );

  box.append(field);

  const actions = document.createElement('div');

  actions.className = 'toolbar';

  const saveNote = document.createElement('button');

  saveNote.className = 'secondary';
  saveNote.textContent = 'Salva errore';

  const saved = document.createElement('span');

  saved.className = 'muted';

  saveNote.onclick = () => {
    errorNotes[quiz.id] = field.value;

    if (saveErrors()) {
      saved.textContent = '✓ Salvato';
    }
  };

  const retry = document.createElement('button');

  retry.className = 'secondary';
  retry.textContent = 'Riprova questa domanda';

  retry.onclick = () => {
    // Conserva le annotazioni scritte.
    errorNotes[quiz.id] = field.value;
    saveErrors();

    sessionStates[idx] = {
      selected: -1,
      graded: false
    };

    show();
  };

  actions.append(saveNote, retry, saved);

  box.append(actions);
}

// ============================================================
// ESPORTAZIONE JSON
// ============================================================

function download(name, data) {
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    )
  );

  const link = document.createElement('a');

  link.href = url;
  link.download = name;

  document.body.append(link);

  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ============================================================
// ANTEPRIMA IMPORTAZIONE
// ============================================================

function previewImport() {
  const box = $('previewList');

  box.replaceChildren();

  const sections = CHAPTERS.flatMap(
    chapter => chapter[2].map(section => ({
      id: section[0],
      name: section[1]
    }))
  );

  for (let i = 0; i < pending.length; i++) {
    const quiz = pending[i];

    const div = document.createElement('div');

    div.className = 'previewitem';

    const label = document.createElement('p');

    label.textContent =
      (i + 1) + ') ' + mathText(quiz.question);

    div.append(label);

    const select = document.createElement('select');

    select.setAttribute(
      'aria-label',
      'Sezione domanda ' + (i + 1)
    );

    for (const section of sections) {
      const option = document.createElement('option');

      option.value = section.id;

      option.textContent =
        section.id + ' · ' + section.name;

      select.append(option);
    }

    select.value = quiz.section;

    select.onchange = () => {
      quiz.section = select.value;
    };

    div.append(select);

    const detail = document.createElement('span');

    detail.className = 'muted';

    detail.textContent =
      ' ' +
      (
        quiz.correct === null
          ? 'Soluzione mancante'
          : 'Soluzione presente'
      ) +
      (quiz.page ? ' · pag. ' + quiz.page : '');

    div.append(detail);

    box.append(div);
  }

  $('previewSummary').textContent =
    pending.length +
    ' domande rilevate. Controlla il capitolo suggerito.';

  $('preview').classList.remove('hidden');

  typeset();
}

// ============================================================
// CARICAMENTO FILE TEX
// ============================================================

$('texFile').onchange = async function () {
  const files = [...this.files];

  this.value = '';

  if (!files.length) return;

  try {
    pending = [];

    let count = 0;
    let solutions = 0;

    for (const file of files) {
      const data = parseTex(
        await file.text(),
        file.name
      );

      count += data.blocks;
      solutions += data.solutions;

      pending.push(...data.result);
    }

    if (!pending.length) {
      throw new Error(
        'Nessun quiz riconosciuto nei file selezionati.'
      );
    }

    $('status').textContent =
      'Riconosciuti ' +
      count +
      ' blocchi e ' +
      solutions +
      ' risposte.';

    previewImport();

  } catch (error) {
    $('status').textContent =
      'Errore: ' + error.message;
  }
};

// ============================================================
// CONFERMA IMPORTAZIONE
// ============================================================

$('confirm').onclick = () => {
  try {
    const count = pending.length;

    importBank(pending);

    pending = [];

    $('preview').classList.add('hidden');

    $('status').textContent =
      'Importati/aggiornati ' +
      count +
      ' quiz. Totale disponibile: ' +
      bank.length +
      '.';

  } catch (error) {
    $('status').textContent =
      'Errore: ' + error.message;
  }
};

$('cancel').onclick = () => {
  pending = [];

  $('preview').classList.add('hidden');
};

// ============================================================
// BACKUP
// ============================================================

$('export').onclick = () => {
  download('analisi1_backup.json', {
    version: 5,
    quizzes: bank,
    progress,
    errorNotes,
    errorHistory,
    stats
  });
};

// ============================================================
// IMPORTAZIONE JSON
// ============================================================

$('jsonFile').onchange = async function () {
  const file = this.files?.[0];

  this.value = '';

  if (!file) return;

  try {
    const obj = JSON.parse(await file.text());

    const items = Array.isArray(obj)
      ? obj
      : obj.quizzes;

    const imported = importBank(items);

    $('status').textContent =
      'Importati ' +
      imported +
      ' quiz JSON. Totale: ' +
      bank.length +
      '.';

  } catch (error) {
    $('status').textContent =
      'Errore: ' + error.message;
  }
};

// ============================================================
// RIPRISTINO BACKUP
// ============================================================

$('backupFile').onchange = async function () {
  const file = this.files?.[0];

  this.value = '';

  if (!file) return;

  try {
    const obj = JSON.parse(await file.text());

    importBank(obj.quizzes);

    if (
      obj.progress &&
      typeof obj.progress === 'object'
    ) {
      progress = {
        ...progress,
        ...obj.progress
      };
    }

    if (
      obj.errorNotes &&
      typeof obj.errorNotes === 'object'
    ) {
      Object.assign(errorNotes, obj.errorNotes);
    }

    if (obj.stats && Array.isArray(obj.stats.sessions)) {
      stats = obj.stats;
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }
    if (
      obj.errorHistory &&
      typeof obj.errorHistory === 'object'
    ) {
      Object.assign(errorHistory, obj.errorHistory);
    }

    save();
    saveErrors();
    render();

    $('status').textContent =
      'Backup ripristinato.';

  } catch (error) {
    $('status').textContent =
      'Errore: ' + error.message;
  }
};

// ============================================================
// PULSANTI NAVIGAZIONE
// ============================================================

$('previousTop').onclick = () => previousButton.click();
$('nextTop').onclick = () => $('next').click();
$('unsure').onclick = () => {
  const quiz = queue[idx];
  if (!graded || !Number.isInteger(quiz.correct) || $('unsure').disabled) return;
  // La risposta resta corretta nel conteggio grezzo, ma il quiz va ripassato.
  recordResult(quiz, 'unsure');
  persistActiveSession();
  $('unsure').disabled = true;
  $('unsure').textContent = '★ Segnato da ripassare';
  render();
};
$('review').onclick = () => {
  start(
    bank.filter(due),
    'Ripasso quotidiano'
  );
};

$('check').onclick = grade;

previousButton.onclick = () => {
  if (idx > 0) {
    idx--;
    show();
  }
};

$('next').onclick = () => {
  if (idx < queue.length - 1) {
    idx++;
    show();
  } else {
    finishSession();
    persistActiveSession();
    $('session').classList.add('hidden');
    $('home').classList.remove('hidden');
    render();
  }
};

$('exit').onclick = () => {
  finishSession();
  persistActiveSession();
  $('session').classList.add('hidden');
  $('home').classList.remove('hidden');

  render();
};

// ============================================================
// DOMANDE DIFFICILI
// ============================================================

$('hard').onclick = () => {
  const quiz = queue[idx];

  const p = progress[quiz.id] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    hard: false
  };

  p.hard = !p.hard;

  progress[quiz.id] = p;

  save();

  $('hard').textContent = p.hard
    ? '★ Difficile'
    : '☆ Segna difficile';
};

// ============================================================
// REGISTRO ERRORI
// ============================================================

function openErrorRegister() {
  $('home').classList.add('hidden');
  $('session').classList.add('hidden');
  $('errorsPage').classList.remove('hidden');

  const list = $('errorEntries');

  list.replaceChildren();

  const qs = visibleBank().filter(quiz =>
    isUnresolved(quiz) ||
    (errorNotes[quiz.id] || '').trim()
  );

  if (!qs.length) {
    const p = document.createElement('p');

    p.className = 'muted';

    p.textContent =
      'Non ci sono ancora errori o annotazioni salvate.';

    list.append(p);
  }

  for (const quiz of qs) {
    const wrap = document.createElement('div');

    wrap.className = 'error-entry';

    const heading = document.createElement('strong');

    heading.textContent =
      quiz.section +
      ' · ' +
      (errorHistory[quiz.id]?.wrong || 0) +
      ' errori registrati';

    wrap.append(heading);

    const question = document.createElement('p');

    question.textContent = mathText(quiz.question);

    wrap.append(question);

    if (
      Number.isInteger(quiz.correct) &&
      quiz.options[quiz.correct]
    ) {
      const answer = document.createElement('p');

      answer.className = 'muted';

      answer.textContent =
        'Risposta corretta: ' +
        String.fromCharCode(65 + quiz.correct) +
        ') ' +
        mathText(quiz.options[quiz.correct]);

      wrap.append(answer);
    }

    const field = document.createElement('textarea');

    field.value = errorNotes[quiz.id] || '';

    field.placeholder =
      'Cosa ho sbagliato? Cosa devo ricordare?';

    field.setAttribute(
      'aria-label',
      'Annotazione per ' + quiz.id
    );

    wrap.append(field);

    const actions = document.createElement('div');

    actions.className = 'toolbar';

    const saveButton = document.createElement('button');

    saveButton.className = 'secondary';
    saveButton.textContent = 'Salva annotazione';

    saveButton.onclick = () => {
      errorNotes[quiz.id] = field.value;

      saveErrors();

      saveButton.textContent = 'Salvato';

      setTimeout(() => {
        saveButton.textContent =
          'Salva annotazione';
      }, 1200);
    };

    const retry = document.createElement('button');

    retry.textContent = 'Riprova';

    retry.onclick = () => {
      start([quiz], 'Ripasso errore');
    };

    actions.append(saveButton, retry);

    wrap.append(actions);
    list.append(wrap);
  }

  typeset();
}

// ============================================================
// SIMULAZIONI
// ============================================================

$('simulateAll').onclick = () => {
  start(
    visibleBank(),
    'Simulazione completa',
    true
  );
};

$('simulateWrong').onclick = () => {
  start(
    visibleBank().filter(isUnresolved),
    'Simulazione degli errori',
    true
  );
};

// ============================================================
// REGISTRO ERRORI — PULSANTI
// ============================================================

$('openErrors').onclick = openErrorRegister;

$('closeErrors').onclick = () => {
  $('errorsPage').classList.add('hidden');
  $('home').classList.remove('hidden');

  render();
};

$('exportErrors').onclick = () => {
  download(
    'analisi1_registro_errori.json',

    visibleBank()
      .filter(quiz =>
        errorHistory[quiz.id]?.wrong > 0 ||
        (errorNotes[quiz.id] || '').trim()
      )
      .map(quiz => ({
        id: quiz.id,
        section: quiz.section,
        question: quiz.question,

        wrong:
          errorHistory[quiz.id]?.wrong || 0,

        lastWrong:
          errorHistory[quiz.id]?.lastWrong || null,

        note: errorNotes[quiz.id] || ''
      }))
  );
};

// ============================================================
// CARICAMENTO AUTOMATICO JSON
// ============================================================

async function loadPublishedQuizBank() {
  try {
    const response = await fetch(
      'quiz_bank.json',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    const items = Array.isArray(data)
      ? data
      : data.quizzes;

    if (!Array.isArray(items)) {
      throw new Error('Archivio JSON non valido');
    }

    const imported = importBank(items);

    $('status').textContent =
      'Archivio pubblicato caricato: ' +
      imported +
      ' quiz. Totale disponibile: ' +
      bank.length +
      '.';

  } catch (error) {
    console.warn(
      'Archivio automatico non disponibile:',
      error.message
    );

    // Non cancellare i quiz già presenti.
    render();

    $('status').textContent =
      'Quiz disponibili: ' +
      bank.length +
      '. Archivio automatico non caricato.';
  }
}

// ============================================================
// AVVIO SIT
// ============================================================

installReadableStyles();
refreshUniqueBank();
render();

loadPublishedQuizBank();
window.addEventListener('pagehide', persistActiveSession);
