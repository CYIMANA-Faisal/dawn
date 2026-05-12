CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE form_questions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    parent_question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE,
    
    question_key VARCHAR(100) NOT NULL, 
    type VARCHAR(50) NOT NULL,
    label TEXT,
    tooltip TEXT,
    
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_readonly BOOLEAN NOT NULL DEFAULT FALSE,
    
    options JSONB,
    default_value VARCHAR(255),
    dynamic_default_value JSONB,
    visible_if JSONB,
    dynamic_text JSONB,
    dynamic_options JSONB,
    validation_rules JSONB,
    
    position INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_questions_form_id ON form_questions(form_id);
