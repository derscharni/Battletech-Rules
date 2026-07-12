const { HexGeo, computeLoS } = require('./los-engine.js');

// Karte bauen: flaches Feld, dann Overrides
function makeMap(w, h, overrides) {
  const map = new Map();
  for (let q = 0; q < w; q++) for (let r = 0; r < h; r++) {
    map.set(q + ',' + r, { level: 0, terrain: 'clear' });
  }
  for (const [k, v] of Object.entries(overrides || {})) {
    map.set(k, Object.assign({ level: 0, terrain: 'clear' }, v));
  }
  return map;
}
const U = (q, r, prone) => ({ hex: { q, r }, prone: !!prone });

let pass = 0, fail = 0;
function t(name, cond, detail) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail ? ' — ' + JSON.stringify(detail) : '')); }
}

// Gerade Linie in axial flat-top: gleiche r-Reihe ist NICHT kollinear in cube;
// kollinear: q konstant, oder r konstant? cube: (q, -q-r, r).
// Linie mit konstantem r: y variiert, z konstant -> kollinear. Also (0,3)->(6,3) ist gerade.
// Diagonale Kantenfälle erzeugen wir separat.

// --- 1. Freies Feld ---
{
  const m = makeMap(10, 8);
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('1 freie LoS auf flachem Feld', !res.blocked && res.totalMod === 0 && !res.partialCover, res);
  t('1b Zwischenhexes = Distanz-1', res.rows.length === res.distance - 1, { rows: res.rows.length, d: res.distance });
}

