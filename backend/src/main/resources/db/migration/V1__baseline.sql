-- MonArgent baseline schema (MySQL 8.4 / 8.0 compatible)
-- Generated from JPA entity audit on deployment/preparation.
-- Validate on a disposable empty local MySQL database before production use.

CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    salary_date DATE NULL,
    created_at DATETIME(6) NOT NULL,
    verified TINYINT(1) NOT NULL,
    mp_alias VARCHAR(50) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    icon VARCHAR(50) NULL,
    color VARCHAR(20) NULL,
    type VARCHAR(20) NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE receipts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    image_url VARCHAR(500) NULL,
    extracted_text TEXT NULL,
    detected_amount DECIMAL(19,2) NULL,
    detected_commerce VARCHAR(150) NULL,
    suggested_category VARCHAR(120) NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_receipts_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    amount DECIMAL(19,2) NOT NULL,
    transaction_date DATETIME(6) NOT NULL,
    type VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    receipt_id BIGINT NULL,
    group_expense_id BIGINT NULL,
    source_group_id BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_transactions_receipt FOREIGN KEY (receipt_id) REFERENCES receipts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fixed_expenses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    due_day INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    active TINYINT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_fixed_expenses_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_fixed_expenses_category FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spending_limits (
    id BIGINT NOT NULL AUTO_INCREMENT,
    amount_limit DECIMAL(19,2) NOT NULL,
    current_amount DECIMAL(19,2) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_spending_limits_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_spending_limits_category FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE saving_goals (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    icon_key VARCHAR(30) NOT NULL,
    description VARCHAR(500) NULL,
    target_amount DECIMAL(19,2) NOT NULL,
    current_amount DECIMAL(19,2) NOT NULL,
    target_date DATE NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_saving_goals_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    type VARCHAR(20) NOT NULL,
    message VARCHAR(500) NOT NULL,
    reference_id BIGINT NULL,
    read_flag TINYINT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recommendations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    type VARCHAR(20) NOT NULL,
    message VARCHAR(500) NOT NULL,
    estimated_impact DECIMAL(19,2) NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE calendar_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    month INT NOT NULL,
    day INT NOT NULL,
    event_hour INT NULL,
    event_type VARCHAR(20) NOT NULL,
    active TINYINT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_calendar_events_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE financial_profiles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    monthly_income DECIMAL(19,2) NOT NULL,
    salary_date DATE NULL,
    financial_model VARCHAR(40) NOT NULL,
    monthly_savings_goal DECIMAL(19,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_financial_profiles_user UNIQUE (user_id),
    CONSTRAINT fk_financial_profiles_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verification_codes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL,
    code VARCHAR(6) NOT NULL,
    verified TINYINT(1) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    expiration DATETIME(6) NULL,
    created_at DATETIME(6) NULL,
    name VARCHAR(100) NULL,
    lastname VARCHAR(100) NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE financial_groups (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    lifecycle_status VARCHAR(20) NOT NULL,
    movements_confirmed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    created_by_user_id BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_financial_groups_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE financial_group_members (
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    CONSTRAINT fk_financial_group_members_group FOREIGN KEY (group_id) REFERENCES financial_groups (id),
    CONSTRAINT fk_financial_group_members_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_guest_members (
    id BIGINT NOT NULL AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    mp_alias VARCHAR(50) NOT NULL,
    email VARCHAR(150) NULL,
    added_by_user_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_group_guest_members_group FOREIGN KEY (group_id) REFERENCES financial_groups (id),
    CONSTRAINT fk_group_guest_members_added_by FOREIGN KEY (added_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_invitations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    invited_email VARCHAR(150) NOT NULL,
    invited_by_user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_group_invitations_group FOREIGN KEY (group_id) REFERENCES financial_groups (id),
    CONSTRAINT fk_group_invitations_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_expenses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    date DATETIME(6) NOT NULL,
    description VARCHAR(500) NULL,
    category_id BIGINT NULL,
    group_id BIGINT NOT NULL,
    paid_by_user_id BIGINT NULL,
    paid_by_guest_id BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_group_expenses_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_group_expenses_group FOREIGN KEY (group_id) REFERENCES financial_groups (id),
    CONSTRAINT fk_group_expenses_paid_by_user FOREIGN KEY (paid_by_user_id) REFERENCES users (id),
    CONSTRAINT fk_group_expenses_paid_by_guest FOREIGN KEY (paid_by_guest_id) REFERENCES group_guest_members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_debts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    amount DECIMAL(19,2) NOT NULL,
    paid TINYINT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    group_expense_id BIGINT NOT NULL,
    debtor_user_id BIGINT NOT NULL,
    creditor_user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_group_debts_expense FOREIGN KEY (group_expense_id) REFERENCES group_expenses (id),
    CONSTRAINT fk_group_debts_debtor FOREIGN KEY (debtor_user_id) REFERENCES users (id),
    CONSTRAINT fk_group_debts_creditor FOREIGN KEY (creditor_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_movement_confirmations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    confirmed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_group_movement_confirmations_group_user UNIQUE (group_id, user_id),
    CONSTRAINT fk_group_movement_confirmations_group FOREIGN KEY (group_id) REFERENCES financial_groups (id),
    CONSTRAINT fk_group_movement_confirmations_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_settlement_payments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    from_member_key VARCHAR(64) NOT NULL,
    to_member_key VARCHAR(64) NOT NULL,
    marked_by_user_id BIGINT NOT NULL,
    proof_stored_name VARCHAR(255) NULL,
    proof_content_type VARCHAR(100) NULL,
    proof_uploaded_at DATETIME(6) NULL,
    confirmed_by_user_id BIGINT NULL,
    confirmed_at DATETIME(6) NULL,
    settlement_amount DECIMAL(19,2) NULL,
    payment_method VARCHAR(20) NULL,
    transactions_recorded TINYINT(1) NOT NULL,
    creditor_income_recorded TINYINT(1) NOT NULL,
    paid_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_group_settlement_payments_group_from_to UNIQUE (group_id, from_member_key, to_member_key),
    CONSTRAINT fk_group_settlement_payments_group FOREIGN KEY (group_id) REFERENCES financial_groups (id),
    CONSTRAINT fk_group_settlement_payments_marked_by FOREIGN KEY (marked_by_user_id) REFERENCES users (id),
    CONSTRAINT fk_group_settlement_payments_confirmed_by FOREIGN KEY (confirmed_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

