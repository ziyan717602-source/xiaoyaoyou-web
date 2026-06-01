/**
 * Exsp class - Translation of C# PSD.Base.Card.Exsp
 */

export class Exsp {
  readonly name: string;
  readonly code: string;
  readonly type: number;
  readonly hero: number;
  readonly skills: string[];
  readonly description: Record<string, string>;

  constructor(
    name: string,
    code: string,
    type: number,
    hero: number,
    skills: string[],
    description: Record<string, string>,
  ) {
    this.name = name;
    this.code = code;
    this.type = type;
    this.hero = hero;
    this.skills = skills;
    this.description = description;
  }
}
