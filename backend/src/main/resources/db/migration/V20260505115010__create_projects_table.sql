CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuidv7(),

    identifier VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,

    created_by_user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,

    CONSTRAINT fk_projects_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id),

    CONSTRAINT chk_projects_status
        CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

CREATE INDEX idx_projects_identifier ON projects(identifier);
CREATE INDEX idx_projects_created_by_user_id ON projects(created_by_user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
