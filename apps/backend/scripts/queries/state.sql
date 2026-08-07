SELECT f.fixture_id,
       f.source_ref,
       count(d.delivery_id) AS live_deliveries
FROM fixture f
JOIN innings i ON i.fixture_id = f.fixture_id
LEFT JOIN delivery d
       ON d.innings_id = i.innings_id
      AND d.superseded_at IS NULL
GROUP BY f.fixture_id, f.source_ref
ORDER BY f.fixture_id;