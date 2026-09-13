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
  /** Deliveries in this group where the participant was the bowler. */
  bowlingDeliveryCount: number;
  runsConceded: number;
  /** Bowler-attributable wide runs, including multi-run wides. */
  wides: number;
  /** Bowler-attributable no-ball runs, including the no-ball penalty. */
  noBalls: number;
  legalBallsBowled: number;
  wicketsTaken: number;
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
