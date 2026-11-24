#!/usr/bin/env python3
"""Genera archivio web e PDF dai .tex verificando formato e metadati."""
import re,json,pathlib,sys,subprocess
P=pathlib.Path(__file__).resolve().parent
SECTIONS={'1.1':'Insiemi','1.2':'Logica delle proposizioni e dei predicati','1.3':'Relazioni','1.4':'Funzioni','1.5':'Insiemi numerici','1.6':'Il principio di induzione','2.1':'Successioni reali e loro proprietà','2.2':'Limiti di successioni','3.1':'Definizioni e prime proprietà. Limiti','3.2':'Continuità di una funzione','3.3':'La continuità uniforme','3.4':'Confronto tra funzioni: infinitesimi e infiniti','4.1':'Derivate','4.2':'I teoremi fondamentali del calcolo differenziale','4.3':'Proprietà delle funzioni: monotonia e punti estremali','4.4':'Lo studio di funzione','5.1':'L’integrale di Riemann','5.2':'Proprietà dell’integrale','5.3':'Integrali indefiniti e regole di integrazione','5.4':'Tecniche di integrazione','5.5':'Integrali impropri','5.6':'Alcune applicazioni degli integrali','5.7':'Alcuni esercizi svolti e alcuni da svolgere','6.1':'Metodi risolutivi di alcune equazioni differenziali ordinarie','6.2':'Buona positura del problema di Cauchy','6.3':'Studi qualitativi','7.1':'Concetti di base','7.2':'Successioni','7.3':'Funzioni reali di variabile reale','7.4':'Calcolo differenziale','7.5':'Integrazione','7.6':'Equazioni differenziali ordinarie'}
def suggest(s):
 t=s.lower()
 rules=[('6.2',r'cauchy|unicità.*soluzion'),('6.1',r'equazion.{0,25}differenzial|y\x27\x27|y\x27'),('5.5',r'impropri'),('5.2',r'funzione integrale|\\int_0\^\{?x'),('5.4',r'\\\\int|integral|primitiv'),('4.2',r'taylor|mac ?laurin|rolle|lagrange|teorema di.*valor'),('4.4',r'asintot|studio di funzione'),('4.3',r'convess|concav|massim|minim|monoton|estrem|flesso|punto critico'),('4.1',r'derivat|differenziabil|f\x27|tangente'),('3.4',r'o\(x|o\(\(|infinitesim|equivalent|\\sim|parte principale'),('2.2',r'succession|a_n|\\lim_\{?n'),('3.1',r'\\\\lim|limite'),('3.2',r'continu|discontinu'),('1.5',r'compless|\\mathbb|\\overline|cosh|sinh'),('1.4',r'invertib|dominio|funzion')]
 return next((k for k,r in rules if re.search(r,t)), '1.4')
# Normalizzazione conservativa per pdfLaTeX.
# I simboli ambigui non vengono alterati: sono segnalati con file e riga.
INVISIBLE_TEX = dict.fromkeys(map(ord, "\u2060\u2061\u2062\u2063\u2064\u200b\u200c\u200d\ufeff\u00ad"), None)
MATH_UNICODE = {
 "⋮": r"\ensuremath{\vdots}", "⋯": r"\ensuremath{\cdots}",
 "⋱": r"\ensuremath{\ddots}", "⋅": r"\ensuremath{\cdot}",
 "×": r"\ensuremath{\times}", "÷": r"\ensuremath{\div}",
 "≤": r"\ensuremath{\leq}", "≥": r"\ensuremath{\geq}",
 "≠": r"\ensuremath{\neq}", "≈": r"\ensuremath{\approx}",
 "≃": r"\ensuremath{\simeq}", "≡": r"\ensuremath{\equiv}",
 "∞": r"\ensuremath{\infty}", "∈": r"\ensuremath{\in}",
 "∉": r"\ensuremath{\notin}", "⊂": r"\ensuremath{\subset}",
 "⊆": r"\ensuremath{\subseteq}", "∪": r"\ensuremath{\cup}",
 "∩": r"\ensuremath{\cap}", "∅": r"\ensuremath{\varnothing}",
 "∀": r"\ensuremath{\forall}", "∃": r"\ensuremath{\exists}",
 "→": r"\ensuremath{\to}", "←": r"\ensuremath{\leftarrow}",
 "↔": r"\ensuremath{\leftrightarrow}",
 "⇒": r"\ensuremath{\Rightarrow}", "⇔": r"\ensuremath{\Leftrightarrow}",
 "∑": r"\ensuremath{\sum}", "∏": r"\ensuremath{\prod}",
 "∫": r"\ensuremath{\int}", "∂": r"\ensuremath{\partial}",
 "∇": r"\ensuremath{\nabla}",
 "α": r"\ensuremath{\alpha}", "β": r"\ensuremath{\beta}",
 "γ": r"\ensuremath{\gamma}", "δ": r"\ensuremath{\delta}",
 "ε": r"\ensuremath{\varepsilon}", "θ": r"\ensuremath{\theta}",
 "λ": r"\ensuremath{\lambda}", "μ": r"\ensuremath{\mu}",
 "π": r"\ensuremath{\pi}", "σ": r"\ensuremath{\sigma}",
 "φ": r"\ensuremath{\varphi}", "ω": r"\ensuremath{\omega}",
 "Δ": r"\ensuremath{\Delta}", "Σ": r"\ensuremath{\Sigma}",
 "Π": r"\ensuremath{\Pi}", "Ω": r"\ensuremath{\Omega}",
 "−": "-", "…": r"\ldots{}", "²": r"\ensuremath{^2}",
 "³": r"\ensuremath{^3}", "⁴": r"\ensuremath{^4}",
}
# Caratteri testuali supportati da inputenc/T1 e segni di punteggiatura comuni.
SAFE_TEXT_UNICODE = set("àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚçÇñÑüÜäÄöÖß°§£€’‘“”–—«»¡¿")

