/* The Content Vault. Rules, the store (its SQL run for real against
   the SQLite that ships with Node), the sync against a stand-in for
   Drive, and what the routes are made of.

   Run with `npm run test:vault`. Nothing here touches a network. */
import fs from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { FakeD1, FakeR2 } from './_d1-shim.mjs';

const V = await import('../.tmp-vault-lib.mjs');

let pass = 0, fail = 0;
const is = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, '\n       got ', g, '\n       want', w); }
};
const ok = (name, cond) => is(name, Boolean(cond), true);
const section = (title) => console.log(`\n${title}`);
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

/* ══ the rules ══════════════════════════════════════════════════ */

section('Vault · folders: the show, the date, unreleased');
{
  const { datedFolder, monthFolder, yearFolder, isIdsFolder, placeFile, fileDate, exifDay } = V;
  is('a dated folder is a day and a name', datedFolder('2026-11-07 Revival After Dark'), { date: '2026-11-07', show: 'Revival After Dark' });
  is('a dash or a dot between them is not part of the name', [datedFolder('2026-11-07 - Rooftop Revival'), datedFolder('2026.11.07_Twins')], [{ date: '2026-11-07', show: 'Rooftop Revival' }, { date: '2026-11-07', show: 'Twins' }]);
  is('a day and nothing else has no name', datedFolder('2026-11-07'), { date: '2026-11-07', show: null });
  is('a date that is not a real day is not a date', [datedFolder('2026-13-07 Nope'), datedFolder('2026-02-30 Nope'), datedFolder('Revival 2026-11-07'), datedFolder('20261107 Revival')], [null, null, null, null]);
  is('a month folder and a year folder', [monthFolder('2026-11'), monthFolder('2026-13'), monthFolder('2026-11-07'), yearFolder('2026'), yearFolder('1066'), yearFolder('2026-11')], ['2026-11', null, null, '2026', null, null]);
  is('the IDs folder, whatever its capitals', [isIdsFolder('_IDS'), isIdsFolder('_ids'), isIdsFolder('IDs'), isIdsFolder('_IDS old')], [true, true, false, false]);

  is('Footage Drop: the shoot folder gives the show and the day, and the file is Raw with no source yet',
     placeFile('drop', ['2026-11-07 Revival After Dark', 'Cam B']),
     { kind: 'Raw', source: null, unreleased: false, show: 'Revival After Dark', guess: null, needsShow: false, date: '2026-11-07' });
  is('Footage Drop: anything under _IDS is unreleased, at any depth',
     [placeFile('drop', ['_IDS']).unreleased, placeFile('drop', ['_IDS', '2026-11-07 Revival After Dark']).unreleased, placeFile('drop', ['2026-11-07 Revival After Dark', '_IDS']).unreleased, placeFile('drop', ['2026-11-07 Revival After Dark']).unreleased],
     [true, true, true, false]);
  is('Footage Drop: an ID inside a shoot keeps the shoot', placeFile('drop', ['_IDS', '2026-11-07 Revival After Dark']).show, 'Revival After Dark');
  is('Footage Drop: an ID with no shoot around it is not waiting on a show', [placeFile('drop', ['_IDS']).needsShow, placeFile('drop', ['_IDS']).show], [false, null]);
  is('Footage Drop: a file lying loose, or in a folder with an odd name, is kept and asked about',
     [placeFile('drop', []), placeFile('drop', ['Phone dump', 'Saturday'])].map((p) => [p.needsShow, p.guess, p.show]), [[true, null, null], [true, 'Phone dump', null]]);
  is('_IDS is only a thing in Footage Drop', [placeFile('finished', ['2026', '2026-11', '_IDS']).unreleased, placeFile('archive', ['_IDS']).unreleased], [false, false]);

  is('Finished Content: YYYY/YYYY-MM/<show>/... gives the month and the show, and deeper folders are filing',
     placeFile('finished', ['2026', '2026-11', 'Revival After Dark', 'Post Show', 'Photo']),
     { kind: 'Finished', source: 'Blueprint', unreleased: false, show: 'Revival After Dark', guess: null, needsShow: false, date: '2026-11' });
  is('Finished Content: without the year folder it reads the same', placeFile('finished', ['2026-11', 'Revival After Dark', 'Photo']).show, 'Revival After Dark');
  is('Finished Content: a file loose in a month folder has the month and no show', [placeFile('finished', ['2026', '2026-11']).date, placeFile('finished', ['2026', '2026-11']).needsShow, placeFile('finished', ['2026', '2026-11']).guess], ['2026-11', true, null]);
  is('Finished Content: older work filed YYYY/<show>/... takes the year from the first folder and the show from the second',
     placeFile('finished', ['2023', 'Rebelz Showoffs 2023', 'Rebellion']),
     { kind: 'Finished', source: 'Blueprint', unreleased: false, show: 'Rebelz Showoffs 2023', guess: null, needsShow: false, date: '2023' });
  is('Finished Content: however deep the filing under it goes', placeFile('finished', ['2025', 'Season 15 Cheer Pics', 'Lady Legacy', 'Addison Smith']).show, 'Season 15 Cheer Pics');
  is('Finished Content: a file loose in a year folder has no folder to name it, so it is asked about', [placeFile('finished', ['2023']).needsShow, placeFile('finished', ['2023']).guess, placeFile('finished', ['2023']).date], [true, null, '2023']);
  is('Finished Content: a month folder still wins over a year alone', [placeFile('finished', ['2026', '2026-11', 'Revival After Dark']).date, placeFile('finished', ['2026', '2026-11', 'Revival After Dark']).show], ['2026-11', 'Revival After Dark']);
  is('the year shape is Finished Content’s: an Archive folder named for a year is still only a guess', [placeFile('archive', ['2023', 'Old shows']).needsShow, placeFile('archive', ['2023', 'Old shows']).guess], [true, 'Old shows']);
  is('Finished Content: a show folder that carries its own day gives the day', placeFile('finished', ['2026', '2026-11', '2026-11-15 Revival After Dark']), { kind: 'Finished', source: 'Blueprint', unreleased: false, show: 'Revival After Dark', guess: null, needsShow: false, date: '2026-11-15' });

  is('Archive: nothing is trusted but a dated folder, and the rest is a guess from the top folder',
     [placeFile('archive', ['Old shows', 'Photos'], 'Sean archive'), placeFile('archive', [], 'Sean archive'), placeFile('archive', ['2024-06-01 Pride Rooftop', 'Edits'], 'Sean archive')].map((p) => [p.kind, p.source, p.show, p.guess, p.needsShow, p.date]),
     [['Raw', 'Archive', null, 'Old shows', true, null], ['Raw', 'Archive', null, 'Sean archive', true, null], ['Raw', 'Archive', 'Pride Rooftop', null, false, '2024-06-01']]);
  ok('no folder shape makes a file disappear: every placement names a kind', [['drop', []], ['drop', ['??']], ['finished', []], ['finished', ['x', 'y', 'z']], ['archive', []], ['archive', ['', ' ']]].every(([r, f]) => !!V.placeFile(r, f).kind));

  is('Drive writes a camera time with colons', [exifDay('2026:11:07 21:14:03'), exifDay('2026-11-07T21:14:03'), exifDay('0000:00:00 00:00:00'), exifDay('')], ['2026-11-07', '2026-11-07', null, null]);
  is('date: the folder’s day wins', fileDate('2026-11-07', '2026:11:09 01:00:00', '2026-11-20T00:00:00Z', null), { date: '2026-11-07', from: 'folder' });
  is('date: a month is sharpened to the day it was taken when that day is in the month, and left alone when it is not',
     [fileDate('2026-11', '2026:11:15 22:00:00', null, null), fileDate('2026-11', '2026:10:31 22:00:00', null, null), fileDate('2026-11', null, '2026-11-20T00:00:00Z', null)],
     [{ date: '2026-11-15', from: 'folder' }, { date: '2026-11', from: 'folder' }, { date: '2026-11', from: 'folder' }]);
  is('date: a year is sharpened by the day it was taken, then by the day Drive says it was created, then last changed',
     [fileDate('2023', '2023:05:04 10:00:00', '2023-06-01T00:00:00Z', null), fileDate('2023', null, '2023-06-01T10:00:00Z', '2023-05-30T10:00:00Z'), fileDate('2023', null, '2026-03-01T10:00:00Z', '2023-05-30T10:00:00Z')],
     [{ date: '2023-05-04', from: 'folder' }, { date: '2023-06-01', from: 'folder' }, { date: '2023-05-30', from: 'folder' }]);
  is('date: a file’s own date outside its folder’s year is not believed over the folder', [fileDate('2023', '2026:01:01 10:00:00', '2026-03-01T10:00:00Z', '2026-03-01T10:00:00Z'), fileDate('2023', null, null, null)], [{ date: '2023', from: 'folder' }, { date: '2023', from: 'folder' }]);
  is('date: a month is not sharpened by an upload day', fileDate('2026-11', null, '2026-11-20T00:00:00Z', '2026-11-20T00:00:00Z'), { date: '2026-11', from: 'folder' });
  is('date: with no folder date it is the day it was taken, then the earliest day Drive has for the file',
     [fileDate(null, '2026:11:15 22:00:00', '2026-11-20T00:00:00Z', null), fileDate(null, null, '2026-11-20T10:00:00Z', '2026-11-16T03:00:00Z'), fileDate(null, null, null, null)],
     [{ date: '2026-11-15', from: 'taken' }, { date: '2026-11-16', from: 'file' }, { date: null, from: null }]);
}

section('Vault · type, orientation, keepers');
{
  const { vaultType, vaultOrientation, isVaultMedia, isKeeper, isUnsorted, VAULT_TYPES, VAULT_SOURCES, VAULT_RATINGS, canPlay, MAX_PLAY_SECONDS } = V;
  is('the lists are the ones asked for: no Audio, and Archive and Blueprint among the sources',
     [VAULT_TYPES, VAULT_RATINGS, VAULT_SOURCES], [['Photo', 'Video', 'Graphic'], ['Hero', 'Strong', 'Usable'], ['Own shooter', 'Crowd', 'Other artist', 'Phone', 'Festival', 'Archive', 'Blueprint']]);
  is('only images and videos are logged', ['image/jpeg', 'image/heic', 'video/quicktime', 'audio/mpeg', 'application/pdf', 'application/vnd.google-apps.folder', ''].map(isVaultMedia), [true, true, true, false, false, false, false]);
  is('type: a video, a photo, and a graphic by format or by folder',
     [vaultType('video/mp4'), vaultType('image/jpeg'), vaultType('image/png'), vaultType('image/jpeg', ['2026-11', 'Revival', 'Flyers']), vaultType('image/jpeg', ['Photos'])], ['Video', 'Photo', 'Graphic', 'Graphic', 'Photo']);
  is('orientation: from the size, a camera held on its side swapped, and near enough square is Square',
     [vaultOrientation(1080, 1920), vaultOrientation(1920, 1080), vaultOrientation(7008, 4672, 1), vaultOrientation(7008, 4672, 2), vaultOrientation(1080, 1100), vaultOrientation(0, 10), vaultOrientation(null, null)],
     ['Vertical', 'Horizontal', 'Vertical', 'Horizontal', 'Square', null, null]);
  const f = (o) => ({ kind: 'Raw', star: false, rating: null, missing: false, ...o });
  is('a keeper is a Finished file, or a Raw one somebody starred or rated', [f({}), f({ star: true }), f({ rating: 'Usable' }), f({ kind: 'Finished' })].map(isKeeper), [false, true, true, true]);
  is('unsorted is a Raw file nobody has starred or rated, that is still there', [f({}), f({ star: true }), f({ kind: 'Finished' }), f({ missing: true })].map(isUnsorted), [true, false, false, false]);
  is('play on demand: five minutes and under, and never a length nobody knows', [canPlay(44), canPlay(MAX_PLAY_SECONDS), canPlay(MAX_PLAY_SECONDS + 1), canPlay(null), canPlay(0), MAX_PLAY_SECONDS], ['yes', 'yes', 'too_long', 'unknown', 'unknown', 300]);
}

