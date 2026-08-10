-- Foreign key relationships, for generating the ERD.
SELECT
    src.relname  AS child_table,
    tgt.relname  AS parent_table,
    con.conname  AS constraint_name
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_class tgt ON tgt.oid = con.confrelid
JOIN pg_namespace n ON n.oid = src.relnamespace
WHERE con.contype = 'f'
  AND n.nspname = 'public'
ORDER BY src.relname, tgt.relname;