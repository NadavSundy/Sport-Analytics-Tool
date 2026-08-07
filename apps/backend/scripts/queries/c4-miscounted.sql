SELECT f.source_ref,
       i.ordinal AS innings_ordinal,
       t.name AS batting_team,
       m.over_number,
       m.balls AS recorded_balls,
       (SELECT count(*)
          FROM delivery d
         WHERE d.innings_id = i.innings_id
           AND d.over_number = m.over_number
           AND d.superseded_at IS NULL) AS delivery_rows
FROM innings_miscounted_over m
JOIN innings i ON i.innings_id = m.innings_id
JOIN fixture f ON f.fixture_id = i.fixture_id
JOIN team t ON t.team_id = i.batting_team_id
ORDER BY f.source_ref, i.ordinal, m.over_number;