window._kbLoaded = true;

// Custom T9-style half-QWERTY keyboard for snot.
// Loaded as a separate script before the main app script.
// Exposes globals: T9_KEYS, CHAR_TO_KEY, SEED_WORDS, WORD_FREQ,
//   CustomKeyboard, and all handleT9*/commitWord/addWordToDictionary helpers.
// The main script gates use of these behind the CUSTOM_KEYBOARD feature flag.

// ── CSS ──────────────────────────────────────────────────────────────────────
(() => {
  if (document.querySelector('style[data-keyboard]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-keyboard', '');
  style.textContent = `
    #custom-keyboard {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-width: 720px;
      margin: 0 auto;
      background: var(--pico-card-sectioning-background-color, #f4f4f4);
      border-top: 1px solid var(--pico-muted-border-color);
      padding: 0.4rem 0.35rem 0.5rem;
      z-index: 1100;
      user-select: none;
    }

    #kb-suggestion-bar {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.1rem 0.4rem;
      min-height: 2rem;
    }

    #kb-suggestions {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      flex: 1;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
      min-height: 2rem;
    }

    #kb-suggestions::-webkit-scrollbar { display: none; }

    .kb-side-buttons {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-shrink: 0;
    }

    .kb-suggestion {
      background: var(--pico-primary-background);
      color: var(--pico-primary-inverse);
      border: none;
      border-radius: 1rem;
      padding: 0.2rem 0.75rem;
      font-size: 0.9rem;
      cursor: pointer;
      line-height: 1.4;
      width: auto;
      margin: 0;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .kb-suggestion.prefix {
      background: none;
      border: 1px solid var(--pico-primary-border, var(--pico-primary));
      color: var(--pico-primary);
    }

    .kb-add-word {
      background: none;
      border: 1px dashed var(--pico-muted-border-color);
      border-radius: 1rem;
      padding: 0.2rem 0.65rem;
      font-size: 0.8rem;
      color: var(--pico-muted-color);
      cursor: pointer;
      width: auto;
      margin: 0;
      white-space: nowrap;
    }

    .kb-done {
      width: auto;
      margin: 0;
      padding: 0.15rem 0.6rem;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .kb-row {
      display: flex;
      gap: 0.3rem;
      margin-bottom: 0.3rem;
    }

    .kb-key {
      flex: 1;
      background: var(--pico-background-color, #fff);
      border: 1px solid var(--pico-muted-border-color);
      border-radius: 0.35rem;
      padding: 0.5rem 0.15rem;
      cursor: pointer;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      min-height: 2.8rem;
      width: auto;
      margin: 0;
      color: var(--pico-color);
    }

    .kb-key:active {
      background: var(--pico-card-sectioning-background-color, #e8e8e8);
    }

    .kb-primary {
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1;
      color: var(--pico-color);
    }

    .kb-alt {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--pico-color);
      line-height: 1;
    }

    .kb-alt-alpha { opacity: 0.6; }
    .kb-alt-num   { opacity: 0.25; }
    .kb-alt-sym   { opacity: 0.25; }

    #custom-keyboard.alt-mode .kb-alt  { color: var(--pico-color); font-weight: 700; opacity: 1; }
    #custom-keyboard.alt-mode .kb-primary { opacity: 0.25; }

    .kb-caps-mode {
      flex: 1;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .kb-caps-mode.active {
      background: #b45a00;
      color: #fff;
      border-color: #b45a00;
    }

    .kb-utility-row { gap: 0.3rem; margin-bottom: 0; }

    .kb-backspace-bar {
      width: auto;
      margin: 0;
      padding: 0.15rem 0.6rem;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .kb-num-layer {
      flex: 1;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .kb-num-layer.active {
      background: var(--pico-primary-background);
      color: var(--pico-primary-inverse);
      border-color: var(--pico-primary-border);
    }

    .kb-space {
      flex: 1.5;
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0.05em;
    }

    .kb-alt-mode {
      flex: 1;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .kb-alt-mode.active {
      background: var(--pico-primary-background);
      color: var(--pico-primary-inverse);
      border-color: var(--pico-primary-border);
    }

    .kb-submit { flex: 1; font-size: 1.1rem; }
  `;
  document.head.appendChild(style);
})();

// ── Key map ───────────────────────────────────────────────────────────────────
// Each entry: [primaryChar, altChar]. 4 letter rows of 5 keys each.
// Alt layer mirrors the right half of QWERTY (folded-keyboard layout).
const T9_KEYS = [
  ['1','0'], ['2','9'], ['3','8'], ['4','7'], ['5','6'],
  ['q','p'], ['w','o'], ['e','i'], ['r','u'], ['t','y'],
  ['a',';'], ['s','l'], ['d','k'], ['f','j'], ['g','h'],
  ['z','/'], ['x','.'], ['c',','], ['v','m'], ['b','n'],
];

const CHAR_TO_KEY = {};
T9_KEYS.forEach((pair, idx) => { pair.forEach(ch => { CHAR_TO_KEY[ch] = idx; }); });

// ── Dictionary seed + frequency table ────────────────────────────────────────
// SEED_WORDS is generated at load time by combining typed base lists with
// programmatic inflection (verb conjugations, noun plurals, adverbs).
// Words appear in rough frequency order so earlier entries rank higher.

function _isVowel(c) { return 'aeiou'.includes(c); }
function _isCVC(w) {
  const l = w.length;
  // Consonant-Vowel-Consonant: don't double w/x/y/h
  return l >= 3 && !_isVowel(w[l-1]) && !'wxyh'.includes(w[l-1]) &&
         _isVowel(w[l-2]) && !_isVowel(w[l-3]);
}
// [3sg, -ing, -ed] for regular verbs
function _verbForms(w) {
  const l = w.length, last = w[l-1], last2 = w.slice(-2);
  const s   = (last==='y' && !_isVowel(w[l-2])) ? w.slice(0,-1)+'ies'
            : (last2==='sh'||last2==='ch'||'sxzo'.includes(last)) ? w+'es'
            : w+'s';
  const ing = (last==='e' && l>2 && last2!=='ee' && last2!=='ie') ? w.slice(0,-1)+'ing'
            : _isCVC(w) ? w+last+'ing'
            : w+'ing';
  const ed  = last==='e' ? w+'d'
            : (last==='y' && !_isVowel(w[l-2])) ? w.slice(0,-1)+'ied'
            : _isCVC(w) ? w+last+'ed'
            : w+'ed';
  return [s, ing, ed];
}
// Plural(s) for regular nouns
function _nounForms(w) {
  const l = w.length, last = w[l-1], last2 = w.slice(-2);
  if (last==='y' && !_isVowel(w[l-2])) return [w.slice(0,-1)+'ies'];
  if (last2==='sh'||last2==='ch'||'sxz'.includes(last)) return [w+'es'];
  return [w+'s'];
}
// -ly adverb for adjectives
function _adjLy(w) {
  const l = w.length;
  if (w.slice(-2)==='le') return [w.slice(0,-1)+'y'];            // simple→simply
  if (w[l-1]==='y' && !_isVowel(w[l-2])) return [w.slice(0,-1)+'ily']; // happy→happily
  return [w+'ly'];
}

// Invariable base words in rough frequency order
const _BASE = `the of and to a in is it you that he was for on are with as his they be at
  one have this from or had by not but what all were when we there can an your which their
  said if do will each how up out two more no could my than first been its who now over
  where just well back also into much any those though three through until very while
  without yet since before between both even own same soon still again always never often
  sometimes usually already perhaps probably definitely certainly maybe okay yes no sorry
  thanks glad please hello hi hey bye hmm about above below near far here there now then
  once twice ago next last every some few many most least less all one two three four five
  six seven eight nine ten hundred truly wholly fully nearly partly fairly quite rather too
  very just only simply me him her them us we you they it its our your their his my
  so because although unless therefore thus hence anyway actually really finally recently
  today tomorrow yesterday morning afternoon evening tonight
  myself yourself himself herself itself ourselves themselves
  anything something everything nothing anyone someone everyone nobody
  anywhere somewhere everywhere nowhere
  whether neither nor either
  second third fourth fifth sixth seventh eighth ninth tenth
  another other each every several
  exactly roughly approximately currently previously
  completely entirely totally absolutely
  immediately eventually suddenly gradually constantly frequently rarely
  especially particularly specifically generally normally basically essentially primarily
  despite whereas along across throughout against
  almost always often enough both further
  somehow anyway meanwhile otherwise regardless instead
  kind of sort of a lot of a bit of
  per via etc eg ie vs re
  monday tuesday wednesday thursday friday saturday sunday
  january february march april may june july august september october november december
  am pm et pt utc gmt
  ok cool wow nice wow yep nope sure fair`.split(/\s+/).filter(Boolean);

// Irregular verb forms listed explicitly (base + all conjugations)
const _IRREG = `
  be am is are was were been being
  have has had having
  do does did done doing
  go goes went gone going
  say says said saying
  make makes made making
  know knows knew known knowing
  think thinks thought thinking
  take takes took taken taking
  see sees saw seen seeing
  come comes came coming
  get gets got gotten getting
  give gives gave given giving
  find finds found finding
  tell tells told telling
  become becomes became becoming
  feel feels felt feeling
  leave leaves left leaving
  keep keeps kept keeping
  begin begins began begun beginning
  hear hears heard hearing
  run runs ran running
  sit sits sat sitting
  stand stands stood standing
  lose loses lost losing
  meet meets met meeting
  lead leads led leading
  win wins won winning
  fall falls fell fallen falling
  cut cuts cutting
  build builds built building
  send sends sent sending
  spend spends spent spending
  grow grows grew grown growing
  hold holds held holding
  write writes wrote written writing
  speak speaks spoke spoken speaking
  buy buys bought buying
  sell sells sold selling
  read reads reading
  show shows showed shown showing
  put puts putting
  let lets letting
  set sets setting
  bring brings brought bringing
  catch catches caught catching
  teach teaches taught teaching
  draw draws drew drawn drawing
  drive drives drove driven driving
  break breaks broke broken breaking
  choose chooses chose chosen choosing
  fly flies flew flown flying
  forget forgets forgot forgotten forgetting
  fight fights fought fighting
  pay pays paid paying
  rise rises rose risen rising
  throw throws threw thrown throwing
  eat eats ate eaten eating
  drink drinks drank drunk drinking
  sing sings sang sung singing
  swim swims swam swimming
  wake wakes woke woken waking
  hit hits hitting
  hurt hurts hurting
  shut shuts shutting
  spread spreads spreading
  cost costs costing
  shoot shoots shot shooting
  wear wears wore worn wearing
  hide hides hid hidden hiding
  shake shakes shook shaken shaking
  mean means meant meaning
  understand understands understood understanding
  deal deals dealt dealing
  sleep sleeps slept sleeping
  sweep sweeps swept sweeping
  bend bends bent bending
  lend lends lent lending
  spend spends spent spending
  steal steals stole stolen stealing
  freeze freezes froze frozen freezing
  bite bites bit bitten biting
  ride rides rode ridden riding
  strike strikes struck striking
  swear swears swore sworn swearing
  tear tears tore torn tearing
  light lights lit lighting
  fit fits fitting
  quit quits quitting
  split splits splitting
  let lets letting
  shut shuts shutting
  arise arises arose arisen arising
  overcome overcomes overcame overcoming
  undergo undergoes underwent undergone undergoing
  withdraw withdraws withdrew withdrawn withdrawing
  mistake mistakes mistook mistaken mistaking
  foresee foresees foresaw foreseen foreseeing
  forbid forbids forbade forbidden forbidding
  overcome overcomes overcame overcoming
`.trim().split(/\s+/);

// Regular verbs: _verbForms applied automatically (do not list irregular verbs here)
const _REG_VERBS = `
  work call use live move love care plan stop help need want wait walk talk ask play stay
  try learn change follow check start finish watch push pull add remove test schedule look
  open close reach serve appear offer consider remember join share update fix deploy reply
  review draft complete block receive decide suggest happen allow create require include
  provide accept expect explain manage return contain pass travel visit upload download
  install launch assign approve confirm support improve increase decrease connect disable
  enable protect track search filter sort group tag mark miss save load store collect
  process render display format submit cancel delete insert select export import request
  respond post comment mention notify remind count measure compare combine handle cover
  prevent identify supply report cross fill carry press roll pick
  drop flip grab touch tap scroll click type
  log debug build release ship restart reset refresh reload
  note list book order email message text chat postpone
  deny reject publish archive restore backup sync merge
  focus pause resume toggle switch activate deactivate
  agree disagree argue discuss describe analyze propose recommend
  prioritize organize coordinate collaborate communicate
  present demonstrate validate clarify simplify optimize
  integrate configure generate automate iterate
  explore discover research practice reflect observe
  sketch prototype achieve accomplish realize perform execute
  succeed attempt approach address engage evaluate assess
  prepare finalize enter exit express notice contribute
  estimate forecast calculate benchmark
  clarify describe define outline summarize explain
  translate adapt extend limit adjust shift
  negotiate contract partner transform evolve scale
  reference link attach embed annotate highlight copy paste
  register login logout authenticate authorize
  alert escalate resolve investigate audit
  hire promote retire recruit interview onboard
  invoice quote estimate bill charge refund pay
  record track measure monitor report log
  plan draft finalize review approve release
  design architect prototype test iterate deploy
  style theme brand format layout render
  encode decode parse validate sanitize serialize
  cache queue buffer stream pipe
  clone fork branch rebase stash commit push pull
  zip compress extract convert export import
  load save open close read write append
  create rename delete move copy
  search find filter sort group paginate
  send receive forward reply redirect
  trigger fire emit listen subscribe unsubscribe
  start stop restart pause resume continue
  lock unlock block unblock enable disable
  show hide toggle expand collapse
  add remove update patch replace merge
  set get reset clear flush purge
`.trim().split(/\s+/).filter(Boolean);

// Regular nouns: _nounForms applied automatically
const _REG_NOUNS = `
  note task item meeting email report project plan team day week month year minute hour
  file folder document message comment user page link button section part step version
  issue bug feature test change word sentence paragraph chapter point idea question answer
  problem solution result option way method rule case example instance name place city
  town school road car door window room floor wall street book paper line form field
  column row table release patch log error warning success failure server client request
  response header body route endpoint function class module package library framework
  component service database record entry key value type attribute property event
  action handler callback promise variable constant parameter argument return output
  input command option flag setting config mode view model controller layout template
  block item list grid card panel tab menu bar sidebar footer header title label
  deadline presentation manager boss product update sprint ticket priority
  milestone goal metric score rate count total sum average percent ratio amount
  person friend colleague partner parent teacher doctor nurse engineer designer
  developer director leader member owner employee worker staff customer
  head hand eye ear nose mouth face arm leg foot body heart mind brain
  skill experience knowledge memory attention focus effort energy
  phone laptop computer screen keyboard mouse tablet desk chair bag box cable device
  network connection port protocol address domain host server database cluster
  food water coffee tea lunch dinner breakfast snack meal drink
  home kitchen bedroom bathroom garden park hotel airport station office
  thread conversation discussion memo summary feedback draft revision approval
  process workflow pipeline budget cost price revenue expense profit loss
  risk challenge opportunity benefit outcome impact difference progress status
  situation context background reason purpose direction strategy approach
  number letter symbol character space line break indent margin padding border
  color font size weight style class theme icon image icon avatar
  repo branch commit tag release build artifact pipeline environment variable
  token secret credential permission role scope resource endpoint api key
  ticket queue priority label milestone sprint board column swimlane
  comment review approval rejection suggestion improvement refactor
  time date period moment instant season quarter deadline schedule slot
  draft final revision version iteration prototype demo proof concept
  user story acceptance criteria definition requirement specification
  test case scenario step expected actual result pass fail skip
  backup snapshot restore migration rollback deployment rollout
  alert notification alarm reminder event webhook trigger
  chart graph table dashboard panel widget report metric
  team lead senior junior intern contractor vendor partner stakeholder
  account profile setting preference language timezone locale currency
  order invoice receipt payment refund subscription plan trial
`.trim().split(/\s+/).filter(Boolean);

// Irregular noun forms listed explicitly
const _IRREG_NOUNS = `person people man men woman women child children foot feet tooth teeth
  mouse mice life lives leaf leaves knife knives wolf wolves half halves`.split(/\s+/);

// Adjectives: _adjLy generates adverb form
const _ADJS = `
  happy sad angry glad clear clean easy hard fast slow warm cold hot wet dry loud quiet
  free busy safe sick healthy ready sure true good great nice new old young small large
  long short high low dark light bright soft strong heavy deep full real important simple
  special wonderful terrible awful strange funny serious perfect quick smart late early
  open right wrong different same available complete active current recent local public
  private common main general basic standard normal regular extra total final direct
  possible likely certain obvious useful helpful careful smart
  red blue green black white yellow orange purple pink gray brown
  big little tiny huge enormous massive medium wide narrow thick thin flat round sharp
  excellent poor decent moderate significant major minor critical urgent essential optional
  tired excited nervous worried confident calm relaxed stressed anxious exhausted
  kind patient creative innovative ambitious motivated dedicated professional skilled
  digital virtual manual automatic remote secure reliable stable efficient scalable
  blocked pending failed broken fixed enabled disabled
  related connected independent shared unique original custom individual multiple duplicate
  surprised confused interested familiar comfortable flexible appropriate consistent
  accurate relevant precise vague concrete abstract explicit implicit formal informal
  internal external global local specific generic plain fancy raw processed live cached
  open closed locked broken frozen stuck active inactive pending done
  technical operational strategic tactical financial legal medical social environmental
  written verbal visual interactive responsive adaptive progressive
  primary secondary optional mandatory core extended legacy deprecated
  weekly monthly quarterly annual daily hourly instant scheduled
  short-term long-term immediate ongoing future previous current next
  senior junior mid lead principal staff principal contract full-time part-time
  high-priority low-priority medium-priority time-sensitive critical urgent normal low
`.trim().split(/\s+/).filter(Boolean);

// Build deduplicated SEED_WORDS in frequency order
const SEED_WORDS = (() => {
  const seen = new Set();
  const all  = [];
  const add  = w => { if (w && w.length > 0 && !seen.has(w)) { seen.add(w); all.push(w); } };
  _BASE.forEach(add);
  _IRREG.forEach(add);
  _IRREG_NOUNS.forEach(add);
  _REG_VERBS.forEach(w => { add(w); _verbForms(w).forEach(add); });
  _REG_NOUNS.forEach(w => { add(w); _nounForms(w).forEach(add); });
  _ADJS.forEach(w => { add(w); _adjLy(w).forEach(add); });
  return all.join(' ');
})();


// Frequency scores: index 0 = "the" = highest. User-added words get 99999.
const WORD_FREQ = {};
(() => {
  const words = SEED_WORDS.split(' ');
  words.forEach((w, i) => { WORD_FREQ[w] = words.length - i; });
})();

// ── DOM input helpers ─────────────────────────────────────────────────────────
function getInputEl() {
  return document.querySelector('#input-wrapper input');
}

// Replace [start, end) in the real input DOM element with `text`, then fire a
// synthetic input event so Mithril's handleInput runs (updates state.input,
// manages autocomplete, etc.).  We save the resulting cursor position so that
// index.html's onupdate hook can restore it after Mithril re-renders.
function replaceInInput(text, start, end) {
  const el = getInputEl();
  if (!el) return;
  el.setRangeText(text, start, end, 'end');
  state.kb_cursor_pos = el.selectionStart;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// ── Shared helpers ────────────────────────────────────────────────────────────
// Resets all in-progress keyboard state. Called from both keyboard.js handlers
// and index.html's handleSubmit / clear-button to avoid duplicating 6 assignments.
function resetKbState() {
  state.kb_sequence = [];
  state.kb_alt_seq = [];
  state.kb_alt_mode = false;
  state.kb_caps_seq = [];
  state.kb_caps_mode = false;
  state.kb_suggestions = [];
  state.kb_input_offset = 0;
}

// Prevents focus leaving the input when tapping keyboard buttons.
const NOMOUSEDOWN = { onmousedown: e => e.preventDefault() };

// Long-press state for the space key.
let _spaceLpTimer = null;
let _spaceLpFired = false;

// Key index rows — numbers row removed; now only 3 QWERTY rows (q-t, a-g, z-b).
const KB_ROWS = [[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19]];

// Numbers / symbols layer — 3 rows × 5 keys.
// Row 1: digits 1–5, alt = shift symbols  (!@#$%)
// Row 2: digits 6–0, alt = shift symbols  (^&*())
// Row 3: common punctuation, alt = secondary punctuation
const NUM_LAYER_KEYS = [
  ['1','!'], ['2','@'], ['3','#'], ['4','$'], ['5','%'],
  ['6','^'], ['7','&'], ['8','*'], ['9','('], ['0',')'],
  ['.', ':'], [',', ';'], ['-', '_'], ["'", '"'], ['?', '/'],
];
const NUM_KB_ROWS = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14]];

