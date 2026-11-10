/**
 * N1 gallery (debug only, never part of the game build): gallery/n1.html.
 * Real HTML, so the card words are measured in the phone's own font, as on the real screens.
 *   ?view=streets  the Streets screen mock: four cards (done, done, open, locked) in the grid
 *   ?view=wheel    Nigeria's wheel screen mock with Lagos working
 *   ?view=parts    every card look, both badges, the music icons, the wheel with none and many working
 *   &still         stop the turning (as reduced motion does)
 *
 * The words are copied from docs/design.md S2.10 only to show the fit; gamedev writes the real
 * ones in N2 (src/screens/words.ts). The CSS below is art's proposal for the card look; gamedev
 * moves it into src/screens/screens.css in N2.
 */
import { CARD_LOOK, CARD_PICTURES, cardBadgeSvg, cardSceneSvg, musicIconSvg, type CardPicture, type CardState } from './cards';
import { WHEEL_STATES, wheelSvg } from './wheel';

/** Art's proposed CSS for the street cards (S2.6 "Fit at 320 px", S2.10). */
export const CARD_CSS = `
.streets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0; }
.street-card {
  position: relative; overflow: hidden; box-sizing: border-box; min-height: 60px; min-width: 0;
  display: flex; flex-direction: column; justify-content: center; gap: 1px;
  padding: 5px 8px; border: 2px solid ${CARD_LOOK.open.edge}; border-radius: ${CARD_LOOK.radius}px;
  background: ${CARD_LOOK.open.face}; box-shadow: 0 3px 0 ${CARD_LOOK.open.shadow};
  color: ${CARD_LOOK.ink}; text-align: left; font-family: 'Trebuchet MS', Verdana, sans-serif; cursor: pointer;
}
.street-card.done { background: ${CARD_LOOK.done.face}; border-color: ${CARD_LOOK.done.edge}; box-shadow: 0 3px 0 ${CARD_LOOK.done.shadow}; }
.street-card.locked { background: ${CARD_LOOK.locked.face}; border: 2px dashed ${CARD_LOOK.locked.edge}; box-shadow: none; color: ${CARD_LOOK.inkSoft}; }
.street-card .art { position: absolute; inset: 0; pointer-events: none; }
.street-card .badge { position: absolute; top: 3px; right: 3px; width: ${CARD_LOOK.badge}px; height: ${CARD_LOOK.badge}px; }
.street-card .num, .street-card .name, .street-card .status { position: relative; display: block; }
/* The first line sits beside the badge and is as tall as it, so the bold name below always has the card's full width. */
.street-card .num { font-size: 0.75rem; color: ${CARD_LOOK.inkSoft}; min-height: ${CARD_LOOK.badge}px; line-height: ${CARD_LOOK.badge}px; padding-right: ${CARD_LOOK.badge + 4}px; }
.street-card .name { font-weight: bold; font-size: 1.05rem; line-height: 1.15; overflow-wrap: normal; word-break: keep-all; }
.street-card .status { font-size: 0.8rem; }
/* Tiny screens (the 2 x 2 grid at 320 x 240): S2.6 "Fit at 320 px" */
@media (max-width: 480px), (max-height: 300px) {
  .streets-grid { gap: 6px; margin: 4px 0; }
  .street-card { min-height: 52px; padding: 3px 6px; }
  .street-card .badge { width: ${CARD_LOOK.badgeTiny}px; height: ${CARD_LOOK.badgeTiny}px; }
  .street-card .num { font-size: 0.7rem; min-height: ${CARD_LOOK.badgeTiny - 2}px; line-height: ${CARD_LOOK.badgeTiny - 2}px; padding-right: ${CARD_LOOK.badgeTiny + 4}px; }
  .street-card .name { font-size: 0.9rem; }
  .street-card .status { font-size: 0.7rem; line-height: 1.2; }
}
`;

const PAGE_CSS = `
html, body { margin: 0; height: 100%; background: #6fc2f0; font-family: 'Trebuchet MS', Verdana, sans-serif; }
.screen.n1 { background: rgba(10, 20, 12, 0.55); }
@media (max-height: 300px) {
  .screen.n1 { padding: 6px 8px; }
  .screen.n1 .card { padding: 6px 10px; border-radius: 12px; }
  .screen.n1 h2 { font-size: 1.1rem; margin: 0; }
  .screen.n1 p.small { margin: 0; font-size: 0.75rem; }
  .screen.n1 .minor-row { margin-top: 4px; }
}
.wheel-layout { display: flex; gap: 12px; align-items: center; }
.wheel-box { flex: 0 0 auto; width: min(100vh - 60px, 50vw, 420px); aspect-ratio: 1; }
.wheel-words { flex: 1 1 0; min-width: 0; }
@media (max-height: 300px) {
  .wheel-box { width: min(100vh - 32px, 58vw); }
  .wheel-words p { font-size: 0.72rem; }
  .wheel-words h2 { font-size: 1rem; }
}
.parts { display: flex; flex-wrap: wrap; gap: 14px; padding: 12px; background: #fffaf0; min-height: 100%; box-sizing: border-box; }
.parts .cell { width: 150px; font-size: 11px; color: #1d1a14; }
.parts .cell.big { width: 300px; }
.parts .icons { display: flex; gap: 10px; align-items: center; }
.parts .chip { display: inline-flex; padding: 8px; border-radius: 10px; background: rgba(29, 26, 20, 0.75); color: #fff; }
`;