const file = (o = {}) => ({
  id: 'a'.repeat(32), drive: 'D1', name: 'DSC001.jpg', type: 'Photo', kind: 'Finished', root: 'finished', o: 'Vertical', w: 4000, h: 6000,
  dur: null, size: 1, show: 'Revival After Dark', date: '2026-11-15', path: 'Finished Content / 2026 / 2026-11 / Revival After Dark', un: false, missing: false,
  star: false, rating: null, source: 'Blueprint', tags: [], notes: '', held: false, used: 0, t: null, added: 1, ...o,
});

section('Vault · finding things');
{
  const { matchesFilter, VAULT_VIEWS, viewById, showGaps, sortFiles, searchText, NO_SHOW } = V;
  const raw = file({ id: 'b'.repeat(32), kind: 'Raw', root: 'drop', source: null, name: 'C0012.mp4', type: 'Video', o: 'Vertical', dur: 30 });
  const files = [
    file(),
    file({ id: 'c'.repeat(32), name: 'hero.jpg', rating: 'Hero', tags: ['Crowd', 'lasers'], notes: 'the confetti one' }),
    file({ id: 'd'.repeat(32), name: 'used.mp4', type: 'Video', o: 'Vertical', used: 2 }),
    file({ id: 'e'.repeat(32), name: 'held.mp4', type: 'Video', o: 'Horizontal', held: true }),
    raw,
    file({ id: 'f'.repeat(32), kind: 'Raw', root: 'drop', name: 'id1.mp4', type: 'Video', o: null, un: true, show: null, date: null, star: true }),
    file({ id: '1'.repeat(32), name: 'gone.jpg', missing: true }),
    file({ id: '2'.repeat(32), kind: 'Raw', root: 'archive', name: 'old.jpg', show: null, needsShow: true, guess: 'Old shows', date: '2024' }),
  ];
  const names = (filter) => files.filter((x) => matchesFilter(x, filter)).map((x) => x.name);
  const view = (id) => names(viewById(id).filter);
  is('the default view is keepers only', [VAULT_VIEWS[0].id, view('keepers')], ['keepers', ['DSC001.jpg', 'hero.jpg', 'used.mp4', 'held.mp4', 'id1.mp4']]);
  is('Unsorted is the Raw files nobody has starred or rated', view('unsorted'), ['C0012.mp4', 'old.jpg']);
  is('Never posted leaves out what is used and what is held', view('never'), ['DSC001.jpg', 'hero.jpg', 'id1.mp4']);
  is('the saved views asked for are all there', VAULT_VIEWS.map((v) => v.label), ['Keepers', 'Unsorted', 'Never posted', 'Vertical video', 'Hero shots', 'Unreleased IDs', 'By show', 'Finished', 'Needs a show', 'Everything']);
  is('Vertical video, Hero shots, Unreleased IDs, Finished', [view('vertical'), view('hero'), view('ids'), view('finished')], [['used.mp4'], ['hero.jpg'], ['id1.mp4'], ['DSC001.jpg', 'hero.jpg', 'used.mp4', 'held.mp4']]);
  is('Needs a show is ours, and By show is drawn a show at a time', [viewById('needs-show').ours, view('needs-show'), viewById('shows').byShow], [true, ['old.jpg'], true]);
  is('a missing file is in no view but the one that asks for it', [view('all').includes('gone.jpg'), names({ shelf: 'missing' })], [false, ['gone.jpg']]);
  is('filters: kind, type, orientation, show, rating, source, tag, used, unreleased, held',
     [names({ shelf: 'all', kind: 'Raw' }), names({ shelf: 'all', type: 'Video', o: 'Horizontal' }), names({ shelf: 'all', show: NO_SHOW }), names({ shelf: 'all', rating: 'Hero' }),
      names({ shelf: 'all', source: 'none' }), names({ shelf: 'all', tag: 'crowd' }), names({ shelf: 'all', used: 'used' }), names({ shelf: 'all', un: true }), names({ shelf: 'all', held: true })],
     [['C0012.mp4', 'id1.mp4', 'old.jpg'], ['held.mp4'], ['id1.mp4', 'old.jpg'], ['hero.jpg'], ['C0012.mp4'], ['hero.jpg'], ['used.mp4'], ['id1.mp4'], ['held.mp4']]);
  is('search: every word, in the name, the show, a tag, a note or the folders, whatever the capitals',
     [names({ shelf: 'all', q: 'LASERS hero' }), names({ shelf: 'all', q: 'confetti' }), names({ shelf: 'all', q: 'revival dsc' }), names({ shelf: 'all', q: 'old shows' }), names({ shelf: 'all', q: 'nothing matches this' })],
     [['hero.jpg'], ['hero.jpg'], ['DSC001.jpg'], ['old.jpg'], []]);
  ok('search does not look inside ids', !searchText(files[0]).includes('aaaa'));
  is('newest first, a month before its days, then by name the way a camera numbers them',
     sortFiles([file({ name: 'DSC10.jpg' }), file({ name: 'DSC9.jpg' }), file({ name: 'a.jpg', date: '2026-12' }), file({ name: 'z.jpg', date: null })]).map((x) => x.name), ['a.jpg', 'DSC9.jpg', 'DSC10.jpg', 'z.jpg']);

  const gaps = showGaps(files);
  is('gaps: a show’s photos, vertical video and horizontal video, counted over keepers, with the unsorted beside',
     gaps.map((g) => [g.show, g.photos, g.vertical, g.horizontal, g.unsorted]), [['Revival After Dark', 2, 1, 1, 1], [NO_SHOW, 0, 0, 0, 1]]);
  is('gaps: a missing file is not counted, and a show with none of something says nought', [gaps[0].keepers, showGaps([file({ type: 'Photo' })])[0].vertical], [4, 0]);
}