// ── Lookup ────────────────────────────────────────────────────────────────────
function t9Lookup(sequence, altSeq) {
  if (!sequence.length) return { exact: [], prefix: [] };
  const len = sequence.length;
  const exact = [], prefix = [];
  for (const word of dictWords) {
    if (word.length < len) continue;
    let match = true;
    for (let i = 0; i < len; i++) {
      if (altSeq && altSeq[i]) {
        if (word[i] !== T9_KEYS[sequence[i]][1]) { match = false; break; }
      } else {
        if (CHAR_TO_KEY[word[i]] !== sequence[i]) { match = false; break; }
      }
    }
    if (!match) continue;
    if (word.length === len) exact.push(word);
    else prefix.push(word);
  }
  const byFreq = (a, b) => (WORD_FREQ[b] || 0) - (WORD_FREQ[a] || 0);
  exact.sort(byFreq);
  prefix.sort(byFreq);
  return { exact, prefix };
}

function updateT9Suggestions() {
  const { exact, prefix } = t9Lookup(state.kb_sequence, state.kb_alt_seq);
  state.kb_suggestions = [...exact, ...prefix];
  state.kb_exact_count = exact.length;
}

// ── Word helpers ──────────────────────────────────────────────────────────────
function getRawWord() {
  return state.kb_sequence.map((i, pos) => {
    const ch = T9_KEYS[i][state.kb_alt_seq[pos] ? 1 : 0];
    return state.kb_caps_seq[pos] ? ch.toUpperCase() : ch;
  }).join('');
}

