/**
 * The one place the super-over exclusion is decided.
 *
 * `docs/requirements/sport-domain-definition.md` §7 records super-over
 * statistics as computed on a separately scoped set and **excluded from
 * standard aggregates by default** under issue #104. Every standard statistic —
 * fixture, innings, participant-fixture, and the season, competition and career
 * aggregates added under issue #285 — must consume the same boundary, so that a
 * player's career figures agree with the sum of their published fixture
 * figures.
 *
 * §12 records that the convention is a team decision and that client
 * confirmation is still pending, so it may be revisited. When it is, this
 * module is what changes: no derivation, repository or route should spell the
 * predicate out for itself.
 */

/**
 * Whether super-over innings contribute to standard statistics.
 *
 * Reported to clients as `scope.superOversIncluded` so the boundary is explicit
 * in the response rather than implied by the numbers.
 */
export const SUPER_OVERS_INCLUDED_IN_STANDARD_STATISTICS = false;

/**
 * The SQL predicate restricting an `innings` row to the standard scope.
 *
 * `alias` is the innings alias in the surrounding statement. Callers embed the
 * result in a query rather than binding it as a parameter, so the alias must be
 * a literal written at the call site and never request input.
 */
export function standardInningsPredicate(alias: string): string {
  return `${alias}.is_super_over = ${String(SUPER_OVERS_INCLUDED_IN_STANDARD_STATISTICS)}`;
}
