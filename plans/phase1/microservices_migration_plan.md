# Transition to Microservices Architecture

Currently, the `stock-automation` project follows a Serverless/BaaS (Backend-as-a-Service) architecture. It consists of a React frontend that communicates directly with Supabase for data and authentication, supplemented by a few Vercel serverless functions (`api/contact.js`, `api/send-monthly-report.js`) for tasks requiring secure server environments (like sending emails).

Moving to a **Microservices Architecture** means moving the business logic out of the frontend and organizing it into independent, deployable backend services based on business domains. The frontend will become a "thin client" that interacts with an API Gateway instead of querying the database directly.

## Proposed Changes

We will split the application into the following isolated services.

### 1. API Gateway
- **Purpose**: Acts as the single entry point for the React frontend. It routes requests to the appropriate underlying microservice and handles cross-cutting concerns like rate-limiting and passing auth tokens.
- **Implementation**: Can be implemented using Nginx, AWS API Gateway, or a lightweight Node.js gateway (e.g., using `express-http-proxy` or KrakenD).

### 2. Identity & Authentication Service
- **Purpose**: Manages users, roles, and session tokens.
- **Current State**: Handled directly via `@supabase/supabase-js` auth in the frontend.
- **New State**: The frontend will authenticate via this service, which will abstract the Supabase Auth layer (or replace it with something like Keycloak/Auth0 if desired).

### 3. Inventory & Stock Service
- **Purpose**: Manages central kitchen inventory, store inventory, raw materials, and stock transfers.
- **Current State**: React frontend queries Supabase directly.
- **New State**: A dedicated backend service (e.g., Node.js + Express) will expose REST/GraphQL endpoints for all stock operations. It will manage the `stock`, `inventory`, and `transfers` tables.

### 4. Billing & Sales Service
- **Purpose**: Handles bill generation, receipt printing data, payment modes, and daily store sales tracking.
- **Current State**: React components insert rows into `bills_generated` and `bills_items_generated`.
- **New State**: A dedicated backend service. When a bill is created, it will process the transaction, store it, and optionally emit an event (e.g., via RabbitMQ/Redis/Kafka) that a sale occurred.

### 5. Franchise & Store Management Service
- **Purpose**: Manages franchise profiles, store configurations, and central management dashboards.
- **New State**: A dedicated CRUD service for managing `profiles`, store settings, and franchise details.

### 6. Notification & Reporting Service
- **Purpose**: Handles asynchronous jobs like sending monthly CSV reports, contact form emails, and low-stock alerts.
- **Current State**: Handled by Vercel serverless functions (`api/send-monthly-report.js`, `api/contact.js`).
- **New State**: A worker service that listens to events (e.g., cron jobs, or message queues) and executes the reporting and email logic via Resend and Nodemailer.

---

## Phased Execution Strategy

A "big bang" rewrite is risky. We will use the **Strangler Fig Pattern** to migrate incrementally.

### Phase 1: Establish the API Gateway
- Setup an API Gateway and route all traffic through it. Initially, most API routes will just pass-through, but it gives us the foundation to route to new services as they are built.

### Phase 2: Extract the Notification & Reporting Service
- Migrate `api/contact.js` and `api/send-monthly-report.js` into a standalone Node.js microservice.
- Set up a CRON scheduler (e.g., Node-cron or external trigger) within this service to handle the monthly reports.

### Phase 3: Extract the Billing & Sales Service
- Create the Billing Service.
- Update the React frontend in `src/pages/store` to call the new Billing Service API instead of using `supabase.from('bills_generated').insert(...)`.

### Phase 4: Extract the Inventory Service
- Create the Inventory Service.
- Update the React frontend in `src/pages/stock` and `src/pages/central` to call this new API.

### Phase 5: Complete Frontend Decoupling
- Remove direct `@supabase/supabase-js` database queries from the React frontend.
- The frontend should only make HTTP requests (e.g., using `fetch` or `axios`) to the API Gateway.
