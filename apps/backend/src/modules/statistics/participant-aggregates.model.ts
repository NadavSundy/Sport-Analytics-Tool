/**
 * One grouped row of a participant's derived figures.
 *
 * The repository returns the season, competition and career levels from a
 * single grouped statement, so a row carries flags saying which columns were
 * part of its grouping set rather than which level it belongs to.
 */
export interface ParticipantAggregateRow {
  /** True when this row groups by competition; false when it spans them all. */
  competitionGrouped: boolean;
  /** True when this row groups by season; false when it spans them all. */
  seasonGrouped: boolean;
  competitionId: string | null;
  competitionName: string | null;
  season: string | null;
  /** Fixtures for which authoritative squad data selects the participant. */
  appearances: number;
  /** Fixtures with striker or bowler activity; retained separately from appearances. */
  fixtureCount: number;
  sourceEventCount: number;
  /**
   * Deliveries in this group where the participant was the striker, including
   * wides. Zero means they never batted, which is what distinguishes an absent
   * batting record from a real score of nought.
   */
  battingDeliveryCount: number;
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  battingInnings: number;
  battingDismissals: number;
  fifties: number;
  hundreds: number;
  highestScore: number | null;
  highestScoreNotOut: boolean | null;
  /** Deliveries in this group where the participant was the bowler. */
  bowlingDeliveryCount: number;
  runsConceded: number;
  /** Bowler-attributable wide runs, including multi-run wides and byes or leg byes run off a wide. */
  wides: number;
  /** Bowler-attributable no-ball runs, including the no-ball penalty. */
  noBalls: number;
  legalBallsBowled: number;
  wicketsTaken: number;
  bowlingInnings: number;
  fourWicketHauls: number;
  fiveWicketHauls: number;
  bestBowlingWickets: number | null;
  bestBowlingRuns: number | null;
  catches: number;
  stumpings: number;
  runOutInvolvements: number;
  /**
   * The balls-per-over of the fixtures in this group, or null where they do not
   * agree. Overs bowled and economy rate need a divisor and
   * `sport-domain-definition.md` §10 forbids assuming six, so a group spanning
   * different values reports neither.
   */
  ballsPerOver: number | null;
}

export interface ParticipantAggregatesSource {
  participantId: string;
  participantName: string;
  rows: ParticipantAggregateRow[];
}
