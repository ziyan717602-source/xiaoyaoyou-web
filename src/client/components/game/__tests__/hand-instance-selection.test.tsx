/**
 * Hand Instance Selection Tests — P0 缺陷保护网
 *
 * 为 M3/M6 的手牌实例化做测试占位。
 * 这些 it.todo 占位测试固化了审计报告中的手牌实例相关 P0 缺陷。
 *
 * @see docs/MIMO/implementation-plan.md — M0: 回归基线与保护网
 * @see docs/MIMO/final-audit-report.md — P0 缺陷清单
 */
import { describe, it } from 'vitest';

// ── P0 Regression: Hand Instance Selection ───────────────────

describe('P0 Regression: Hand Instance Selection', () => {
  it.todo('M0-17: two cards with same code should have different keys');
  it.todo('M0-18: clicking one duplicate should not select both');
  it.todo('M0-19: submission should use instanceId, not card code');
});
