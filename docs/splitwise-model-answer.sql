-- ========================================================
-- SPLITWISE MODEL ANSWER (PostgreSQL)
-- One possible design that passes all 15 steps of the lab.
-- Money is NUMERIC(12,2): exact to the paisa, never a float.
-- ========================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(15),
    default_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_groups_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Step 3: leaving sets left_at; the row stays because old expenses still point to the person
CREATE TABLE group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES groups(id),
    CONSTRAINT fk_gm_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

-- Step 14: rules that create an expense on a schedule
CREATE TABLE recurring_expenses (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    split_type TEXT NOT NULL,
    split_template JSONB NOT NULL,
    frequency TEXT NOT NULL,
    next_run_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_rec_group FOREIGN KEY (group_id) REFERENCES groups(id),
    CONSTRAINT fk_rec_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Steps 4, 6, 10, 12, 13, 14
CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT,                         -- empty for an expense between two friends
    created_by BIGINT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,              -- when it was spent
    split_type TEXT NOT NULL CHECK (split_type IN ('EQUAL', 'EXACT', 'PERCENT', 'SHARES')),
    currency VARCHAR(3) NOT NULL,
    exchange_rate NUMERIC(18, 8) NOT NULL DEFAULT 1,   -- frozen when added
    client_request_id UUID UNIQUE NOT NULL,  -- step 13: retries are refused
    recurring_id BIGINT,                     -- step 14: empty for normal expenses
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),   -- when it was entered
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,                  -- step 12: soft delete
    CONSTRAINT fk_exp_group FOREIGN KEY (group_id) REFERENCES groups(id),
    CONSTRAINT fk_exp_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_exp_recurring FOREIGN KEY (recurring_id) REFERENCES recurring_expenses(id)
);

-- Steps 5 and 6: what was entered (share_value) and what it works out to (owed_amount)
CREATE TABLE expense_splits (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    share_value NUMERIC(12, 4),              -- 40 (%), 2 (shares) or 600.00 (exact)
    owed_amount NUMERIC(12, 2) NOT NULL,
    CONSTRAINT fk_split_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
    CONSTRAINT fk_split_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_split UNIQUE (expense_id, user_id)
);

-- Step 7: several people can pay one expense
CREATE TABLE expense_payers (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL CHECK (paid_amount > 0),
    CONSTRAINT fk_payer_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
    CONSTRAINT fk_payer_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_payer UNIQUE (expense_id, user_id)
);

-- Step 8: each pair stored once, smaller id first
CREATE TABLE friendships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    friend_id BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    requested_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_fr_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_fr_friend FOREIGN KEY (friend_id) REFERENCES users(id),
    CONSTRAINT fk_fr_requester FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT uq_friend_pair UNIQUE (user_id, friend_id),
    CONSTRAINT chk_pair_order CHECK (user_id < friend_id)
);

-- Step 9
CREATE TABLE settlements (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT,
    payer_id BIGINT NOT NULL,
    payee_id BIGINT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    method TEXT,
    client_request_id UUID UNIQUE NOT NULL,
    settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_set_group FOREIGN KEY (group_id) REFERENCES groups(id),
    CONSTRAINT fk_set_payer FOREIGN KEY (payer_id) REFERENCES users(id),
    CONSTRAINT fk_set_payee FOREIGN KEY (payee_id) REFERENCES users(id),
    CONSTRAINT chk_not_self CHECK (payer_id <> payee_id)
);

-- Step 11: a cache, updated in the same transaction as each expense or settlement
CREATE TABLE group_balances (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,   -- + is owed to you, - you owe
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_bal_group FOREIGN KEY (group_id) REFERENCES groups(id),
    CONSTRAINT fk_bal_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_balance UNIQUE (group_id, user_id)
);

-- Step 12
CREATE TABLE expense_history (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL,
    changed_by BIGINT NOT NULL,
    action TEXT NOT NULL,                    -- CREATED, UPDATED, DELETED, RESTORED
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_hist_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
    CONSTRAINT fk_hist_user FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Step 15: insert-only; the entries of any expense or settlement sum to zero
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    group_id BIGINT,
    expense_id BIGINT,
    settlement_id BIGINT,
    amount NUMERIC(12, 2) NOT NULL,          -- signed, in the group's base currency
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_led_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_led_group FOREIGN KEY (group_id) REFERENCES groups(id),
    CONSTRAINT fk_led_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
    CONSTRAINT fk_led_settlement FOREIGN KEY (settlement_id) REFERENCES settlements(id),
    CONSTRAINT chk_one_source CHECK ((expense_id IS NULL) <> (settlement_id IS NULL))
);

-- Queries the app runs most, kept fast
CREATE INDEX idx_expenses_group_date ON expenses (group_id, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_splits_user ON expense_splits (user_id);
CREATE INDEX idx_ledger_user_group ON ledger_entries (user_id, group_id);
