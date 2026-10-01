function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function aggregateLighthouseResults(results) {
  const groups = new Map();
  for (const result of results) {
    const key = `${result.route}\u0000${result.profile}`;
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups.values()].map((runs) => {
    const first = runs[0];
    const metric = (name) => median(runs.map((run) => run[name]).filter((value) => value !== null));
    return {
      route: first.route,
      profile: first.profile,
      individualRuns: runs.map((run) => run.performance),
      performance: metric('performance'),
      fcpMs: metric('fcpMs'),
      lcpMs: metric('lcpMs'),
      tbtMs: metric('tbtMs'),
      cls: metric('cls'),
      speedIndexMs: metric('speedIndexMs'),
    };
  });
}

export function evaluateLighthouseGate(result, { mode = 'strict', floors = {} } = {}) {
  if (mode === 'strict') {
    const passes =
      result.performance >= 90 && result.cls <= 0.1 && result.lcpMs <= 2500 && result.tbtMs <= 200;
    return { passes, gate: passes ? 'strict pass' : 'strict failure' };
  }
  if (mode === 'baseline') {
    const floor = floors[result.route]?.[result.profile];
    if (floor === undefined) return { passes: false, gate: 'missing baseline floor' };
    const passes = result.performance >= floor;
    return { passes, gate: passes ? 'baseline pass' : `below baseline floor ${floor}` };
  }
  const passes = result.performance >= 40;
  return { passes, gate: passes ? 'report only' : 'catastrophic regression' };
}
