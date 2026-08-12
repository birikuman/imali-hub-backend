-- PostgreSQL Database Initialization Script for Imali Hub

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    national_id VARCHAR(50) UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'bank_officer', 'admin', 'relationship_manager', 'credit_manager', 'head_officer', 'analyst')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Create Banks Table
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Loan Products Table
CREATE TABLE IF NOT EXISTS loan_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    loan_type VARCHAR(50) NOT NULL CHECK (loan_type IN ('personal', 'business', 'mortgage', 'agricultural')),
    interest_rate DECIMAL(5, 2) NOT NULL,
    max_amount DECIMAL(15, 2) NOT NULL,
    repayment_months INTEGER NOT NULL,
    requirements TEXT NOT NULL, -- JSON string or comma-separated requirements
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loan_products_bank ON loan_products(bank_id);

-- 5. Create Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_product_id UUID NOT NULL REFERENCES loan_products(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    term_months INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'under_review', 'additional_documents_requested', 'approved', 'rejected', 'disbursed'
    )),
    notes TEXT,
    credit_score_estimate INTEGER,
    income_to_debt_ratio DECIMAL(5, 2),
    application_data JSONB,
    assigned_role VARCHAR(50) DEFAULT 'relationship_manager',
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 6. Create Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN (
        'national_id', 'payslip', 'bank_statement', 'business_registration', 'supporting'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);

-- 7. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
    status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 8. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- SEED DATA
-- ==========================================

-- Insert Banks (if they don't exist yet)
INSERT INTO banks (id, name, code, logo_url, rating) VALUES
('b072da3e-08bb-44ab-9c59-d8e2026857ba', 'Bank of Kigali', 'BK', 'https://www.bk.rw/assets/img/logo.png', 4.80)
ON CONFLICT (name) DO NOTHING;

INSERT INTO banks (id, name, code, logo_url, rating) VALUES
('c072da3e-08bb-44ab-9c59-d8e2026857bb', 'I&M Bank Rwanda', 'IMB', 'https://www.imbank.com/rwanda/logo.png', 4.60)
ON CONFLICT (name) DO NOTHING;

INSERT INTO banks (id, name, code, logo_url, rating) VALUES
('d072da3e-08bb-44ab-9c59-d8e2026857bc', 'Equity Bank Rwanda', 'EQTY', 'https://equitygroupholdings.com/rw/logo.png', 4.40)
ON CONFLICT (name) DO NOTHING;


INSERT INTO banks (id, name, code, logo_url, rating) VALUES
('f072da3e-08bb-44ab-9c59-d8e2026857be', 'Development Bank of Rwanda', 'BRD', 'https://www.brd.rw/logo.png', 4.50)
ON CONFLICT (name) DO NOTHING;


-- Insert Default Users (Password is 'password123')
-- Bcrypt Hash: $2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO
INSERT INTO users (id, email, password_hash, full_name, phone_number, national_id, role, status) VALUES
('d3b07384-d113-4956-bc21-0a625a6f23b2', 'admin@imalihub.rw', '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', 'Imali Hub Administrator', '+250780000001', '1199580000000012', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, phone_number, national_id, role, status) VALUES
('e2b07384-d113-4956-bc21-0a625a6f23b3', 'officer@bk.rw', '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', 'Jean Keza', '+250780000002', '1199580000000013', 'bank_officer', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, phone_number, national_id, role, status) VALUES
('f2b07384-d113-4956-bc21-0a625a6f23b4', 'citizen@gmail.com', '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', 'Mugenzi Eric', '+250788123456', '1199280123456789', 'citizen', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, phone_number, national_id, role, status) VALUES
('a1b07384-d113-4956-bc21-0a625a6f23b5', 'rm@bk.rw', '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', 'RM Alice', '+250788123457', '1199280123456790', 'relationship_manager', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, phone_number, national_id, role, status) VALUES
('b2b07384-d113-4956-bc21-0a625a6f23b6', 'cm@bk.rw', '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', 'CM Bob', '+250788123458', '1199280123456791', 'credit_manager', 'active')
ON CONFLICT (email) DO NOTHING;


-- Insert Loan Products
INSERT INTO loan_products (id, bank_id, name, loan_type, interest_rate, max_amount, repayment_months, requirements, status) VALUES
('l1b07384-d113-4956-bc21-0a625a6f23c1', 'b072da3e-08bb-44ab-9c59-d8e2026857ba', 'BK Personal Loan', 'personal', 15.50, 15000000.00, 60, '["Proof of regular income (Payslip)", "National ID copy", "Active BK account"]', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO loan_products (id, bank_id, name, loan_type, interest_rate, max_amount, repayment_months, requirements, status) VALUES
('l2b07384-d113-4956-bc21-0a625a6f23c2', 'b072da3e-08bb-44ab-9c59-d8e2026857ba', 'BK Agri-Business Finance', 'agricultural', 12.00, 50000000.00, 36, '["Land title (Ubutaka)", "Project business plan", "Cooperative membership proof"]', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO loan_products (id, bank_id, name, loan_type, interest_rate, max_amount, repayment_months, requirements, status) VALUES
('l3b07384-d113-4956-bc21-0a625a6f23c3', 'c072da3e-08bb-44ab-9c59-d8e2026857bb', 'I&M SME Business Loan', 'business', 14.80, 100000000.00, 48, '["Business registration (RDB certificate)", "6 months bank statement", "Tax clearance certificate (RRA)"]', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO loan_products (id, bank_id, name, loan_type, interest_rate, max_amount, repayment_months, requirements, status) VALUES
('l4b07384-d113-4956-bc21-0a625a6f23c4', 'd072da3e-08bb-44ab-9c59-d8e2026857bc', 'Equity Mortgage Loan', 'mortgage', 16.00, 250000000.00, 180, '["Property valuation report", "Approved construction plan", "Proof of steady employment/income"]', 'active')
ON CONFLICT (id) DO NOTHING;
