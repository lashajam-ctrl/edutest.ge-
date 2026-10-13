import assert from 'node:assert/strict';

const quote = value => `'${String(value).replaceAll("'", "''")}'`;

// A content decision is curated outside this helper. Never quarantine by a
// keyword heuristic: only exact reviewed IDs, hashes and scope are accepted.
export function planQualityHold(rows, candidates, scope) {
  assert.ok(candidates.length > 0, 'An explicit reviewed manifest is required');
  const byId = new Map(rows.map(row => [row.id, row]));
  assert.equal(byId.size, rows.length, 'Duplicate source IDs');
  assert.equal(new Set(candidates.map(row => row.id)).size, candidates.length, 'Duplicate manifest IDs');
  return candidates.map(candidate => {
    const row = byId.get(candidate.id);
    assert.ok(row, `Missing reviewed row: ${candidate.id}`);
    assert.match(candidate.content_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.content_hash, candidate.content_hash, 'Content drift; review again');
    assert.ok(typeof candidate.reason === 'string' && candidate.reason.trim().length > 10, 'Review reason required');
    for (const field of ['grade', 'semester', 'subject']) assert.equal(row[field], scope[field], `Scope mismatch: ${field}`);
    assert.ok(row.active === 0 || row.active === 1, 'Unexpected activation state');
    const where = `id=${quote(row.id)} AND content_hash=${quote(row.content_hash)} AND grade=${Number(scope.grade)} AND semester=${Number(scope.semester)} AND subject=${quote(scope.subject)}`;
    return {
      id: row.id, reason: candidate.reason, alreadyHeld: row.active === 0,
      apply: `UPDATE assessment_questions SET active=0 WHERE ${where} AND active=1;`,
      rollback: `UPDATE assessment_questions SET active=1 WHERE ${where} AND active=0;`
    };
  });
}