section('Vault · who may change what');
{
  const { cleanVaultEdit, cleanIds, cleanTag, cleanTags, mergeTags, CLIENT_VAULT_EDITS, ADMIN_VAULT_EDITS, MAX_EDIT_IDS, MAX_USE_IDS, isVaultId } = V;
  const everything = { star: true, tagsAdd: ['crowd'], tagsRemove: ['blurry'], notes: ' a note ', rating: 'Hero', source: 'Phone', type: 'Graphic', show: 'Revival', confirmShow: true, hold: { kind: 'item', id: 'a'.repeat(32) }, used: true, madeFrom: { id: 'b'.repeat(32), on: true } };
  const asClient = cleanVaultEdit(everything, 'client');
  is('a client may star, tag and write notes', asClient.edit, { star: true, tagsAdd: ['crowd'], tagsRemove: ['blurry'], notes: 'a note' });
  is('and everything else a client sends is dropped', asClient.rejected.sort(), ['confirmShow', 'hold', 'madeFrom', 'rating', 'show', 'source', 'type', 'used']);
  is('the list of what a client may change is exactly that', [...CLIENT_VAULT_EDITS], ['star', 'tagsAdd', 'tagsRemove', 'notes']);
  ok('everything a client may change, we may', CLIENT_VAULT_EDITS.every((k) => ADMIN_VAULT_EDITS.includes(k)));
  const asAdmin = cleanVaultEdit(everything, 'admin');
  is('one of us may set all of it; a typed show wins over "confirm the guess"', [Object.keys(asAdmin.edit).sort(), asAdmin.rejected], [['hold', 'madeFrom', 'notes', 'rating', 'show', 'source', 'star', 'tagsAdd', 'tagsRemove', 'type', 'used'], []]);
  is('values are held to the lists: no Audio, no invented rating or source',
     cleanVaultEdit({ type: 'Audio', rating: 'Amazing', source: 'TikTok', show: '   ', hold: { kind: 'client', id: 'x' }, star: 'yes', madeFrom: { id: 'nope', on: true } }, 'admin'),
     { edit: {}, rejected: ['type', 'rating', 'source', 'show', 'hold', 'star', 'madeFrom'] });
  is('clearing is allowed where clearing means something', cleanVaultEdit({ rating: null, source: null, show: null, hold: null }, 'admin').edit, { rating: null, source: null, show: null, hold: null });
  is('a hold’s id may be dashed, and only ever names a page', cleanVaultEdit({ hold: { kind: 'campaign', id: 'AAAAAAAA-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'ignored' } }, 'admin').edit, { hold: { kind: 'campaign', id: 'a'.repeat(32) } });
  is('a field nobody has heard of is dropped, for either', [cleanVaultEdit({ client: 'x', drive_id: 'y', missing: false }, 'admin'), cleanVaultEdit({ thumb_key: 'previews/other/x' }, 'client')].map((r) => [r.edit, r.rejected]), [[{}, ['client', 'drive_id', 'missing']], [{}, ['thumb_key']]]);

  is('a tag is tidied', [cleanTag('  #Crowd   shot '), cleanTag('a,b'), cleanTag(''), cleanTag(7), cleanTag('x'.repeat(60)).length], ['Crowd shot', 'a b', null, null, 40]);
  is('no two tags the same, whatever their capitals', cleanTags(['Crowd', 'crowd', ' lasers', '', null, 'CROWD']), ['Crowd', 'lasers']);
  is('tags are added to and taken from what a file has', mergeTags(['Crowd', 'lasers'], ['confetti', 'crowd'], ['LASERS']), ['Crowd', 'confetti']);
  is('ids: Vault ids only, once each, in the order given, and not too many',
     [cleanIds(['b'.repeat(32), 'a'.repeat(32), 'b'.repeat(32)]), cleanIds([]), cleanIds('x'), cleanIds(['a'.repeat(32), '../x']), cleanIds(new Array(MAX_EDIT_IDS + 1).fill('a'.repeat(32))), cleanIds(new Array(MAX_USE_IDS + 1).fill(0).map((_, i) => String(i).padStart(32, '0')), MAX_USE_IDS)],
     [['b'.repeat(32), 'a'.repeat(32)], null, null, null, null, null]);
  is('an id is thirty-two hex and nothing else', [isVaultId('a'.repeat(32)), isVaultId('A'.repeat(32)), isVaultId('a'.repeat(31)), isVaultId(null)], [true, false, false, false]);
}

section('Vault · how things are said');
{
  const { vaultDateLabel, durationLabel, sizeLabel, useTitle, useMedia, newFilesLabel, vaultUrl, hqVaultUrl, thumbUrl, vaultFilesMessage, mediaReadyMessage, CLIENT_KINDS, ADMIN_KINDS } = V;
  is('a day, a month, a year', [vaultDateLabel('2026-11-07'), vaultDateLabel('2026-11'), vaultDateLabel('2026'), vaultDateLabel(null)], ['Nov 7, 2026', 'Nov 2026', '2026', '']);
  is('a length', [durationLabel(44), durationLabel(725), durationLabel(3730), durationLabel(0)], ['0:44', '12:05', '1:02:10', '']);
  is('a size', [sizeLabel(900), sizeLabel(5 * 1024 * 1024), sizeLabel(184 * 1024 * 1024), sizeLabel(3 * 1024 ** 3), sizeLabel(null)], ['1 KB', '5.0 MB', '184 MB', '3.0 GB', '']);
  is('a new Idea is called after its show and its file, or its slides', [useTitle([file()]), useTitle([file(), file()]), useTitle([file({ show: null, name: 'clip.final.mp4' })]), useTitle([])], ['Revival After Dark: DSC001', 'Revival After Dark: 2 slides', 'clip.final', 'From the Vault']);
  is('and its Media and Source are the pipeline’s own words', [useMedia([file()]), useMedia([file({ type: 'Video' })]), useMedia([file({ type: 'Graphic' })]), useMedia([file(), file()])],
     [{ media: 'Photo', source: 'Show Media' }, { media: 'Video', source: 'Show Media' }, { media: 'Graphic', source: 'Flyer / Graphic' }, { media: 'Carousel', source: 'Show Media' }]);
  is('addresses', [vaultUrl('sean-comma'), vaultUrl('sean-comma', 'Revival: Holy Night'), hqVaultUrl(), hqVaultUrl('sean-comma'), thumbUrl('sean-comma', 'a'.repeat(32))],
     ['/portal/sean-comma#/vault', '/portal/sean-comma#/vault/show/Revival%3A%20Holy%20Night', '/portal/hq#/vault', '/portal/hq#/vault/sean-comma', `/portal/sean-comma/vault/thumb/${'a'.repeat(32)}`]);
  const ours = vaultFilesMessage({ client: 'Sean Comma', slug: 'sean-comma', count: 12 });
  is('HQ is told "[Client]: 12 new files", and a tap opens that client’s Vault in HQ', [ours.title, ours.url, vaultFilesMessage({ client: 'Sean Comma', slug: 'sean-comma', count: 1 }).title, newFilesLabel(12)], ['Sean Comma: 12 new files', '/portal/hq#/vault/sean-comma', 'Sean Comma: 1 new file', '12 new files']);
  const theirs = mediaReadyMessage('sean-comma', 'Revival After Dark');
  is('a client is told "Your [show] media is ready", and a tap opens their Vault at that show', [theirs.title, theirs.url], ['Your Revival After Dark media is ready', '/portal/sean-comma#/vault/show/Revival%20After%20Dark']);
  is('each is its own kind, so a device can turn it off', [CLIENT_KINDS.includes('media'), ADMIN_KINDS.includes('files'), CLIENT_KINDS.includes('files'), ADMIN_KINDS.includes('media')], [true, true, false, false]);
}

/* ══ the store ══════════════════════════════════════════════════ */

const SEAN = '3f7c8be8be728123a420fb9aef6bc0e9';
const REBELZ = '41cc8be8be72818d826cd0b2299aedc5';

async function facts(client, driveId, o = {}) {
  return {
    id: await V.vaultFileId(client, driveId), driveId, name: `${driveId}.jpg`, mime: 'image/jpeg', type: 'Photo', kind: 'Raw', root: 'drop', rootId: 'ROOTDROP01',
    parentId: 'P1', path: 'Footage Drop / 2026-11-07 Revival After Dark', show: 'Revival After Dark', guess: null, needsShow: false, date: '2026-11-07', dateFrom: 'folder',
    taken: null, width: 4000, height: 6000, orientation: 'Vertical', durationMs: null, size: 1000, unreleased: false, source: null, modified: '2026-11-08T00:00:00Z', ...o,
  };
}

section('Vault · the store');
{
  const db = await V.vaultDb({ VAULT_DB: new FakeD1() });
  ok('the tables are made the first time the database is used', (await db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name LIKE 'vault_%'`).first()).n === 6);
  const again = new FakeD1();
  await V.vaultDb({ VAULT_DB: again });
  const first = again.statements;
  await V.vaultDb({ VAULT_DB: again });
  ok('and are not made again by the next request', again.statements === first);
  is('no database bound is not an error, it is "not set up"', await V.vaultDb({}), null);

  is('a file’s id is thirty-two hex, the same every time, and different for another client', [/^[0-9a-f]{32}$/.test(await V.vaultFileId(SEAN, 'D1')), await V.vaultFileId(SEAN, 'D1') === await V.vaultFileId(SEAN, 'D1'), await V.vaultFileId(SEAN, 'D1') === await V.vaultFileId(REBELZ, 'D1'), await V.vaultFileId(`${SEAN.slice(0, 8)}-${SEAN.slice(8)}`, 'D1') === await V.vaultFileId(SEAN, 'D1')], [true, true, false, true]);

  const a = await facts(SEAN, 'A'), b = await facts(SEAN, 'B', { kind: 'Finished', root: 'finished', source: 'Blueprint' }), c = await facts(SEAN, 'C', { show: null, guess: 'Old shows', needsShow: true });
  const other = await facts(REBELZ, 'A');
  is('new files are logged', [await V.insertFiles(db, SEAN, [a, b, c], 'run1', 100), await V.insertFiles(db, REBELZ, [other], 'run1', 100)], [3, 1]);
  await V.editFiles(db, SEAN, [a.id], { star: true, rating: 'Hero' }, { now: 110, today: '2026-11-24' });
  is('a file already logged is skipped, and logging it again changes nothing about it', [await V.insertFiles(db, SEAN, [{ ...a, name: 'renamed.jpg' }], 'run2', 200), (await V.filesById(db, SEAN, [a.id], { admin: true }))[0].name, (await V.filesById(db, SEAN, [a.id], { admin: true }))[0].star], [0, 'A.jpg', true]);

  const admin = await V.listFiles(db, SEAN, { admin: true });
  const client = await V.listFiles(db, SEAN, { admin: false });
  is('a client’s files are theirs alone', [admin.length, (await V.listFiles(db, REBELZ, { admin: true })).length], [3, 1]);
  is('one of us is told which files are waiting on a show, and the guess; a client is not', [admin.find((f) => f.id === c.id).needsShow, admin.find((f) => f.id === c.id).guess, client.some((f) => 'needsShow' in f || 'guess' in f || 'holdFor' in f)], [true, 'Old shows', false]);
  ok('nothing sent to a page holds a storage key or a thumbnail address', !/previews\/|thumb_key|googleusercontent/.test(JSON.stringify(admin)));

  // an edit only ever reaches the asker's own rows
  is('an id from another client’s Vault changes nothing', [await V.editFiles(db, REBELZ, [a.id, b.id], { star: true, notes: 'mine now' }, { now: 120, today: '2026-11-24' }), (await V.filesById(db, SEAN, [b.id], { admin: true }))[0].star, (await V.filesById(db, SEAN, [b.id], { admin: true }))[0].notes, (await V.filesById(db, REBELZ, [a.id], { admin: true })).length], [0, false, '', 0]);
  await V.editFiles(db, SEAN, [a.id, b.id], { tagsAdd: ['Crowd'] }, { now: 130, today: '2026-11-24' });
  await V.editFiles(db, SEAN, [a.id], { tagsAdd: ['lasers', 'crowd'], tagsRemove: ['nothing'] }, { now: 131, today: '2026-11-24' });
  await V.editFiles(db, SEAN, [a.id, b.id], { tagsRemove: ['CROWD'], notes: 'kept' }, { now: 132, today: '2026-11-24' });
  is('tags are added to and taken from each file’s own', (await V.filesById(db, SEAN, [a.id, b.id], { admin: true })).map((f) => [f.tags, f.notes]), [[['lasers'], 'kept'], [[], 'kept']]);
  await V.editFiles(db, SEAN, [c.id], { confirmShow: true }, { now: 140, today: '2026-11-24' });
  is('confirming a guess makes it the show and takes the file off the list', (await V.filesById(db, SEAN, [c.id], { admin: true })).map((f) => [f.show, !!f.needsShow]), [['Old shows', false]]);
  await V.editFiles(db, SEAN, [a.id], { hold: { kind: 'item', id: 'f'.repeat(32) } }, { now: 150, today: '2026-11-24', hold: { kind: 'item', id: 'f'.repeat(32), title: 'Faith Rave carousel' } });
  is('a hold is named for us and only flagged for a client', [(await V.filesById(db, SEAN, [a.id], { admin: true }))[0].holdFor, (await V.filesById(db, SEAN, [a.id], { admin: false }))[0].held, 'holdFor' in (await V.filesById(db, SEAN, [a.id], { admin: false }))[0]], ['Faith Rave carousel', true, false]);
  await V.editFiles(db, SEAN, [a.id], { hold: { kind: 'item', id: 'e'.repeat(32) } }, { now: 151, today: '2026-11-24', hold: null });
  is('a hold the server could not name is not written', (await V.filesById(db, SEAN, [a.id], { admin: true }))[0].holdFor, 'Faith Rave carousel');
  await V.editFiles(db, SEAN, [a.id], { hold: null }, { now: 152, today: '2026-11-24' });
  is('and letting go clears it', (await V.filesById(db, SEAN, [a.id], { admin: true }))[0].held, false);

  // the usage log
  await V.editFiles(db, SEAN, [a.id], { used: true }, { now: 160, today: '2026-11-24' });
  await V.editFiles(db, SEAN, [a.id], { used: true }, { now: 161, today: '2026-11-25' });
  is('marked as used by hand, once', [(await V.listUses(db, SEAN)).map((u) => [u.how, u.date, u.post]), (await V.filesById(db, SEAN, [a.id], { admin: true }))[0].used], [[['hand', '2026-11-24', 'Marked as used']], 1]);
  const post = { file: b.id, postId: '9'.repeat(32), post: 'Faith Rave photo carousel', platform: 'Instagram, TikTok', date: '2026-11-20', how: 'post' };
  is('a posted use is logged with its date, platform and post', [await V.reconcileUses(db, SEAN, [post], 170), (await V.listUses(db, SEAN)).find((u) => u.how === 'post')], [{ added: 1, removed: 0 }, { file: b.id, date: '2026-11-20', platform: 'Instagram, TikTok', post: 'Faith Rave photo carousel', postId: '9'.repeat(32), how: 'post' }]);
  is('logging it again does not log it twice, and a renamed post is corrected', [await V.reconcileUses(db, SEAN, [post], 171), await V.reconcileUses(db, SEAN, [{ ...post, post: 'Faith Rave carousel' }], 172), (await V.listUses(db, SEAN)).filter((u) => u.how === 'post').map((u) => u.post)], [{ added: 0, removed: 0 }, { added: 0, removed: 0 }, ['Faith Rave carousel']]);
  is('a post moved back out of Posted is taken off the log, and a use marked by hand is never touched', [await V.reconcileUses(db, SEAN, [], 173), (await V.listUses(db, SEAN)).map((u) => u.how)], [{ added: 0, removed: 1 }, ['hand']]);
  await V.editFiles(db, SEAN, [a.id], { used: false }, { now: 174, today: '2026-11-24' });
  is('the hand mark comes off', (await V.listUses(db, SEAN)).length, 0);
  await V.setMadeFrom(db, SEAN, [a.id, other.id], { id: '9'.repeat(32), title: 'An edit' }, true, 175);
  is('"made from" takes this client’s files and nobody else’s', (await V.listMade(db, SEAN)).map((m) => [m.file === a.id, m.post]), [[true, 'An edit']]);
  await V.setMadeFrom(db, SEAN, [a.id], { id: '9'.repeat(32), title: 'An edit' }, false, 176);
  is('and can be taken back', (await V.listMade(db, SEAN)).length, 0);

  // what Drive says now
  await V.refreshFiles(db, SEAN, [{ ...a, name: 'A-renamed.jpg', path: 'Footage Drop / 2026-11-08 Twins', show: 'Twins', date: '2026-11-08' }], 300);
  let row = (await V.filesById(db, SEAN, [a.id], { admin: true }))[0];
  is('a file moved to another shoot follows it, and keeps its star and rating', [row.name, row.show, row.date, row.star, row.rating], ['A-renamed.jpg', 'Twins', '2026-11-08', true, 'Hero']);
  await V.editFiles(db, SEAN, [a.id], { show: 'Revival After Dark' }, { now: 310, today: '2026-11-24' });
  await V.refreshFiles(db, SEAN, [{ ...a, path: 'Footage Drop / Odd folder', show: null, guess: 'Odd folder', needsShow: true, date: null, dateFrom: null }], 320);
  row = (await V.filesById(db, SEAN, [a.id], { admin: true }))[0];
  is('a show set by hand is not overwritten by a folder', [row.show, !!row.needsShow, row.path, row.date], ['Revival After Dark', false, 'Footage Drop / Odd folder', '2026-11-08']);

  await V.saveThumbs(db, SEAN, [{ id: a.id, key: `previews/sean-comma/${a.id}/${'1'.repeat(16)}/thumb.jpg` }, { id: b.id, key: null }], 330);
  is('a thumbnail is recorded as a version, and one Drive did not have is counted as a try', [(await V.filesById(db, SEAN, [a.id], { admin: true }))[0].t, (await V.fileRecord(db, SEAN, b.id)).thumbTries, await V.countNeedingThumbs(db, SEAN)], ['1'.repeat(16), 1, 2]);
  await V.refreshFiles(db, SEAN, [{ ...a, size: 2000 }], 340);
  is('a file whose size has changed is a different picture: its thumbnail is forgotten and made again', [(await V.fileRecord(db, SEAN, a.id)).thumbKey, await V.countNeedingThumbs(db, SEAN)], [null, 3]);

  await V.markMissing(db, SEAN, [b.id], 400);
  is('a file removed from Drive is marked Missing and kept, with everything written about it', [(await V.listFiles(db, SEAN, { admin: true })).length, (await V.filesById(db, SEAN, [b.id], { admin: true }))[0].missing, (await V.filesById(db, SEAN, [b.id], { admin: true }))[0].notes], [3, true, 'kept']);
  await V.refreshFiles(db, SEAN, [b], 410);
  is('and found again when it comes back', (await V.filesById(db, SEAN, [b.id], { admin: true }))[0].missing, false);
  ok('no statement in the store deletes a file', !/DELETE\s+FROM\s+vault_files/i.test(read('../src/server/vault-db.ts')));
  ok('and every statement that reads or changes a file names the client', (read('../src/server/vault-db.ts').match(/(FROM|UPDATE|INTO) vault_files\b[^`]*`/g) ?? []).every((q) => /client|\$\{mine\}/.test(q)));

  // more files than one read brings back
  const big = await V.vaultDb({ VAULT_DB: new FakeD1() });
  const lots = [];
  for (let i = 0; i < 2300; i += 1) lots.push(await facts(SEAN, `BIG${i}`));
  await V.insertFiles(big, SEAN, lots, 'run1', 1);
  const allBack = await V.listFiles(big, SEAN, { admin: true });
  is('a client with more files than one read brings back is read a page at a time, every file once', [allBack.length, new Set(allBack.map((f) => f.id)).size, (await V.loadIndex(big, SEAN)).size], [2300, 2300, 2300]);

  const t = (await V.tallies(db)).get(SEAN);
  is('HQ’s counts', [t.files, t.keepers, t.unsorted, t.needsShow, t.missing], [3, 2, 1, 0, 0]);

  // one sync at a time
  const take = (run, now) => V.takeSync(db, { client: SEAN, slug: 'sean-comma', name: 'Sean Comma', run, now, quietMs: 90000, resumeMs: 3600000 });
  const one = await take('r1', 1000);
  is('a sync takes the client, and a second in the meantime is refused', [one, await take('r2', 2000)], [{ ok: true, run: 'r1', resumed: false }, { ok: false }]);
  await V.beatSync(db, SEAN, 'r1', { phase: 'thumbnails', counts: { thumbs: 40 }, now: 3000 });
  is('while it keeps saying it is alive it is not taken over', await take('r2', 80000), { ok: false });
  is('one that has gone quiet is picked up, under the same run so what it logged still counts as new', await take('r3', 3000 + 90001), { ok: true, run: 'r1', resumed: true });
  await V.endSync(db, SEAN, 'r1', { ok: true, counts: { added: 3 }, sources: [], now: 100000 });
  is('a finished one leaves the client free, and the next is a new run', await take('r4', 100001), { ok: true, run: 'r4', resumed: false });
  await V.endSync(db, SEAN, 'r4', { ok: false, error: 'Drive answered 500 while listing.', counts: {}, sources: [], now: 100002 });
  const st = V.syncStatus(await V.syncRow(db, SEAN), { now: 100003, admin: true, email: 'vault@example.iam.gserviceaccount.com' });
  is('a failed sync says why, and keeps the time of the last good one', [st.phase, st.error, st.okAt, st.running], ['failed', 'Drive answered 500 while listing.', 100000, false]);
  is('the address folders are shared with is told to us and not to a client', [st.email, 'email' in V.syncStatus(await V.syncRow(db, SEAN), { now: 100003, admin: false, email: 'vault@example.iam.gserviceaccount.com' })], ['vault@example.iam.gserviceaccount.com', false]);

  await V.insertFiles(db, SEAN, [await facts(SEAN, 'N1'), await facts(SEAN, 'N2'), await facts(SEAN, 'N3', { kind: 'Finished', root: 'finished' })], 'r5', 100010);
  await take('r5', 100010);
  is('a run’s new Raw files are claimed for one announcement, and only one', [await V.claimNewRaw(db, SEAN, 'r5'), await V.claimNewRaw(db, SEAN, 'r5')], [2, 0]);
}

/* ══ Drive, stood in for ════════════════════════════════════════ */

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const KEY = JSON.stringify({ client_email: 'vault@example.iam.gserviceaccount.com', private_key: privateKey });
const FOLDER = 'application/vnd.google-apps.folder';

/** A pretend Drive: folders and files by id, each with a parent.
 *  `shared` is "shared with the service account by name". A folder
 *  that is `linkOnly` can be read by anyone who has its id, which is
 *  what "anyone with the link" is. */
function drive(nodes) {
  const calls = [];
  const state = { failList: null, noThumbs: false };
  const node = (id) => nodes[id];
  const visible = (id) => { for (let n = node(id); n; n = node(n.parent)) { if (n.shared || n.linkOnly) return true; } return false; };
  const meta = (id) => {
    const n = node(id);
    return {
      id, name: n.name, mimeType: n.mime ?? FOLDER, trashed: !!n.trashed,
      ...(n.shared ? { sharedWithMeTime: '2026-11-05T18:06:06.654Z' } : {}),
      ...(n.parent && visible(n.parent) && !node(id).linkOnly ? { parents: [n.parent] } : {}),
      ...(n.size ? { size: String(n.size) } : {}),
      ...(n.mime && n.mime !== FOLDER ? { createdTime: n.created ?? '2026-11-20T10:00:00Z', modifiedTime: n.modified ?? '2026-11-16T03:00:00Z', ...(state.noThumbs || n.noThumb ? {} : { thumbnailLink: `https://lh3.googleusercontent.com/drive-storage/${id}=s220` }) } : {}),
      ...(n.image ? { imageMediaMetadata: n.image } : {}),
      ...(n.video ? { videoMediaMetadata: n.video } : {}),
    };
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchFake = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ method, host: url.hostname, path: url.pathname, q: url.searchParams.get('q') });
    if (url.hostname === 'oauth2.googleapis.com') return json({ access_token: 'a-token' });
    if (url.hostname === 'lh3.googleusercontent.com') {
      const size = Number(/=s(\d+)$/.exec(url.pathname)?.[1] ?? 0);
      return new Response(new Uint8Array(size === 400 ? 64 : 640), { headers: { 'Content-Type': 'image/jpeg' } });
    }
    if (url.hostname !== 'www.googleapis.com') return json({}, 404);
    const one = /^\/drive\/v3\/files\/([\w-]+)$/.exec(url.pathname);
    if (one) return node(one[1]) && visible(one[1]) ? json(meta(one[1])) : json({ error: { code: 404 } }, 404);
    const q = url.searchParams.get('q') ?? '';
    const parents = [...q.matchAll(/'([\w-]+)' in parents/g)].map((m) => m[1]);
    if (state.failList && parents.some((p) => state.failList.includes(p))) return json({ error: { code: 500 } }, 500);
    const onlyFolders = /mimeType = 'application\/vnd\.google-apps\.folder'$/.test(q);
    const files = Object.keys(nodes).filter((id) => parents.includes(node(id).parent) && !node(id).trashed && visible(id))
      .filter((id) => !onlyFolders || (node(id).mime ?? FOLDER) === FOLDER)
      .filter((id) => { const m = node(id).mime ?? FOLDER; return m === FOLDER || m.endsWith('shortcut') || m.startsWith('image/') || m.startsWith('video/'); })
      .map((id) => ({ ...meta(id), parents: [node(id).parent] }));
    return json({ files });
  };
  return { fetch: fetchFake, calls, state, nodes };
}

const photo = (name, parent, o = {}) => ({ name, parent, mime: 'image/jpeg', size: 28_000_000, image: { width: 4672, height: 7008, rotation: 0, time: '2026:11:15 22:10:00' }, ...o });
const clip = (name, parent, o = {}) => ({ name, parent, mime: 'video/mp4', size: 66_000_000, video: { width: 1080, height: 1920, durationMillis: '44000' }, ...o });

function seanDrive() {
  return drive({
    ROOTFOLDER01: { name: '01) Sean Comma × Blueprint', shared: true },
    DROPFOLDER01: { name: 'Footage Drop', parent: 'ROOTFOLDER01' },
    FINISHED0001: { name: 'Finished Content', parent: 'ROOTFOLDER01' },
    MUSICFOLDER1: { name: 'Music', parent: 'ROOTFOLDER01' },
    song00000001: { name: 'song.jpg', parent: 'MUSICFOLDER1', mime: 'image/jpeg' },
    IDSFOLDER001: { name: '_IDS', parent: 'DROPFOLDER01' },
    idclip000001: clip('ID 1.mp4', 'IDSFOLDER001'),
    SHOOTFOLDER1: { name: '2026-11-07 Revival After Dark', parent: 'DROPFOLDER01' },
    CAMBFOLDER01: { name: 'Cam B', parent: 'SHOOTFOLDER1' },
    rawclip00001: clip('C0012.mp4', 'CAMBFOLDER01', { video: { width: 1920, height: 1080, durationMillis: '725000' } }),
    rawphoto0001: photo('DSC0001.jpg', 'SHOOTFOLDER1', { image: { width: 7008, height: 4672, rotation: 1 } }),
    notesdoc0001: { name: 'notes.pdf', parent: 'SHOOTFOLDER1', mime: 'application/pdf' },
    shortcut0001: { name: 'a shortcut', parent: 'SHOOTFOLDER1', mime: 'application/vnd.google-apps.shortcut' },
    trashed00001: photo('deleted.jpg', 'SHOOTFOLDER1', { trashed: true }),
    YEARFOLDER01: { name: '2026', parent: 'FINISHED0001' },
    MONTHFOLDER1: { name: '2026-11', parent: 'YEARFOLDER01' },
    SHOWFOLDER01: { name: 'Revival After Dark', parent: 'MONTHFOLDER1' },
    POSTSHOW0001: { name: 'Post Show', parent: 'SHOWFOLDER01' },
    PHOTOFOLDER1: { name: 'Photo', parent: 'POSTSHOW0001' },
    finphoto0001: photo('DSC06286.jpg', 'PHOTOFOLDER1'),
    finflyer0001: { name: 'flyer.png', parent: 'SHOWFOLDER01', mime: 'image/png', size: 900_000, image: { width: 1080, height: 1350 } },
    ARCHIVEOK001: { name: 'Sean old content', shared: true },
    OLDSHOWS0001: { name: 'Old shows', parent: 'ARCHIVEOK001' },
    oldphoto0001: photo('old.jpg', 'OLDSHOWS0001', { image: null, created: '2024-06-02T10:00:00Z', modified: '2024-06-01T09:00:00Z' }),
    ARCHIVELINK1: { name: 'Shared by link only', linkOnly: true },
    linkphoto001: photo('by-link.jpg', 'ARCHIVELINK1'),
  });
}

const record = (o = {}) => ({
  pageId: `${SEAN.slice(0, 8)}-${SEAN.slice(8, 12)}-${SEAN.slice(12, 16)}-${SEAN.slice(16, 20)}-${SEAN.slice(20)}`, slug: 'sean-comma', portalEnabled: true, portalEmails: [],
  client: { artist: 'Sean Comma', driveFolder: 'https://drive.google.com/drive/folders/ROOTFOLDER01' },
  archiveFolders: [{ id: 'ARCHIVEOK001', link: 'https://drive.google.com/drive/folders/ARCHIVEOK001' }, { id: 'ARCHIVELINK1', link: 'https://drive.google.com/drive/folders/ARCHIVELINK1' }, { id: 'ARCHIVEGONE1', link: 'https://drive.google.com/drive/folders/ARCHIVEGONE1' }],
  ...o,
});

/** Notion, as much as a sync asks of it: the client's Posted items. */
const notion = (posted = []) => async (input) => {
  const url = String(typeof input === 'string' ? input : input.url);
  if (/api\.notion\.com\/v1\/databases\/[\w-]+\/query/.test(url)) return new Response(JSON.stringify({ results: posted, has_more: false }), { status: 200 });
  return new Response('{}', { status: 404 });
};

const realFetch = globalThis.fetch;
const withFetch = async (d, extra, run) => {
  globalThis.fetch = async (input, init) => {
    const url = String(typeof input === 'string' ? input : input.url);
    return url.includes('api.notion.com') || url.includes('api.cloudflare.com') || url.includes('push.example') ? extra(input, init) : d.fetch(input, init);
  };
  try { return await run(); } finally { globalThis.fetch = realFetch; }
};

section('Vault · the sync');
{
  const d = seanDrive();
  const env = { VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2(), GOOGLE_SERVICE_ACCOUNT_JSON: KEY, NOTION_TOKEN: 'a-token' };
  const db = await V.vaultDb(env);
  const first = await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 1_000_000 }));
  const files = await V.listFiles(db, SEAN, { admin: true });
  const by = (name) => files.find((f) => f.name === name);
  is('one pass lists all three sources and logs every image and video in them', [first.ok, first.more, first.status.phase, first.status.listed, first.status.added, files.map((f) => f.name).sort()],
     [true, false, 'done', 6, 6, ['C0012.mp4', 'DSC0001.jpg', 'DSC06286.jpg', 'ID 1.mp4', 'flyer.png', 'old.jpg']]);
  is('what is not an image or a video, what is in the trash, and folders that are not sources are left out', ['notes.pdf', 'deleted.jpg', 'song.jpg', 'a shortcut'].map((n) => !!by(n)), [false, false, false, false]);
  is('Footage Drop: Raw, the show and the day from the shoot folder, the whole path kept', [by('C0012.mp4').kind, by('C0012.mp4').show, by('C0012.mp4').date, by('C0012.mp4').path, by('C0012.mp4').source], ['Raw', 'Revival After Dark', '2026-11-07', 'Footage Drop / 2026-11-07 Revival After Dark / Cam B', null]);
  is('filled in by itself: type, orientation, length, size', [by('C0012.mp4').type, by('C0012.mp4').o, by('C0012.mp4').dur, by('C0012.mp4').size, by('DSC0001.jpg').o, by('flyer.png').type, by('flyer.png').o], ['Video', 'Horizontal', 725, 66_000_000, 'Vertical', 'Graphic', 'Vertical']);
  is('_IDS is Unreleased', [by('ID 1.mp4').un, by('C0012.mp4').un], [true, false]);
  is('Finished Content: Finished, from Blueprint, the show from the folder under the month, the month sharpened by the camera', [by('DSC06286.jpg').kind, by('DSC06286.jpg').source, by('DSC06286.jpg').show, by('DSC06286.jpg').date, by('DSC06286.jpg').path], ['Finished', 'Blueprint', 'Revival After Dark', '2026-11-15', 'Finished Content / 2026 / 2026-11 / Revival After Dark / Post Show / Photo']);
  is('Archive: Raw, source Archive, a guess to confirm, and the file’s own date', [by('old.jpg').kind, by('old.jpg').source, by('old.jpg').show, by('old.jpg').needsShow, by('old.jpg').guess, by('old.jpg').date], ['Raw', 'Archive', null, true, 'Old shows', '2024-06-01']);
  is('new Raw files are unsorted and Finished ones are keepers', [files.filter(V.isUnsorted).map((f) => f.name).sort(), files.filter(V.isKeeper).map((f) => f.name).sort()], [['C0012.mp4', 'DSC0001.jpg', 'ID 1.mp4', 'old.jpg'], ['DSC06286.jpg', 'flyer.png']]);
  is('every file has a thumbnail, in R2 under the preview service’s address for one', [files.every((f) => /^[0-9a-f]{16}$/.test(f.t)), [...env.REPORTS_BUCKET.files.keys()].every((k) => /^previews\/sean-comma\/[0-9a-f]{32}\/[0-9a-f]{16}\/thumb\.jpg$/.test(k)), env.REPORTS_BUCKET.files.size, first.status.thumbsLeft], [true, true, 6, 0]);

  const src = Object.fromEntries(first.status.sources.map((s) => [s.name ?? s.link.slice(-12), [s.root, s.state, s.files]]));
  is('each source says how it went', [src['Footage Drop'], src['Finished Content'], src['Sean old content']], [['drop', 'ok', 3], ['finished', 'ok', 2], ['archive', 'ok', 1]]);
  is('a folder we could only read by its link is "not shared", and none of its files are logged', [src['Shared by link only'], !!by('by-link.jpg')], [['archive', 'not_shared', 0], false]);
  is('so is one that is not there for us at all', src.ARCHIVEGONE1, ['archive', 'not_shared', 0]);
  is('the address to share with is in what we are told', first.status.email, 'vault@example.iam.gserviceaccount.com');

  // read-only, to the letter
  const toDrive = d.calls.filter((c) => c.host === 'www.googleapis.com');
  is('Drive is only ever asked: every request to it is a GET', [toDrive.length > 5, toDrive.every((c) => c.method === 'GET')], [true, true]);
  ok('and no original is downloaded: nothing asks Drive for a file’s bytes', !d.calls.some((c) => /alt=media/.test(c.path)) && !/alt=media|uploadType|\/copy|method:\s*'(PATCH|PUT|DELETE)'/.test(read('../src/server/vault-drive.ts') + read('../src/server/vault-sync.ts')));
  ok('the key is asked for read-only', /auth\/drive\.readonly'/.test(read('../src/server/google-drive.ts')) && !/auth\/drive'/.test(read('../src/server/google-drive.ts')));

  // again
  const callsBefore = d.calls.length;
  const second = await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 2_000_000 }));
  is('a second sync finds nothing new, makes no thumbnail again, and writes no file', [second.status.added, second.status.thumbs, env.REPORTS_BUCKET.files.size, d.calls.slice(callsBefore).some((c) => c.host === 'lh3.googleusercontent.com')], [0, 0, 6, false]);

  // hand-set things survive, a moved file follows, a removed one is Missing
  await V.editFiles(db, SEAN, [by('C0012.mp4').id], { star: true, rating: 'Strong', notes: 'the drop' }, { now: 1, today: '2026-11-24' });
  d.nodes.rawphoto0001.trashed = true;
  delete d.nodes.idclip000001;
  d.nodes.rawclip00001.parent = 'SHOOTFOLDER1';
  d.nodes.newclip00001 = clip('C0013.mp4', 'CAMBFOLDER01');
  const third = await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 3_000_000 }));
  const after = await V.listFiles(db, SEAN, { admin: true });
  const now = (name) => after.find((f) => f.name === name);
  is('a file removed from Drive, or put in its trash, is marked Missing and never deleted', [after.length, now('DSC0001.jpg').missing, now('ID 1.mp4').missing, third.status.missing], [7, true, true, 2]);
  is('a file moved to another folder is the same file, with what was written on it', [now('C0012.mp4').path, now('C0012.mp4').star, now('C0012.mp4').rating, now('C0012.mp4').notes, now('C0012.mp4').missing], ['Footage Drop / 2026-11-07 Revival After Dark', true, 'Strong', 'the drop', false]);
  is('only the new file is added', [third.status.added, !!now('C0013.mp4')], [1, true]);
  d.nodes.rawphoto0001.trashed = false;
  await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 4_000_000 }));
  is('a file that comes back is found again', (await V.listFiles(db, SEAN, { admin: true })).find((f) => f.name === 'DSC0001.jpg').missing, false);

  // the rules changing under a file that has not moved
  await db.prepare(`UPDATE vault_files SET show = NULL, show_guess = 'Revival After Dark', needs_show = 1, show_by = NULL WHERE name = 'DSC06286.jpg'`).run();
  await db.prepare(`UPDATE vault_files SET show = 'Typed by hand', show_by = 'hand' WHERE name = 'flyer.png'`).run();
  const reread = await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 4_500_000 }));
  const fixed = await V.listFiles(db, SEAN, { admin: true });
  is('a file logged under an older reading of its folders is read again by the next sync, and one whose show was set by hand is left alone',
     [fixed.find((f) => f.name === 'DSC06286.jpg').show, !!fixed.find((f) => f.name === 'DSC06286.jpg').needsShow, fixed.find((f) => f.name === 'flyer.png').show, reread.status.added],
     ['Revival After Dark', false, 'Typed by hand', 0]);

  // a folder that will not list is never read as an empty folder
  d.state.failList = ['CAMBFOLDER01'];
  const broken = await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 5_000_000 }));
  const kept = await V.listFiles(db, SEAN, { admin: true });
  is('a folder that will not list fails the sync, and marks nothing Missing', [broken.ok, broken.why, /Footage Drop/.test(broken.note), kept.filter((f) => f.missing).map((f) => f.name), broken.status.phase], [false, 'failed', true, ['ID 1.mp4'], 'failed']);
  d.state.failList = null;

  // a source that stops being shared says nothing about its files
  d.nodes.ARCHIVEOK001.shared = false;
  const unshared = await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 6_000_000 }));
  is('an Archive folder that is not shared any more is said so, and its files are left as they were', [unshared.status.sources.find((s) => s.link.endsWith('ARCHIVEOK001')).state, (await V.listFiles(db, SEAN, { admin: true })).find((f) => f.name === 'old.jpg').missing], ['not_shared', false]);
  d.nodes.ARCHIVEOK001.shared = true;

  // no Drive Folder at all
  const bare = await withFetch(d, notion(), () => V.syncClient({ ...env, VAULT_DB: new FakeD1() }, record({ client: { artist: 'Kindrix', driveFolder: null }, archiveFolders: [], pageId: REBELZ, slug: 'kindrix' }), { now: 1 }));
  is('a client with no Drive Folder syncs to nothing, and says so', [bare.ok, bare.status.listed, bare.status.sources.map((s) => s.state)], [true, 0, ['not_set', 'not_set']]);
  is('nothing bound, or no key, is "not set up" and not a failure of the files', [(await V.syncClient({ NOTION_TOKEN: 'x' }, record())).why, (await V.syncClient({ ...env, GOOGLE_SERVICE_ACCOUNT_JSON: '' }, record())).why], ['not_configured', 'not_configured']);
}

