CREATE TABLE form_submissions (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    shareholder_id UUID NOT NULL REFERENCES shareholders(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    signature_image TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_shareholder_id ON form_submissions(shareholder_id);
