SELECT match_type, team_type, gender, count(*) AS fixtures
FROM fixture
GROUP BY match_type, team_type, gender
ORDER BY count(*) DESC;