def normalize_tex_sources():
 """Converte simboli certi; segnala quelli non gestiti senza indovinare."""
 problems=[]
 for path in sorted((P/'quiz').glob('quiz_pagine_*.tex')):
  source=path.read_text(encoding='utf-8-sig')
  result=[]
  for line_number,line in enumerate(source.splitlines(keepends=True),1):
   # I commenti LaTeX non sono compilati. Conserviamo i metadati originali.
   code,sep,comment=line.partition('%')
   # Un percento escaped non inizia un commento.
   if sep and code.endswith('\\'):
    code,sep,comment=line,'',''
   code=code.translate(INVISIBLE_TEX)
   for char,replacement in MATH_UNICODE.items():
    code=code.replace(char,replacement)
   for char in code:
    if ord(char)>127 and char not in SAFE_TEXT_UNICODE:
     problems.append(f'{path.name}:{line_number}: U+{ord(char):04X} ({char!r})')
   result.append(code+sep+comment)
  cleaned=''.join(result)
  if cleaned!=source:
   path.write_text(cleaned,encoding='utf-8')
   print(f'Unicode normalizzato: {path.name}')
 if problems:
  raise SystemExit('Caratteri Unicode non gestiti (correggere prima della compilazione):\n'+'\n'.join(problems[:50]))

def parse(f):
 raw=f.read_text(encoding='utf8'); clean=re.sub(r'(?<!\\)%[^\n]*','',raw)
 answers={int(n):a.upper() for n,a in re.findall(r'\\registraSoluzione\{(\d+)\}\{([A-Ea-e])\}',clean)}
 pages=[(m.start(),int(m.group(1))) for m in re.finditer(r'Pag\. originale\s+(\d+)/\d+',clean)]
 blocks=list(re.finditer(r'\\begin\{quiz\}([\s\S]*?)\\end\{quiz\}',clean)); result=[]
 for i,m in enumerate(blocks,1):
  b=m.group(1); enum=re.search(r'\\begin\{enumerate\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{enumerate\}',b)
  if not enum: raise ValueError(f'{f.name} quiz {i}: opzioni mancanti')
  q=b[:enum.start()].strip(); opts=[x.strip() for x in re.split(r'\\item(?:\[[^\]]*\])?',enum.group(1))[1:]]
  if not q or len(opts) not in (2,4,5) or any(not x for x in opts): raise ValueError(f'{f.name} quiz {i}: domanda o alternative non valide ({len(opts)})')
  before=raw[:raw.find('\\begin{quiz}',0) ] if False else None
  # Commenti associati al quiz: dopo la chiusura, prima dell'inizio successivo.
  endpos=raw.find('\\end{quiz}',raw.find('\\begin{quiz}',0)) if False else None
  page=next((p for pos,p in reversed(pages) if pos<m.start()),None)
  result.append({'id':f.stem+'_'+str(i).zfill(3),'question':q,'options':opts,'correct':ord(answers[i])-65 if i in answers else None,'section':suggest(q),'source':f.name,'page':page,'explanation':'','classificationStatus':'da verificare'})
 # extract local comments with original positions
 orig=list(re.finditer(r'\\begin\{quiz\}[\s\S]*?\\end\{quiz\}',raw))
 for i,m in enumerate(orig):
  after=raw[m.end():orig[i+1].start() if i+1<len(orig) else len(raw)]
  sol=re.search(r'^% SOLUZIONE:\s*([a-eA-E]|nessuna|\?)\s*$',after,re.M)
  expl=re.search(r'^% SPIEGAZIONE:\s*(.*)$',after,re.M)
  sect=re.search(r'^% SEZIONE_AM1:\s*(\d+\.\d+)\s*$',after,re.M)
  if sol:
   if sol[1].lower() in 'abcde' and len(sol[1])==1:result[i]['correct']=ord(sol[1].upper())-65
   else:result[i]['correct']=None
  if expl:result[i]['explanation']=expl[1].strip()
  if sect:
   if sect[1] not in SECTIONS:raise ValueError(f'{f.name} quiz {i+1}: sezione inesistente {sect[1]}')
   result[i]['section']=sect[1];result[i]['classificationStatus']='assegnata'
  if result[i]['correct'] is not None and not 0<=result[i]['correct']<len(result[i]['options']):raise ValueError('Risposta fuori intervallo')
 return result
