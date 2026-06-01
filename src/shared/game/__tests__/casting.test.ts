import { describe, it, expect } from 'vitest';
import { CastingPick, CastingTable, CastingPublic, CastingCongress, RuleCode } from '../rules';

describe('CastingPick', () => {
  it('should init and pick', () => {
    const cp = new CastingPick();
    cp.init(1, [101, 102, 103]);
    expect(cp.pick(1, 102)).toBe(true);
    expect(cp.ding.get(1)).toBe(102);
  });

  it('should switch', () => {
    const cp = new CastingPick();
    cp.init(1, [101, 102, 103], [201, 202]);
    const switched = cp.switch(1, 101);
    expect(switched).toBe(201);
    expect(cp.xuan.get(1)).toContain(201);
  });

  it('should toMessage', () => {
    const cp = new CastingPick();
    cp.init(1, [101, 102]);
    cp.init(2, [201, 202], [301]);
    cp.pick(1, 101);
    expect(cp.toMessage(1)).toBe('102');
    expect(cp.toMessage(2)).toBe('201,202,0');
  });
});

describe('CastingTable', () => {
  it('should pick and ban', () => {
    const ct = new CastingTable([101, 102, 103, 104]);
    expect(ct.pick(1, 101)).toBe(true);
    expect(ct.ban(2, 102)).toBe(true);
    expect(ct.banAo).toContain(102);
  });

  it('should putBack', () => {
    const ct = new CastingTable([101, 102]);
    ct.ban(1, 101);
    expect(ct.putBack(101)).toBe(true);
    expect(ct.xuan).toContain(101);
  });

  it('should toMessage', () => {
    const ct = new CastingTable([101, 102]);
    ct.pick(1, 101);
    const msg = ct.toMessage();
    expect(msg).toContain('102');
  });
});

describe('CastingPublic', () => {
  it('should ban and pick', () => {
    const cp = new CastingPublic([101, 102, 103, 104]);
    expect(cp.ban(true, 101)).toBe(true);
    expect(cp.pick(true, 102)).toBe(102);
    expect(cp.dingAka).toContain(102);
    expect(cp.banAka).toContain(101);
  });
});

describe('CastingCongress', () => {
  it('should init and set', () => {
    const cc = new CastingCongress([101, 102], [201, 202], []);
    cc.init(1, 0);
    const result = cc.set(1, 101);
    expect(result.result).toBe(0); // old value was 0
    expect(cc.ding.get(1)).toBe(101);
  });

  it('should check isDecide', () => {
    const cc = new CastingCongress([101, 103, 105], [201, 203, 205], []);
    cc.init(1, 101);
    cc.init(3, 103);
    cc.init(5, 105);
    cc.init(2, 201);
    cc.init(4, 203);
    cc.init(6, 205);
    expect(cc.isDecide(1)).toBe(true);
    expect(cc.isDecide(2)).toBe(true);
  });
});

describe('RuleCode', () => {
  it('should convert mode string to int', () => {
    expect(RuleCode.castMode('00')).toBe(RuleCode.MODE_00);
    expect(RuleCode.castMode('CJ')).toBe(RuleCode.MODE_CJ);
    expect(RuleCode.castMode('RM')).toBe(RuleCode.MODE_RM);
    expect(RuleCode.castMode('BP')).toBe(RuleCode.MODE_BP);
  });

  it('should convert mode int to string', () => {
    expect(RuleCode.castModeToString(RuleCode.MODE_00)).toBe('00');
    expect(RuleCode.castModeToString(RuleCode.MODE_CJ)).toBe('CJ');
    expect(RuleCode.castModeToString(RuleCode.MODE_RM)).toBe('RM');
  });

  it('should have correct constants', () => {
    expect(RuleCode.DEF_CODE).toBe(0);
    expect(RuleCode.HOPE_NO).toBe(0x2);
    expect(RuleCode.LEVEL_NEW).toBe(2);
    expect(RuleCode.LEVEL_STD).toBe(4);
  });
});
