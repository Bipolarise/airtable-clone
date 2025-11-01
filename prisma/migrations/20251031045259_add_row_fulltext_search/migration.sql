-- 1) Column that stores the searchable text
ALTER TABLE "Row" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2) Trigger function to rebuild search_vector whenever JSON data changes
CREATE OR REPLACE FUNCTION row_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector(
      'simple',
      COALESCE(
        (SELECT string_agg(val, ' ')
         FROM (
           SELECT value::text AS val
           FROM jsonb_each_text(NEW.data)
         ) v
        ),
        ''
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Trigger to keep it in sync on INSERT/UPDATE(data)
DROP TRIGGER IF EXISTS row_search_vector_update_trg ON "Row";
CREATE TRIGGER row_search_vector_update_trg
BEFORE INSERT OR UPDATE OF data ON "Row"
FOR EACH ROW
EXECUTE FUNCTION row_search_vector_update();

-- 4) Backfill existing rows (fires the trigger)
UPDATE "Row" SET data = data;

-- 5) Fast index for text search
CREATE INDEX IF NOT EXISTS row_search_vector_gin_idx
  ON "Row" USING GIN (search_vector);
