/**
 * The one place a delivery's wides and no-balls are classified.
 *
 * A delivery is a wide when its wides value is greater than zero, and a no-ball
 * when its no-ball value is greater than zero. Absent, `null`, `undefined` and
 * `0` all mean "not a wide" or "not a no-ball". The contract permits an explicit
 * zero, so key presence or nullness must never decide the classification
 * (issue #590).
 *
 *   - Wides and no-balls are not legal deliveries: they do not count towards
 *     the balls of an over or towards overs bowled.
 *   - A wide is not a ball faced by the batter. A no-ball is.
 *   - Wide and no-ball runs are charged to the bowler. Under Law 22.6 every run
 *     completed off a wide is a wide run, so byes or leg byes recorded on a wide
 *     are wide runs and are charged to the bowler too: `{ wides: 1, byes: 4 }`
 *     is charged exactly as `{ wides: 5 }`, the form Cricsheet records
 *     (ADR-014, issue #623).
 *   - Byes and leg byes on any other delivery, including a no-ball, and all
 *     penalty runs are team extras and are never charged to the bowler.
 *
 * Stored events keep the values exactly as submitted, including explicit zeros
 * and byes recorded on a wide. Every derivation classifies through these
 * functions instead, in TypeScript, or through the SQL fragments below, which
 * must agree with them. A database test runs both over the same table of cases.
 */

export interface CricketDeliveryExtrasValues {
  wides?: number | null | undefined;
  noBalls?: number | null | undefined;
  byes?: number | null | undefined;
  legByes?: number | null | undefined;
}

function positive(value: number | null | undefined): number {
  return Math.max(value ?? 0, 0);
}

export function isWide(extras: CricketDeliveryExtrasValues): boolean {
  return positive(extras.wides) > 0;
}

export function isNoBall(extras: CricketDeliveryExtrasValues): boolean {
  return positive(extras.noBalls) > 0;
}

export function isLegalDelivery(extras: CricketDeliveryExtrasValues): boolean {
  return !isWide(extras) && !isNoBall(extras);
}

export function countsAsBallFaced(extras: CricketDeliveryExtrasValues): boolean {
  return !isWide(extras);
}

/** Wide runs charged to the bowler, including byes and leg byes run off a wide. */
export function bowlerWideRuns(extras: CricketDeliveryExtrasValues): number {
  return isWide(extras)
    ? positive(extras.wides) + positive(extras.byes) + positive(extras.legByes)
    : 0;
}

/** Wide and no-ball runs, which are charged to the bowler as well as the team. */
export function bowlerChargedExtras(extras: CricketDeliveryExtrasValues): number {
  return bowlerWideRuns(extras) + positive(extras.noBalls);
}

const SQL_ALIAS_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * `alias` names a row carrying the `delivery` table's `extra_wides`,
 * `extra_noballs`, `extra_byes` and `extra_legbyes` columns. Callers embed the
 * result in a query rather than binding it as a parameter, so the alias must be
 * a literal written at the call site and never request input.
 */
function extrasColumns(alias: string): {
  wides: string;
  noBalls: string;
  byes: string;
  legByes: string;
} {
  if (!SQL_ALIAS_PATTERN.test(alias)) {
    throw new Error(`Invalid SQL alias for delivery classification: ${alias}`);
  }

  return {
    wides: `COALESCE(${alias}.extra_wides, 0)`,
    noBalls: `COALESCE(${alias}.extra_noballs, 0)`,
    byes: `COALESCE(${alias}.extra_byes, 0)`,
    legByes: `COALESCE(${alias}.extra_legbyes, 0)`,
  };
}

export function isWideSql(alias: string): string {
  return `(${extrasColumns(alias).wides} > 0)`;
}

export function isNoBallSql(alias: string): string {
  return `(${extrasColumns(alias).noBalls} > 0)`;
}

export function isLegalDeliverySql(alias: string): string {
  const columns = extrasColumns(alias);
  return `(${columns.wides} <= 0 AND ${columns.noBalls} <= 0)`;
}

export function countsAsBallFacedSql(alias: string): string {
  return `(${extrasColumns(alias).wides} <= 0)`;
}

export function bowlerWideRunsSql(alias: string): string {
  const columns = extrasColumns(alias);
  return (
    `(CASE WHEN ${columns.wides} > 0 ` +
    `THEN ${columns.wides} + GREATEST(${columns.byes}, 0) + GREATEST(${columns.legByes}, 0) ` +
    `ELSE 0 END)`
  );
}

export function bowlerChargedExtrasSql(alias: string): string {
  const columns = extrasColumns(alias);
  return `(${bowlerWideRunsSql(alias)} + GREATEST(${columns.noBalls}, 0))`;
}
