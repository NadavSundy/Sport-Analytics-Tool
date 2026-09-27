# ADR-014: Byes and leg byes recorded on a wide are wide runs charged to the bowler

- **Status:** Accepted, pending PR review
- **Date:** 2026-09-16
- **Participants:** Ben Swartz (team notified in group chat)
- **Related issues:** #623, #590

## Context

A delivery's extras are stored as five separate run counts: wides, no-balls, byes, leg byes and
penalty. Bowler figures charged wide and no-ball runs to the bowler and treated byes and leg byes as
team extras on every delivery. Schema observation O3 and the sport domain definition gave "a wide
with byes" as the example of extras types co-occurring, which raised the question of how byes or leg
byes recorded on a wide should be charged.

Law 22.6 of the Laws of Cricket answers it: all runs completed off a wide, together with the wide
penalty, are scored as wide balls and charged to the bowler. They are not byes or leg byes. Byes and
leg byes run off a no-ball are different: under Law 21 they remain byes and leg byes and are not
charged to the bowler.

Before deciding, the treatment was checked against the data rather than assumed. A scan for issue
#623 read every Cricsheet match file the project holds: the 13,953-match T20 corpus
(3,193,996 deliveries), the four reference fixtures (1399114, 1462921, 729307 and 423788), the seeds,
the invalid seeds and every JSON test fixture, 14,261 files in all.

- **No delivery records a positive wide together with byes or leg byes.** The combinations that do
  occur are a no-ball with byes (488 deliveries), a no-ball with leg byes (106), and a penalty with a
  wide (3), leg byes (2) or a no-ball (1). On every delivery the extras sum to `runs.extras`.
- Cricsheet records runs completed off a wide as wides, as Law 22.6 requires. Wide values in the
  corpus are 1 (108,017 deliveries), 2 (6,072), 3 (1,456), 4 (151) and 5 (3,683), the last typically
  a wide that runs to the boundary.
- The published figures for fixture 423788 agree: New Zealand conceded four wide deliveries for five
  wide runs, one of them recorded in the source as `wides: 2`.

O3's "a wide with byes" was therefore an illustrative example, not a measured property of the data.
The case can still arise, because the submission contract accepts `{ wides: 1, byes: 4 }` from direct
submissions, CSV uploads and batches.

## Decision

Byes and leg byes recorded on a delivery with a positive wide are wide runs. They are charged to the
bowler in runs conceded, economy rate and the bowler's wides figure, so `{ wides: 1, byes: 4 }` gives
exactly the figures of `{ wides: 5 }`, the form Cricsheet records.

- The rule is implemented once, in the shared delivery classification
  (`bowlerWideRuns` and `bowlerChargedExtras`, with matching SQL fragments), and applied by the
  fixture statistics derivation, the season, competition and career aggregates, and the participant
  fixture history.
- Byes and leg byes on any other delivery, including a no-ball, and all penalty runs remain team
  extras.
- Stored events are not altered. The contract continues to accept such deliveries, and the events API
  returns the extras exactly as submitted.
- Batter figures, balls faced, legal balls and team totals are unchanged.

## Alternatives considered

- **B: charge the byes and leg byes in runs conceded only.** The bowler's runs conceded and economy
  would follow Law 22.6, but the bowler's wides figure would still show only the recorded wides, so
  the bowler's figures would contradict each other and differ from the same delivery recorded as
  `{ wides: 5 }`. Rejected.
- **C: keep the existing treatment and correct only the documentation.** Byes and leg byes on a wide
  would stay team extras, contrary to Law 22.6, and a bowler's figures would depend on how a scorer
  chose to record the same delivery. Rejected.
- **Rejecting such deliveries in the contract.** Out of scope: valid data must continue to ingest, and
  the delivery can be charged correctly without refusing it.

## Advantages

- Bowler figures follow the Laws of Cricket and match Cricsheet's recording convention.
- A delivery gives the same figures however its runs off a wide were recorded.
- One shared rule covers every derivation path, and a database parity test holds the TypeScript and
  SQL forms together.

## Disadvantages

- A bowler's wides figure can exceed the stored `extra_wides` values for their deliveries, so a
  reader comparing raw events with derived figures must apply the same rule.
- No published scorecard contains the case, so the decision rests on Law 22.6 and equivalence tests
  rather than on a published bowler figure.

## Consequences

- Bowler runs conceded, economy rate and wides include byes and leg byes recorded on a wide, at
  fixture, history, season, competition and career level.
- No published figure changes: neither the corpus, the reference fixtures nor the deployed database
  contain such a delivery (see Verification).
- Schema observation O3 and the sport domain definition now give "a no-ball with byes" as their
  example, and the statistics documentation states the rule.

## Verification and review date

- **Corpus scan (16 September 2026):** 0 deliveries with a positive wide and byes or leg byes across
  14,261 files, including 13,953 corpus matches (3,193,996 deliveries) and the four reference
  fixtures.
- **Deployed database (16 September 2026):** a read-only query against `delivery_current` found 0
  deliveries and 0 innings with a positive wide combined with byes or leg byes.
- **No published figure changes** as a result of this decision.
- **Tests:** contract unit tests cover wide runs and equivalence of `{ wides: 1, byes: 4 }` and
  `{ wides: 5 }`; the TypeScript and SQL parity test covers the new cases; a derivation test and a
  direct-submission database test show identical fixture, history, season, competition and career
  figures for both recording forms, with batter figures and team totals unchanged.
- **Review:** at PR review for #623, and again if a data source is found that records runs off a wide
  as byes or leg byes.

## AI Declaration

The preceding decision record was drafted with the assistance of Claude-Code[Claude Opus 5].
