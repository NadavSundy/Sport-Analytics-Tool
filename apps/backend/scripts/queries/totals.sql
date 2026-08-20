SELECT
  (SELECT count(*) FROM fixture) AS fixtures,
  (SELECT count(*) FROM delivery WHERE superseded_at IS NULL) AS deliveries,
  (SELECT count(*) FROM competition) AS competitions,
  (SELECT count(*) FROM person) AS participants,
  (SELECT count(*) FROM submission) AS submissions;
