import { buildProperties, normaliseUrl, textObjects } from '../.tmp-intake-lib.mjs';
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
