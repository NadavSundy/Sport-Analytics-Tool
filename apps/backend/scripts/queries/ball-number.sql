-- Does the printed ball number repeat within an over, as O1 claims?
SELECT f.source_ref,
       i.ordinal AS innings_ordinal,
       d.over_number,
       count(*) AS deliveries,
       count(DISTINCT d.ball_number) AS distinct_ball_numbers
FROM delivery_current d
JOIN innings i ON i.innings_id = d.innings_id
JOIN fixture f ON f.fixture_id = i.fixture_id
GROUP BY f.source_ref, i.ordinal, d.over_number
HAVING count(*) > count(DISTINCT d.ball_number)
ORDER BY count(*) - count(DISTINCT d.ball_number) DESC,
         f.source_ref, i.ordinal, d.over_number
LIMIT 10;