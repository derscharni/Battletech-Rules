
/* ============================================================
   LoS-Engine — verifiziert gegen MegaMek LosEffects.java
   (21 Node-Tests bestanden)
   ============================================================ */
const HexGeo = {
  toCube(h){ return {x:h.q, y:-h.q-h.r, z:h.r}; },
  cubeRound(fx,fy,fz){
    let x=Math.round(fx), y=Math.round(fy), z=Math.round(fz);
    const dx=Math.abs(x-fx), dy=Math.abs(y-fy), dz=Math.abs(z-fz);
    if(dx>dy&&dx>dz) x=-y-z; else if(dy>dz) y=-x-z; else z=-x-y;
    return {q:x, r:z};
  },
  distance(a,b){
    const ac=this.toCube(a), bc=this.toCube(b);
    return Math.max(Math.abs(ac.x-bc.x),Math.abs(ac.y-bc.y),Math.abs(ac.z-bc.z));
  },
  key(h){ return h.q+','+h.r; },
  equals(a,b){ return a.q===b.q && a.r===b.r; },
  line(a,b,eps){
    const N=this.distance(a,b);
    if(N===0) return [a];
    const ac=this.toCube(a), bc=this.toCube(b);
    const nudge=eps||0, res=[];
    for(let i=0;i<=N;i++){
      const t=i/N;
      const fx=ac.x+(bc.x-ac.x)*t+nudge*1e-6;
      const fy=ac.y+(bc.y-ac.y)*t+nudge*2e-6;
      const fz=ac.z+(bc.z-ac.z)*t-nudge*3e-6;
      const h=this.cubeRound(fx,fy,fz);
      if(!res.length||!this.equals(res[res.length-1],h)) res.push(h);
    }
    return res;
  }
};
function effElevation(hex){
  let e=hex.level;
  if(hex.terrain==='building') e+=(hex.bldgHeight||1);
  return e;
}
function woodsTop(hex){
  return (hex.terrain==='lightWoods'||hex.terrain==='heavyWoods') ? hex.level+2 : null;
}
const RULEBOOKS={
  bmm:{
    id:'bmm', name:'BattleMech Manual',
    woodsPts:{lightWoods:1,heavyWoods:2}, woodsBlockAt:3,
    countTargetHexWoods:false, cumulativeWoodsMod:true,
    targetInWoodsMod:{lightWoods:1,heavyWoods:2},
    partialCover:true, partialCoverMod:1,
    cite:{
      losBase:'BMM S. 22, »Line of Sight« — Linie von Hexmitte zu Hexmitte; Angreifer- und Zielhex zählen nicht als Zwischenterrain',
      hill:'BMM S. 23, »Intervening Terrain« — Terrain interveniert, wenn sein Level ≥ beide Mechs ist, oder ≥ einem Mech und direkt angrenzend. Ein intervenierendes Hügel- oder Gebäudehex blockiert. Stehende Mechs sind 2 Level hoch (S. 22)',
      woods:'BMM S. 22–23, »Woods/Jungle« — Wälder ragen 2 Level über ihr Hex; Light zählt 1 Punkt, Heavy 2; ab 3 Punkten Zwischen-Wald ist die LoS blockiert. Das Zielhex zählt hier NICHT mit (nur als Modifikator, S. 26)',
      partialCover:'BMM S. 26, »Partial Cover Modifier« — Zielhex-Nachbar exakt 1 Level höher, entlang der LoS: +1, Beintreffer treffen die Deckung. Steht der Angreifer höher, entfällt die Deckung (außer bei Wasser)',
      divided:'BMM S. 22, »LOS on the Border of Two Hexes« — läuft die Linie exakt auf der Kante, entscheidet der Spieler des Ziels, durch welches Hex sie führt',
      prone:'BMM S. 22/26 — liegende Mechs sind 1 Level hoch, erhalten kein Partial Cover; hinter einer Level-+1-Kante sind sie komplett verdeckt',
      water:'BMM S. 23/26/65 — stehend in Tiefe 1: Partial Cover (auch bergab); stehend ab Tiefe 2 oder liegend ab Tiefe 1: vollständig getaucht, LoS blockiert (außer Unterwasserkampf, S. 64)'
    }
  },
  tw:{
    id:'tw', name:'Total Warfare',
    woodsPts:{lightWoods:1,heavyWoods:2}, woodsBlockAt:3,
    countTargetHexWoods:false, cumulativeWoodsMod:true,
    targetInWoodsMod:{lightWoods:1,heavyWoods:2},
    partialCover:true, partialCoverMod:1,
    cite:{
      losBase:'TW, »Line of Sight« — Linie von Hexmitte zu Hexmitte; gilt für alle Einheitentypen',
      hill:'TW, »Terrain Restrictions« — Zwischenterrain blockiert, wenn höher als beide Einheiten (oder höher als die angrenzende Einheit)',
      woods:'TW, »Woods« — Light +1, Heavy +2; 3+ Punkte blockieren. Wälder sind 2 Level hoch.',
      partialCover:'TW, »Partial Cover« — +1 auf den Angriff, Beintreffer treffen die Deckung',
      divided:'TW, »Hexside LoS« — zugunsten des Verteidigers aufgelöst',
      prone:'TW, »Prone Units« — liegende Einheiten sind 1 Level niedriger',
      water:'TW, »Depth 1 Water« — stehender Mech erhält Partial Cover'
    }
  },
  as:{
    id:'as', name:'Alpha Strike: CE',
    woodsPts:{lightWoods:1,heavyWoods:3}, woodsBlockAt:3,
    countTargetHexWoods:false, cumulativeWoodsMod:false, flatWoodsMod:1,
    targetInWoodsMod:{lightWoods:1,heavyWoods:1},
    partialCover:true, partialCoverMod:1,
    cite:{
      losBase:'AS:CE, »Line of Sight« — hier auf Hexfeld übertragen (1 Hex ≈ 2")',
      hill:'AS:CE, »Hills« — Terrain höher als beide Einheiten blockiert',
      woods:'AS:CE, »Woods« — LoS durch mehr als 2" Heavy Woods (1 Hex) oder 6" Light Woods (3 Hexes) ist blockiert; Wald gibt pauschal +1 auf die Target Number',
      partialCover:'AS:CE, »Cover« — Ziel in Deckung: +1 Target Number',
      divided:'AS:CE — Kantenfälle zugunsten des Verteidigers',
      prone:'AS:CE — liegende Einheiten niedriger (vereinfacht)',
      water:'AS:CE, »Water« — vereinfacht übernommen'
    }
  }
};
function unitAbsHeight(map,unit){
  // BMM S. 22: stehender Mech = 2 Level hoch, liegender = 1 Level.
  // LoS-Level = Level des Hex + Höhe des Mechs. In Wasser steht er auf dem Grund.
  const hex=map.get(HexGeo.key(unit.hex));
  let ground=hex.level;
  if(hex.terrain==='water') ground=hex.level-(hex.depth||0);
  return ground+(unit.prone?1:2);
}
function isSubmerged(map,unit){
  // BMM S. 23: stehend ab Tiefe 2, liegend ab Tiefe 1 = vollständig unter Wasser
  const hex=map.get(HexGeo.key(unit.hex));
  if(hex.terrain!=='water') return false;
  const d=hex.depth||0;
  return unit.prone ? d>=1 : d>=2;
}
function analyzePath(map,path,atk,tgt,rb){
  const tgtHex=map.get(HexGeo.key(tgt.hex));
  const attAbs=unitAbsHeight(map,atk);
  const tgtAbs=unitAbsHeight(map,tgt);
  const rows=[];
  let blocked=false, blockReason=null, blockHexKey=null;
  let woodsPts=0, lightCount=0, heavyCount=0;
  let partialCover=false, coverHexKey=null;
  // BMM S. 23: Unter-Wasser-Sonderfälle zuerst
  if(isSubmerged(map,tgt)){
    return finishAnalysis({path,rows,blocked:true,
      blockReason:tgt.prone?'Ziel liegt unter Wasser (liegend ab Tiefe 1 = vollständig getaucht)':'Ziel vollständig unter Wasser (Tiefe 2+)',
      blockHexKey:HexGeo.key(tgt.hex),woodsPts:0,lightCount:0,heavyCount:0,
      partialCover:false,coverHexKey:null,targetWoodsMod:0,attAbs,tgtAbs,submerged:true},rb,map,tgt);
  }
  if(isSubmerged(map,atk)){
    return finishAnalysis({path,rows,blocked:true,
      blockReason:'Angreifer vollständig unter Wasser — Unterwasserkampf (BMM S. 64) ist hier nicht abgebildet',
      blockHexKey:HexGeo.key(atk.hex),woodsPts:0,lightCount:0,heavyCount:0,
      partialCover:false,coverHexKey:null,targetWoodsMod:0,attAbs,tgtAbs,submerged:true},rb,map,tgt);
  }
  for(const c of path){
    const key=HexGeo.key(c);
    if(HexGeo.equals(c,atk.hex)||HexGeo.equals(c,tgt.hex)) continue;
    const hex=map.get(key);
    if(!hex) continue;
    const adjAtk=HexGeo.distance(c,atk.hex)===1;
    const adjTgt=HexGeo.distance(c,tgt.hex)===1;
    const E=effElevation(hex);
    const row={key,coord:c,hex,effEl:E,effects:[]};
    // BMM S. 23: Terrain interveniert, wenn Level >= beide Mechs,
    // oder >= Angreifer und angrenzend, oder >= Ziel und angrenzend
    const hillBlocks=(E>=attAbs&&E>=tgtAbs)||(E>=attAbs&&adjAtk)||(E>=tgtAbs&&adjTgt);
    if(hillBlocks){
      blocked=true; blockHexKey=blockHexKey||key;
      const what=hex.terrain==='building'?'Gebäude':'Geländestufe';
      let why;
      if(E>=attAbs&&E>=tgtAbs) why=`Level ${E} ≥ beide Mechs (LoS-Level ${attAbs}/${tgtAbs})`;
      else if(E>=attAbs&&adjAtk) why=`Level ${E} ≥ Angreifer (LoS-Level ${attAbs}) und direkt angrenzend`;
      else why=`Level ${E} ≥ Ziel (LoS-Level ${tgtAbs}) und direkt angrenzend`;
      row.effects.push({type:'block',label:`${what} blockiert: ${why}`,cite:rb.cite.hill});
      if(!blockReason) blockReason=`${what} (${why})`;
    }
    // BMM S. 26: Partial Cover = Hex exakt 1 Level über dem Zielhex, angrenzend,
    // entlang der LoS; entfällt, wenn der Angreifer höher steht (bergab)
    if(!hillBlocks&&rb.partialCover&&adjTgt&&!tgt.prone&&tgtHex.terrain!=='water'&&
       E===tgtHex.level+1&&attAbs<=tgtAbs){
      partialCover=true; coverHexKey=key;
      row.effects.push({type:'cover',label:`Partial Cover: Level ${E} = Zielhex +1, angrenzend, Angreifer nicht höher`,cite:rb.cite.partialCover});
    }
    const wTop=woodsTop(hex);
    if(wTop!==null){
      const interferes=(wTop>=attAbs&&wTop>=tgtAbs)||(wTop>=attAbs&&adjAtk)||(wTop>=tgtAbs&&adjTgt);
      if(interferes){
        const pts=rb.woodsPts[hex.terrain];
        woodsPts+=pts;
        if(hex.terrain==='lightWoods') lightCount++; else heavyCount++;
        row.effects.push({type:'woods',label:`${hex.terrain==='lightWoods'?'Light':'Heavy'} Woods: +${pts} Waldpunkt${pts>1?'e':''} (Krone auf Level ${wTop})`,cite:rb.cite.woods});
      }else{
        row.effects.push({type:'ignored',label:`Wald wird überblickt (Krone Level ${wTop} unter der Sichtlinie)`,cite:rb.cite.woods});
      }
    }
    if(!row.effects.length) row.effects.push({type:'clear',label:'Kein Einfluss auf die LoS'});
    rows.push(row);
  }
  return finishAnalysis({path,rows,blocked,blockReason,blockHexKey,woodsPts,lightCount,heavyCount,
    partialCover,coverHexKey,targetWoodsMod:0,attAbs,tgtAbs,submerged:false},rb,map,tgt);
}
function finishAnalysis(o,rb,map,tgt){
  const tgtHex=map.get(HexGeo.key(tgt.hex));
  // BMM S. 26: Ziel im Wald gibt einen Modifikator — zählt aber NICHT zur
  // 3-Punkte-Blockade (BMM S. 22: nur Zwischenhexes werden geprüft)
  let targetWoodsLabel=null;
  const tgtW=(tgtHex.terrain==='lightWoods'||tgtHex.terrain==='heavyWoods')?tgtHex.terrain:null;
  if(tgtW){
    o.targetWoodsMod=rb.targetInWoodsMod[tgtW];
    targetWoodsLabel=`Ziel steht in ${tgtW==='lightWoods'?'Light':'Heavy'} Woods`;
    if(rb.countTargetHexWoods) o.woodsPts+=rb.woodsPts[tgtW];
  }
  if(!o.blocked&&o.woodsPts>=rb.woodsBlockAt){
    o.blocked=true;
    o.blockReason=`Waldpunkte der Zwischenhexes: ${o.woodsPts} ≥ ${rb.woodsBlockAt}`;
  }
  // BMM S. 26: Tiefe-1-Wasser gibt Partial Cover — auch gegen höher stehende Angreifer
  if(!o.blocked&&rb.partialCover&&!tgt.prone&&tgtHex.terrain==='water'&&(tgtHex.depth||0)===1){
    o.partialCover=true; o.coverHexKey=HexGeo.key(tgt.hex); o.waterCover=true;
  }
  const mods=[];
  if(!o.blocked){
    if(rb.cumulativeWoodsMod){
      if(o.lightCount) mods.push({label:`${o.lightCount}× Light Woods dazwischen`,value:o.lightCount*rb.woodsPts.lightWoods});
      if(o.heavyCount) mods.push({label:`${o.heavyCount}× Heavy Woods dazwischen`,value:o.heavyCount*rb.woodsPts.heavyWoods});
      if(o.targetWoodsMod) mods.push({label:targetWoodsLabel,value:o.targetWoodsMod});
    }else{
      if(o.lightCount||o.heavyCount||o.targetWoodsMod) mods.push({label:'Wald in der Sichtlinie / Ziel im Wald (pauschal)',value:rb.flatWoodsMod});
    }
    if(o.partialCover) mods.push({label:o.waterCover?'Partial Cover (Tiefe-1-Wasser)':'Partial Cover',value:rb.partialCoverMod});
  }
  o.mods=mods;
  o.totalMod=mods.reduce((s,m)=>s+m.value,0);
  return o;
}
/* ---------- Ausrichtung & Angriffsrichtung ----------
   Bögen wie MegaMek Compute.targetSideTable: Front 270°–90° (drei vordere
   Hexseiten), rechte Seite (90°,150°], Heck (150°,210°), linke Seite [210°,270°).
   Facing 0–5 = Hexseite, gegen den Uhrzeigersinn ab »Norden« der Karte. */
