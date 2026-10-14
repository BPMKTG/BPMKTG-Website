import { buildProperties, normaliseUrl, textObjects, missingRequired } from '../.tmp-intake-lib.mjs';
let pass = 0, fail = 0;
const is = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, '\n       got ', g, '\n       want', w); }
};

// URL normalisation
is('url: adds scheme', normaliseUrl('instagram.com/x'), 'https://instagram.com/x');
is('url: keeps scheme', normaliseUrl('https://a.com/b'), 'https://a.com/b');
is('url: bare word rejected', normaliseUrl('soundcloud'), null);
is('url: blank rejected', normaliseUrl('   '), null);

// Chunking at Notion's 2000-char limit
const long = 'x'.repeat(4500);
const chunks = textObjects(long);
is('chunk: count', chunks.length, 3);
is('chunk: sizes', chunks.map(c => c.text.content.length), [2000, 2000, 500]);

// Property building
const props = buildProperties({
  'Artist Name': 'Sean Comma',
  'Your Name': 'Sean C',
  'Email': 'sean@example.com',
  'Phone': '',                                   // empty -> omitted
  'Best Way to Reach You': 'Text',               // allowed select
  'Shows per month (average)': 'nonsense',       // bad select -> omitted
  'Events you are targeting': ['Clubs', 'Hacked'], // filtered
  'Link to your footage folder': 'drive.google.com/f/1',
  'Instagram': 'not a url at all',               // unsalvageable -> fallback
  'Other links': 'soundcloud.com/x',
  'Home City': '   ',                            // whitespace -> omitted
});

is('title type', props['Artist Name'], { title: [{ type: 'text', text: { content: 'Sean Comma' } }] });
is('email type', props['Email'], { email: 'sean@example.com' });
is('empty phone omitted', 'Phone' in props, false);
is('whitespace omitted', 'Home City' in props, false);
is('valid select kept', props['Best Way to Reach You'], { select: { name: 'Text' } });
is('invalid select omitted', 'Shows per month (average)' in props, false);
is('multi_select filtered', props['Events you are targeting'], { multi_select: [{ name: 'Clubs' }] });
is('url normalised', props['Link to your footage folder'], { url: 'https://drive.google.com/f/1' });
is('bad url not written as url', 'Instagram' in props, false);
is('bad url salvaged into Other links',
   props['Other links'].rich_text[0].text.content,
   'soundcloud.com/x\nInstagram: not a url at all');

// ── The step 6 platform links ──────────────────────────────────
// Every one is a Notion url property, so all three paths matter:
// already-valid, missing scheme, and unsalvageable.
const links = buildProperties({
  'Instagram': 'https://instagram.com/seancomma',
  'TikTok': 'tiktok.com/@seancomma',
  'Threads': 'threads.net/@seancomma',
  'X (Twitter)': 'https://x.com/seancomma',
  'YouTube': 'youtube.com/@seancomma',
  'Spotify': 'https://open.spotify.com/artist/abc',
  'Apple Music': 'music.apple.com/artist/seancomma',
  'SoundCloud': 'soundcloud.com/seancomma',
});

is('threads: scheme prepended', links['Threads'], { url: 'https://threads.net/@seancomma' });
is('x (twitter): kept as given', links['X (Twitter)'], { url: 'https://x.com/seancomma' });
is('apple music: scheme prepended', links['Apple Music'], { url: 'https://music.apple.com/artist/seancomma' });
is('soundcloud: scheme prepended', links['SoundCloud'], { url: 'https://soundcloud.com/seancomma' });
is('tiktok still fine alongside', links['TikTok'], { url: 'https://tiktok.com/@seancomma' });

// Unsalvageable values go to Other links rather than failing the write.
const badLinks = buildProperties({
  'Threads': 'my threads handle',
  'X (Twitter)': '@seancomma',
  'Apple Music': 'ask me',
  'SoundCloud': 'soundcloud',          // bare word, no dot
  'Other links': 'Bandcamp: example',
});

is('bad platform links are not written as urls',
   ['Threads', 'X (Twitter)', 'Apple Music', 'SoundCloud'].some(k => k in badLinks),
   false);
is('bad platform links salvaged into Other links',
   badLinks['Other links'].rich_text[0].text.content,
   'Bandcamp: example\nThreads: my threads handle\nX (Twitter): @seancomma\nApple Music: ask me\nSoundCloud: soundcloud');

is('empty platform links omitted',
   Object.keys(buildProperties({ 'Threads': '', 'SoundCloud': '   ' })).length, 0);

// ── Required-field validation ──────────────────────────────────
// A complete, valid submission for the eight required fields.
const complete = {
  'Artist Name': 'Sean Comma',
  'Your Name': 'Sean C',
  'Email': 'sean@example.com',
  'In one sentence, what is your project about?': 'Bass music with a message.',
  'Who is your ideal fan?': 'Festival regulars in their twenties.',
  'Footage you already have': ['Live show footage', 'Photos'],
  'How often do you post right now?': 'Weekly',
  'What does a win look like in 90 days?': 'A real audience.',
};

is('required: complete submission passes', missingRequired(complete), []);

is('required: all eight reported when empty',
   missingRequired({}).length, 8);

is('required: blank string counts as missing',
   missingRequired({ ...complete, 'Who is your ideal fan?': '   ' }),
   ['Who is your ideal fan?']);

// The multi_select cases are the ones the old string-only check got wrong.
is('required: empty multi_select missing',
   missingRequired({ ...complete, 'Footage you already have': [] }),
   ['Footage you already have']);

is('required: single-value multi_select accepted as a bare string',
   missingRequired({ ...complete, 'Footage you already have': 'Photos' }),
   []);

is('required: multi_select of junk does not satisfy',
   missingRequired({ ...complete, 'Footage you already have': ['Nonsense'] }),
   ['Footage you already have']);

is('required: select must be a real option',
   missingRequired({ ...complete, 'How often do you post right now?': 'Occasionally' }),
   ['How often do you post right now?']);

is('required: optional fields never reported',
   missingRequired({ ...complete, 'Phone': '', 'Distributor': '' }), []);

// Reported by label, which is what the person actually sees.
is('required: reported by label not property',
   missingRequired({ ...complete, 'Artist Name': '' }), ['Artist name']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