// --- 2. Level-2-Hügel in der Mitte blockiert ---
{
  const m = makeMap(10, 8, { '3,3': { level: 2 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('2 Level-2-Hügel blockiert', res.blocked === true, res.blockReason);
}

// --- 3. Level-1-Hügel in der Mitte blockiert NICHT ---
{
  const m = makeMap(10, 8, { '3,3': { level: 1 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('3 Level-1-Hügel mittig blockiert nicht', !res.blocked && res.totalMod === 0, res.blockReason);
}

// --- 4. Level-1-Hügel angrenzend ans Ziel -> Partial Cover ---
{
  const m = makeMap(10, 8, { '5,3': { level: 1 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('4 Partial Cover hinter Level-1-Kante', !res.blocked && res.partialCover && res.totalMod === 1, res);
}

// --- 4b. Gleicher Hügel, aber Angreifer steht höher -> kein Cover ---
{
  const m = makeMap(10, 8, { '5,3': { level: 1 }, '0,3': { level: 2 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('4b Angreifer höher: kein Partial Cover', !res.blocked && !res.partialCover, res);
}

// --- 5. Level-2-Hex angrenzend am Angreifer blockiert (auch wenn Ziel hoch steht) ---
{
  const m = makeMap(10, 8, { '1,3': { level: 2 }, '6,3': { level: 4 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('5 hohe Wand direkt vorm Angreifer blockiert', res.blocked === true, res.blockReason);
}

// --- 6. Zwei Light Woods: +2, nicht blockiert ---
{
  const m = makeMap(10, 8, { '2,3': { terrain: 'lightWoods' }, '4,3': { terrain: 'lightWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('6 zwei Light Woods = +2, offen', !res.blocked && res.totalMod === 2 && res.woodsPts === 2, res);
}

// --- 7. Light + Heavy Woods = 3 Punkte -> blockiert ---
{
  const m = makeMap(10, 8, { '2,3': { terrain: 'lightWoods' }, '4,3': { terrain: 'heavyWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('7 Light+Heavy = 3 Punkte blockiert', res.blocked === true && res.woodsPts === 3, res);
}

// --- 8. Ziel in Light Woods hinter Heavy Woods -> NICHT blockiert (BMM S.22: nur Zwischenhexes) ---
{
  const m = makeMap(10, 8, { '3,3': { terrain: 'heavyWoods' }, '6,3': { terrain: 'lightWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('8 Zielhex-Wald blockiert NICHT, gibt aber Modifikator (+3 gesamt)', !res.blocked && res.woodsPts === 2 && res.totalMod === 3, res);
}

// --- 8d. Zwei Zwischen-Heavy-Woods -> 4 Punkte blockiert ---
{
  const m = makeMap(10, 8, { '2,3': { terrain: 'heavyWoods' }, '4,3': { terrain: 'heavyWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('8d zwei Heavy Woods dazwischen blockieren', res.blocked === true && res.woodsPts === 4, res);
}

// --- 8e. Liegendes Ziel in Tiefe-1-Wasser -> vollständig getaucht, blockiert ---
{
  const m = makeMap(10, 8, { '6,3': { terrain: 'water', depth: 1 } });
  const res = computeLoS(m, U(0, 3), U(6, 3, true), 'bmm');
  t('8e prone in Tiefe-1-Wasser: getaucht, blockiert', res.blocked === true && res.submerged === true, res);
}

// --- 8f. Stehendes Ziel in Tiefe-2-Wasser -> blockiert ---
{
  const m = makeMap(10, 8, { '6,3': { terrain: 'water', depth: 2 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('8f stehend in Tiefe 2: getaucht, blockiert', res.blocked === true && res.submerged === true, res);
}

// --- 8g. Partial Cover auch auf Hügeln: Ziel L2, Kante L3, Angreifer L2 ---
{
  const m = makeMap(10, 8, { '0,3': { level: 2 }, '6,3': { level: 2 }, '5,3': { level: 3 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('8g Partial Cover auf Hügelplateau', !res.blocked && res.partialCover, res);
}

// --- 8b. Nur Ziel in Heavy Woods -> +2, offen ---
{
  const m = makeMap(10, 8, { '6,3': { terrain: 'heavyWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('8b Ziel in Heavy Woods: +2, offen', !res.blocked && res.totalMod === 2, res);
}

// --- 9. Beide auf Level-3-Hügeln, Wald unten wird überblickt ---
{
  const m = makeMap(10, 8, { '0,3': { level: 3 }, '6,3': { level: 3 }, '3,3': { terrain: 'heavyWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('9 Wald unterhalb der Sichtlinie ignoriert', !res.blocked && res.totalMod === 0, res);
}

// --- 10. Liegendes Ziel hinter Level-1-Hügel -> blockiert ---
{
  const m = makeMap(10, 8, { '5,3': { level: 1 } });
  const res = computeLoS(m, U(0, 3), U(6, 3, true), 'bmm');
  t('10 prone hinter Level-1-Kante: blockiert', res.blocked === true, res.blockReason);
}

// --- 11. Ziel in Tiefe-1-Wasser -> Partial Cover ---
{
  const m = makeMap(10, 8, { '6,3': { terrain: 'water', depth: 1 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('11 Tiefe-1-Wasser: Partial Cover', !res.blocked && res.partialCover, res);
}

// --- 12. Gebäude Höhe 2 blockiert ---
{
  const m = makeMap(10, 8, { '3,3': { terrain: 'building', bldgHeight: 2 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'bmm');
  t('12 Gebäude H2 blockiert', res.blocked === true, res.blockReason);
}

// --- 13. Geteilte Linie: Verteidiger wählt (Wald auf einer Seite) ---
{
  // (0,0) -> (1,-2)? Suche ein Paar mit geteilter Linie: Distanz 2, Linie exakt
  // durch Kante: axial (0,0) und (2,-1) — Mittelpunkt liegt auf Kante zwischen (1,0) und (1,-1)
  const m = makeMap(1, 1, {
    '0,0': { level: 0, terrain: 'clear' },
    '2,-1': { level: 0, terrain: 'clear' },
    '1,0': { level: 0, terrain: 'heavyWoods' },
    '1,-1': { level: 0, terrain: 'clear' }
  });
  const res = computeLoS(m, { hex: { q: 0, r: 0 }, prone: false }, { hex: { q: 2, r: -1 }, prone: false }, 'bmm');
  t('13 geteilte Linie erkannt', res.divided === true, res);
  t('13b Verteidiger wählt Heavy Woods (+2)', !res.blocked && res.totalMod === 2, res);
}

// --- 14. Alpha Strike: 1 Heavy Woods blockiert ---
{
  const m = makeMap(10, 8, { '3,3': { terrain: 'heavyWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'as');
  t('14 AS: 1 Heavy-Woods-Hex blockiert', res.blocked === true, res);
}

// --- 15. Alpha Strike: 2 Light Woods = pauschal +1, offen; 3 blockieren ---
{
  const m = makeMap(10, 8, { '2,3': { terrain: 'lightWoods' }, '4,3': { terrain: 'lightWoods' } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'as');
  t('15 AS: 2 Light Woods offen, +1 pauschal', !res.blocked && res.totalMod === 1, res);
  const m2 = makeMap(10, 8, { '2,3': { terrain: 'lightWoods' }, '3,3': { terrain: 'lightWoods' }, '4,3': { terrain: 'lightWoods' } });
  const res2 = computeLoS(m2, U(0, 3), U(6, 3), 'as');
  t('15b AS: 3 Light Woods blockieren', res2.blocked === true, res2);
}

// --- 16. TW identisch zu BMM im Kernfall ---
{
  const m = makeMap(10, 8, { '3,3': { level: 2 } });
  const res = computeLoS(m, U(0, 3), U(6, 3), 'tw');
  t('16 TW: Level-2-Hügel blockiert', res.blocked === true, res.blockReason);
}

console.log('\n' + pass + ' bestanden, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