function commitWord(word) {
  const wordLen = state.kb_sequence.length;
  replaceInInput(word + ' ', state.kb_input_offset, state.kb_input_offset + wordLen);
  resetKbState();
  m.redraw();
}

function addWordToDictionary(word) {
  if (!word || dictWords.includes(word)) { commitWord(word); return; }
  dictWords.push(word);
  WORD_FREQ[word] = 99999;
  if (db) dbDictPut(word);
  commitWord(word);
  showToast(`Added "${word}" to dictionary`);
}

// ── Key handlers ──────────────────────────────────────────────────────────────
function handleT9AltMode() {
  state.kb_alt_mode = !state.kb_alt_mode;
  m.redraw();
}

function handleNumLayer() {
  state.kb_num_layer = !state.kb_num_layer;
  m.redraw();
}

function handleNumKey(keyIdx) {
  // Commit any pending T9 sequence before inserting a symbol
  if (state.kb_sequence.length > 0) {
    const wordLen = state.kb_sequence.length;
    const word = state.kb_exact_count > 0 ? state.kb_suggestions[0] : getRawWord();
    replaceInInput(word, state.kb_input_offset, state.kb_input_offset + wordLen);
    resetKbState();
  }
  const el = getInputEl();
  const pos = el ? el.selectionStart : state.input.length;
  const ch = NUM_LAYER_KEYS[keyIdx][state.kb_alt_mode ? 1 : 0];
  replaceInInput(ch, pos, pos);
  state.kb_alt_mode = false;
  m.redraw();
}

