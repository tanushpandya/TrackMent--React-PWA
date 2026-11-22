/**
 * Largest Remainder (Hamilton-Hare) Allocation Engine with RVCE Institutional Rubrics.
 * Pure TypeScript implementation preventing fractional rounding discrepancies in academic grading.
 * Aligned with RVCE Experiential Learning circular (RVCE/DA/030/2026-27).
 */

export interface RubricCriterion {
  key: string;
  label: string;
  maxMarks: number;
  priority: number; // 0 = highest priority for tie-breaking
  subCriteria?: RubricCriterion[];
}

export class LargestRemainderAllocator {
  // ── Phase 1 Canonical Rubrics (40 Marks) ──────────────────────────────────
  static readonly PHASE_1_CRITERIA: RubricCriterion[] = [
    {
      key: 'problem_definition',
      label: 'Problem Formulation & Literature Survey',
      maxMarks: 20.0,
      priority: 0,
    },
    {
      key: 'objectives',
      label: 'Project Objectives & Scope',
      maxMarks: 10.0,
      priority: 1,
    },
    {
      key: 'methodology',
      label: 'Methodology & Proposed Architecture',
      maxMarks: 10.0,
      priority: 2,
    },
  ];

  // ── Phase 2 Canonical Rubrics (60 Marks) ──────────────────────────────────
  static readonly PHASE_2_PARTIAL_RESULTS_CRITERIA: RubricCriterion[] = [
    {
      key: 'partial_results_clarity',
      label: 'Clarity of Results',
      maxMarks: 4.0,
      priority: 0,
    },
    {
      key: 'partial_results_progress',
      label: 'Milestone Progress',
      maxMarks: 3.0,
      priority: 1,
    },
    {
      key: 'partial_results_analysis',
      label: 'Preliminary Analysis',
      maxMarks: 3.0,
      priority: 2,
    },
  ];

  static readonly PHASE_2_CRITERIA: RubricCriterion[] = [
    {
      key: 'project_execution',
      label: 'Project Execution',
      maxMarks: 30.0,
      priority: 0,
    },
    {
      key: 'tools_techniques',
      label: 'Tools & Techniques',
      maxMarks: 20.0,
      priority: 1,
    },
    {
      key: 'partial_results',
      label: 'Partial Results',
      maxMarks: 10.0,
      priority: 2,
      subCriteria: LargestRemainderAllocator.PHASE_2_PARTIAL_RESULTS_CRITERIA,
    },
  ];

  // ── Phase 3 Canonical Rubrics (100 Marks) ─────────────────────────────────
  // Core (80 Marks) + Standalone Notable Outcomes (20 Marks)
  static readonly PHASE_3_CORE_CRITERIA: RubricCriterion[] = [
    {
      key: 'prototype_demo',
      label: 'Prototype Demonstration',
      maxMarks: 30.0,
      priority: 0,
    },
    {
      key: 'results_discussion',
      label: 'Results & Discussion',
      maxMarks: 20.0,
      priority: 1,
    },
    {
      key: 'report',
      label: 'Project Report',
      maxMarks: 20.0,
      priority: 2,
    },
    {
      key: 'poster_ppt',
      label: 'Poster & PPT Presentation',
      maxMarks: 10.0,
      priority: 3,
    },
  ];

  static readonly PHASE_3_NOTABLE_CRITERION: RubricCriterion = {
    key: 'notable_outcomes',
    label: 'Notable Outcomes & Publication',
    maxMarks: 20.0,
    priority: 4,
  };

  static readonly PHASE_3_CRITERIA: RubricCriterion[] = [
    ...LargestRemainderAllocator.PHASE_3_CORE_CRITERIA,
    LargestRemainderAllocator.PHASE_3_NOTABLE_CRITERION,
  ];

  /**
   * Resolves phase index (1, 2, or 3) from a phase name using strict word-boundary matching.
   */
  static resolvePhaseNumber(phaseName: string): number {
    if (!phaseName || typeof phaseName !== 'string') return 1;
    const name = phaseName.trim().toLowerCase();

    // Specific phase checks with word boundaries - check Phase 3 first
    if (/\b(?:phase\s*3|p3|final(?:\s*demo|\s*eval|\s*defense|\s*presentation)?|cie\s*3)\b/i.test(name)) {
      return 3;
    }
    // Phase 2 check
    if (/\b(?:phase\s*2|p2|milestone(?:\s*review)?|cie\s*2)\b/i.test(name)) {
      return 2;
    }
    // Phase 1 check
    if (/\b(?:phase\s*1|p1|synopsis|formulation|cie\s*1)\b/i.test(name)) {
      return 1;
    }

    // Explicit phase pattern match
    const phaseMatch = name.match(/\bphase\s*([123])\b/i);
    if (phaseMatch) {
      return parseInt(phaseMatch[1], 10);
    }

    if (/\b3\b/.test(name)) return 3;
    if (/\b2\b/.test(name)) return 2;
    if (/\b1\b/.test(name)) return 1;

    return 1;
  }

  static getCriteriaForPhase(phaseNumber: number): RubricCriterion[] {
    if (phaseNumber === 1) return this.PHASE_1_CRITERIA;
    if (phaseNumber === 2) return this.PHASE_2_CRITERIA;
    return this.PHASE_3_CRITERIA;
  }

