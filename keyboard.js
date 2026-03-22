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

    .kb-backspace { flex: 1; font-size: 1.1rem; }

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
// SEED_WORDS is kept as a global so the DB-seeding code in index.html can use it.
// Words are roughly in English frequency order; earlier = more common.
const SEED_WORDS = `the of and to a in is it you that he was for on are with as his they be at one have this from or had by hot but some what there we can out other were all your when up use word how said an each she which do their time if will way about many then them write would like so these her long make thing see him two has look more day could go come did number sound no most people my over know water than call first who may down side been now find any new work part take get place made live where after back little only round man year came show every good me give our under name very through just form sentence great think say help low line differ turn cause much mean before move right boy old too same tell does set three want air well also play small end put home read hand port large spell add even land here must big high such follow act why ask men change went light kind off need house picture try us again animal point mother world near build self earth father head stand own page should country found answer school grow study still learn plant cover food sun four between state keep eye never last let thought city tree cross farm hard start might story saw far sea draw left late run while press close night real life few north open seem together next white children begin got walk example ease paper group always music those both mark often letter until mile river car feet care second enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure door product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass since top whole king space heard best hour better true during hundred five remember step early hold west ground interest reach fast verb sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map rain rule govern pull cold notice voice unit power town fine certain fly fall lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop ocean warm free minute strong special heavy diamond window sharp matter friend floor beautiful within often process clear deep full mark sure red small old even mean keep children feet side face wood between able seem head later become plan real felt hundred city trees run cut face base started follow love road soon last together next car below paper days white hundred soon group feet letter took science eat room friend began idea fish mountain stop once base hear horse cut sure watch color face wood main open seem half life always those both form sentence often letter enough plain young ready above ever list while main along watch those real light put end does large door hand move spell let back again animal then also two help between take every near add food keep children school start might story cross farm hard`;

// Frequency scores: index 0 = "the" = highest. User-added words get 99999.
const WORD_FREQ = {};
(() => {
  const words = SEED_WORDS.split(' ');
  words.forEach((w, i) => { WORD_FREQ[w] = words.length - i; });
})();

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

// Key index rows — constant, defined once outside view().
const KB_ROWS = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19]];

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
  state.input = state.input.slice(0, state.kb_input_offset) + word + ' ';
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

function handleT9CapsMode() {
  state.kb_caps_mode = !state.kb_caps_mode;
  m.redraw();
}

function handleT9Key(keyIdx) {
  if (state.kb_sequence.length === 0) state.kb_input_offset = state.input.length;
  state.kb_sequence.push(keyIdx);
  state.kb_alt_seq.push(state.kb_alt_mode);
  state.kb_caps_seq.push(state.kb_caps_mode);
  state.kb_alt_mode = false;
  state.kb_caps_mode = false;
  updateT9Suggestions();
  state.input = state.input.slice(0, state.kb_input_offset) + getRawWord();
  m.redraw();
}

function handleT9Backspace() {
  if (state.kb_sequence.length > 0) {
    state.kb_sequence.pop();
    state.kb_alt_seq.pop();
    state.kb_caps_seq.pop();
    updateT9Suggestions();
    state.input = state.input.slice(0, state.kb_input_offset) + getRawWord();
  } else {
    state.input = state.input.slice(0, -1);
  }
  m.redraw();
}

function handleT9Space() {
  if (state.kb_sequence.length > 0) {
    const word = state.kb_exact_count > 0 ? state.kb_suggestions[0] : getRawWord();
    state.input = state.input.slice(0, state.kb_input_offset) + word + ' ';
    resetKbState();
  } else {
    state.input += ' ';
  }
  m.redraw();
}

function handleT9Submit() {
  if (state.kb_sequence.length > 0)
    state.input = state.input.slice(0, state.kb_input_offset) + getRawWord();
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
    return m('#custom-keyboard', { class: kbClass }, [
      m('#kb-suggestion-bar', [
        m('#kb-suggestions',
          suggestions.map((word, i) =>
            m('button.kb-suggestion' + (i >= exactCount ? '.prefix' : ''), {
              ...NOMOUSEDOWN,
              onclick: () => commitWord(word),
            }, word)
          )
        ),
        m('.kb-side-buttons', [
          hasPending && exactCount === 0
            ? m('button.kb-add-word', {
                ...NOMOUSEDOWN,
                onclick: () => addWordToDictionary(rawPreview),
                title: 'Add to dictionary',
              }, '+ dict')
            : null,
          m('button.secondary.kb-done', {
            ...NOMOUSEDOWN,
            onclick: () => {
              state.kb_visible = false;
              const inp = document.querySelector('#input-row input');
              if (inp) inp.blur();
              m.redraw();
            },
          }, 'done'),
        ]),
      ]),
      ...KB_ROWS.map(rowIndices =>
        m('.kb-row', rowIndices.map(keyIdx => {
          const primary = T9_KEYS[keyIdx][0];
          const alt = T9_KEYS[keyIdx][1];
          const altIsAlpha = /[a-z]/i.test(alt);
          const altIsNum = /[0-9]/.test(alt);
          const altClass = altIsAlpha ? '.kb-alt-alpha' : altIsNum ? '.kb-alt-num' : '.kb-alt-sym';
          return m('button.kb-key', {
            ...NOMOUSEDOWN,
            onclick: () => handleT9Key(keyIdx),
          }, [
            m('span.kb-primary', caps ? primary.toUpperCase() : primary),
            m('span.kb-alt ' + altClass, caps ? alt.toUpperCase() : alt),
          ]);
        }))
      ),
      m('.kb-row.kb-utility-row', [
        m('button.kb-key.kb-backspace', { ...NOMOUSEDOWN, onclick: handleT9Backspace }, '\u232B'),
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
                state.input = state.input.slice(0, state.kb_input_offset) + word + ' ';
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