interface CardMock {
  pic: CardPicture;
  state: CardState;
  num: string;
  name: string;
  status: string;
}

function card(c: CardMock): string {
  const badge = cardBadgeSvg(c.state);
  return (
    `<button class="street-card ${c.state}" type="button"${c.state === 'locked' ? ' aria-disabled="true"' : ''}>` +
    `<span class="art">${cardSceneSvg(c.pic, c.state)}</span>` +
    (badge ? `<span class="badge">${badge}</span>` : '') +
    // No small line on the hall card: an empty one keeps the names in a row lined up.
    `<span class="num"${c.num ? '' : ' aria-hidden="true"'}>${c.num}</span>` +
    `<span class="name">${c.name}</span><span class="status">${c.status}</span></button>`
  );
}

const MOCK: CardMock[] = [
  { pic: 'morning', state: 'done', num: 'Street 1', name: 'Alausa', status: 'Done ✓ Best: 120 kobo' },
  { pic: 'market', state: 'done', num: 'Street 2', name: 'Computer Village', status: 'Done ✓ Best: 113 kobo' },
  { pic: 'evening', state: 'open', num: 'Street 3', name: 'Ikeja', status: 'Ready to play' },
  { pic: 'hall', state: 'locked', num: '', name: 'Go-Slow Hall', status: 'Finish street 3 first' },
];

function streetsScreen(): string {
  return (
    '<div class="screen n1"><div class="card narrow" role="dialog" aria-label="Lagos">' +
    '<h2>Lagos</h2><p class="small">Fix 3 streets, then clear Go-Slow Hall.</p>' +
    `<div class="streets-grid">${MOCK.map(card).join('')}</div>` +
    '<div class="minor-row"><button class="minor">Nigeria’s wheel</button><button class="minor">Home</button></div>' +
    '</div></div>'
  );
}

function wheelScreen(still: boolean): string {
  return (
    '<div class="screen n1"><div class="card" role="dialog" aria-label="Nigeria’s wheel"><div class="wheel-layout">' +
    `<div class="wheel-box">${wheelSvg(['lagos'], { turn: !still })}</div>` +
    '<div class="wheel-words"><h2>Nigeria’s wheel</h2>' +
    '<p>Every state is a part of Nigeria Company. Fix a state’s problems and its cog starts turning.</p>' +
    '<p><b>1 of 37 cogs turning.</b> More states are coming soon.</p>' +
    '<button class="minor">Back</button></div>' +
    '</div></div></div>'
  );
}

function parts(still: boolean): string {
  const cells: string[] = [];
  for (const state of ['open', 'done', 'locked'] as const) {
    for (const pic of CARD_PICTURES) {
      cells.push(
        `<div class="cell">${pic}, ${state}<div class="streets-grid" style="grid-template-columns:1fr">` +
          card({ pic, state, num: pic === 'hall' ? '' : 'Street 2', name: pic === 'hall' ? 'Go-Slow Hall' : 'Computer Village', status: state === 'done' ? 'Done ✓ Best: 113 kobo' : state === 'open' ? 'Ready to play' : 'Finish street 1 first' }) +
          '</div></div>',
      );
    }
  }
  cells.push(
    '<div class="cell">music on, music off (on a dark chip and on cream)<div class="icons">' +
      `<span class="chip">${musicIconSvg(true)}</span><span class="chip">${musicIconSvg(false)}</span>` +
      `<span style="color:#1d1a14">${musicIconSvg(true)}</span><span style="color:#1d1a14">${musicIconSvg(false)}</span>` +
      `<span style="width:22px;height:22px;display:inline-block">${cardBadgeSvg('done')}</span><span style="width:22px;height:22px;display:inline-block">${cardBadgeSvg('locked')}</span>` +
      '</div></div>',
  );
  const some = WHEEL_STATES.filter((_, i) => i % 3 === 0).map((s) => s.id);
  cells.push(`<div class="cell big">wheel, none working<div style="width:300px;height:300px">${wheelSvg([], { turn: !still })}</div></div>`);
  cells.push(`<div class="cell big">wheel, Lagos working<div style="width:300px;height:300px">${wheelSvg(['lagos'], { turn: !still })}</div></div>`);
  cells.push(`<div class="cell big">wheel, every third state working (later)<div style="width:300px;height:300px">${wheelSvg(some, { turn: !still })}</div></div>`);
  cells.push(`<div class="cell big">wheel, all 37 working (later)<div style="width:300px;height:300px">${wheelSvg(WHEEL_STATES.map((s) => s.id), { turn: !still })}</div></div>`);
  return `<div class="parts">${cells.join('')}</div>`;
}

if (typeof document !== 'undefined') {
  const q = new URLSearchParams(location.search);
  const view = q.get('view') ?? 'streets';
  const still = q.has('still');
  const style = document.createElement('style');
  style.textContent = CARD_CSS + PAGE_CSS;
  document.head.append(style);
  const root = document.getElementById('root') ?? document.body;
  root.innerHTML = view === 'wheel' ? wheelScreen(still) : view === 'parts' ? parts(still) : streetsScreen();
}
