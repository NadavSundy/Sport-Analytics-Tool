SELECT count(*) AS competitions FROM competition;
SELECT count(*) FILTER (WHERE competition_id IS NULL) AS without_competition FROM fixture;
