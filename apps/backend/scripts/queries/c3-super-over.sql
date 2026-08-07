SELECT i.ordinal,
       t.name AS batting_team,
       i.is_super_over,
       count(d.delivery_id) AS deliveries
FROM innings i
JOIN team t ON t.team_id = i.batting_team_id
LEFT JOIN delivery d
       ON d.innings_id = i.innings_id
      AND d.superseded_at IS NULL
WHERE i.fixture_id = 3
GROUP BY i.ordinal, t.name, i.is_super_over
ORDER BY i.ordinal;