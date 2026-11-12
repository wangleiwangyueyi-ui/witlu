/** DSATUR with backtracking; preserve prior colors before trying alternatives. */
export function colorGraph(ids, edges, palette, previous = {}) {
  const neighbors = new Map(ids.map(id => [id, new Set()]));
  for (const [a, b] of edges) { if (a !== b && neighbors.has(a) && neighbors.has(b)) { neighbors.get(a).add(b); neighbors.get(b).add(a); } }
  const result = {};
  const solve = () => {
    const todo = ids.filter(id => result[id] === undefined);
    if (!todo.length) return true;
    const saturation = id => new Set([...neighbors.get(id)].map(n => result[n]).filter(Boolean)).size;
    todo.sort((a, b) => saturation(b) - saturation(a) || neighbors.get(b).size - neighbors.get(a).size || a.localeCompare(b));
    const id = todo[0], forbidden = new Set([...neighbors.get(id)].map(n => result[n]));
    const choices = [...new Set([previous[id], ...palette])].filter(c => palette.includes(c) && !forbidden.has(c));
    for (const c of choices) { result[id] = c; if (solve()) return true; delete result[id]; }
    return false;
  };
  return solve() ? result : null;
}
