/**
 * Hero class - Translation of C# PSD.Base.Card.Hero
 */

export class Hero {
  readonly name: string;
  readonly avatar: number;
  readonly group: number;
  readonly genre: number;
  readonly gender: string;
  readonly hp: number;
  readonly str: number;
  readonly dex: number;
  readonly skills: string[];
  relatedSkills: string[];
  readonly spouses: string[];
  readonly isomorphic: number[];

  private _archetype: number;
  get archetype(): number {
    return this._archetype !== 0 ? this._archetype : this.antecessor;
  }
  readonly antecessor: number;
  pioneer = 0;

  ofcode = '';
  bio = '';
  tokenAlias = '';
  peopleAlias = '';
  playerTarAlias = '';
  exCardsAlias = '';
  awakeAlias = '';
  folderAlias = '';
  guestAlias = '';

  availableDay: number[] = [];
  availableTestPkg = 0;

  constructor(
    name: string,
    avatar: number,
    group: number,
    genre: number,
    gender: string,
    hp: number,
    str: number,
    dex: number,
    spouses: string[],
    isomorphic: number[],
    archetype: number,
    antecessor: number,
    skills: string[],
  ) {
    this.name = name;
    this.avatar = avatar;
    this.group = group;
    this.genre = genre;
    this.gender = gender;
    this.hp = hp;
    this.str = str;
    this.dex = dex;
    this.spouses = spouses;
    this.skills = skills;
    this.isomorphic = isomorphic;
    this._archetype = archetype;
    this.antecessor = antecessor;
    this.relatedSkills = [];
  }

  /** Force change attribute for version compatibility */
  forceChange(field: string, value: unknown): void {
    // Hero fields are readonly in TS, so we use a type assertion for ForceChange
    // This matches the C# behavior where ForceChange can modify readonly properties
    const self = this as Record<string, unknown>;
    if (field === 'HP' && typeof value === 'number') self['hp'] = value;
    else if (field === 'STR' && typeof value === 'number') self['str'] = value;
    else if (field === 'DEX' && typeof value === 'number') self['dex'] = value;
    else if (field === 'Avatar' && typeof value === 'number') self['avatar'] = value;
    else if (field === 'OfCode' && typeof value === 'string') self['ofcode'] = value;
  }

  /** Set available parameter from group string */
  setAvailableParam(groupString: string): void {
    const list: number[] = [];
    let apkg = 0;
    const parts = groupString.split(',');
    for (const part of parts) {
      switch (part) {
        case 'L1': list.push(1); break; // Monday
        case 'L2': list.push(2); break;
        case 'L3': list.push(3); break;
        case 'L4': list.push(4); break;
        case 'L5': list.push(5); break;
        case 'L6': list.push(6); break;
        case 'L7': list.push(0); break; // Sunday
        default:
          if (part.startsWith('R')) {
            apkg = parseInt(part.substring(1), 10);
          }
          break;
      }
    }
    this.availableDay = list;
    this.availableTestPkg = apkg;
  }
}
