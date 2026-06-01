import tuxData from '../../shared/data/tux.json';
import heroData from '../../shared/data/hero.json';

export interface CardInfo {
  name: string;
  code: string;
  type: string;
  description: string;
}

const tuxMap = new Map<string, CardInfo>();
const heroMap = new Map<string, CardInfo>();
const avatarToOfcode = new Map<number, string>();

for (const t of tuxData) {
  tuxMap.set(t.Code, {
    name: t.Name,
    code: t.Code,
    type: t.Type,
    description: t.Description,
  });
}

for (const h of heroData) {
  heroMap.set(h.Ofcode, {
    name: h.Name,
    code: h.Ofcode,
    type: 'HL',
    description: `HP:${h.HP} STR:${h.STR} DEX:${h.DEX}`,
  });
  // Map numeric avatar to Ofcode string for image lookup
  avatarToOfcode.set(h.Avatar, h.Ofcode);
}

export function getCardInfo(code: string): CardInfo | null {
  return tuxMap.get(code) || heroMap.get(code) || null;
}

/** Convert numeric hero avatar to Ofcode string (e.g., 10101 → 'XJ101') */
export function getHeroOfcode(avatar: number): string {
  return avatarToOfcode.get(avatar) || `HL${avatar}`;
}
