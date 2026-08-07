SELECT f.outcome,
       w.name AS winner,
       e.name AS eliminator,
       f.outcome_by_runs,
       f.outcome_by_wickets,
       f.decided_by_bowl_out
FROM fixture f
LEFT JOIN team w ON w.team_id = f.winner_id
LEFT JOIN team e ON e.team_id = f.eliminator_id
WHERE f.fixture_id = 3;