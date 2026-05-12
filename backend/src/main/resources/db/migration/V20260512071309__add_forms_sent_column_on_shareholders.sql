ALTER TABLE shareholders ADD COLUMN forms_sent JSONB NOT NULL DEFAULT '[]'::jsonb;
