/**
 * Tests for format-parser.ts
 *
 * Covers all known format string patterns from the game's cottage files.
 */

import { describe, it, expect } from 'vitest';
import { parseFormat, formatSelectionResult, type ParsedFormat } from '../format-parser';

describe('parseFormat', () => {
  // === Side selection ===
  describe('Side selection (S)', () => {
    it('bare S', () => {
      const r = parseFormat('S');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].type).toBe('S');
      expect(r.segments[0].options).toEqual([
        { value: '1', label: '仙' },
        { value: '2', label: '剑' },
      ]);
    });

    it('#description,S', () => {
      const r = parseFormat('#战力增加,S');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].type).toBe('S');
      expect(r.segments[0].description).toBe('战力增加');
    });
  });

  // === Menu selection (Y) ===
  describe('Menu selection (Y)', () => {
    it('#desc##opt1##opt2,Y2', () => {
      const r = parseFormat('#是否发动混战？##不发动##发动,Y2');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].type).toBe('Y');
      expect(r.segments[0].count).toBe(2);
      expect(r.segments[0].description).toBe('是否发动混战？');
      expect(r.segments[0].options).toEqual([
        { value: '1', label: '不发动' },
        { value: '2', label: '发动' },
      ]);
    });

    it('#desc##opt1##opt2##opt3,Y3', () => {
      const r = parseFormat('#请选择执行项##触发事件##交换手牌##交换宠物,Y3');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].type).toBe('Y');
      expect(r.segments[0].count).toBe(3);
      expect(r.segments[0].options).toHaveLength(3);
      expect(r.segments[0].options[0].label).toBe('触发事件');
    });

    it('#desc##opt1,Y1 (single option)', () => {
      const r = parseFormat('#是否展示您的手牌？##否,Y1');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].count).toBe(1);
      expect(r.segments[0].options).toHaveLength(1);
    });

    it('/ menu (optional)', () => {
      const r = parseFormat('/#请选择调整的数值##-2##-1##+1##+2,Y4');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].optional).toBe(true);
      expect(r.segments[0].type).toBe('Y');
    });
  });

  // === Player target selection (T) ===
  describe('Player target selection (T)', () => {
    it('T1(p1p2p3)', () => {
      const r = parseFormat('T1(p1p2p3)');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].type).toBe('T');
      expect(r.segments[0].count).toBe(1);
      expect(r.segments[0].options.map(o => o.value)).toEqual(['1', '2', '3']);
    });

    it('T2(p1p2) — select 2', () => {
      const r = parseFormat('T2(p1p2)');
      expect(r.segments[0].count).toBe(2);
    });

    it('T1~2(p1p3p5) — range selection', () => {
      const r = parseFormat('T1~2(p1p3p5)');
      expect(r.segments[0].count).toBe(1);
      expect(r.segments[0].maxCount).toBe(2);
    });

    it('/T1(p1p2) — optional target', () => {
      const r = parseFormat('/T1(p1p2)');
      expect(r.segments[0].optional).toBe(true);
      expect(r.segments[0].type).toBe('T');
    });

    it('#desc,T1(p1p2) — with description', () => {
      const r = parseFormat('#攻击,T1(p1p2)');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].description).toBe('攻击');
      expect(r.segments[0].type).toBe('T');
    });

    it('#desc,/T1(p1p2) — optional with description', () => {
      const r = parseFormat('#获得其手牌,/T1(p1p2)');
      expect(r.segments[0].optional).toBe(true);
      expect(r.segments[0].description).toBe('获得其手牌');
    });
  });

  // === Card selection (Q, C, Z, M, I) ===
  describe('Card selection (Q/C/Z/M/I)', () => {
    it('Q1(p101p102) — select from hand', () => {
      const r = parseFormat('Q1(p101p102)');
      expect(r.segments[0].type).toBe('Q');
      expect(r.segments[0].options.map(o => o.value)).toEqual(['101', '102']);
    });

    it('C1(p36p37) — hidden card selection', () => {
      const r = parseFormat('C1(p36p37)');
      expect(r.segments[0].type).toBe('C');
    });

    it('M1(p101p102) — monster/pet selection', () => {
      const r = parseFormat('M1(p101p102)');
      expect(r.segments[0].type).toBe('M');
    });

    it('/Q1(p101p102) — optional card', () => {
      const r = parseFormat('/Q1(p101p102)');
      expect(r.segments[0].optional).toBe(true);
    });

    it('/+Q1(p101p102) — optional with plus', () => {
      const r = parseFormat('/+Q1(p101p102)');
      expect(r.segments[0].optional).toBe(true);
      expect(r.segments[0].plus).toBe(true);
    });

    it('Q1~3(p101p102p103) — range card selection', () => {
      const r = parseFormat('Q1~3(p101p102p103)');
      expect(r.segments[0].count).toBe(1);
      expect(r.segments[0].maxCount).toBe(3);
    });

    it('#弃置的,Q1(p101p102) — with description', () => {
      const r = parseFormat('#弃置的,Q1(p101p102)');
      expect(r.segments[0].description).toBe('弃置的');
      expect(r.segments[0].type).toBe('Q');
    });

    it('Z1(p101p102) — zone selection', () => {
      const r = parseFormat('Z1(p101p102)');
      expect(r.segments[0].type).toBe('Z');
    });

    it('+Z1(p101p102) — zone with plus', () => {
      const r = parseFormat('+Z1(p101p102)');
      expect(r.segments[0].plus).toBe(true);
    });

    it('F1(p101p102) — rune selection', () => {
      const r = parseFormat('F1(p101p102)');
      expect(r.segments[0].type).toBe('F');
    });
  });

  // === ZW battle choice (J) ===
  describe('ZW battle choice (J)', () => {
    it('J1(pT1pT2)', () => {
      const r = parseFormat('J1(pT1pT2)');
      expect(r.segments[0].type).toBe('J');
      expect(r.segments[0].options.map(o => o.value)).toEqual(['T1', 'T2']);
    });
  });

  // === Auto-confirm ===
  describe('Auto-confirm', () => {
    it('// returns AUTO segment', () => {
      const r = parseFormat('//');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].type).toBe('AUTO');
      expect(r.segments[0].options[0].value).toBe('0');
    });
  });

  // === Compound formats ===
  describe('Compound formats', () => {
    it('#desc,T1(p...),#desc2,C1(p...) — two segments', () => {
      const r = parseFormat('#弃置的,Q1(p101p102),#获得的,C1(p201p202)');
      expect(r.isCompound).toBe(true);
      expect(r.segments.length).toBeGreaterThanOrEqual(2);
      // First segment
      const first = r.segments.find(s => s.type === 'Q');
      expect(first).toBeDefined();
      expect(first!.description).toBe('弃置的');
      // Second segment
      const second = r.segments.find(s => s.type === 'C');
      expect(second).toBeDefined();
      expect(second!.description).toBe('获得的');
    });

    it('/Q1(p...),/T1(p...) — two optional segments', () => {
      const r = parseFormat('/Q1(p101p102),/T1(p1p2)');
      expect(r.isCompound).toBe(true);
      expect(r.segments[0].optional).toBe(true);
      expect(r.segments[0].type).toBe('Q');
      expect(r.segments[1].optional).toBe(true);
      expect(r.segments[1].type).toBe('T');
    });
  });

  // === Literal value passthrough (!) ===
  describe('Literal value passthrough (!)', () => {
    it('!value returns LITERAL segment', () => {
      const r = parseFormat('!0');
      expect(r.segments).toHaveLength(1);
      expect(r.segments[0].type).toBe('LITERAL');
      expect(r.segments[0].options[0].value).toBe('0');
    });

    it('!1 returns LITERAL with value "1"', () => {
      const r = parseFormat('!1');
      expect(r.segments[0].type).toBe('LITERAL');
      expect(r.segments[0].options[0].value).toBe('1');
    });
  });

  // === Edge cases ===
  describe('Edge cases', () => {
    it('empty string', () => {
      const r = parseFormat('');
      expect(r.segments).toHaveLength(0);
    });

    it('whitespace only', () => {
      const r = parseFormat('   ');
      expect(r.segments).toHaveLength(0);
    });

    it('description only (#text,)', () => {
      const r = parseFormat('#提示信息,');
      // The trailing comma makes it a description segment
      expect(r.segments.length).toBeGreaterThanOrEqual(1);
    });
  });

  // === Real format strings from the game ===
  describe('Real format strings from cottage files', () => {
    const realFormats: Array<{ format: string; expectedTypes: string[] }> = [
      // Skill cottage
      { format: '#获得其手牌,T1(p1p3)', expectedTypes: ['T'] },
      { format: '#获得2张补牌,T1(p2p4)', expectedTypes: ['T'] },
      { format: '#『结拜』的,/T1(p1p3)', expectedTypes: ['T'] },
      { format: '#是否进行第二次战斗？##不进行##进行,Y2', expectedTypes: ['Y'] },
      { format: '#是否放弃此怪，翻出新怪？##不翻出##翻出,Y2', expectedTypes: ['Y'] },
      { format: '#弃置的,/M1(p101p102)', expectedTypes: ['M'] },
      { format: '#额外HP-2,T1(p1p3)', expectedTypes: ['T'] },
      { format: '#须弃置的,Q1(p101p102)', expectedTypes: ['Q'] },
      { format: '#HP+2,T1(p1p2p3p4p5p6)', expectedTypes: ['T'] },
      // Tux cottage
      { format: '#获得其手牌,T1(p1p3)', expectedTypes: ['T'] },
      { format: '#攻击,T1(p1p3p5)', expectedTypes: ['T'] },
      { format: '#弃置,T1(p2p4)', expectedTypes: ['T'] },
      { format: 'T1(p1p3)', expectedTypes: ['T'] },
      { format: 'S', expectedTypes: ['S'] },
      { format: '#夺宠,T1(p1p3)', expectedTypes: ['T'] },
      { format: '#请选择【驯化】执行项。##开牌##驯化,Y2', expectedTypes: ['Y'] },
      { format: '#请选择执行项##命中+3##战力+2,Y2', expectedTypes: ['Y'] },
      // Eve cottage
      { format: '#「天雷破」的,/T1(p1p3p5)', expectedTypes: ['T'] },
      { format: '#是否展示您的手牌？##是##否,Y2', expectedTypes: ['Y'] },
      { format: '#须弃置,Q1(p101p102)', expectedTypes: ['Q'] },
      // Operation cottage
      { format: '#是否发动混战？##不发动##发动,Y2', expectedTypes: ['Y'] },
      // Rune cottage
      { format: '#是否抵御此伤害？##是##否,Y2', expectedTypes: ['Y'] },
    ];

    for (const { format, expectedTypes } of realFormats) {
      it(`parses: ${format.substring(0, 50)}...`, () => {
        const r = parseFormat(format);
        const types = r.segments
          .filter(s => s.type !== 'DESC')
          .map(s => s.type);
        expect(types).toEqual(expectedTypes);
      });
    }
  });
});

describe('formatSelectionResult', () => {
  it('single segment selection', () => {
    const r = parseFormat('T1(p1p2p3)');
    const selections = new Map([[0, ['2']]]);
    expect(formatSelectionResult(r.segments, selections)).toBe('2');
  });

  it('compound segment selection', () => {
    const r = parseFormat('Q1(p101p102),T1(p1p2)');
    const selections = new Map([
      [0, ['101']],
      [1, ['1']],
    ]);
    expect(formatSelectionResult(r.segments, selections)).toBe('101,1');
  });

  it('optional segment skipped', () => {
    const r = parseFormat('/T1(p1p2)');
    const selections = new Map();
    expect(formatSelectionResult(r.segments, selections)).toBe('/');
  });

  it('auto-confirm', () => {
    const r = parseFormat('//');
    const selections = new Map();
    expect(formatSelectionResult(r.segments, selections)).toBe('0');
  });
});
