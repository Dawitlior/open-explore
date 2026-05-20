import { describe, it, expect } from 'vitest';
import { nextNode } from '@/lib/oracle/engine';
import { ORACLE_NODES_BY_CODE, depthProbeForDimension } from '@/lib/oracle/nodes.seed';
import { vectorizePath, hesitationIndex, signalAmplifier } from '@/lib/oracle/vectorize';
import type { OracleSessionState, VisitedStep } from '@/lib/oracle/types';

const baseSession = (): OracleSessionState => ({
  id: 's1',
  user_id: 'u1',
  state: 'in_progress',
  current_node_code: 'IMP_01_BREAKOUT',
  visited_path: [],
  dissonance_log: [],
  depth_score: 0,
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
        { node: 'IMP_01_BREAKOUT', optionId: 'enter_market', t_ms: 800, skipped: false, revisit: false },
        { node: 'NAR_01_STORY',    optionId: null,           t_ms: 0,   skipped: true,  revisit: false },
      ],
      ORACLE_NODES_BY_CODE,
    );
    expect(v.impulsivity).toBeGreaterThan(0);
    expect(v.story_dependency ?? 0).toBe(0);
  });
});

describe('Oracle engine.nextNode', () => {
  it('follows static branch on first answer', () => {
    const s = baseSession();
    s.visited_path = [{ node: 'IMP_01_BREAKOUT', optionId: 'wait_retest', t_ms: 1000, skipped: false, revisit: false }];
    const r = nextNode({ session: s, nodesByCode: ORACLE_NODES_BY_CODE, vector: {}, depthProbeForDimension });
    expect(r.nextNodeCode).toBe('NAR_01_STORY');
    expect(r.reason).toBe('static_branch');
  });

  it('triggers depth-probe on trap contradiction', () => {
    const s = baseSession();
    s.current_node_code = 'IMP_02_TRAP';
    s.visited_path = [
      // First answer: low impulsivity
      { node: 'IMP_01_BREAKOUT', optionId: 'skip_setup', t_ms: 1500, skipped: false, revisit: false },
      // Trap pair answer: high impulsivity → contradiction on `impulsivity` dim
      { node: 'IMP_02_TRAP',     optionId: 'chase',      t_ms: 900,  skipped: false, revisit: false },
    ];
    const r = nextNode({ session: s, nodesByCode: ORACLE_NODES_BY_CODE, vector: {}, depthProbeForDimension });
    expect(r.reason).toBe('trap_contradiction');
    expect(r.nextNodeCode).toBe('PROBE_IMPULSIVITY_QUANT');
    expect(r.dissonance_log.length).toBe(1);
    expect(r.depth_score).toBe(1);
  });

  it('re-approaches a stale skip', () => {
    const s = baseSession();
    s.current_node_code = 'EGO_01_BLAME';
    s.visited_path = [
      { node: 'IMP_01_BREAKOUT', optionId: null, t_ms: 0, skipped: true, revisit: false },
      { node: 'NAR_01_STORY',    optionId: 'verify_data', t_ms: 1200, skipped: false, revisit: false },
      { node: 'EGO_01_BLAME',    optionId: 'me_fault',    t_ms: 1100, skipped: false, revisit: false },
    ];
    const r = nextNode({ session: s, nodesByCode: ORACLE_NODES_BY_CODE, vector: {}, depthProbeForDimension });
    expect(r.reason).toBe('reapproach_skip');
    expect(r.nextNodeCode).toBe('IMP_02_TRAP'); // trap pair of IMP_01
  });

  it('respects hard cap', () => {
    const s = baseSession();
    s.visited_path = Array.from({ length: 60 }, (_, i) => ({
      node: 'IMP_01_BREAKOUT', optionId: 'wait_retest', t_ms: 1000, skipped: false, revisit: false,
    }));
    const r = nextNode({ session: s, nodesByCode: ORACLE_NODES_BY_CODE, vector: {}, depthProbeForDimension });
    expect(r.nextNodeCode).toBeNull();
    expect(r.reason).toBe('hard_cap');
  });
});