section('Vault · a sync that is cut off, and one that runs out of room');
{
  const nodes = { ROOTFOLDER01: { name: 'Client', shared: true }, FINISHED0001: { name: 'Finished Content', parent: 'ROOTFOLDER01' }, MONTHFOLDER1: { name: '2026-11', parent: 'FINISHED0001' }, SHOWFOLDER01: { name: 'A Show', parent: 'MONTHFOLDER1' } };
  for (let i = 0; i < 100; i += 1) nodes[`file${String(i).padStart(8, '0')}`] = photo(`DSC${String(i).padStart(4, '0')}.jpg`, 'SHOWFOLDER01');
  const d = drive(nodes);
  const env = { VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2(), GOOGLE_SERVICE_ACCOUNT_JSON: KEY, NOTION_TOKEN: 'a-token' };
  const db = await V.vaultDb(env);
  const rec = record({ archiveFolders: [] });
  const part = await withFetch(d, notion(), () => V.syncClient(env, rec, { now: 1_000_000, callBudget: 70 }));
  is('out of room part way: every file is logged, some thumbnails are made, and it says there is more', [part.ok, part.more, part.status.added, part.status.thumbs > 0 && part.status.thumbs < 100, part.status.thumbs + part.status.thumbsLeft], [true, true, 100, true, 100]);
  const madeFirst = part.status.thumbs;
  const rest = await withFetch(d, notion(), () => V.syncClient(env, rec, { now: 1_060_000, thumbsOnly: true }));
  is('the next call carries on with the thumbnails and does not list the folders again', [rest.ok, rest.more, rest.status.thumbs, rest.status.thumbsLeft, env.REPORTS_BUCKET.files.size, rest.status.listed], [true, false, 100, 0, 100, 100]);
  ok('it made only the ones that were left', rest.status.thumbs - madeFirst === 100 - madeFirst && d.calls.filter((c) => c.host === 'lh3.googleusercontent.com').length === 100);

  // a shoot with many folders
  const wide = { ROOTFOLDER01: { name: 'Client', shared: true }, DROPFOLDER01: { name: 'Footage Drop', parent: 'ROOTFOLDER01' } };
  for (let i = 0; i < 45; i += 1) { wide[`CAMFOLDER${String(i).padStart(3, '0')}`] = { name: `2026-11-${String((i % 28) + 1).padStart(2, '0')} Show ${i}`, parent: 'DROPFOLDER01' }; wide[`wide${String(i).padStart(8, '0')}`] = clip(`C${i}.mp4`, `CAMFOLDER${String(i).padStart(3, '0')}`); }
  const w = drive(wide);
  const envW = { ...env, VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2() };
  const wideRun = await withFetch(w, notion(), () => V.syncClient(envW, rec, { now: 1 }));
  is('forty-five folders are asked about twenty at a time: one question for the root and three for what is in them', [wideRun.status.added, w.calls.filter((c) => c.q && /in parents/.test(c.q) && !/'ROOTFOLDER01' in parents/.test(c.q)).length], [45, 4]);

  // cut off: the record says a sync is running, and nothing more comes
  const env2 = { ...env, VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2() };
  const db2 = await V.vaultDb(env2);
  let died = false;
  const dying = drive(nodes);
  const cut = async (input, init) => {
    const url = String(typeof input === 'string' ? input : input.url);
    if (url.includes('lh3.googleusercontent.com') && dying.calls.filter((c) => c.host === 'lh3.googleusercontent.com').length >= 40) { died = true; throw new Error('the request was cut off'); }
    return dying.fetch(input, init);
  };
  globalThis.fetch = async (input, init) => (String(typeof input === 'string' ? input : input.url).includes('api.notion.com') ? notion()(input, init) : cut(input, init));
  try { await V.syncClient(env2, rec, { now: 1_000_000 }); } finally { globalThis.fetch = realFetch; }
  ok('(the stand-in did cut it off)', died);
  // A thumbnail that could not be fetched is a try against the file,
  // not the end of the sync: the files are all logged either way.
  is('cut off or not, every file it listed is logged', (await V.listFiles(db2, SEAN, { admin: true })).length, 100);
  const resumed = await withFetch(d, notion(), () => V.syncClient(env2, rec, { now: 1_200_000 }));
  is('and the next sync finishes the thumbnails without logging anything twice', [resumed.ok, resumed.status.added, (await V.listFiles(db2, SEAN, { admin: true })).filter((f) => f.t).length], [true, 0, 100]);

  // two at once
  const env3 = { ...env, VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2() };
  const both = await withFetch(d, notion(), () => Promise.all([V.syncClient(env3, rec, { now: 1 }), V.syncClient(env3, rec, { now: 2 })]));
  is('two syncs started together: one runs, and the other is told it is busy', [both.filter((b) => b.busy).length, both.filter((b) => !b.busy && b.ok).length, (await V.listFiles(await V.vaultDb(env3), SEAN, { admin: true })).length, env3.REPORTS_BUCKET.files.size], [1, 1, 100, 100]);

  // a file Drive has drawn nothing for
  const env4 = { ...env, VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2() };
  const blank = drive({ ...nodes, file00000000: { ...nodes.file00000000, noThumb: true } });
  const quiet = await withFetch(blank, notion(), () => V.syncClient(env4, rec, { now: 1 }));
  is('a file Drive has no thumbnail for is asked about once in a sync, logged all the same, and left for the next', [quiet.ok, quiet.more, quiet.status.thumbs, quiet.status.thumbsLeft, (await V.fileRecord(await V.vaultDb(env4), SEAN, await V.vaultFileId(SEAN, 'file00000000'))).thumbTries], [true, false, 99, 1, 1]);
}