def latex_safe_explanation(value):
 """Escape LaTeX text without altering already-delimited mathematics."""
 def escape_text(t):
  substitutions = {'\\':r'\textbackslash{}','{':r'\{','}':r'\}',
    '#':r'\#','$':r'\$','%':r'\%','&':r'\&','_':r'\_',
    '^':r'\textasciicircum{}','~':r'\textasciitilde{}',
    '²':r'\textsuperscript{2}','³':r'\textsuperscript{3}',
    '⁴':r'\textsuperscript{4}', '≤':r'\ensuremath{\leq}',
    '≥':r'\ensuremath{\geq}', '→':r'\ensuremath{\to}',
    '∞':r'\ensuremath{\infty}', '∈':r'\ensuremath{\in}',
    '≠':r'\ensuremath{\neq}', 'π':r'\ensuremath{\pi}',
    '√':r'\ensuremath{\sqrt{\phantom{x}}}', '−':'-',
    '’':"'", '“':'``', '”':"''", '…':'...', '€':r'\texteuro{}'}
  return ''.join(substitutions.get(c,c) for c in t)
 pieces=re.split(r'(?<!\\)(\$)',value)
 if len(pieces)%4 != 1:
  return escape_text(value)
 output=[]
 for idx,part in enumerate(pieces):
  if part=='$': continue
  output.append('$'+part+'$' if idx%4==2 else escape_text(part))
 return ''.join(output)

normalize_tex_sources()
files=sorted((P/'quiz').glob('quiz_pagine_*.tex'))
if not files:sys.exit('Nessun file quiz trovato')
allq=[]
for f in files:
 data=parse(f);print(f'{f.name}: {len(data)} quiz, {sum(x["correct"] is not None for x in data)} risposte, {sum(bool(x["explanation"]) for x in data)} spiegazioni')
 allq+=data
ids=[x['id'] for x in allq]
if len(set(ids))!=len(ids):sys.exit('ID duplicati')
(P/'quiz_bank.json').write_text(json.dumps({'version':1,'quizzes':allq},ensure_ascii=False,indent=2),encoding='utf8')
# PDF leggibile: include solo i file effettivamente presenti e raccoglie le soluzioni a fine capitolo.
lines=[r'\documentclass[11pt,a4paper]{article}',r'\usepackage[T1]{fontenc}',r'\usepackage[utf8]{inputenc}',r'\usepackage[italian]{babel}',r'\usepackage{amsmath,amssymb,enumitem,xcolor}',r'\usepackage[a4paper,margin=2.2cm]{geometry}',r'\newcounter{quiz}',r'\newenvironment{quiz}{\par\medskip\noindent\refstepcounter{quiz}\textbf{\thequiz)}\enspace\ignorespaces}{\par\bigskip}',r'\newcommand{\registraSoluzione}[2]{}',r'\begin{document}',r'\section*{Quiz Analisi 1 -- Paola Suria}']
for f in files:lines.append(r'\input{quiz/'+f.name+'}')
lines.append(r'\clearpage\section*{Soluzioni e spiegazioni per capitolo (AM1 Morandotti)}')
for chapter in sorted(set(x['section'].split('.')[0] for x in allq),key=int):
 lines.append(r'\subsection*{Capitolo '+chapter+'}')
 for sec in sorted(set(x['section'] for x in allq if x['section'].startswith(chapter+'.')),key=lambda x:tuple(map(int,x.split('.')))):
  lines.append(r'\subsubsection*{'+sec+' -- '+SECTIONS[sec]+'}')
  for q in (x for x in allq if x['section']==sec):
   ans='ABCDE'[q['correct']] if q['correct'] is not None else 'non verificata / nessuna alternativa corretta'
   lines.append(r'\noindent\textbf{'+q['id'].replace('_',r'\_')+'}: '+ans+r'. '+latex_safe_explanation(q['explanation'] or 'Spiegazione non ancora disponibile.')+r'\par\medskip')
lines.append(r'\end{document}')
(P/'main.tex').write_text('\n'.join(lines)+'\n',encoding='utf8')
print('Archivio generato:',len(allq),'quiz. Classificazioni euristiche non confermate restano marcate da verificare.')
