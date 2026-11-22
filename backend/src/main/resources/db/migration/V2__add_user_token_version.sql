-- Add token_version for JWT invalidation on password change/reset.
ALTER TABLE users
    ADD COLUMN token_version INT NOT NULL DEFAULT 0;