section('Vault · the usage log, from the Content Pipeline');
{
  const d = seanDrive();
  const kv = new Map();
  const env = { VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2(), GOOGLE_SERVICE_ACCOUNT_JSON: KEY, NOTION_TOKEN: 'a-token' };
  const db = await V.vaultDb(env);
  const page = (id, o) => ({
    id, last_edited_time: '2026-11-22T10:00:00.000Z',
    properties: {
      Content: { type: 'title', title: [{ plain_text: o.title }] }, Status: { type: 'select', select: { name: 'Posted' } },
      Platforms: { type: 'multi_select', multi_select: (o.platforms ?? ['Instagram']).map((name) => ({ name })) },
      'Post Date': { type: 'date', date: o.date ? { start: o.date } : null },
      'Edit Link': { type: 'url', url: o.link ?? null }, 'Hide from Client': { type: 'checkbox', checkbox: !!o.hidden },
      'Slides Manifest': { type: 'rich_text', rich_text: o.slides ? [{ plain_text: 'x' }] : [] }, Deliverable: { type: 'select', select: o.deliverable ? { name: 'Photo Set' } : null },
    },
  });
  const P1 = '11111111-1111-1111-1111-111111111111', P2 = '22222222-2222-2222-2222-222222222222', P3 = '33333333-3333-3333-3333-333333333333', P4 = '44444444-4444-4444-4444-444444444444';
  // a carousel's slides are kept in R2, by Drive file id
  await env.REPORTS_BUCKET.put(`previews/sean-comma/${P2.replace(/-/g, '')}/slides.json`, JSON.stringify({ v: 1, item: P2.replace(/-/g, ''), folder: null, updated: '2026-11-20T00:00:00Z', slides: [{ id: 'aaaaaaaa', file: 'rawphoto0001', name: null, preview: {} }, { id: 'bbbbbbbb', file: 'not-in-the-vault', name: null, preview: {} }] }));
  const posted = [
    page(P1, { title: 'Revival recap', link: 'https://drive.google.com/file/d/finphoto0001/view', date: '2026-11-20', platforms: ['Instagram', 'TikTok'] }),
    page(P2, { title: 'Faith Rave carousel', slides: true }),
    page(P3, { title: 'A hidden test row', link: 'https://drive.google.com/file/d/rawclip00001/view', hidden: true }),
    page(P4, { title: 'A delivery', link: 'https://drive.google.com/file/d/rawclip00001/view', deliverable: true }),
  ];
  await withFetch(d, notion(posted), () => V.syncClient(env, record(), { now: 1_000_000 }));
  const files = await V.listFiles(db, SEAN, { admin: true });
  const uses = await V.listUses(db, SEAN);
  const name = (u) => files.find((f) => f.id === u.file).name;
  is('a Posted item’s file is logged as used, with the date, the platforms and the post',
     uses.map((u) => [name(u), u.post, u.platform, u.date, u.how]).sort(), [['DSC0001.jpg', 'Faith Rave carousel', 'Instagram', '2026-11-22', 'post'], ['DSC06286.jpg', 'Revival recap', 'Instagram, TikTok', '2026-11-20', 'post']]);
  is('which covers a Finished file and a carousel’s slides, by Drive file id', [files.find((f) => f.name === 'DSC06286.jpg').used, files.find((f) => f.name === 'DSC0001.jpg').used], [1, 1]);
  is('a row we are holding back from the client, and a delivery, log nothing', files.find((f) => f.name === 'C0012.mp4').used, 0);

  await V.setMadeFrom(db, SEAN, [files.find((f) => f.name === 'C0012.mp4').id], { id: P1.replace(/-/g, ''), title: 'Revival recap' }, true, 5);
  await withFetch(d, notion(posted), () => V.logPostedUses(env, record(), 6));
  is('a file marked as what a post was made from is used when that post is out', (await V.listUses(db, SEAN)).filter((u) => u.how === 'made').map((u) => [name(u), u.post]), [['C0012.mp4', 'Revival recap']]);
  await withFetch(d, notion([posted[1]]), () => V.logPostedUses(env, record(), 7));
  is('a post moved back out of Posted comes off the log', (await V.listUses(db, SEAN)).map((u) => u.post), ['Faith Rave carousel']);
  const failing = async () => new Response('nope', { status: 500 });
  await withFetch(d, failing, () => V.logPostedUses(env, record(), 8));
  is('a pipeline that cannot be read leaves the log alone', (await V.listUses(db, SEAN)).length, 1);
  void kv;
}

