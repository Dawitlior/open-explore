import { describe, it, expect } from 'vitest';
import { nextNode, claimDebt } from '@/lib/oracle/engine';
import { ORACLE_NODES_BY_CODE, depthProbeForDimension } from '@/lib/oracle/nodes.seed';
import { vectorizePath, hesitationIndex, signalAmplifier } from '@/lib/oracle/vectorize';
import type { OracleSessionState, VisitedStep } from '@/lib/oracle/types';

const baseSession = (): OracleSessionState => ({
  id: 's1', user_id: 'u1', state: 'in_progress',
  current_node_code: 'S1_SLEEP_WINDOW',
  visited_path: [], dissonance_log: [], depth_score: 0,
  claim_ledger: {}, instability_index: 0,
});

describe('Oracle vectorize', () => {
  it('hesitationIndex stays in 0..1', () => {
    expect(hesitationIndex(0)).toBe(0);
    expect(hesitationIndex(500)).toBe(0);
    expect(hesitationIndex(10_000)).toBeLessThanOrEqual(1);
    expect(hesitationIndex(2700)).toBeGreaterThan(0);
  });

  it('amplifier grows with hesitation + changes of mind', () => {
    const fast: VisitedStep = { node: 'X', optionId: 'a', t_ms: 400, skipped: false, revisit: false };
    const slow: VisitedStep = { node: 'X', optionId: 'a', t_ms: 4000, skipped: false, revisit: false, changed_mind: 2, hover_count: 3 };
    expect(signalAmplifier(slow)).toBeGreaterThan(signalAmplifier(fast));
  });

  it('vectorizePath ignores skipped steps', () => {
    const v = vectorizePath(
      [
        { node: 'S5_BREAKOUT_TEST', optionId: 'enter_market', t_ms: 800, skipped: false, revisit: false },
        { node: 'S5_GURU_TEST',     optionId: null,           t_ms: 0,   skipped: true,  revisit: false },
      ],
      ORACLE_NODES_BY_CODE,
    );
    expect((v.impulsivity ?? 0)).toBeGreaterThan(0);
    expect(v.story_dependency ?? 0).toBe(0);
  });
});

describe('Oracle engine v2', () => {
  it('routes to claim-test owed after an S4 claim', () => {
    const s = baseSession();
    s.current_node_code = 'S4_CLAIM_PATIENT';
    s.visited_path = [
      { node: 'S4_CLAIM_PATIENT', optionId: 'patient', t_ms: 1200, skipped: false, revisit: false },
    ];
    const r = nextNode({ session: s, nodesByCode: ORACLE_NODES_BY_CODE, vector: {}, depthProbeForDimension });
    expect(r.reason).toBe('claim_test_owed');
    expect(r.nextNodeCode).toBe('S5_BREAKOUT_TEST');
  });

  it('claimDebt clears once a counter is answered', () => {
    const s = baseSession();
    s.visited_path = [
      { node: 'S4_CLAIM_PATIENT', optionId: 'patient', t_ms: 800, skipped: false, revisit: false },
      { node: 'S5_BREAKOUT_TEST', optionId: 'wait_retest', t_ms: 900, skipped: false, revisit: false },
    ];
    expect(claimDebt(s, ORACLE_NODES_BY_CODE)).not.toContain('claim:patient');
  });

  it('respects hard cap', () => {
    const s = baseSession();
    s.visited_path = Array.from({ length: 48 }, () => ({
      node: 'S1_SLEEP_WINDOW', optionId: 'before_23', t_ms: 1000, skipped: false, revisit: false,
    }));
    const r = nextNode({ session: s, nodesByCode: ORACLE_NODES_BY_CODE, vector: {}, depthProbeForDimension });
    expect(r.nextNodeCode).toBeNull();
    expect(r.reason).toBe('hard_cap');
  });
});
