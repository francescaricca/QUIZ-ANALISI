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

const KEY = 'quiz_analisi_bank_v1';
const STATE_KEY = 'quiz_analisi_progress_v1';

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
function emptyState() {
  return {progress: {}, errorNotes: {}, errorHistory: {},
    stats: {sessions: [], attempts: []}, activeSession: null};
}

const storedState = load(STATE_KEY, null);
let state = validState(storedState) ? storedState : emptyState();
let {progress, errorNotes, errorHistory, stats, activeSession} = state;
let savedState = JSON.stringify(state);
let hasSavedState = storedState !== null;

let pending = [];
let queue = [];
let idx = 0;
let selected = -1;
let graded = false;
let sessionName = '';
let sessionStates = [];

// ============================================================
// SALVATAGGIO
// ============================================================

function setState(next) {
  state = next;
  ({progress, errorNotes, errorHistory, stats, activeSession} = state);
}

function saveState() {
  try {
    const current = localStorage.getItem(STATE_KEY);
    if (current !== (hasSavedState ? savedState : null)) {
      throw new Error('Ricarica la pagina per aggiornare i progressi salvati.');
    }
    const snapshot = JSON.stringify({...state, activeSession});
    localStorage.setItem(STATE_KEY, snapshot);
    savedState = snapshot;
    hasSavedState = true;
    return true;
  } catch (error) {
    setState(JSON.parse(savedState));
    console.error('Impossibile salvare i progressi:', error);
    alert('Progressi non salvati. ' + error.message);
    return false;
  }
}

