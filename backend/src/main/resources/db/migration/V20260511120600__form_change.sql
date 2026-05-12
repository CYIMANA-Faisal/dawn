-- Add form_key to forms
ALTER TABLE forms ADD COLUMN form_key VARCHAR(100);

-- Create form_sections table
CREATE TABLE form_sections (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    section_key VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Modify form_questions table
-- Add section_id and link to sections
ALTER TABLE form_questions ADD COLUMN section_id UUID REFERENCES form_sections(id) ON DELETE CASCADE;

-- Rename and update columns
ALTER TABLE form_questions RENAME COLUMN question_key TO key;
ALTER TABLE form_questions RENAME COLUMN visible_if TO visible_when;

-- Add new columns for enhanced behavior
ALTER TABLE form_questions ADD COLUMN required_when JSONB;
ALTER TABLE form_questions ADD COLUMN clear_when_hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE form_questions ADD COLUMN prefill_from TEXT;
ALTER TABLE form_questions ADD COLUMN default_from TEXT;
ALTER TABLE form_questions ADD COLUMN templates JSONB;
ALTER TABLE form_questions ADD COLUMN config JSONB;

-- Drop redundant form_id (association is now via sections)
ALTER TABLE form_questions DROP COLUMN form_id;

-- Indices for performance
CREATE INDEX idx_form_questions_section_id ON form_questions(section_id);
CREATE INDEX idx_form_sections_form_id ON form_sections(form_id);