function handleT9CapsMode() {
  state.kb_caps_mode = !state.kb_caps_mode;
  m.redraw();
}

function handleT9Key(keyIdx) {
  const el = getInputEl();
  if (state.kb_sequence.length === 0) state.kb_input_offset = el ? el.selectionStart : state.input.length;
  const prevLen = state.kb_sequence.length;
  state.kb_sequence.push(keyIdx);
  state.kb_alt_seq.push(state.kb_alt_mode);
  state.kb_caps_seq.push(state.kb_caps_mode);
  state.kb_alt_mode = false;
  state.kb_caps_mode = false;
  updateT9Suggestions();
  replaceInInput(getRawWord(), state.kb_input_offset, state.kb_input_offset + prevLen);
  m.redraw();
}

function handleT9Backspace() {
  if (state.kb_sequence.length > 0) {
    const prevLen = state.kb_sequence.length;
    state.kb_sequence.pop();
    state.kb_alt_seq.pop();
    state.kb_caps_seq.pop();
    updateT9Suggestions();
    replaceInInput(getRawWord(), state.kb_input_offset, state.kb_input_offset + prevLen);
  } else {
    const el = getInputEl();
    const pos = el ? el.selectionStart : state.input.length;
    if (pos > 0) replaceInInput('', pos - 1, pos);
  }
  m.redraw();
}