/* ══ what the routes are made of ════════════════════════════════ */

const ctxFor = (db, role, slug = 'sean-comma', client = SEAN) => ({ slug, viewer: { role, who: 'x' }, admin: role === 'admin', client, db, body: {} });

section('Vault · opening a file');
{
  const d = seanDrive();
  const env = { VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2(), GOOGLE_SERVICE_ACCOUNT_JSON: KEY, NOTION_TOKEN: 'a-token', CF_ACCOUNT_ID: 'd'.repeat(32), CLOUDFLARE_STREAM_TOKEN: 'a-stream-token' };
  const db = await V.vaultDb(env);
  await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 1_000_000 }));
  const files = await V.listFiles(db, SEAN, { admin: true });
  const id = (name) => files.find((f) => f.name === name).id;
  const stream = [];
  const cf = async (input, init = {}) => { stream.push(`${init.method ?? 'GET'} ${String(typeof input === 'string' ? input : input.url)}`); return new Response('{}', { status: 500 }); };

  const sizeBefore = env.REPORTS_BUCKET.files.size;
  const photoOpen = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'client'), id('DSC06286.jpg'), { play: false, verify: false, retry: false }));
  is('a photo: the web-sized picture is made the first time it is opened, under the preview route’s own address', [photoOpen.ok, /^[0-9a-f]{16}$/.test(photoOpen.web), photoOpen.video, photoOpen.play, env.REPORTS_BUCKET.files.size - sizeBefore, [...env.REPORTS_BUCKET.files.keys()].some((k) => k === `previews/sean-comma/${id('DSC06286.jpg')}/${photoOpen.web}/image.jpg`)], [true, true, null, null, 1, true]);
  const callsThen = d.calls.length;
  const photoAgain = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'client'), id('DSC06286.jpg'), { play: false, verify: false, retry: false }));
  is('and kept: opening it again asks Drive nothing and makes nothing', [photoAgain.web === photoOpen.web, d.calls.length - callsThen, env.REPORTS_BUCKET.files.size - sizeBefore], [true, 0, 1]);
  ok('the bigger picture was not made for files nobody opened', [...env.REPORTS_BUCKET.files.keys()].filter((k) => k.endsWith('/image.jpg')).length === 1);
  await env.REPORTS_BUCKET.delete(`previews/sean-comma/${id('DSC06286.jpg')}/${photoOpen.web}/image.jpg`);
  const healed = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'client'), id('DSC06286.jpg'), { play: false, verify: true, retry: false }));
  ok('a copy that has gone is made again when the page says it could not show it', /^[0-9a-f]{16}$/.test(healed.web) && healed.web !== photoOpen.web);

  const short = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'client'), id('ID 1.mp4'), { play: false, verify: false, retry: false }));
  is('a video: the poster first, nothing converted until Play is tapped', [/^[0-9a-f]{16}$/.test(short.web), short.video, short.play, short.wait, stream.length], [true, null, 'yes', false, 0]);
  const long = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'client'), id('C0012.mp4'), { play: true, verify: false, retry: false }));
  is('a video over five minutes is not converted, even when Play is asked for: poster and "Open original"', [/^[0-9a-f]{16}$/.test(long.web), long.play, long.video, stream.length, (await V.fileRecord(db, SEAN, id('C0012.mp4'))).preview.status], [true, 'too_long', null, 0, null]);
  const longAdmin = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'admin'), id('C0012.mp4'), { play: true, verify: false, retry: true }));
  is('nor for one of us asking again', [longAdmin.play, stream.length], ['too_long', 0]);
  is('an id that is not this client’s opens nothing', [await V.openFile(env, ctxFor(db, 'client', 'rebelz-cheer', REBELZ), id('DSC06286.jpg'), { play: false, verify: false, retry: false }), await V.openFile(env, ctxFor(db, 'client'), '0'.repeat(32), { play: true, verify: false, retry: false })], [null, null]);

  // Play, for a clip under the cap, goes to the preview service
  const played = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'client'), id('ID 1.mp4'), { play: true, verify: false, retry: false }));
  ok('Play on a short clip goes to the converter, through the preview service', stream.some((s) => /^POST https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/d{32}\/stream/.test(s)));
  is('a converter that is not answering is not held against the file, and a client is not told why', [played.video?.state, 'why' in (played.video ?? {}), (await V.fileRecord(db, SEAN, id('ID 1.mp4'))).preview.status], ['failed', false, null]);
  const playedAdmin = await withFetch(d, cf, () => V.openFile(env, ctxFor(db, 'admin'), id('ID 1.mp4'), { play: true, verify: false, retry: false }));
  ok('one of us is told why', typeof playedAdmin.video?.why === 'string' && playedAdmin.video.why.length > 0);

  // a thumbnail asked for before one was made
  await db.prepare(`UPDATE vault_files SET thumb_key = NULL WHERE id = ?1`).bind(id('flyer.png')).run();
  const made = await withFetch(d, cf, () => V.thumbFor(env, ctxFor(db, 'client'), id('flyer.png')));
  is('a thumbnail asked for before the sync reached it is made by the asking, and recorded', [/^previews\/sean-comma\/[0-9a-f]{32}\/[0-9a-f]{16}\/thumb\.jpg$/.test(made.key), (await V.fileRecord(db, SEAN, id('flyer.png'))).thumbKey === made.key, !!(await env.REPORTS_BUCKET.head(made.key))], [true, true, true]);
  is('and not for somebody else’s file', await V.thumbFor(env, ctxFor(db, 'client', 'rebelz-cheer', REBELZ), id('flyer.png')), null);
}

