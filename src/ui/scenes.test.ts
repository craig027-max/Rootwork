import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots.data';
import { SCENES, SCENE_EMOJI } from './scenes';

describe('scene registry', () => {
  it('exports a function for every registered scene key', () => {
    const keys = Object.keys(SCENES);
    expect(keys.length).toBeGreaterThan(19);
    for (const key of keys) {
      expect(typeof SCENES[key], key).toBe('function');
    }
  });

  it('gives every root a scene that exists in the registry', () => {
    const missing = ROOTS.filter((r) => !SCENES[r.scene]).map((r) => `${r.root} → ${r.scene}`);
    expect(missing).toEqual([]);
  });

  it('has an emoji for every registered scene', () => {
    const missing = Object.keys(SCENES).filter((k) => !SCENE_EMOJI[k]);
    expect(missing).toEqual([]);
  });

  it('wires meaning-true scenes onto the roots that used to contradict', () => {
    const byRoot = Object.fromEntries(ROOTS.map((r) => [r.root, r.scene]));
    expect(byRoot.Stat).toBe('stand');
    expect(byRoot.Ten).toBe('hold');
    expect(byRoot.Tang).toBe('touch');
    expect(byRoot.Lev).toBe('lift');
    expect(byRoot.Aero).toBe('air');
    expect(byRoot.Ptero).toBe('wing');
    expect(byRoot.Struct).toBe('build');
    expect(byRoot.Uni).toBe('one');
    expect(byRoot.Bi).toBe('two');
    expect(byRoot.Tri).toBe('three');
    expect(byRoot.Aqua).toBe('water');
    expect(byRoot.Photo).toBe('light');
    expect(byRoot.Astro).toBe('stars');
    expect(byRoot.Therm).toBe('heat');
    expect(byRoot.Bio).toBe('dna');
    expect(byRoot.Pyr).toBe('heat');
    expect(byRoot.Semi).toBe('half');
    expect(byRoot.Circum).toBe('circle');
    expect(byRoot.Cycl).toBe('circle');
    expect(byRoot.Sub).toBe('under');
    expect(byRoot.Hypo).toBe('under');
    expect(byRoot.Manu).toBe('hand');
    expect(byRoot.Sect).toBe('cut');
    expect(byRoot.Fort).toBe('strong');
    expect(byRoot.Cent).toBe('hundred');
    expect(byRoot.Dis).toBe('apart');
    expect(byRoot.Mis).toBe('wrong');
    expect(byRoot.Anti).toBe('against');
    expect(byRoot.Contra).toBe('against');
    expect(byRoot.Mort).toBe('death');
    expect(byRoot.Rupt).toBe('breakx');
    expect(byRoot.Fract).toBe('breakx');
    expect(byRoot.Quad).toBe('four');
    expect(byRoot.Pent).toBe('five');
    expect(byRoot.Hex).toBe('six');
    expect(byRoot.Sept).toBe('seven');
    expect(byRoot.Oct).toBe('eight');
    expect(byRoot.Dec).toBe('ten');
    expect(byRoot.Mill).toBe('thousand');
    expect(byRoot.Gon).toBe('angle');
    expect(byRoot.Later).toBe('side');
    expect(byRoot.Rect).toBe('straight');
    expect(byRoot.Prim).toBe('before');
    expect(byRoot.Post).toBe('after');
    expect(byRoot.Flor).toBe('flower');
    expect(byRoot.Herb).toBe('plant');
    expect(byRoot.Chlor).toBe('green');
    expect(byRoot.Dendr).toBe('tree');
    expect(byRoot.Vor).toBe('eat');
    expect(byRoot.Avi).toBe('bird');
    expect(byRoot.Saur).toBe('lizard');
    expect(byRoot.Luna).toBe('moon');
    expect(byRoot.Noct).toBe('night');
    expect(byRoot.Nimb).toBe('cloud');
    expect(byRoot.Alb).toBe('white');
    expect(byRoot.Seism).toBe('quake');
    expect(byRoot.Ocul).toBe('eye');
    expect(byRoot.Aur).toBe('ear');
    expect(byRoot.Lingu).toBe('tongue');
    expect(byRoot.Gust).toBe('taste');
    expect(byRoot.Capit).toBe('head');
    expect(byRoot.Cerebr).toBe('mind');
    expect(byRoot.Dent).toBe('tooth');
    expect(byRoot.Brachi).toBe('arm');
    expect(byRoot.Digit).toBe('finger');
    expect(byRoot.Gastr).toBe('stomach');
    expect(byRoot.Pulmo).toBe('lung');
    expect(byRoot.Pod).toBe('foot');
    expect(byRoot.Dom).toBe('house');
    expect(byRoot.Famil).toBe('family');
    expect(byRoot.Frater).toBe('brother');
    expect(byRoot.Sen).toBe('old');
    expect(byRoot.Juven).toBe('young');
    expect(byRoot.Ami).toBe('friend');
    expect(byRoot.Pac).toBe('peace');
    expect(byRoot.Doc).toBe('teach');
    expect(byRoot.Schol).toBe('school');
    expect(byRoot.Via).toBe('road');
    expect(byRoot.Medi).toBe('middle');
    expect(byRoot.San).toBe('healthy');
    expect(byRoot.Can).toBe('dog');
    expect(byRoot.Fel).toBe('cat');
    expect(byRoot.Hipp).toBe('horse');
    expect(byRoot.Porc).toBe('pig');
    expect(byRoot.Capr).toBe('goat');
    expect(byRoot.Taur).toBe('bull');
    expect(byRoot.Api).toBe('bee');
    expect(byRoot.Pisc).toBe('fish');
    expect(byRoot.Urs).toBe('bear');
    expect(byRoot.Leon).toBe('lion');
    expect(byRoot.Ovi).toBe('egg');
    expect(byRoot.Corn).toBe('horn');
    expect(byRoot.Lact).toBe('milk');
    expect(byRoot.Fruct).toBe('fruit');
    expect(byRoot.Gran).toBe('grain');
    expect(byRoot.Sal).toBe('salt');
    expect(byRoot.Mel).toBe('honey');
    expect(byRoot.Ole).toBe('oil');
    expect(byRoot.Sacchar).toBe('sugar');
    expect(byRoot.Flam).toBe('flame');
    expect(byRoot.Fum).toBe('smoke');
    expect(byRoot.Cand).toBe('glow');
    expect(byRoot.Foc).toBe('hearth');
    expect(byRoot.Bib).toBe('drink');
    expect(byRoot.Tex).toBe('weave');
    expect(byRoot.Fil).toBe('thread');
    expect(byRoot.Lin).toBe('flax');
    expect(byRoot.Vest).toBe('clothing');
    expect(byRoot.Plic).toBe('fold');
    expect(byRoot.Cinct).toBe('belt');
    expect(byRoot.Strict).toBe('tight');
    expect(byRoot.Tect).toBe('cover');
    expect(byRoot.Punct).toBe('point');
    expect(byRoot.Acu).toBe('needle');
    expect(byRoot.Lig).toBe('tie');
    expect(byRoot.Nod).toBe('knot');
    expect(byRoot.Mont).toBe('mountain');
    expect(byRoot.Insul).toBe('island');
    expect(byRoot.Sylv).toBe('woods');
    expect(byRoot.Agr).toBe('field');
    expect(byRoot.Glac).toBe('ice');
    expect(byRoot.Gel).toBe('freeze');
    expect(byRoot.Cav).toBe('hollow');
    expect(byRoot.Riv).toBe('brook');
    expect(byRoot.Und).toBe('ripple');
    expect(byRoot.Plan).toBe('flat');
    expect(byRoot.Scend).toBe('climb');
    expect(byRoot.Cumul).toBe('heap');
    expect(byRoot.Curr).toBe('run');
    expect(byRoot.Ambul).toBe('walk');
    expect(byRoot.Sult).toBe('leap');
    expect(byRoot.Cad).toBe('tumble');
    expect(byRoot.Laps).toBe('slip');
    expect(byRoot.Err).toBe('stray');
    expect(byRoot.Flect).toBe('bend');
    expect(byRoot.Puls).toBe('drive');
    expect(byRoot.Press).toBe('squeeze');
    expect(byRoot.Sed).toBe('sit');
    expect(byRoot.Cub).toBe('lie');
    expect(byRoot.Clin).toBe('lean');
    expect(byRoot.Aug).toBe('grow');
    expect(byRoot.Long).toBe('length');
    expect(byRoot.Brev).toBe('short');
    expect(byRoot.Celer).toBe('swift');
    expect(byRoot.Tard).toBe('slow');
    expect(byRoot.Grav).toBe('heavy');
    expect(byRoot.Journ).toBe('day');
    expect(byRoot.Dur).toBe('lasting');
    expect(byRoot.Termin).toBe('border');
    expect(byRoot.Plen).toBe('full');
    expect(byRoot.Matur).toBe('ripe');
    expect(byRoot.Merid).toBe('noon');
    expect(byRoot.Val).toBe('worth');
    expect(byRoot.Labor).toBe('exertion');
    expect(byRoot.Cur).toBe('care');
    expect(byRoot.Culp).toBe('blame');
    expect(byRoot.Don).toBe('give');
    expect(byRoot.Merc).toBe('trade');
    expect(byRoot.Numer).toBe('number');
    expect(byRoot.Part).toBe('share');
    expect(byRoot.Vac).toBe('void');
    expect(byRoot.Mut).toBe('shift');
    expect(byRoot.Clar).toBe('clear');
    expect(byRoot.Clam).toBe('shout');
    expect(byRoot.Liber).toBe('liberty');
    expect(byRoot.Serv).toBe('serve');
    expect(byRoot.Reg).toBe('crown');
    expect(byRoot.Sat).toBe('enough');
    expect(byRoot.Grat).toBe('thanks');
    expect(byRoot.Vol).toBe('wish');
    expect(byRoot.Tim).toBe('alarm');
    expect(byRoot.Ira).toBe('wrath');
    expect(byRoot.Celebr).toBe('honor');
    expect(byRoot.Prob).toBe('proof');
    expect(byRoot.Leg).toBe('statute');
    expect(byRoot.Ord).toBe('rank');
  });

  it('keeps breakx for break-roots only', () => {
    const onBreak = ROOTS.filter((r) => r.scene === 'breakx').map((r) => r.root);
    expect(onBreak.sort()).toEqual(['Fract', 'Rupt']);
  });

  it('keeps water for water-roots only', () => {
    const onWater = ROOTS.filter((r) => r.scene === 'water').map((r) => r.root);
    expect(onWater.sort()).toEqual(['Aqua', 'Flu', 'Hydro', 'Mar']);
  });

  it('keeps clock for time-roots only', () => {
    const onClock = ROOTS.filter((r) => r.scene === 'clock').map((r) => r.root);
    expect(onClock.sort()).toEqual(['Ann', 'Chrono']);
  });

  it('wires the rest of the assignment-audit remaps', () => {
    const byRoot = Object.fromEntries(ROOTS.map((r) => [r.root, r.scene]));
    expect(byRoot.Anim).toBe('dna');
    expect(byRoot.Inter).toBe('between');
    expect(byRoot.Auto).toBe('self');
    expect(byRoot.Carn).toBe('body');
    expect(byRoot.Plac).toBe('calm');
    expect(byRoot.Duc).toBe('lead');
    expect(byRoot.Junct).toBe('join');
    expect(byRoot.Jud).toBe('equal');
    expect(byRoot.Naut).toBe('boat');
    expect(byRoot.Dyna).toBe('power');
    expect(byRoot.Bene).toBe('good');
    expect(byRoot.Mal).toBe('wrong');
    expect(byRoot.Nov).toBe('new');
    expect(byRoot.Bibl).toBe('book');
    expect(byRoot.Chrom).toBe('color');
    expect(byRoot.Lith).toBe('stone');
    expect(byRoot.Crat).toBe('rule');
    expect(byRoot.Urb).toBe('city');
    expect(byRoot.Jur).toBe('equal');
    expect(byRoot.Arch).toBe('rule');
    expect(byRoot.Polis).toBe('city');
    expect(byRoot.Techno).toBe('gear');
    expect(byRoot.Bel).toBe('against');
    expect(byRoot.Somn).toBe('sleep');
    expect(byRoot.Ver).toBe('straight');
    expect(byRoot.Omni).toBe('many');
    expect(byRoot.Sequ).toBe('lead');
    expect(byRoot.Corp).toBe('body');
    expect(byRoot.Pug).toBe('against');
    expect(byRoot.Fin).toBe('end');
    expect(byRoot.Osteo).toBe('bone');
    expect(byRoot.Odont).toBe('tooth');
    expect(byRoot.Eu).toBe('good');
    expect(byRoot.Dys).toBe('wrong');
    expect(byRoot.Xeno).toBe('stranger');
    expect(byRoot.Necro).toBe('death');
    expect(byRoot.Onym).toBe('name');
    expect(byRoot.Pseudo).toBe('wrong');
    expect(byRoot.Ichthy).toBe('fish');
    expect(byRoot.Sesqui).toBe('onehalf');
    expect(byRoot.Thanato).toBe('death');
    expect(byRoot.Caco).toBe('wrong');
    expect(byRoot.Calli).toBe('beauty');
    expect(byRoot.Pan).toBe('many');
    expect(byRoot.Proto).toBe('before');
    expect(byRoot.Pre).toBe('before');
    expect(byRoot.Hetero).toBe('different');
    expect(byRoot.Agog).toBe('lead');
    expect(byRoot.Graph).toBe('draw');
    expect(byRoot.Scrib).toBe('draw');
    expect(byRoot.Aqua).toBe('water');
    expect(byRoot.Struct).toBe('build');
  });

  it('lets every scene paint a frame without throwing', () => {
    const ctx = stubCtx();
    const pal = ['52,224,166', '52,217,240'];
    for (const [key, fn] of Object.entries(SCENES)) {
      expect(() => fn(ctx, 320, 200, 1.25, pal), key).not.toThrow();
      expect(() => fn(ctx, 320, 200, 0, pal), `${key} @ t=0`).not.toThrow();
    }
  });

  it('keeps a pencil on the write scene at preview and card size, even after the stroke', () => {
    const pal = ['244,63,94', '251,113,133'];
    const drawFn = SCENES.draw;
    expect(drawFn).toBeTypeOf('function');

    // (t * 0.16) % 1.25 >= 1 → stroke finished, old code hid the pencil.
    const afterStroke = 7;
    expect((afterStroke * 0.16) % 1.25).toBeGreaterThanOrEqual(1);

    const sizes: Array<[number, number]> = [
      [280, 168], // home preview
      [520, 420], // full deck card
    ];
    for (const [w, h] of sizes) {
      for (const t of [0, 2.4, afterStroke]) {
        const counts = { rotate: 0, translate: 0, fill: 0 };
        const ctx = stubCtx({
          rotate: () => {
            counts.rotate += 1;
          },
          translate: () => {
            counts.translate += 1;
          },
          fill: () => {
            counts.fill += 1;
          },
        });
        expect(() => drawFn!(ctx, w, h, t, pal), `${w}×${h} t=${t}`).not.toThrow();
        expect(counts.rotate, `pencil rotate ${w}×${h} t=${t}`).toBeGreaterThan(0);
        expect(counts.translate, `pencil translate ${w}×${h} t=${t}`).toBeGreaterThan(0);
        expect(counts.fill, `pencil body fill ${w}×${h} t=${t}`).toBeGreaterThan(3);
      }
    }
  });
});

function stubCtx(overrides: Partial<Record<string, unknown>> = {}): CanvasRenderingContext2D {
  const grad = { addColorStop: () => undefined };
  const noop = () => undefined;
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowColor: '',
    shadowBlur: 0,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    arc: noop,
    ellipse: noop,
    arcTo: noop,
    rect: noop,
    fillRect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    fillText: noop,
    setLineDash: noop,
    createRadialGradient: () => grad,
    createLinearGradient: () => grad,
    ...overrides,
  } as unknown as CanvasRenderingContext2D;
}