  /**
   * Allocates marks for Phase 1 (40 Marks).
   * Problem Definition (20) > Objectives (10) > Methodology (10)
   */
  static allocatePhase1(totalMarks: number): Record<string, number> {
    const safeTotal = Number.isFinite(totalMarks) ? totalMarks : 0;
    const t = Math.max(0, Math.min(40, Math.round(safeTotal)));
    if (t === 0) {
      return { problem_definition: 0, objectives: 0, methodology: 0 };
    }
    if (t === 40) {
      return { problem_definition: 20, objectives: 10, methodology: 10 };
    }

    const p1 = Math.round(t * (20.0 / 40.0));
    const remaining = t - p1;
    const obj = Math.round(remaining * (10.0 / 20.0));
    const meth = remaining - obj;

    return {
      problem_definition: p1,
      objectives: obj,
      methodology: meth,
    };
  }

  /**
   * Allocates marks for Phase 2 (60 Marks).
   * Project Execution (30) > Tools & Techniques (20) > Partial Results (10 [4+3+3])
   */
  static allocatePhase2(totalMarks: number): Record<string, number> {
    const safeTotal = Number.isFinite(totalMarks) ? totalMarks : 0;
    const t = Math.max(0, Math.min(60, Math.round(safeTotal)));
    if (t === 0) {
      return {
        project_execution: 0,
        tools_techniques: 0,
        partial_results: 0,
        partial_results_clarity: 0,
        partial_results_progress: 0,
        partial_results_analysis: 0,
      };
    }
    if (t === 60) {
      return {
        project_execution: 30,
        tools_techniques: 20,
        partial_results: 10,
        partial_results_clarity: 4,
        partial_results_progress: 3,
        partial_results_analysis: 3,
      };
    }

    // Allocate 3 top-level categories: Execution (30), Tools (20), Results (10)
    const weights = [30.0, 20.0, 10.0];
    const raw = weights.map((w) => (t * w) / 60.0);
    const floored = raw.map(Math.floor);
    let allocated = floored.reduce((a, b) => a + b, 0);
    let rem = t - allocated;

    const remainders = raw.map((r, i) => ({ index: i, remainder: r - floored[i], priority: i }));
    remainders.sort((a, b) => b.remainder - a.remainder || a.priority - b.priority);

    const result = [...floored];
    for (let i = 0; i < rem; i++) {
      result[remainders[i].index]++;
    }

    const [exec, tools, partialTotal] = result;

    // Sub-allocate partial results (10 marks max) across 4:3:3
    const subWeights = [4.0, 3.0, 3.0];
    const subRaw = subWeights.map((w) => (partialTotal * w) / 10.0);
    const subFloored = subRaw.map(Math.floor);
    let subAllocated = subFloored.reduce((a, b) => a + b, 0);
    let subRem = partialTotal - subAllocated;

    const subRemainders = subRaw.map((r, i) => ({ index: i, remainder: r - subFloored[i], priority: i }));
    subRemainders.sort((a, b) => b.remainder - a.remainder || a.priority - b.priority);

    const subResult = [...subFloored];
    for (let i = 0; i < subRem; i++) {
      subResult[subRemainders[i].index]++;
    }

    return {
      project_execution: exec,
      tools_techniques: tools,
      partial_results: partialTotal,
      partial_results_clarity: subResult[0],
      partial_results_progress: subResult[1],
      partial_results_analysis: subResult[2],
    };
  }

  /**
   * Allocates marks for Phase 3 (100 Marks).
   * Core 80 Marks: Prototype (30) > Results (20) > Report (20) > Poster/PPT (10)
   * Ceiling Guard: If total > 80, Core is capped at 80 and overflow (total - 80) is allocated to Notable Outcomes (max 20).
   */
  static allocatePhase3(totalMarks: number): Record<string, number> {
    const safeTotal = Number.isFinite(totalMarks) ? totalMarks : 0;
    const t = Math.max(0, Math.min(100, Math.round(safeTotal)));
    if (t === 0) {
      return {
        prototype_demo: 0,
        results_discussion: 0,
        report: 0,
        poster_ppt: 0,
        notable_outcomes: 0,
      };
    }

    let coreTotal = t;
    let notable = 0;

    if (t > 80) {
      coreTotal = 80;
      notable = t - 80;
    }

    const weights = [30.0, 20.0, 20.0, 10.0];
    const raw = weights.map((w) => (coreTotal * w) / 80.0);
    const floored = raw.map(Math.floor);
    let allocated = floored.reduce((a, b) => a + b, 0);
    let rem = coreTotal - allocated;

    const remainders = raw.map((r, i) => ({ index: i, remainder: r - floored[i], priority: i }));
    remainders.sort((a, b) => b.remainder - a.remainder || a.priority - b.priority);

    const core = [...floored];
    for (let i = 0; i < rem; i++) {
      core[remainders[i].index]++;
    }

    return {
      prototype_demo: core[0],
      results_discussion: core[1],
      report: core[2],
      poster_ppt: core[3],
      notable_outcomes: notable,
    };
  }

  /**
   * Universal allocator dispatching based on phase number or name.
   */
  static allocate(phaseName: string, totalMarks: number): Record<string, number> {
    const num = this.resolvePhaseNumber(phaseName);
    if (num === 1) return this.allocatePhase1(totalMarks);
    if (num === 2) return this.allocatePhase2(totalMarks);
    return this.allocatePhase3(totalMarks);
  }

  /**
   * Calculates total marks from individual criteria scores.
   */
  static calculateTotal(phaseNumber: number, scores: Record<string, number>): number {
    if (phaseNumber === 1) {
      return (scores.problem_definition || 0) + (scores.objectives || 0) + (scores.methodology || 0);
    }
    if (phaseNumber === 2) {
      return (scores.project_execution || 0) + (scores.tools_techniques || 0) + (scores.partial_results || 0);
    }
    return (
      (scores.prototype_demo || 0) +
      (scores.results_discussion || 0) +
      (scores.report || 0) +
      (scores.poster_ppt || 0) +
      (scores.notable_outcomes || 0)
    );
  }
}
