import { describe, it, expect } from 'vitest';
import { Skill, Bless, SKBranch } from '../skill';

describe('Skill', () => {
  it('should construct from strings', () => {
    const skill = new Skill('test', 'JN01', 'R$Z1', '0', '1', '', '', '');
    expect(skill.name).toBe('test');
    expect(skill.code).toBe('JN01');
    expect(skill.occurs[0]).toBe('R$Z1');
    expect(skill.priorities[0]).toBe(0);
    expect(skill.isOnce[0]).toBe(true);
  });

  it('should handle lock parsing', () => {
    const skill = new Skill('test', 'JN01', '!R$Z1,?R#Z1', '0,100', '1,0', '', '', '');
    expect(skill.lock[0]).toBe(true);
    expect(skill.lock[1]).toBeNull();
    expect(skill.occurs[0]).toBe('R$Z1');
    expect(skill.occurs[1]).toBe('R#Z1');
  });

  it('should check isLinked', () => {
    const skill = new Skill('test', 'JN01', 'R%Z1', '0', '1', '', '', '');
    expect(skill.isLinked(0)).toBe(true);
    const skill2 = new Skill('test2', 'JN02', 'R$Z1', '0', '1', '', '', '');
    expect(skill2.isLinked(0)).toBe(false);
  });

  it('should use default delegates', () => {
    const skill = new Skill('test', 'JN01', 'R$Z1', '0', '1', '', '', '');
    expect(skill.valid(null as any, 0, '')).toBe(true);
    expect(skill.input(null as any, 0, '', '')).toBe('');
    expect(skill.encrypt('test')).toBe('test');
  });

  it('should forceChange', () => {
    const skill = new Skill('test', 'JN01', 'R$Z1', '0', '1', '', '', '');
    skill.forceChange('Name', 'new name');
    expect(skill.name).toBe('new name');
  });

  it('should not be BK', () => {
    const skill = new Skill('test', 'JN01', 'R$Z1', '0', '1', '', '', '');
    expect(skill.isBK).toBe(false);
  });
});

describe('Bless', () => {
  it('should be BK', () => {
    const bless = new Bless('bk', 'BK01', 'R$Z1', '0', '1', '', '', '');
    expect(bless.isBK).toBe(true);
  });

  it('should use bkValid delegate', () => {
    const bless = new Bless('bk', 'BK01', 'R$Z1', '0', '1', '', '', '');
    expect(bless.bkValid(null as any, 0, '', 0)).toBe(true);
  });
});

describe('SKBranch', () => {
  it('should parse from strings', () => {
    const branches = SKBranch.parseFromStrings('R$Z1,!R#Z2', '100,200', '1,5');
    expect(branches.length).toBe(2);
    expect(branches[0]?.occur).toBe('R$Z1');
    expect(branches[0]?.priority).toBe(100);
    expect(branches[0]?.lock).toBe(false);
    expect(branches[1]?.occur).toBe('R#Z2');
    expect(branches[1]?.lock).toBe(true);
  });

  it('should parse empty caret as null', () => {
    const branches = SKBranch.parseFromStrings('R$Z1,^', '100,200', '1,5');
    expect(branches[0]).not.toBeNull();
    expect(branches[1]).toBeNull();
  });

  it('should parse from single string', () => {
    const branches = SKBranch.parseFromString('R$Z1,100,1;R#Z2,200,5');
    expect(branches.length).toBe(2);
    expect(branches[0]?.occur).toBe('R$Z1');
    expect(branches[1]?.occur).toBe('R#Z2');
  });

  it('should handle empty string', () => {
    const branches = SKBranch.parseFromString('');
    expect(branches).toEqual([]);
  });

  it('should compute mixCode', () => {
    const branch = new SKBranch();
    branch.once = true;
    branch.demiurgic = true;
    expect(branch.mixCode).toBe(0x3);
    branch.mixCode = 0x5;
    expect(branch.once).toBe(true);
    expect(branch.serial).toBe(true);
    expect(branch.demiurgic).toBe(false);
  });

  it('should check linked', () => {
    const branch = new SKBranch();
    branch.occur = 'R&Z1';
    expect(branch.linked).toBe(true);
    branch.occur = 'R$Z1';
    expect(branch.linked).toBe(false);
  });

  it('should handle question mark lock', () => {
    const branches = SKBranch.parseFromStrings('?R$Z1', '100', '1');
    expect(branches[0]?.lock).toBeNull();
    expect(branches[0]?.occur).toBe('R$Z1');
  });
});