function day(n = 0, from = new Date()) {
  const d = new Date(from);

  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${date}`;
}

function due(q) {
  return isUnresolved(q) || (progress[quizKey(q)]?.attempts > 0 &&
         progress[quizKey(q)]?.due <= day());
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

  localStorage.setItem(KEY, JSON.stringify([...map.values()]));
  bank = [...map.values()];
  refreshUniqueBank();
  render();

  return imported;
}

// ============================================================
// VISTA UNICA E STATISTICHE (archivio originale intatto)
// ============================================================
let uniqueQuizBank = [];

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function answerText(q) {
  return Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length
    ? normalizedText(q.options[q.correct]) : null;
}
function quizKey(q) {
  return JSON.stringify([q.section, normalizedText(q.question),
    q.options.map(normalizedText).sort(), answerText(q)]);
}
function refreshUniqueBank() {
  const groups = new Map();
  for (const quiz of bank) {
    const key = quizKey(quiz);
    if (!groups.has(key)) groups.set(key, quiz);
  }
  uniqueQuizBank = [...groups.values()];
}
function visibleBank() { return uniqueQuizBank; }
function isUnresolved(q) {
  const h = errorHistory[quizKey(q)];
  return !!(h && (h.wrong > 0 || h.marked) && !h.recovered);
}
function applyAnswer(quiz, outcome, at = new Date().toISOString()) {
  const key = quizKey(quiz);
  const p = progress[key] || {attempts: 0, streak: 0, hard: false};
  const correct = outcome === 'correct';
  p.attempts++;
  p.streak = correct ? p.streak + 1 : 0;
  p.due = day(correct && !p.hard ? [1, 3, 7, 14, 30][Math.min(p.streak - 1, 4)] : 1, at);
  progress[key] = p;
  recordResult(quiz, outcome, day(0, at), at);
}

function recordResult(q, outcome, today = day(), at = new Date().toISOString()) {
  const h = errorHistory[quizKey(q)] || {wrong: 0, recoveryDays: [], recovered: false};
  if (outcome === 'wrong' || outcome === 'unsure') {
    if (outcome === 'wrong') h.wrong = (h.wrong || 0) + 1;
    else h.marked = true;
    h.lastWrong = today;
    h.recoveryDays = [];
    h.recovered = false;
  } else if (outcome === 'correct' && (h.wrong || h.marked) && !h.recovered) {
    if (!Array.isArray(h.recoveryDays)) h.recoveryDays = [];
    if (today > (h.lastWrong || '') && !h.recoveryDays.includes(today)) {
      h.recoveryDays.push(today);
      if (h.recoveryDays.length >= 2) h.recovered = true;
    }
  }
  errorHistory[quizKey(q)] = h;
  if (outcome === 'unsure') return;
  const result = {key: quizKey(q), section: q.section, outcome, at};
  stats.attempts.push(result);
  if (activeSession) activeSession.results.push(result);
}
function finishSession(showSummary = true, interrupted = false) {
  if (!activeSession) return true;
  if (!activeSession.results.length) {
    activeSession = null;
    return true;
  }
  const summary = summarizeSession(activeSession, new Date().toISOString(), interrupted);
  const {results, correct: good, wrong: bad} = summary;
  stats.sessions.push(summary);
  activeSession = null;
  if (!saveState()) return false;
  if (showSummary) {
    alert('Sessione terminata\nRisposte corrette: ' + good + '\nErrori: ' + bad +
      '\nPercentuale corrette: ' + (summary.percentage === null ? '—' : summary.percentage + '%') +
      '\nRisposte non valutabili: ' + (results.length - good - bad));
  }
  render();
  return true;
}

function summarizeSession(session, ended, interrupted) {
  const results = session.results;
  const good = results.filter(r => r.outcome === 'correct').length;
  const bad = results.filter(r => r.outcome === 'wrong').length;
  const total = good + bad;
  return {...session, ended, interrupted, correct: good, wrong: bad,
    percentage: total ? Math.round(1000 * good / total) / 10 : null};
}

function answerCounts(attempts) {
  const correct = attempts.filter(result => result.outcome === 'correct').length;
  const wrong = attempts.filter(result => result.outcome === 'wrong').length;
  return {wrong, precision: correct + wrong
    ? (100 * correct / (correct + wrong)).toFixed(1) + '%' : '—'};
}

function updateStatsPanel() {
  const box = $('statsPanel');
  if (!box) return;
  const qs = visibleBank();
  const counts = answerCounts(stats.attempts);
  const rows = CHAPTERS.flatMap(([chapter, , sections]) =>
    [chapter, ...sections.map(([section]) => section)]).map(section => {
    const belongs = value => value === section || value.startsWith(section + '.');
    const attempts = stats.attempts.filter(result => belongs(result.section));
    const quizzes = qs.filter(quiz => belongs(quiz.section));
    const open = quizzes.filter(isUnresolved).length;
    if (!attempts.length && !open) return '';
    return '<tr><td>' + section + '</td><td>' +
      quizzes.filter(quiz => progress[quizKey(quiz)]?.attempts > 0).length +
      '</td><td>' + attempts.length + '</td><td>' +
      answerCounts(attempts).precision + '</td><td>' + open + '</td></tr>';
  }).join('');
  const history = stats.sessions.slice().reverse().map(session =>
    '<li>' + new Date(session.ended).toLocaleString('it-IT') + ' · ' +
    session.results.length + ' tentativi · Precisione ' +
    (session.percentage === null ? '—' : session.percentage.toFixed(1) + '%') +
    (session.interrupted ? ' · Interrotta' : '') + '</li>').join('');
  box.innerHTML = '<h2>📊 Le mie statistiche</h2><p><strong>Tentativi:</strong> ' +
    stats.attempts.length + ' · <strong>Risposte errate:</strong> ' + counts.wrong +
    ' · <strong>Errori aperti:</strong> ' + qs.filter(isUnresolved).length +
    '</p><p>Precisione: risposte corrette su risposte valutabili.</p>' +
    '<p>Quiz unici: ' + qs.length + ' su ' + bank.length + ' originali</p>' +
    '<div style="overflow-x:auto"><table class="stats-table"><thead><tr>' +
    '<th>Capitolo / sezione</th><th>Affrontati</th><th>Tentativi</th>' +
    '<th>Precisione</th><th>Errori aperti</th></tr></thead><tbody>' + rows +
    '</tbody></table></div><details><summary>Storico delle sessioni</summary>' +
    (history ? '<ul>' + history + '</ul>' : '<p>Nessuna sessione conclusa.</p>') + '</details>';
}

// ============================================================
// DASHBOARD
// ============================================================

function render() {
  const attempted = visibleBank().filter(
    quiz => progress[quizKey(quiz)]?.attempts > 0
  );

  $('total').textContent = visibleBank().length;

  $('done').textContent = attempted.length;

  $('due').textContent = visibleBank().filter(due).length;

  $('accuracy').textContent = answerCounts(stats.attempts).precision;

  $('review').disabled = !visibleBank().some(due);

  $('simulateAll').disabled = !visibleBank().length;

  $('simulateWrong').disabled = !visibleBank().some(
    quiz => isUnresolved(quiz)
  );

  $('errorCount').textContent =
    visibleBank().filter(isUnresolved).length + ' domande da recuperare';

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
          quiz => progress[quizKey(quiz)]?.attempts > 0
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
          quiz => !progress[quizKey(quiz)]?.attempts
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
  if (!items.length) {
    alert('Non ci sono quiz disponibili.');
    return;
  }
  if (activeSession && !finishSession(false)) return;
  queue = [...items];
  activeSession = {title, started: new Date().toISOString(), results: []};

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

  $('unsure').disabled = !graded || answerText(quiz) === null || !!state.unsure;
  $('unsure').textContent = state.unsure ? '★ Segnato da ripassare' : 'Non ero sicura';
  $('hard').textContent =
    progress[quizKey(quiz)]?.hard
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

  const hasKey = answerText(quiz) !== null;
  const outcome = !hasKey ? 'ungraded' : selected === quiz.correct ? 'correct' : 'wrong';
  const session = activeSession;
  applyAnswer(quiz, outcome);
  if (!saveState()) {
    if (!activeSession && session) activeSession = {...session, results: []};
    return;
  }

  render();
  graded = true;
  sessionStates[idx].graded = true;

  displayCorrection(quiz);
  $('unsure').disabled = !hasKey;
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

  field.value = errorNotes[quizKey(quiz)] || '';

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
    errorNotes[quizKey(quiz)] = field.value;

    if (saveState()) {
      saved.textContent = '✓ Salvato';
      render();
    }
  };

  const retry = document.createElement('button');

  retry.className = 'secondary';
  retry.textContent = 'Riprova questa domanda';

  retry.onclick = () => {
    // Conserva le annotazioni scritte.
    errorNotes[quizKey(quiz)] = field.value;
    if (!saveState()) return;
    render();

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

function exportBackup(name = 'analisi1_backup.json') {
  download(name, {format: 'quiz-analisi', version: 6, quizzes: bank,
    state: {...state, activeSession}});
}

$('export').onclick = () => exportBackup();

const legacyKeys = {
  quizzes: 'am1_v3_bank', progress: 'am1_v3_progress',
  errorNotes: 'am1_error_notes', errorHistory: 'am1_error_history',
  stats: 'am1_stats_v1', activeSession: 'am1_active_session_v1'
};
const legacyButton = document.createElement('button');
legacyButton.className = 'secondary';
legacyButton.textContent = 'Esporta dati precedenti';
legacyButton.onclick = () => {
  try {
    const legacy = {};
    for (const [field, key] of Object.entries(legacyKeys)) {
      const value = localStorage.getItem(key);
      if (value !== null) legacy[field] = JSON.parse(value);
    }
    if (!Object.keys(legacy).length) {
      $('status').textContent = 'Nessun dato precedente disponibile.';
      return;
    }
    download('analisi1_dati_precedenti.json', {version: 5, ...legacy});
  } catch (error) {
    $('status').textContent = 'Esportazione non riuscita. ' + error.message;
  }
};
$('export').after(legacyButton);

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

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validAttempt(result) {
  return isRecord(result) && typeof result.section === 'string' &&
    typeof result.key === 'string' && ['correct', 'wrong', 'ungraded'].includes(result.outcome) &&
    typeof result.at === 'string' && Number.isFinite(Date.parse(result.at));
}

function validSession(session) {
  return isRecord(session) && Array.isArray(session.results) && session.results.every(validAttempt);
}

function validState(value) {
  return isRecord(value) && isRecord(value.progress) && isRecord(value.errorHistory) &&
    isRecord(value.errorNotes) && Object.values(value.errorNotes).every(note => typeof note === 'string') &&
    Object.values(value.progress).every(p => isRecord(p) &&
      Number.isSafeInteger(p.attempts) && p.attempts >= 0 &&
      Number.isSafeInteger(p.streak) && p.streak >= 0) &&
    Object.values(value.errorHistory).every(h => isRecord(h) &&
      Number.isSafeInteger(h.wrong) && h.wrong >= 0 && Array.isArray(h.recoveryDays)) &&
    isRecord(value.stats) && Array.isArray(value.stats.attempts) && value.stats.attempts.every(validAttempt) &&
    Array.isArray(value.stats.sessions) && value.stats.sessions.every(session =>
      validSession(session) && (session.percentage === null || Number.isFinite(session.percentage))) &&
    (value.activeSession === null || validSession(value.activeSession));
}

function legacyState(backup) {
  const quizzes = new Map(backup.quizzes.map(quiz => [String(quiz.id), quiz]));
  function convert(entry) {
    const quiz = quizzes.get(String(entry?.id));
    if (!quiz || quiz.section !== entry.section ||
        !['correct', 'wrong', 'ungraded', 'unsure'].includes(entry.outcome) ||
        !Number.isFinite(Date.parse(entry.at))) return null;
    return {key: quizKey(quiz), section: quiz.section, outcome: entry.outcome, at: entry.at};
  }

  const before = {...state, activeSession};
  setState(emptyState());
  try {
    for (const entry of Array.isArray(backup.stats?.attempts) ? backup.stats.attempts : []) {
      const result = convert(entry);
      if (!result) continue;
      const quiz = quizzes.get(String(entry.id));
      if (result.outcome === 'unsure') recordResult(quiz, 'unsure', day(0, result.at), result.at);
      else applyAnswer(quiz, result.outcome, result.at);
    }
    for (const [id, quiz] of quizzes) {
      const note = backup.errorNotes?.[id];
      if (typeof note === 'string' && note.trim()) errorNotes[quizKey(quiz)] = note;
      if (backup.progress?.[id]?.hard === true) {
        const key = quizKey(quiz);
        progress[key] = {...(progress[key] || {attempts: 0, streak: 0}), hard: true};
      }
    }
    const sessions = Array.isArray(backup.stats?.sessions) ? backup.stats.sessions : [];
    const archived = [...sessions, backup.activeSession];
    for (const session of archived) {
      if (!Array.isArray(session?.results)) continue;
      const results = session.results.map(convert).filter(result => result && result.outcome !== 'unsure');
      if (!results.length) continue;
      const ended = session.ended || results.at(-1).at;
      stats.sessions.push(summarizeSession({results}, ended, !!session.interrupted || !session.ended));
    }
    return state;
  } finally {
    setState(before);
  }
}

$('backupFile').onchange = async function () {
  const file = this.files?.[0];
  this.value = '';
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());
    const modern = backup?.format === 'quiz-analisi' && backup.version === 6;
    const legacy = backup?.version === 5 && backup.format === undefined;
    if ((!modern && !legacy) || !Array.isArray(backup.quizzes) ||
        backup.quizzes.some(quiz => !isRecord(quiz) || quiz.id == null ||
          typeof quiz.question !== 'string' || typeof quiz.section !== 'string' ||
          !Array.isArray(quiz.options) || quiz.options.length < 2 ||
          quiz.options.some(option => typeof option !== 'string')) ||
        (modern && !validState(backup.state))) {
      throw new Error('Formato del backup non valido.');
    }
    const message = legacy
      ? 'Sostituire i progressi correnti con i tentativi dettagliati e le note del vecchio backup? Procedi solo se riconosci questi dati come tuoi.'
      : 'Ripristinare i progressi del backup? I progressi correnti saranno sostituiti.';
    if (!confirm(message + ' Verrà scaricata una copia dei dati correnti.')) return;

    exportBackup('analisi1_prima_del_ripristino.json');
    const next = modern ? backup.state : legacyState(backup);
    if (next.activeSession?.results.length) {
      next.stats.sessions.push(summarizeSession(next.activeSession, new Date().toISOString(), true));
    }
    next.activeSession = null;
    importBank(backup.quizzes);
    setState(next);
    if (!saveState()) {
      render();
      $('status').textContent = 'Archivio importato. Ripristino dei progressi non riuscito.';
      return;
    }
    render();
    $('status').textContent = 'Backup ripristinato.';
  } catch (error) {
    $('status').textContent = 'Errore: ' + error.message;
  }
};

// ============================================================
// PULSANTI NAVIGAZIONE
// ============================================================

$('previousTop').onclick = () => previousButton.click();
$('nextTop').onclick = () => $('next').click();
$('unsure').onclick = () => {
  const quiz = queue[idx];
  if (!graded || answerText(quiz) === null || sessionStates[idx].unsure) return;
  // La risposta resta corretta nel conteggio grezzo, ma il quiz va ripassato.
  recordResult(quiz, 'unsure');
  if (!saveState()) return;
  sessionStates[idx].unsure = true;
  $('unsure').disabled = true;
  $('unsure').textContent = '★ Segnato da ripassare';
  render();
};
$('review').onclick = () => {
  start(
    visibleBank().filter(due),
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
    if (!finishSession()) return;
    $('session').classList.add('hidden');
    $('home').classList.remove('hidden');
    render();
  }
};

$('exit').onclick = () => {
  if (!finishSession()) return;
  $('session').classList.add('hidden');
  $('home').classList.remove('hidden');

  render();
};

// ============================================================
// DOMANDE DIFFICILI
// ============================================================

$('hard').onclick = () => {
  const quiz = queue[idx];

  const p = progress[quizKey(quiz)] || {attempts: 0, streak: 0, hard: false};

  const session = activeSession;
  p.hard = !p.hard;

  progress[quizKey(quiz)] = p;

  if (!saveState()) {
    if (!activeSession && session) activeSession = session;
    return;
  }

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
    (errorNotes[quizKey(quiz)] || '').trim()
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
      (errorHistory[quizKey(quiz)]?.wrong || 0) +
      ' errori registrati' +
      (isUnresolved(quiz) && errorHistory[quizKey(quiz)]?.marked ? ' · Segnato da ripassare' : '');

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

    field.value = errorNotes[quizKey(quiz)] || '';

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
      errorNotes[quizKey(quiz)] = field.value;

      if (!saveState()) return;
      render();

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
        isUnresolved(quiz) || errorHistory[quizKey(quiz)]?.wrong > 0 ||
        (errorNotes[quizKey(quiz)] || '').trim()
      )
      .map(quiz => ({
        id: quiz.id,
        section: quiz.section,
        question: quiz.question,

        wrong:
          errorHistory[quizKey(quiz)]?.wrong || 0,

        lastWrong:
          errorHistory[quizKey(quiz)]?.lastWrong || null,

        daRipassare: isUnresolved(quiz),
        note: errorNotes[quizKey(quiz)] || ''
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
if (activeSession) finishSession(false, true);
render();

loadPublishedQuizBank();