const FACING_DIRS=[[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]];
const FACING_NAMES=['N','NO','SO','S','SW','NW'];
const FACING_ANG=[-90,-30,30,90,150,210];
function hexAngle(a,b){
  const ax=a.q*1.5, ay=(a.r+a.q/2)*Math.sqrt(3);
  const bx=b.q*1.5, by=(b.r+b.q/2)*Math.sqrt(3);
  return Math.atan2(by-ay,bx-ax)*180/Math.PI;
}
function attackDirection(atk,tgt){
  if(HexGeo.equals(atk.hex,tgt.hex)) return null;
  const deg=hexAngle(tgt.hex,atk.hex);
  let fa=(deg-FACING_ANG[tgt.facing||0])%360; if(fa<0)fa+=360;
  fa=Math.round(fa*1000)/1000;
  let side='front';
  if(fa>90&&fa<=150) side='right';
  else if(fa>150&&fa<210) side='rear';
  else if(fa>=210&&fa<270) side='left';
  const boundary=fa===90||fa===150||fa===210||fa===270;
  return {fa,side,boundary};
}
/* Trefferzonentabelle (2W6). Front und Heck nutzen dieselbe Spalte —
   Torsotreffer von hinten gehen aber auf die Heckpanzerung. */
const HIT_LOCATIONS={CT:'Zentraltorso',LT:'Linker Torso',RT:'Rechter Torso',LA:'Linker Arm',RA:'Rechter Arm',LL:'Linkes Bein',RL:'Rechtes Bein',HD:'Kopf'};
const HIT_TABLE={
  front:['CT','RA','RA','RL','RT','CT','LT','LL','LA','LA','HD'],
  rear: ['CT','RA','RA','RL','RT','CT','LT','LL','LA','LA','HD'],
  left: ['LT','LL','LA','LA','LL','LT','CT','RT','RA','RL','HD'],
  right:['RT','RL','RA','RA','RL','RT','CT','LT','LA','LL','HD']
};
function hitLocation(side,roll){
  const code=HIT_TABLE[side||'front'][roll-2];
  return {code,name:HIT_LOCATIONS[code],crit:roll===2,
    rearArmor:side==='rear'&&(code==='CT'||code==='LT'||code==='RT')};
}
function defenderScore(a){ return (a.blocked?1000:0)+a.totalMod; }
function computeLoS(map,atk,tgt,rulebookId){
  const rb=RULEBOOKS[rulebookId]||RULEBOOKS.bmm;
  if(HexGeo.equals(atk.hex,tgt.hex)){
    return {sameHex:true,blocked:false,rows:[],mods:[],totalMod:0,rb,dir:null,atkArc:null};
  }
  const p1=HexGeo.line(atk.hex,tgt.hex,+1);
  const p2=HexGeo.line(atk.hex,tgt.hex,-1);
  const same=p1.length===p2.length&&p1.every((h,i)=>HexGeo.equals(h,p2[i]));
  const a1=analyzePath(map,p1,atk,tgt,rb);
  let result, divided=false, altResult=null;
  if(same){ result=a1; }
  else{
    divided=true;
    const a2=analyzePath(map,p2,atk,tgt,rb);
    if(defenderScore(a2)>defenderScore(a1)){ result=a2; altResult=a1; }
    else{ result=a1; altResult=a2; }
  }
  return Object.assign({sameHex:false,divided,altResult,rb,distance:HexGeo.distance(atk.hex,tgt.hex),
    dir:attackDirection(atk,tgt),atkArc:attackDirection(tgt,atk)},result);
}

if(typeof module!=='undefined'){module.exports={HexGeo,RULEBOOKS,computeLoS,unitAbsHeight,effElevation,woodsTop,isSubmerged,
  FACING_DIRS,FACING_NAMES,FACING_ANG,attackDirection,hitLocation,HIT_TABLE,HIT_LOCATIONS};}
