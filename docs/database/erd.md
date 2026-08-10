@'
# Entity relationship diagram

The relationships below were read from the database with
`apps/backend/scripts/queries/erd.sql`, which lists every foreign key in the
`public` schema. The diagram is therefore a description of the schema as
migrated, not a separate design document. Column detail is in
[the event model](schema.md).

## Provenance and identity

```mermaid
erDiagram
    app_user ||--o{ submission : submits
    submission ||--o{ fixture : "first seen in"
    submission ||--o{ delivery : supplies
    person ||--o{ person_alias : "known as"
```

Every fixture and every delivery carries the submission it arrived in. A person
is identified by their registry reference; the names they have appeared under are
kept separately and are never a join key.

## Match structure

```mermaid
erDiagram
    competition ||--o{ fixture : contains
    venue ||--o{ fixture : hosts
    team ||--o{ fixture : "won, eliminated or won toss"
    fixture ||--o{ fixture_team : contests
    team ||--o{ fixture_team : "plays in"
    fixture ||--o{ fixture_squad : names
    person ||--o{ fixture_squad : "selected in"
    team ||--o{ fixture_squad : "selected for"
    fixture ||--o{ fixture_official : officiated
    official ||--o{ fixture_official : officiates
    fixture ||--o{ fixture_player_of_match : awards
    person ||--o{ fixture_player_of_match : "awarded to"
    fixture ||--o{ innings : "divided into"
    team ||--o{ innings : bats
    innings ||--o{ innings_powerplay : has
    innings ||--o{ innings_absent : records
    person ||--o{ innings_absent : absent
    innings ||--o{ innings_miscounted_over : records
```

A fixture holds any number of innings rather than two; a super over adds a third
and fourth. Officials are separate from persons because the source gives them no
stable identifier.

## Events

```mermaid
erDiagram
    innings ||--o{ delivery : contains
    delivery ||--o| delivery : supersedes
    person ||--o{ delivery : "faces, partners or bowls"
    delivery ||--o{ delivery_wicket : "may take"
    dismissal_kind ||--o{ delivery_wicket : classifies
    person ||--o{ delivery_wicket : "dismissed in"
    delivery_wicket ||--o{ delivery_wicket_fielder : credits
    person ||--o{ delivery_wicket_fielder : fields
    delivery ||--o| delivery_review : "may be reviewed"
    team ||--o{ delivery_review : reviews
    person ||--o{ delivery_review : "review concerns"
    official ||--o{ delivery_review : "decision reviewed"
    delivery ||--o{ delivery_replacement : records
    person ||--o{ delivery_replacement : "replaces or replaced"
```

The delivery is the event. A correction inserts a new row and marks the prior one
superseded through `superseded_by`, so the relationship from delivery to delivery
is the correction history. All derivation reads `delivery_current`, the view of
rows not yet superseded.

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
'@ | Set-Content -Path docs\database\erd.md -Encoding utf8