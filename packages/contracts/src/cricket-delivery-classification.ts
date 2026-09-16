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
 *   - Wide and no-ball runs are charged to the bowler. Byes, leg byes and
 *     penalty runs are team extras and are never charged to the bowler, so
 *     they play no part in classification.
 *
 * Stored events keep the values exactly as submitted, including explicit zeros.
 * Every derivation classifies through these functions instead, in TypeScript,
 * or through the SQL fragments below, which must agree with them. A database
 * test runs both over the same table of cases.
 */

export interface CricketDeliveryExtrasValues {
  wides?: number | null | undefined;
  noBalls?: number | null | undefined;
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

/** Wide and no-ball runs, which are charged to the bowler as well as the team. */
export function bowlerChargedExtras(extras: CricketDeliveryExtrasValues): number {
  return positive(extras.wides) + positive(extras.noBalls);
}

const SQL_ALIAS_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * `alias` names a row carrying the `delivery` table's `extra_wides` and
 * `extra_noballs` columns. Callers embed the result in a query rather than
 * binding it as a parameter, so the alias must be a literal written at the call
 * site and never request input.
 */
function extrasColumns(alias: string): { wides: string; noBalls: string } {
  if (!SQL_ALIAS_PATTERN.test(alias)) {
    throw new Error(`Invalid SQL alias for delivery classification: ${alias}`);
  }

  return {
    wides: `COALESCE(${alias}.extra_wides, 0)`,
    noBalls: `COALESCE(${alias}.extra_noballs, 0)`,
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

export function bowlerChargedExtrasSql(alias: string): string {
  const columns = extrasColumns(alias);
  return `(GREATEST(${columns.wides}, 0) + GREATEST(${columns.noBalls}, 0))`;
}
