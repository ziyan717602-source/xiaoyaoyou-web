/**
 * Card static class - Translation of C# PSD.Base.Card.Card
 * Genre and PileGenre enums matching C# original
 */

/** Genre enum matching C# Card.Genre */
export enum Genre {
  NIL = 0,
  Tux = 1,
  NMB = 2,
  Eve = 3,
  TuxSerial = 4,
  Rune = 5,
  Five = 6,
  Exsp = 7,
  Hero = 8,
  NPC = 9,
}

/** PileGenre enum matching C# Card.PileGenre */
export enum PileGenre {
  Tux = 0,
  NMB = 1,
  Eve = 2,
  UH = 3,
  UM = 4,
  UN = 5,
}

export class Card {
  /** Pick some items in random order, up to maxCount */
  static pickSomeInRandomOrder<T>(items: Iterable<T>, maxCount: number): T[] {
    const arr = [...items];
    const map = new Map<number, T>();
    for (const item of arr) {
      map.set(Math.random(), item);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, maxCount)
      .map(entry => entry[1]);
  }

  /** Pick some items given a probability */
  static pickSomeInGivenProbability<T>(items: Iterable<T>, probability: number): T[] {
    const result: T[] = [];
    for (const item of items) {
      if (Math.random() < probability) {
        result.push(item);
      }
    }
    return result;
  }

  /** Map level to package array (C# Card.Level2Pkg) */
  static level2Pkg(level: number): number[] | null {
    const pkgCode = level >> 1;
    if (pkgCode === 1) return [1];
    if (pkgCode === 2) return [1, 2];
    if (pkgCode === 3) return [1, 2, 4];
    if (pkgCode === 4) return [1, 2, 4, 5, 7];
    if (pkgCode === 5) return [1, 2, 3, 4, 5, 6, 7];
    return null;
  }

  /** Convert Genre to char */
  static genre2Char(genre: Genre): string {
    const chars = ' CMNEGFVIH';
    return chars[genre] ?? ' ';
  }

  /** Convert char to Genre */
  static char2Genre(char: string): Genre {
    switch (char) {
      case 'C': return Genre.Tux;
      case 'M': return Genre.NMB;
      case 'E': return Genre.Eve;
      case 'G': return Genre.TuxSerial;
      case 'F': return Genre.Rune;
      case 'V': return Genre.Five;
      case 'I': return Genre.Exsp;
      case 'H': return Genre.Hero;
      case 'N': return Genre.NPC;
      default: return Genre.NIL;
    }
  }
}