section('Vault · use in a post');
{
  const d = seanDrive();
  const env = { VAULT_DB: new FakeD1(), REPORTS_BUCKET: new FakeR2(), GOOGLE_SERVICE_ACCOUNT_JSON: KEY, NOTION_TOKEN: 'a-token' };
  const db = await V.vaultDb(env);
  await withFetch(d, notion(), () => V.syncClient(env, record(), { now: 1_000_000 }));
  const files = await V.listFiles(db, SEAN, { admin: true });
  const f = (name) => files.find((x) => x.name === name);
  const sent = [];
  const NEW = '77777777-7777-7777-7777-777777777777';
  const schema = { properties: { Status: { type: 'select', select: { options: ['Idea', 'Planned', 'Posted'].map((name) => ({ name })) } }, Media: { type: 'select', select: { options: ['Video', 'Photo', 'Carousel', 'Graphic', 'Story'].map((name) => ({ name })) } }, Source: { type: 'select', select: { options: ['Client Films', 'Show Media', 'Flyer / Graphic'].map((name) => ({ name })) } }, 'Posted By': { type: 'select', select: { options: ['Blueprint', 'Client'].map((name) => ({ name })) } } } };
  const api = (s = schema) => async (input, init = {}) => {
    const url = String(typeof input === 'string' ? input : input.url);
    const method = init.method ?? 'GET';
    if (method !== 'GET') sent.push({ method, url, body: JSON.parse(init.body) });
    if (/\/v1\/databases\/[\w-]+$/.test(url)) return new Response(JSON.stringify(s), { status: 200 });
    if (method === 'POST' && url.endsWith('/v1/pages')) return new Response(JSON.stringify({ id: NEW, properties: { Content: { type: 'title', title: [{ plain_text: JSON.parse(init.body).properties.Content.title[0].text.content }] } } }), { status: 200 });
    if (method === 'PATCH') return new Response('{"id":"x","properties":{}}', { status: 200 });
    return new Response('{}', { status: 404 });
  };

  const one = await withFetch(d, api(), () => V.useInPost(env, ctxFor(db, 'client'), record(), [f('DSC06286.jpg')], '  My idea  '));
  const made = sent.find((s) => s.method === 'POST').body;
  is('one file: a new Idea, in this client’s pipeline, with the file attached', [one.ok, one.title, one.url, made.parent.database_id, made.properties.Status.select.name, made.properties.Client.relation, made.properties['Edit Link'].url],
     [true, 'My idea', `/portal/sean-comma#/content/${NEW.replace(/-/g, '')}`, '086468af-a36c-414a-9dd0-e13fca387a42', 'Idea', [{ id: record().pageId }], 'https://drive.google.com/file/d/finphoto0001/view']);
  is('it is the client’s to post, so it is not counted toward what we owe, and is stamped with who made it', [made.properties['Posted By'].select.name, made.properties.Media.select.name, made.properties.Source.select.name, made.properties['Last Edited By'].select.name, made.properties['Hide from Client'].checkbox, 'Post Date' in made.properties, 'Campaign' in made.properties], ['Client', 'Photo', 'Show Media', 'Client', false, false, false]);
  ok('only a new page is made: no existing card is written to', sent.every((s) => s.method === 'POST' && s.url.endsWith('/v1/pages')));

  sent.length = 0;
  const picked = [f('C0012.mp4'), f('DSC06286.jpg'), f('flyer.png')];
  const many = await withFetch(d, api(), () => V.useInPost(env, ctxFor(db, 'admin'), record(), picked, null));
  const manifest = JSON.parse(new TextDecoder().decode(env.REPORTS_BUCKET.files.get(`previews/sean-comma/${NEW.replace(/-/g, '')}/slides.json`).bytes));
  is('several files: a carousel Idea with the files as its slides, in the order they were picked', [many.ok, many.slides, manifest.slides.map((s) => s.file), sent[0].body.properties.Media.select.name, 'Edit Link' in sent[0].body.properties, many.title, sent[0].body.properties['Last Edited By'].select.name],
     [true, 3, ['rawclip00001', 'finphoto0001', 'finflyer0001'], 'Carousel', false, 'Revival After Dark: 3 slides', 'Blueprint']);
  is('the Idea is told it has slides, and that is the only thing written to it', sent.slice(1).map((s) => [s.method, s.url.endsWith(NEW), Object.keys(s.body.properties)]), [['PATCH', true, ['Slides Manifest']]]);

  sent.length = 0;
  const thin = { properties: { ...schema.properties, Source: { type: 'select', select: { options: [{ name: 'Client Films' }] } }, Media: { type: 'select', select: { options: [{ name: 'Video' }] } } } };
  await withFetch(d, api(thin), () => V.useInPost(env, ctxFor(db, 'client'), record(), [f('DSC06286.jpg')], null));
  is('a select is only ever set to a name the pipeline already has', ['Media' in sent[0].body.properties, 'Source' in sent[0].body.properties, sent[0].body.properties.Content.title[0].text.content], [false, false, 'Revival After Dark: DSC06286']);

  sent.length = 0;
  const gone = await withFetch(d, api(), () => V.useInPost(env, ctxFor(db, 'client'), record(), [{ ...f('DSC06286.jpg'), missing: true }], null));
  is('a file that is missing from Drive cannot be used, and nothing is created', [gone.ok, gone.error, sent.length], [false, 'none', 0]);
  const noIdea = await withFetch(d, api({ properties: { Status: { type: 'select', select: { options: [{ name: 'Planned' }] } } } }), () => V.useInPost(env, ctxFor(db, 'client'), record(), [f('DSC06286.jpg')], null));
  is('with no Idea status there is nowhere to put it, and nothing is created', [noIdea.ok, sent.length], [false, 0]);

  const route = read('../functions/portal/[slug]/vault/use.ts');
  ok('the route takes ids and a title from the request and nothing else: no link, no client, no status', /cleanIds\(ctx\.body\.ids, MAX_USE_IDS\)/.test(route) && /ctx\.body\.title/.test(route) && (route.match(/ctx\.body\.\w+/g) ?? []).every((m) => ['ctx.body.ids', 'ctx.body.title'].includes(m)));
}

