CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuidv7(),

    provider VARCHAR(50) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    provider_tenant_id VARCHAR(255),

    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,

    CONSTRAINT uk_users_provider_identity UNIQUE (
        provider,
        provider_tenant_id,
        provider_subject
    )
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,

    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role),

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_users_provider_identity
    ON users(provider, provider_tenant_id, provider_subject);