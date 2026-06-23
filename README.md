# Glint — Certificate Issuance & Verification Platform

<div align="center">
  <img width="1200" height="475" alt="Glint Certificate Platform Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
  <p><em>Secure, AI-powered digital certificate designer, bulk-issuer, and verification portal.</em></p>
</div>

---

**Glint** is an enterprise-grade digital credentialing system that enables organizations to design bespoke certificates using an interactive drag-and-drop Canva-style editor, leverage Gemini AI for instant layout and design generations, manage bulk recipient issuances, and offer cryptographically secure verification portals.

## 🚀 Key Features

*   **Interactive Canva-Style Editor:** A drag-and-drop designer allowing real-time placement, sizing, custom styling, and alignment of dynamic text elements (e.g., recipient names, program titles), borders, logos, and digital signatures.
*   **Gemini AI Template Assistant:** Leverage state-of-the-art AI (`gemini-2.5-flash`) via `@google/genai` to automatically generate beautiful certificate layouts, backgrounds, SVGs, and text configurations from plain text descriptions.
*   **Cryptographic Verification Portal:** Each issued certificate contains a secure hash/verification seal and dynamic QR code. Anyone can instantly verify the authenticity and validity of a certificate, complete with an immutable public audit trail.
*   **Organization Workspaces & Custom Branding:** Create independent workspaces per department or team. Customize primary/accent colors, white-labeling, brand logos, custom sender names/emails, and footer copy.
*   **Bulk Recipients Dispatch:** Import recipient details dynamically (supporting custom fields like grades, roles, or scores), validate entries, and dispatch credentials via automated email logs in one click.
*   **Analytics Dashboard:** Track metrics such as total issued credentials, certificate views, PDF downloads, social shares, and view trends in real-time.

---

## 🛠️ Tech Stack

*   **Frontend:** React 19 (TypeScript), TailwindCSS v4, Vite 6, Motion (Framer Motion), Recharts, Lucide Icons.
*   **Backend:** Node.js, Express (TypeScript via `tsx` runner), PostgreSQL (`pg`), `esbuild` for production bundling.
*   **AI Integration:** `@google/genai` (utilizing Gemini models for intelligent design and content generation).

---

## 📊 Database Schema

Glint runs on a PostgreSQL database. Below is the SQL schema required to initialize the database tables.

```sql
-- 1. Create workspaces table
CREATE TABLE workspaces (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    plan TEXT DEFAULT 'free',
    brand_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0a0a0a',
    accent_color TEXT DEFAULT '#1a73e8',
    sender_name TEXT,
    sender_email TEXT,
    white_label BOOLEAN DEFAULT FALSE,
    footer_text TEXT,
    custom_domain TEXT
);

-- 2. Create templates table
CREATE TABLE templates (
    id VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(50) REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    layout TEXT DEFAULT 'landscape',
    background_color TEXT DEFAULT '#ffffff',
    border_color TEXT DEFAULT '#000000',
    border_width INTEGER DEFAULT 2,
    show_seal BOOLEAN DEFAULT TRUE,
    seal_type TEXT DEFAULT 'classic',
    show_qr_code BOOLEAN DEFAULT TRUE,
    qr_code_x NUMERIC DEFAULT 10,
    qr_code_y NUMERIC DEFAULT 85,
    logo_url TEXT,
    logo_x NUMERIC DEFAULT 50,
    logo_y NUMERIC DEFAULT 10,
    logo_width NUMERIC DEFAULT 100,
    signature_url TEXT,
    secondary_signature_url TEXT,
    signature_x NUMERIC DEFAULT 50,
    signature_y NUMERIC DEFAULT 75,
    signature_width NUMERIC DEFAULT 90,
    signatory_name TEXT,
    signatory_title TEXT,
    text_elements JSONB DEFAULT '[]'::jsonb,
    border_radius INTEGER DEFAULT 0,
    border_style TEXT DEFAULT 'solid',
    background_gradient TEXT,
    decor_flourish TEXT DEFAULT 'none',
    logo_icon_type TEXT,
    signature_style TEXT,
    show_secondary_signatory BOOLEAN DEFAULT FALSE,
    secondary_signatory_name TEXT,
    secondary_signatory_title TEXT,
    secondary_signature_x NUMERIC,
    secondary_signature_y NUMERIC,
    secondary_signature_width NUMERIC,
    background_image_url TEXT
);

-- 3. Create programs table
CREATE TABLE programs (
    id VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(50) REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_id VARCHAR(50) REFERENCES templates(id) ON DELETE SET NULL,
    issue_date DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'draft',
    created_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recipient_fields JSONB DEFAULT '[]'::jsonb
);

-- 4. Create certificates table
CREATE TABLE certificates (
    id VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(50) REFERENCES workspaces(id) ON DELETE CASCADE,
    program_id VARCHAR(50) REFERENCES programs(id) ON DELETE SET NULL,
    program_name TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    issue_date DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'valid',
    revocation_reason TEXT,
    security_hash TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    last_viewed TIMESTAMP WITH TIME ZONE,
    audit_trail JSONB DEFAULT '[]'::jsonb
);

-- 5. Create email_logs table
CREATE TABLE email_logs (
    id VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(50) REFERENCES workspaces(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    certificate_id VARCHAR(50) REFERENCES certificates(id) ON DELETE SET NULL,
    sent_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚙️ Getting Started

### 📋 Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **PostgreSQL** database instance running locally or on a cloud provider.

### 🔧 Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone git@github.com:jayakrishna0023/Glint.git
    cd Glint
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env.local` file in the root directory (you can copy [.env.example](.env.example)):
    ```env
    # Gemini AI API Key (Required for AI layout generations)
    GEMINI_API_KEY=your_gemini_api_key_here

    # Database URL Connection String
    DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database_name>
    ```
    *Example connection string (using credentials from previous runs):*
    `postgresql://postgres:Admin@123@localhost:5432/Certificates_Platform`

4.  **Database Migration:**
    Execute the table DDL queries from the **Database Schema** section in your PostgreSQL database instance to set up all tables.

---

## 🏃 Running the Application

### Development Mode

Runs the backend express server and mounts the Vite dev middleware client side:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

To build the client SPA and compile the backend server bundle:
```bash
# Clean previous builds
npm run clean

# Compile client code & bundle the TS backend server
npm run build

# Start the node server in production mode
npm run start
```

---

## 📄 License

This project is licensed under the Apache-2.0 License. See the header of source files for details.
