-- Up Migration

ALTER TABLE submission
    ADD COLUMN source_file_name text,
    ADD COLUMN source_file_media_type text,
    ADD COLUMN source_file_size_bytes integer,
    ADD CONSTRAINT submission_source_file_provenance_ck
        CHECK (
            (source_file_name IS NULL AND source_file_media_type IS NULL AND source_file_size_bytes IS NULL)
            OR
            (
                source_file_name IS NOT NULL
                AND source_file_media_type IN ('application/json', 'text/csv')
                AND source_file_size_bytes > 0
                AND source_file_size_bytes <= 1000000
            )
        );

COMMENT ON COLUMN submission.source_file_name IS
    'Original basename of a validated JSON or CSV upload; null for non-file submissions.';

COMMENT ON COLUMN submission.source_file_media_type IS
    'Canonical media type of the validated uploaded source file.';

COMMENT ON COLUMN submission.source_file_size_bytes IS
    'Byte length of the validated uploaded source file, limited to 1 MB.';

-- Down Migration

ALTER TABLE submission
    DROP CONSTRAINT IF EXISTS submission_source_file_provenance_ck,
    DROP COLUMN IF EXISTS source_file_size_bytes,
    DROP COLUMN IF EXISTS source_file_media_type,
    DROP COLUMN IF EXISTS source_file_name;
