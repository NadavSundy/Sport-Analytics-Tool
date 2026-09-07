-- How ambiguous is a human-readable reference, per entity, at corpus scale.
--
-- Issue #360 resolves staged competition, fixture, innings, team and participant
-- references without database identifiers. Whether that is safe depends on
-- whether a name identifies one record, and at what scope. This query measures
-- that rather than assuming it.
--
-- Run with:
--   npm run db:sql --workspace=@sport-analytics/backend -- scripts/queries/360-reference-ambiguity.sql
--
-- Two results carry the design:
--
--   Measure 2 shows a display name is ambiguous for hundreds of people globally.
--   Measure 4 shows it collides inside a single fixture squad in a handful of
--   fixtures. That gap is why resolution is scoped from competition to fixture
--   to participant, and why a name is never matched globally.
--
-- One caveat applies to measures 5 and 7. The corpus importer populates team and
-- competition through ON CONFLICT (name), so genuinely distinct entities sharing
-- a name have already been merged into one row. A zero there records that no
-- collision survives, not that none occurred.

-- 1. Corpus scale.
SELECT 'corpus' AS measure,
       (SELECT count(*) FROM person)       AS people,
       (SELECT count(*) FROM person_alias) AS aliases,
       (SELECT count(*) FROM team)         AS teams,
       (SELECT count(*) FROM competition)  AS competitions,
       (SELECT count(*) FROM official)     AS officials,
       (SELECT count(*) FROM fixture)      AS fixtures,
       (SELECT count(*) FROM innings)      AS innings;

-- 2. person.display_name ambiguity, globally.
SELECT 'person display_name' AS measure,
       count(*)                                           AS distinct_names,
       count(*) FILTER (WHERE people > 1)                 AS names_shared,
       COALESCE(sum(people) FILTER (WHERE people > 1), 0) AS people_affected,
       COALESCE(max(people), 0)                           AS worst_case
FROM (SELECT display_name, count(*) AS people FROM person GROUP BY display_name) g;

-- 3. person_alias ambiguity: one written name, several people.
SELECT 'person_alias name' AS measure,
       count(*)                           AS distinct_aliases,
       count(*) FILTER (WHERE people > 1) AS aliases_shared,
       COALESCE(max(people), 0)           AS worst_case
FROM (SELECT name, count(DISTINCT person_id) AS people FROM person_alias GROUP BY name) g;

-- 4. The decisive measure: within one fixture squad, is a display name unique?
SELECT 'name collision inside one fixture squad' AS measure,
       count(*)                   AS colliding_name_fixture_pairs,
       count(DISTINCT fixture_id) AS fixtures_affected,
       COALESCE(max(people), 0)   AS worst_case
FROM (SELECT fs.fixture_id, p.display_name, count(*) AS people
        FROM fixture_squad fs
        JOIN person p ON p.person_id = fs.person_id
       GROUP BY fs.fixture_id, p.display_name
      HAVING count(*) > 1) g;

-- 5. team name ambiguity. See the caveat above.
SELECT 'team name' AS measure,
       count(*)                          AS distinct_names,
       count(*) FILTER (WHERE teams > 1) AS names_shared
FROM (SELECT name, count(*) AS teams FROM team GROUP BY name) g;

-- 6. A team is not partitioned by competition, so competition cannot scope a
--    team name lookup.
SELECT 'team spanning competitions' AS measure,
       count(*) FILTER (WHERE competitions > 1) AS teams_in_many_competitions,
       count(*)                                 AS teams_with_fixtures,
       COALESCE(max(competitions), 0)           AS worst_case
FROM (SELECT ft.team_id, count(DISTINCT f.competition_id) AS competitions
        FROM fixture_team ft
        JOIN fixture f ON f.fixture_id = ft.fixture_id
       WHERE f.competition_id IS NOT NULL
       GROUP BY ft.team_id) g;

-- 7. competition name ambiguity. See the caveat above.
SELECT 'competition name' AS measure,
       count(*)                                 AS distinct_names,
       count(*) FILTER (WHERE competitions > 1) AS names_shared
FROM (SELECT name, count(*) AS competitions FROM competition GROUP BY name) g;

-- 8. A competition name spans seasons, so a season is part of the fixture key.
SELECT 'seasons per competition' AS measure,
       count(*)                            AS competitions_with_fixtures,
       count(*) FILTER (WHERE seasons > 1) AS spanning_many_seasons,
       COALESCE(max(seasons), 0)           AS worst_case
FROM (SELECT competition_id, count(DISTINCT season) AS seasons
        FROM fixture
       WHERE competition_id IS NOT NULL
       GROUP BY competition_id) g;

-- 9. official.display_name carries no unique constraint, and the resolver looks
--    the name up before inserting. The surplus rows are what that costs.
SELECT 'official display_name' AS measure,
       count(*)                              AS distinct_names,
       count(*) FILTER (WHERE officials > 1) AS names_duplicated,
       COALESCE(max(officials), 0)           AS worst_case
FROM (SELECT display_name, count(*) AS officials FROM official GROUP BY display_name) g;

SELECT 'official duplication' AS measure,
       count(*)                                    AS official_rows,
       count(DISTINCT display_name)                AS distinct_names,
       count(*) - count(DISTINCT display_name)     AS surplus_rows
FROM official;

-- 10. Names whose duplicate official rows are each referenced by a fixture, so
--     one person's appearances are split across several canonical records.
SELECT 'duplicate officials actually referenced' AS measure,
       count(*) AS names_with_references_split
FROM (SELECT o.display_name
        FROM official o
        JOIN fixture_official fo ON fo.official_id = o.official_id
       GROUP BY o.display_name
      HAVING count(DISTINCT o.official_id) > 1) g;

-- 11. Does (competition, season, start_date, teams) identify one fixture? This
--     is the natural key the resolver falls back to when no source identifier is
--     supplied, so its collisions are staged as ambiguous rather than guessed.
SELECT 'fixture natural key (competition, season, start_date, teams)' AS measure,
       count(*)                             AS distinct_keys,
       count(*) FILTER (WHERE fixtures > 1) AS keys_shared,
       COALESCE(max(fixtures), 0)           AS worst_case
FROM (SELECT f.competition_id,
             f.season,
             f.start_date,
             (SELECT string_agg(ft.team_id::text, ',' ORDER BY ft.team_id)
                FROM fixture_team ft
               WHERE ft.fixture_id = f.fixture_id) AS teams,
             count(*) AS fixtures
        FROM fixture f
       GROUP BY 1, 2, 3, 4) g;

-- 12. Source-reference coverage. A reference the platform can match exactly is
--     the preferred path; these show how much of the corpus offers one.
SELECT 'fixture source_ref' AS measure,
       count(*)                                   AS fixtures,
       count(*) FILTER (WHERE source_ref IS NULL) AS without_source_ref,
       count(DISTINCT source_ref)                 AS distinct_source_refs
FROM fixture;

SELECT 'person source_ref' AS measure,
       count(*)                                   AS people,
       count(*) FILTER (WHERE source_ref IS NULL) AS without_source_ref
FROM person;