function handleT9Space() {
  if (state.kb_sequence.length > 0) {
    const word = state.kb_exact_count > 0 ? state.kb_suggestions[0] : getRawWord();
    const wordLen = state.kb_sequence.length;
    replaceInInput(word + ' ', state.kb_input_offset, state.kb_input_offset + wordLen);
    resetKbState();
  } else {
    const el = getInputEl();
    const pos = el ? el.selectionStart : state.input.length;
    replaceInInput(' ', pos, pos);
  }
  m.redraw();
}

function handleT9Submit() {
  if (state.kb_sequence.length > 0) {
    const wordLen = state.kb_sequence.length;
    replaceInInput(getRawWord(), state.kb_input_offset, state.kb_input_offset + wordLen);
  }
  resetKbState();
  state.kb_visible = false;
  handleSubmit();
  m.redraw();
}

// ── Mithril component ─────────────────────────────────────────────────────────
const CustomKeyboard = {
  view() {
    if (!state.kb_visible) return null;
    const sequence = state.kb_sequence;
    const rawPreview = getRawWord();
    const suggestions = state.kb_suggestions;
    const exactCount = state.kb_exact_count || 0;
    const hasPending = sequence.length > 0;
    const kbClass = [state.kb_alt_mode ? 'alt-mode' : '', state.kb_caps_mode ? 'caps-mode' : ''].filter(Boolean).join(' ');
    const caps = state.kb_caps_mode;
    const numLayer = !!state.kb_num_layer;
    const activeRows = numLayer ? NUM_KB_ROWS : KB_ROWS;
    const activeKeys = numLayer ? NUM_LAYER_KEYS : T9_KEYS;
    const onKeyPress = numLayer
      ? (keyIdx) => handleNumKey(keyIdx)
      : (keyIdx) => handleT9Key(keyIdx);

    return m('#custom-keyboard', { class: kbClass }, [
      m('#kb-suggestion-bar', [
        m('#kb-suggestions',
          suggestions.map((word, i) =>
            m('button.kb-suggestion' + (i >= exactCount ? '.prefix' : ''), {
              ...NOMOUSEDOWN,
              onclick: () => commitWord(word),
            }, word)
          ).concat(
            hasPending && exactCount === 0 && rawPreview
              ? [m('button.kb-add-word', {
                  ...NOMOUSEDOWN,
                  onclick: () => addWordToDictionary(rawPreview),
                  title: 'Add to dictionary',
                }, '+ ' + rawPreview)]
              : []
          )
        ),
        m('.kb-side-buttons', [
          m('button.secondary.kb-done', {
            ...NOMOUSEDOWN,
            onclick: () => {
              state.kb_visible = false;
              const inp = document.querySelector('#input-row input');
              if (inp) inp.blur();
              m.redraw();
            },
          }, 'done'),
          m('button.secondary.kb-backspace-bar', {
            ...NOMOUSEDOWN,
            onclick: handleT9Backspace,
            title: 'Backspace',
          }, '\u232B'),
        ]),
      ]),
      ...activeRows.map(rowIndices =>
        m('.kb-row', rowIndices.map(keyIdx => {
          const primary = activeKeys[keyIdx][0];
          const alt = activeKeys[keyIdx][1];
          const altIsAlpha = /[a-z]/i.test(alt);
          const altIsNum = /[0-9]/.test(alt);
          const altClass = altIsAlpha ? '.kb-alt-alpha' : altIsNum ? '.kb-alt-num' : '.kb-alt-sym';
          return m('button.kb-key', {
            ...NOMOUSEDOWN,
            onclick: () => onKeyPress(keyIdx),
          }, [
            m('span.kb-primary', caps ? primary.toUpperCase() : primary),
            m('span.kb-alt' + altClass, caps ? alt.toUpperCase() : alt),
          ]);
        }))
      ),
      m('.kb-row.kb-utility-row', [
        m('button.kb-key.kb-num-layer', {
          class: numLayer ? 'active' : '',
          ...NOMOUSEDOWN,
          onclick: handleNumLayer,
          title: 'Switch to numbers / symbols layer',
        }, '123'),
        m('button.kb-key.kb-alt-mode', {
          class: state.kb_alt_mode ? 'active' : '',
          ...NOMOUSEDOWN,
          onclick: handleT9AltMode,
          title: 'Next key uses alternate character',
        }, 'ALT'),
        m('button.kb-key.kb-caps-mode', {
          class: state.kb_caps_mode ? 'active' : '',
          ...NOMOUSEDOWN,
          onclick: handleT9CapsMode,
          title: 'Next key is uppercase',
        }, '\u21E7'),
        m('button.kb-key.kb-space', {
          onmousedown: e => e.preventDefault(),
          onpointerdown: e => {
            e.preventDefault();
            _spaceLpFired = false;
            // Long-press only fires when there are prefix suggestions but no exact match
            if (state.kb_sequence.length > 0 && state.kb_exact_count === 0 && state.kb_suggestions.length > 0) {
              _spaceLpTimer = setTimeout(() => {
                _spaceLpFired = true;
                const word = state.kb_suggestions[0];
                const wordLen = state.kb_sequence.length;
                replaceInInput(word + ' ', state.kb_input_offset, state.kb_input_offset + wordLen);
                resetKbState();
                m.redraw();
              }, 450);
            }
          },
          onpointerup:     () => clearTimeout(_spaceLpTimer),
          onpointercancel: () => clearTimeout(_spaceLpTimer),
          onclick: () => { if (_spaceLpFired) { _spaceLpFired = false; return; } handleT9Space(); },
        }, 'SPACE'),
        m('button.kb-key.kb-submit', { ...NOMOUSEDOWN, onclick: handleT9Submit }, '\u23CE'),
      ]),
    ]);
  }
};
