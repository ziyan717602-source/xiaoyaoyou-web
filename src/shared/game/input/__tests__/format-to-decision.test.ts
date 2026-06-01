/**
 * FormatToDecision Tests - M2 Legacy format string conversion
 *
 * Tests converting old format strings to DecisionRequest objects.
 */
import { describe, it, expect } from 'vitest';
import { formatToDecision, decisionToLegacyInput } from '../format-to-decision';

describe('formatToDecision', () => {
  it('should convert T1 format to SELECT_TARGET', () => {
    const request = formatToDecision(1, '#选择目标/T1(p2p3)', 'ZW', 'R1ZW');

    expect(request.recipients).toEqual([1]);
    expect(request.code).toBe('ZW');
    expect(request.candidates).toHaveLength(2);
    expect(request.candidates![0].uid).toBe(2);
    expect(request.candidates![1].uid).toBe(3);
    expect(request.legalActions.some(a => a.type === 'SELECT_TARGET')).toBe(true);
  });

  it('should convert S format to CHOOSE_OPTION with side options', () => {
    const request = formatToDecision(1, '#选择阵营/S', 'ZW', 'R1ZW');

    expect(request.candidates).toHaveLength(2);
    expect(request.candidates![0].value).toBe('aka');
    expect(request.candidates![1].value).toBe('ao');
    expect(request.legalActions.some(a => a.type === 'CHOOSE_OPTION')).toBe(true);
  });

  it('should convert // format to CONFIRM', () => {
    const request = formatToDecision(1, '#确认//', 'SK', 'R1SK');

    expect(request.legalActions.some(a => a.type === 'CONFIRM')).toBe(true);
  });

  it('should mark optional when / prefix is present', () => {
    const request = formatToDecision(1, '/#跳过/S', 'ZW', 'R1ZW');

    expect(request.optional).toBe(true);
    expect(request.legalActions.some(a => a.type === 'PASS')).toBe(true);
  });

  it('should preserve sourceFormat for legacy compatibility', () => {
    const format = '#选择目标/T1(p2p3)';
    const request = formatToDecision(1, format, 'ZW', 'R1ZW');

    expect(request.sourceFormat).toBe(format);
  });

  it('should handle empty format string', () => {
    const request = formatToDecision(1, '', 'ZW', 'R1ZW');

    expect(request.recipients).toEqual([1]);
    expect(request.legalActions).toHaveLength(0);
  });
});

describe('decisionToLegacyInput', () => {
  it('should convert PASS action to /', () => {
    const input = decisionToLegacyInput({
      requestId: 'req-1',
      phaseId: 'R1ZW',
      uid: 1,
      actionId: 'PASS',
      payload: {},
    });

    expect(input).toBe('/');
  });

  it('should convert target selection to T{uid}', () => {
    const input = decisionToLegacyInput({
      requestId: 'req-1',
      phaseId: 'R1ZW',
      uid: 1,
      actionId: 'target-2',
      payload: { targetUids: [2] },
    });

    expect(input).toBe('T2');
  });

  it('should convert option selection to value string', () => {
    const input = decisionToLegacyInput({
      requestId: 'req-1',
      phaseId: 'R1ZW',
      uid: 1,
      actionId: 'choose-side',
      payload: { optionValues: ['aka'] },
    });

    expect(input).toBe('aka');
  });
});