section('Vault · holding');
{
  const page = (o) => ({ object: 'page', id: o.id, archived: !!o.archived, parent: { database_id: o.db }, properties: { Client: { type: 'relation', relation: [{ id: o.client }] }, Content: { type: 'title', title: [{ plain_text: 'Faith Rave carousel' }] }, Item: { type: 'title', title: [{ plain_text: 'Sean Comma · Revival: Holy Night (tentative)' }] }, Kind: { type: 'select', select: { name: o.kind ?? 'Moment' } }, 'Is Playbook': { type: 'checkbox', checkbox: !!o.playbook }, Deliverable: { type: 'select', select: null } } });
  const CONTENT = '086468af-a36c-414a-9dd0-e13fca387a42', CAL = 'cb355a1b-fc2b-4550-86f2-f572b4a5040f';
  const pages = {
    ['a'.repeat(32)]: page({ id: 'a'.repeat(32), db: CONTENT, client: SEAN }),
    ['b'.repeat(32)]: page({ id: 'b'.repeat(32), db: CAL, client: SEAN }),
    ['c'.repeat(32)]: page({ id: 'c'.repeat(32), db: CONTENT, client: REBELZ }),
    ['d'.repeat(32)]: page({ id: 'd'.repeat(32), db: CAL, client: SEAN, kind: 'Step' }),
    ['e'.repeat(32)]: page({ id: 'e'.repeat(32), db: CONTENT, client: SEAN, archived: true }),
  };
  globalThis.fetch = async (input) => { const id = String(typeof input === 'string' ? input : input.url).split('/').pop(); return pages[id] ? new Response(JSON.stringify(pages[id]), { status: 200 }) : new Response('{}', { status: 404 }); };
  try {
    const hold = (kind, id) => V.holdTarget('a-token', record(), { kind, id });
    is('a hold is one of this client’s posts or campaigns, named by the server the way the calendar names it', [await hold('item', 'a'.repeat(32)), await hold('campaign', 'b'.repeat(32))], [{ kind: 'item', id: 'a'.repeat(32), title: 'Faith Rave carousel' }, { kind: 'campaign', id: 'b'.repeat(32), title: 'Revival: Holy Night' }]);
    is('never another client’s, a step, an archived page, a page of the wrong kind, or one that is not there', [await hold('item', 'c'.repeat(32)), await hold('campaign', 'd'.repeat(32)), await hold('item', 'e'.repeat(32)), await hold('campaign', 'a'.repeat(32)), await hold('item', 'b'.repeat(32)), await hold('item', 'f'.repeat(32))], [null, null, null, null, null, null]);
  } finally { globalThis.fetch = realFetch; }
}

section('Vault · the routes');
{
  const dir = '../functions/portal/[slug]/vault/';
  const routes = ['data.ts', 'edit.ts', 'sync.ts', 'use.ts', 'announce.ts', 'pick.ts', 'open/[id].ts', 'thumb/[id].ts'];
  const src = Object.fromEntries(routes.map((r) => [r, read(dir + r)]));
  ok('every route starts at the same gate, which checks the sign-in before anything about the Vault', routes.every((r) => /await beginVault\(request, env, params\.slug, \{ post: (true|false) \}\)/.test(src[r])));
  const gate = read('../src/server/vault.ts');
  const begin = gate.slice(gate.indexOf('export async function beginVault'), gate.indexOf('/** The whole Clients row'));
  ok('the gate reads the viewer before the client, and the client before the database', begin.indexOf('readViewer(') < begin.indexOf('knownClient(') && begin.indexOf('knownClient(') < begin.indexOf('vaultDb('));
  ok('a write must come from our own page, as JSON', /o\.post && \(!isSameOrigin\(request\) \|\| !isJsonRequest\(request\)\)/.test(begin));
  ok('a client whose portal is off gets nothing, and one of us still does', /!known \|\| \(!admin && !known\.on\)/.test(begin));
  is('what is ours alone refuses a client before doing anything: sync, the picker, announce', ['sync.ts', 'pick.ts', 'announce.ts'].map((r) => (src[r].match(/if \(!ctx\.admin\) return portalNotFound\(\);/g) ?? []).length), [2, 1, 1]);
  ok('what a client may change is decided by the session’s role, not the request', /cleanVaultEdit\(ctx\.body, ctx\.viewer\.role\)/.test(src['edit.ts']) && !/ctx\.body\.role|body\.admin/.test(Object.values(src).join('')));
  ok('announce is the only thing that tells a client, and only behind the admin check', /notifyMediaReady/.test(src['announce.ts']) && routes.filter((r) => /notifyMediaReady/.test(src[r])).length === 1 && !/notifyMediaReady/.test(read('../src/server/vault-sync.ts')));
  ok('a sync tells us and never a client', /notifyVaultFiles/.test(read('../src/server/vault-sync.ts')) && !/clientKey\(slug\)[^\n]*'files'|notifyProgress|notifyReview/.test(read('../src/server/vault-sync.ts')));
  ok('nothing announced is recorded when nobody was told', /if \(!sent\) \{[\s\S]*?announced: null[\s\S]*?\}\s*const now/.test(src['announce.ts']));
  ok('the thumbnail and every preview are private to the browser that asked', /'Cache-Control': 'private, max-age=600'/.test(src['thumb/[id].ts']));
  ok('a file’s id from the address is checked to be an id before anything else', /if \(!isVaultId\(id\)\) return portalNotFound\(\);\s*const begun/.test(src['open/[id].ts']) && /if \(!isVaultId\(id\) \|\| !env\.REPORTS_BUCKET\) return portalNotFound\(\);\s*const begun/.test(src['thumb/[id].ts']));

  // the daily sync's door
  const cron = (env, headers = {}) => V.cronPost({ request: new Request('https://blueprint-marketing.com/portal/hq/vault/cron', { method: 'POST', headers }), env });
  const good = 's'.repeat(40);
  is('the daily sync’s address is a 404 with no secret set, a short one set, none sent, or the wrong one sent',
     [(await cron({ NOTION_TOKEN: 't' }, { Authorization: `Bearer ${good}` })).status, (await cron({ NOTION_TOKEN: 't', VAULT_CRON_SECRET: 'short' }, { Authorization: 'Bearer short' })).status,
      (await cron({ NOTION_TOKEN: 't', VAULT_CRON_SECRET: good })).status, (await cron({ NOTION_TOKEN: 't', VAULT_CRON_SECRET: good }, { Authorization: `Bearer ${'x'.repeat(40)}` })).status,
      (await cron({ NOTION_TOKEN: 't', VAULT_CRON_SECRET: good }, { Cookie: 'bp_admin=anything' })).status], [404, 404, 404, 404, 404]);
  const let_in = await cron({ NOTION_TOKEN: 't', VAULT_CRON_SECRET: good }, { Authorization: `Bearer ${good}` });
  is('with the right one it runs, and with no database bound says there is nothing to do', [let_in.status, (await let_in.json()).more], [200, false]);
  ok('the worker that calls it holds nothing but that address and that secret', (() => { const w = read('../workers/vault-sync/worker.js'); return /env\.VAULT_CRON_SECRET/.test(w) && /env\.SITE_URL/.test(w) && !/NOTION|GOOGLE|drive\.google|googleapis/.test(w); })());

  // Archive Folders never reaches a client
  ok('the Archive Folders field is read on the server and is in nothing a client is sent', !V.CLIENT_FIELDS.includes(V.ARCHIVE_FOLDERS_FIELD) && /archiveFolders: folderLinks\(p\[ARCHIVE_FOLDERS_FIELD\]\)/.test(read('../src/server/portal-notion.ts')) && !/archiveFolders/.test(read('../functions/portal/[slug]/data.ts')) && !/archive/i.test(read('../src/data/portal.ts').match(/export interface PortalClient \{[\s\S]*?\n\}/)[0]));
  is('folder links are read whether they were pasted as words or made into links, each folder once',
     V.folderLinks({ rich_text: [{ plain_text: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA, ', href: null }, { plain_text: 'Old shows', href: 'https://drive.google.com/drive/u/0/folders/BBBBBBBBBBBB?usp=sharing' }, { plain_text: '\nhttps://drive.google.com/drive/folders/AAAAAAAAAAAA https://docs.google.com/spreadsheets/d/CCCCCCCCCCCC' }] }).map((f) => f.id), ['AAAAAAAAAAAA', 'BBBBBBBBBBBB']);
  is('and nothing is a folder that is not one', [V.folderLinks(undefined), V.folderLinks({ rich_text: [{ plain_text: 'not a link' }] })], [[], []]);
}

section('Vault · the service worker leaves it alone');
{
  const vm = await import('node:vm');
  const sw = read('../public/portal-sw.js');
  const listeners = {};
  const sandbox = { URL, Response, Promise, console, undefined, caches: { open: async () => ({}) }, fetch: async () => new Response('net'),
    self: { location: { href: 'https://blueprint-marketing.com/portal-sw.js?v=abc123', origin: 'https://blueprint-marketing.com' }, addEventListener: (type, fn) => { listeners[type] = fn; } } };
  vm.createContext(sandbox);
  vm.runInContext(sw, sandbox);
  const routeFor = vm.runInContext('routeFor', sandbox);
  const I = 'a'.repeat(32), Ver = 'b'.repeat(16);
  const paths = [
    '/portal/sean-comma/vault/data', `/portal/sean-comma/vault/thumb/${I}`, `/portal/sean-comma/vault/thumb/${I}?again=1`, `/portal/sean-comma/vault/open/${I}`,
    '/portal/sean-comma/vault/edit', '/portal/sean-comma/vault/sync', '/portal/sean-comma/vault/use', '/portal/sean-comma/vault/pick', '/portal/sean-comma/vault/announce',
    '/portal/hq/vault', '/portal/hq/vault/cron', `/portal/sean-comma/preview/${I}/${Ver}/thumb`, `/portal/sean-comma/preview/${I}/${Ver}/image`, `/portal/sean-comma/preview/${I}/${Ver}/video`,
  ];
  const req = (p, o = {}) => ({ url: `https://blueprint-marketing.com${p}`, method: o.method ?? 'GET', mode: o.mode ?? 'same-origin', headers: { has: (h) => !!o.range && h === 'range' } });
  const fire = (r) => { let answered = null; listeners.fetch({ request: r, respondWith: (p) => { answered = p; } }); return answered; };
  ok('no Vault file, thumbnail, preview or data request is handled, however it is asked for', paths.every((p) => ['same-origin', 'cors', 'no-cors', 'navigate'].every((mode) => routeFor(req(p, { mode })) === null)));
  ok('nor a POST to any of them, nor a video asked for in byte ranges', paths.every((p) => routeFor(req(p, { method: 'POST' })) === null && routeFor(req(p, { range: true })) === null));
  ok('and respondWith is never called for one', paths.every((p) => fire(req(p)) === null && fire(req(p, { mode: 'no-cors' })) === null));
  ok('the service worker was not changed to know about the Vault at all', !/vault/i.test(sw));
  is('the Vault is a view of the portal’s own page, so its address is the page’s', [routeFor(req('/portal/sean-comma', { mode: 'navigate' })), routeFor(req('/portal/hq', { mode: 'navigate' }))], ['page', 'page']);
  const page = read('../src/scripts/portal-vault.ts');
  ok('the page asks only its own Vault addresses and the preview route, and builds nothing with innerHTML', !/\.innerHTML|insertAdjacentHTML|document\.write/.test(page) && !/googleusercontent|googleapis/.test(page));
  ok('a web-sized picture is fetched whole before it is shown', /showWhole\(img, url\)/.test(page) && /showWhole\(img, poster\)/.test(page));
  ok('"Open original" is always there, and is the file’s own page in Drive', /orig\.href = driveFileLink\(f\.drive\)/.test(page) && /'Open original'/.test(page));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
