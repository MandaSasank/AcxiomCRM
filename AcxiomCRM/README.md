# AcxiomCRM - Enterprise Customer Relationship Management System

## Project Overview
AcxiomCRM is an enterprise-grade role-based Customer Relationship Management (CRM) application implementing the full customer sales lifecycle from prospective lead capture through qualification, follow-ups, and sales pipeline opportunity execution.

Built strictly in accordance with the official **AcxiomCRM Technical Assessment Specification**.

---

## Architecture & Technology Stack
1. **Frontend / Live Web Preview Environment**:
   - Modern React with TypeScript & Tailwind CSS.
   - **Chart.js** (`react-chartjs-2`) for responsive pipeline visualizations, lead distributions, and monthly sales outcomes.
   - Bootstrap 5 icon styling & accessible components.
   - Real-time client-side input validations (Required, Email, Phone, Numbers, Dates).

2. **Backend Engine**:
   - Layered architecture separating Presentation, Application/DTOs, Business/Validation, Data Access, and Security layers.
   - **ASP.NET Core Identity & PBKDF2 Password Hashing**: Cryptographically salted password hashing standard with 8+ character complexity policies.
   - **Account Lockout Policy**: Tracks failed authentication attempts, locks account for 15 minutes after 5 consecutive failures, with admin unlock capability.
   - **Role-Based Access Control (RBAC)**: Strict server-side enforcement of 3 distinct roles:
     - **Admin**: Full application administration, User/Role provisioning, and Security Audit Trail inspection.
     - **Manager**: Team-wide pipeline management, conversion analytics, and sales reporting.
     - **Sales Executive**: Strictly scoped to assigned customers, leads, opportunities, and follow-ups.
   - **Append-Only Audit Logging**: Automatically records logins, failed logins, logouts, create, update, delete, and role modification operations with user metadata, timestamp, and client IP.

3. **C# .NET Solution (`/AcxiomCRM`)**:
   - Complete Visual Studio Solution (`AcxiomCRM.sln` & `AcxiomCRM.csproj`) targeting **.NET 8.0**.
   - Entity Framework Core (`ApplicationDbContext.cs`) with SQL Server configuration, uniqueness indexes, and foreign key relationships.
   - Web API Controllers (`/api/customers`, `/api/leads`, `/api/opportunities`, `/api/auth`, `/api/reports/pipeline`) utilizing DTOs and HTTP status codes.

---

## Pre-Configured Test Credentials
| Persona | Email | Password | Access Scope |
|---|---|---|---|
| **Alexander Pierce (Admin)** | `admin@acxiomcrm.com` | `Admin@1234` | Full System Administration, User Mgmt, Audit Trail |
| **Victoria Vance (Manager)** | `manager@acxiomcrm.com` | `Manager@1234` | Team Sales Pipeline & Conversion Reports |
| **David Miller (Sales Executive)** | `sales@acxiomcrm.com` | `Sales@1234` | Assigned Customers, Leads, and Opportunities |

---

## REST API Endpoints
- `POST /api/auth/login` - Authenticate user credentials & issue session token
- `POST /api/auth/logout` - Invalidate session
- `GET /api/customers` - List/search customers (scoped by role)
- `POST /api/customers` - Create customer with email & phone uniqueness validation
- `GET /api/customers/{id}` - Customer 360 details with opportunity & activity history
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Deactivate / delete customer
- `GET /api/leads` - List prospective leads
- `POST /api/leads` - Create lead with mandatory status and expected value
- `POST /api/leads/{id}/convert` - Lead-to-Customer conversion workflow
- `GET /api/opportunities` - Opportunity pipeline list with weighted pipeline calculation
- `POST /api/opportunities` - Create opportunity (validates Amount > 0, Probability 0-100, Close Date >= Today)
- `GET /api/followups` - List planned, overdue, and completed follow-up activities
- `POST /api/followups` - Schedule follow-up (validates Follow-up date >= Today)
- `GET /api/reports/pipeline` - Stage-wise and owner-wise pipeline analytics
- `GET /api/tests/run-acceptance` - Automated verification of all 14 Acceptance Scenarios

---

## Running the Application
### Live Applet Preview:
The live interactive web application runs directly on port 3000 in AI Studio with real-time UI, Chart.js visual analytics, and the interactive Acceptance Test Suite.

### Running the .NET 8 Project locally:
```bash
cd AcxiomCRM
dotnet restore
dotnet build
dotnet run
```
Open `https://localhost:5001` or `http://localhost:5000`.
