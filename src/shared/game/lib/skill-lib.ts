/**
 * SkillLib - Translation of C# PSD.Base.SkillLib
 */
import { Skill, Bless } from '../skill';
import type { Skill as SkillData } from '@shared/types/skill';

export class SkillLib {
  readonly firsts: Skill[] = [];

  constructor(data: SkillData[]) {
    for (const item of data) {
      const isBless = (item as unknown as Record<string, unknown>)['_isBless'] === true;
      const occurs = (item.Occurs ?? []).join(',');
      const priors = (item.Priorities ?? []).join(',');
      const onces = (item.IsOnce ?? []).map(p => p ? '1' : '0').join(',');
      const hinds = (item.IsHind ?? []).map(p => p ? '1' : '0').join(',');
      const parasitismStr = (item.Parasitism ?? []).join('&');
      const terminiStr = (item.IsTermini ?? []).map(p => p ? '1' : '0').join(',');

      if (isBless) {
        const bless = new Bless(
          item.Name, item.Code, occurs, priors, onces, hinds, parasitismStr, terminiStr,
        );
        bless.descripe = item.Descripe ?? '';
        bless.isChange = item.IsChange;
        bless.isRestrict = item.IsRestrict;
        this.firsts.push(bless);
      } else {
        const skill = new Skill(
          item.Name, item.Code, occurs, priors, onces, hinds, parasitismStr, terminiStr,
        );
        skill.descripe = item.Descripe ?? '';
        skill.isChange = item.IsChange;
        skill.isRestrict = item.IsRestrict;
        this.firsts.push(skill);
      }
    }
  }

  get size(): number { return this.firsts.length; }

  encodeSkill(code: string): Skill | null {
    for (const sk of this.firsts) {
      if (sk.code === code) return sk;
    }
    return null;
  }
}
