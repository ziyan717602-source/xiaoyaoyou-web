/**
 * Effects Module - Card effect implementations
 *
 * Translates C# JNS/ directory card effects to TypeScript.
 * Each cottage handles a category of effects.
 */
// Effect framework
export { CardEffectRegistry, OperationEffectRegistry, NpcEffectRegistry, RuneEffectRegistry, EveEffectRegistry } from './registry';
export { JNSBase } from './base';
export type {
  EffectRegistration,
  OpEffectRegistration,
  NpcEffectRegistration,
  RuneEffectRegistration,
  EveEffectRegistration,
  ActionDelegate,
  ValidDelegate,
  InputDelegate,
  BribeDelegate,
  VestigeDelegate,
  LocustDelegate,
  CsActionDelegate,
  CsValidDelegate,
  CsInputDelegate,
  CsActionHolderDelegate,
  CsValidHolderDelegate,
  CsInputHolderDelegate,
  CrActionDelegate,
  UseActionDelegate,
  InputHolderDelegate,
  OpActionDelegate,
  OpValidDelegate,
  OpInputDelegate,
  NpcActionDelegate,
  NpcValidDelegate,
  NpcInputDelegate,
  NpcEscueActionDelegate,
  NpcEscueValidDelegate,
  NpcEscueInputDelegate,
  RuneActionDelegate,
  RuneValidDelegate,
  RuneInputDelegate,
  EveActionDelegate,
} from './types';

// Cottage implementations
export { TuxCottage } from './tux-cottage';
export { OperationCottage } from './operation-cottage';
export { SkillCottage } from './skill-cottage';
export { NpcCottage } from './npc-cottage';
export { RuneCottage } from './rune-cottage';
export { EveCottage } from './eve-cottage';
