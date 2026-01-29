# AssetSim Pro Documentation Hub

**Central Documentation Index for AssetSim Pro**

**Last Updated:** January 28, 2026  
**Maintained By:** AssetSim Pro Documentation Team

---

## 📖 Welcome to AssetSim Pro Documentation

This is the **central hub** for all AssetSim Pro documentation. Whether you're a new developer getting started, deploying to Azure, contributing code, or understanding the architecture, you'll find the right documentation here.

### 🚀 Quick Navigation

**New to AssetSim Pro?** → Start with **[GETTING_STARTED.md](../GETTING_STARTED.md)**

**Need an overview?** → Read **[README.md](../README.md)**

**Contributing code?** → See **[CONTRIBUTING.md](../CONTRIBUTING.md)**

**Understanding architecture?** → Review **[ARCHITECTURE.md](../ARCHITECTURE.md)**

---

## 📚 Documentation Structure

### Primary Entry Points

These documents provide the main entry points for different user journeys:

| Document                                        | Purpose                                                | Audience                      |
| ----------------------------------------------- | ------------------------------------------------------ | ----------------------------- |
| **[GETTING_STARTED.md](../GETTING_STARTED.md)** | Quick setup guide for local dev and Azure deployment   | New Developers, DevOps        |
| **[README.md](../README.md)**                   | Project overview, workspace structure, and navigation  | All Users                     |
| **[ARCHITECTURE.md](../ARCHITECTURE.md)**       | Complete architectural decision records (ADRs)         | Architects, Senior Developers |
| **[CONTRIBUTING.md](../CONTRIBUTING.md)**       | Development guidelines, git workflow, commit standards | Contributors, Developers      |

### Documentation Hierarchy

```
GETTING_STARTED.md (Primary Entry Point) ← Start here for quick setup
├── README.md (Project Overview)
│
├── Local Development Path
│   ├── docs/development/NX_WORKSPACE_GUIDE.md (Nx monorepo development)
│   ├── docs/development/TESTING.md (Testing strategy)
│   └── CONTRIBUTING.md (Git workflow and standards)
│
└── Azure Deployment Path
    ├── docs/deployment/BOOTSTRAP_GUIDE.md (Manual bootstrap - ADR-012)
    ├── scripts/README.md (Automated bootstrap - ADR-013)
    ├── docs/deployment/DEPLOYMENT_GUIDE.md (Terraform deployment)
    ├── docs/architecture/VERIFICATION.md (Post-deployment verification)
    └── docs/architecture/ZERO_TRUST_IMPLEMENTATION.md (Security architecture)

Reference Documentation (Supporting Details)
├── ARCHITECTURE.md (All ADRs)
├── docs/architecture/
│   ├── BACKEND_FRONTEND_INTEGRATION.md (Integration patterns)
│   ├── OBSERVABILITY_ALERT_CONFIG.md (Monitoring setup)
│   ├── VERIFICATION.md (Deployment verification)
│   └── ZERO_TRUST_IMPLEMENTATION.md (Security implementation)
├── docs/development/
│   ├── NX_WORKSPACE_GUIDE.md (Workspace development)
│   ├── TESTING.md (Testing strategy)
│   └── DOCUMENTATION_MAINTENANCE.md (This documentation's maintenance)
└── docs/deployment/
    ├── BOOTSTRAP_GUIDE.md (Manual procedures)
    └── DEPLOYMENT_GUIDE.md (Infrastructure deployment)
```

---

## 📂 Documentation by Category

### 1. Getting Started & Setup

**Start here if you're new to the project:**

- **[GETTING_STARTED.md](../GETTING_STARTED.md)** - Quick start guide
  - Local development setup (Docker + npm)
  - Azure deployment path (Bootstrap → Deploy → Verify)
  - Common troubleshooting and next steps
- **[README.md](../README.md)** - Project overview
  - Workspace structure (Nx monorepo)
  - Quick start commands
  - Technology stack overview

### 2. Development & Contributing

**Guidelines for developers contributing to the project:**

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Development guidelines
  - Git workflow (Conventional Commits, Trunk-Based Development)
  - Code review process
  - Pull request guidelines
  - Commit message standards

- **[NX_WORKSPACE_GUIDE.md](./development/NX_WORKSPACE_GUIDE.md)** - Nx monorepo guide
  - Workspace structure and organization
  - Library architecture
  - Code generation commands
  - Build and test commands

- **[TESTING.md](./development/TESTING.md)** - Testing strategy
  - Test coverage requirements (minimum 80% coverage; see TESTING.md)
  - Unit testing guidelines
  - Integration testing approach
  - E2E testing setup

- **[DOCUMENTATION_MAINTENANCE.md](./development/DOCUMENTATION_MAINTENANCE.md)** - Documentation guidelines
  - Documentation structure and hierarchy
  - Maintenance procedures and update cadence
  - Quality checklists and review process
  - Version control for documentation

### 3. Architecture & Technical Decisions

**Architectural decision records (ADRs) and technical specifications:**

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Complete ADR collection
  - ADR-001: Source Control Governance
  - ADR-002: Zero Trust Security
  - ADR-003: Local Development Strategy
  - ADR-004: Frontend Technology Stack (Angular 21 + Kendo UI)
  - ADR-005: Backend Technology Stack (Azure Functions)
  - ADR-006: UI Component Library (Kendo UI Financial Charts)
  - ADR-007: Infrastructure as Code (Terraform)
  - ADR-008: Database Design
  - ADR-009: Real-time Communication (SignalR)
  - ADR-010: API Design Standards
  - ADR-011: Observability & Monitoring
  - ADR-012: Bootstrap Manual Procedures
  - ADR-013: Bootstrap Automation
  - ADR-014: CI/CD Pipeline
  - ADR-015: Environment Configuration
  - ADR-016: Error Handling Strategy
  - ADR-017: API Documentation (OpenAPI/Swagger)
  - And more...

- **[BACKEND_FRONTEND_INTEGRATION.md](./architecture/BACKEND_FRONTEND_INTEGRATION.md)** - Integration architecture
  - API communication patterns
  - Authentication flow
  - SignalR real-time integration
  - Error handling between layers

- **[ZERO_TRUST_IMPLEMENTATION.md](./architecture/ZERO_TRUST_IMPLEMENTATION.md)** - Security architecture
  - Zero Trust Network principles
  - Private endpoints configuration
  - VNet integration
  - Role-based access control (RBAC)

- **[OBSERVABILITY_ALERT_CONFIG.md](./architecture/OBSERVABILITY_ALERT_CONFIG.md)** - Monitoring setup
  - Application Insights configuration
  - Alert rules and thresholds
  - Logging standards
  - Performance monitoring

### 4. Infrastructure & Deployment

**Infrastructure setup, bootstrap procedures, and deployment guides:**

#### Bootstrap Procedures (One-Time Setup)

- **[BOOTSTRAP_GUIDE.md](./deployment/BOOTSTRAP_GUIDE.md)** - Manual bootstrap (ADR-012)
  - Phase 1: Terraform State Storage
  - Phase 2: Entra ID API Consent
  - Phase 3: Azure DevOps Agent Pool (optional)
  - Step-by-step manual instructions

- **[scripts/README.md](../scripts/README.md)** - Automated bootstrap (ADR-013)
  - `bootstrap-terraform-state.sh` - Automate Phase 1
  - `bootstrap-entra-consent.sh` - Automate Phase 2
  - Usage examples and troubleshooting

#### Infrastructure Deployment

- **[DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md)** - Terraform deployment
  - Infrastructure provisioning
  - Backend configuration
  - Frontend deployment
  - Environment setup

#### Verification

- **[VERIFICATION.md](./architecture/VERIFICATION.md)** - Post-deployment verification
  - Infrastructure verification
  - Application health checks
  - End-to-end testing
  - Security validation

### 5. API Documentation

**Backend API documentation and specifications:**

- **OpenAPI/Swagger Documentation** (ADR-017)
  - **Runtime Access:** `http://localhost:7071/api/docs` (local) or `https://<function-app>.azurewebsites.net/api/docs` (Azure)
  - **Source Files:**
    - [`apps/backend/src/functions/apiDocs.ts`](../apps/backend/src/functions/apiDocs.ts) - API documentation endpoint
    - [`apps/backend/src/lib/openapi-registry.ts`](../apps/backend/src/lib/openapi-registry.ts) - OpenAPI schema registry
  - **Backend README:** [`apps/backend/README.md`](../apps/backend/README.md) - Backend architecture and API overview

- **API Design Standards** - See [ARCHITECTURE.md ADR-010](../ARCHITECTURE.md)
  - RESTful conventions
  - Request/response formats
  - Error handling
  - Versioning strategy

### 6. Library Documentation

**Component libraries and shared modules:**

- **Frontend Libraries**
  - [`libs/client/dashboard/README.md`](../libs/client/dashboard/README.md) - Dashboard components
  - [`libs/client/features/trading/README.md`](../libs/client/features/trading/README.md) - Trading features
  - [`libs/client/core/src/lib/signalr/README.md`](../libs/client/core/src/lib/signalr/README.md) - SignalR integration

- **Shared Libraries**
  - [`libs/shared/api-client/README.md`](../libs/shared/api-client/README.md) - API client utilities
  - [`libs/shared/auth-models/README.md`](../libs/shared/auth-models/README.md) - Authentication models
  - [`libs/shared/error-models/README.md`](../libs/shared/error-models/README.md) - Error handling models
  - [`libs/shared/finance-models/README.md`](../libs/shared/finance-models/README.md) - Financial data models

### 7. DevOps & CI/CD

**Continuous integration and deployment pipelines:**

- **[azure-pipelines.yml](../azure-pipelines.yml)** - Azure DevOps pipeline configuration
- **[.github/workflows/](../.github/workflows/)** - GitHub Actions workflows (if applicable)
- **[azure-devops.md](./azure-devops.md)** - Azure DevOps setup documentation

### 8. Testing Documentation

**End-to-end testing and quality assurance:**

- **[e2e/README.md](../e2e/README.md)** - E2E testing setup
  - Playwright configuration
  - Test scenarios
  - Running E2E tests

---

## 🔍 Documentation by User Journey

### Journey 1: New Developer Onboarding

**Goal:** Get AssetSim Pro running locally

1. Start: **[GETTING_STARTED.md](../GETTING_STARTED.md)** (Local Development Setup)
2. Clone repository and install dependencies
3. Start Docker services
4. Initialize database
5. Start development servers
6. Next: **[NX_WORKSPACE_GUIDE.md](./development/NX_WORKSPACE_GUIDE.md)** (Understand workspace)
7. Next: **[CONTRIBUTING.md](../CONTRIBUTING.md)** (Development workflow)

### Journey 2: Azure Deployment

**Goal:** Deploy AssetSim Pro to Azure

1. Start: **[GETTING_STARTED.md](../GETTING_STARTED.md)** (Azure Deployment Path)
2. **Phase 1 - Bootstrap:**
   - Option A (Automated): **[scripts/README.md](../scripts/README.md)** → Run bootstrap scripts
   - Option B (Manual): **[BOOTSTRAP_GUIDE.md](./deployment/BOOTSTRAP_GUIDE.md)** → Follow manual steps
3. **Phase 2 - Deploy Infrastructure:**
   - **[DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md)** → Terraform deployment
4. **Phase 3 - Verify:**
   - **[VERIFICATION.md](./architecture/VERIFICATION.md)** → Post-deployment checks
5. **Phase 4 - Security Review:**
   - **[ZERO_TRUST_IMPLEMENTATION.md](./architecture/ZERO_TRUST_IMPLEMENTATION.md)** → Security validation

### Journey 3: Understanding Architecture

**Goal:** Learn architectural decisions and design patterns

1. Start: **[ARCHITECTURE.md](../ARCHITECTURE.md)** (All ADRs)
2. Deep Dive:
   - **[BACKEND_FRONTEND_INTEGRATION.md](./architecture/BACKEND_FRONTEND_INTEGRATION.md)** - Integration patterns
   - **[ZERO_TRUST_IMPLEMENTATION.md](./architecture/ZERO_TRUST_IMPLEMENTATION.md)** - Security architecture
3. Related: **[README.md](../README.md)** (Workspace structure overview)

### Journey 4: Contributing Code

**Goal:** Submit a pull request

1. Start: **[CONTRIBUTING.md](../CONTRIBUTING.md)** (Development guidelines)
2. Setup: **[GETTING_STARTED.md](../GETTING_STARTED.md)** (Local development)
3. Testing: **[TESTING.md](./development/TESTING.md)** (Test requirements)
4. Review: **[ARCHITECTURE.md](../ARCHITECTURE.md)** (Relevant ADRs for your change)

### Journey 5: API Integration

**Goal:** Integrate with AssetSim Pro backend APIs

1. Start: **API Documentation** → `http://localhost:7071/api/docs` (OpenAPI/Swagger UI)
2. Source: **[apps/backend/README.md](../apps/backend/README.md)** (Backend overview)
3. Standards: **[ARCHITECTURE.md](../ARCHITECTURE.md)** (ADR-010: API Design, ADR-017: API Documentation)
4. Models: **[libs/shared/finance-models/README.md](../libs/shared/finance-models/README.md)** (Data structures)

---

## 📋 Maintenance & Quality

### Documentation Maintenance

This documentation hub and all related documentation follows the maintenance procedures defined in:

**[DOCUMENTATION_MAINTENANCE.md](./development/DOCUMENTATION_MAINTENANCE.md)**

Key maintenance practices:

- **Review Frequency:** Entry points monthly, procedures after changes, references quarterly
- **Version Control:** Semantic versioning for major procedural documents
- **Update Checklist:** Date updates, version bumps, link validation, cross-reference checks
- **Quality Checks:** Link verification, bidirectional references, no duplicate content

### Quality Control Checklist

Before committing documentation changes:

- [ ] All links work (no 404s)
- [ ] Cross-references are bidirectional where appropriate
- [ ] No duplicate information (use references instead)
- [ ] Dates are current
- [ ] Version numbers are updated
- [ ] Grammar and spelling checked
- [ ] Code examples are tested
- [ ] Consistent formatting (headings, lists, code blocks)

### Quarterly Review Checklist

Every quarter (next review: April 28, 2026):

- [ ] All entry points are accurate
- [ ] Dependencies listed are current
- [ ] Examples and commands still work
- [ ] External links are not broken
- [ ] Screenshots are current (if any)
- [ ] Version numbers make sense
- [ ] No obsolete information
- [ ] Automation status is accurate

---

## 🔗 Cross-Reference Index

### Bootstrap Documentation

- **Primary (Manual):** [BOOTSTRAP_GUIDE.md](./deployment/BOOTSTRAP_GUIDE.md) - ADR-012
- **Primary (Automation):** [scripts/README.md](../scripts/README.md) - ADR-013
- **Entry Point:** [GETTING_STARTED.md](../GETTING_STARTED.md) (Azure Deployment Path)
- **Architecture Decision:** [ARCHITECTURE.md](../ARCHITECTURE.md) (ADR-012, ADR-013)

### Deployment Documentation

- **Primary:** [DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md)
- **Prerequisites:** [BOOTSTRAP_GUIDE.md](./deployment/BOOTSTRAP_GUIDE.md) or [scripts/README.md](../scripts/README.md)
- **Verification:** [VERIFICATION.md](./architecture/VERIFICATION.md)
- **Entry Point:** [GETTING_STARTED.md](../GETTING_STARTED.md) (Step 2: Deploy Infrastructure)

### Architecture Documentation

- **Primary:** [ARCHITECTURE.md](../ARCHITECTURE.md) (All ADRs)
- **Integration:** [BACKEND_FRONTEND_INTEGRATION.md](./architecture/BACKEND_FRONTEND_INTEGRATION.md)
- **Security:** [ZERO_TRUST_IMPLEMENTATION.md](./architecture/ZERO_TRUST_IMPLEMENTATION.md)
- **Monitoring:** [OBSERVABILITY_ALERT_CONFIG.md](./architecture/OBSERVABILITY_ALERT_CONFIG.md)

### Development Documentation

- **Primary:** [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Workspace:** [NX_WORKSPACE_GUIDE.md](./development/NX_WORKSPACE_GUIDE.md)
- **Testing:** [TESTING.md](./development/TESTING.md)
- **Maintenance:** [DOCUMENTATION_MAINTENANCE.md](./development/DOCUMENTATION_MAINTENANCE.md)

---

## 📊 Documentation Statistics

- **Total Documentation Files:** 26 markdown files
- **Root-Level Entry Points:** 4 (README, GETTING_STARTED, ARCHITECTURE, CONTRIBUTING)
- **Architecture Docs:** 4 files in `docs/architecture/`
- **Deployment Docs:** 2 files in `docs/deployment/`
- **Development Docs:** 3 files in `docs/development/`
- **Library Docs:** 7 READMEs in `libs/`
- **Script Docs:** 1 in `scripts/`
- **App-Specific Docs:** 2 (backend, e2e)

---

## 🆘 Support & Contributions

### Getting Help

- **Setup Issues:** See [GETTING_STARTED.md - Common Issues](../GETTING_STARTED.md#common-issues)
- **Architecture Questions:** See [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Development Questions:** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **GitHub Issues:** [Create an issue](https://github.com/archubbuck/asset-sim-pro/issues)

### Contributing to Documentation

- **Guidelines:** See [DOCUMENTATION_MAINTENANCE.md](./development/DOCUMENTATION_MAINTENANCE.md)
- **Commit Standards:** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Review Process:** All documentation changes require review from at least 2 team members

---

## 📅 Documentation Version

**Last Updated:** January 28, 2026  
**Maintained By:** AssetSim Pro Documentation Team  
**Review Schedule:** Quarterly  
**Next Review:** April 28, 2026

---

**Navigation:** [Back to Project Root](../README.md) | [Getting Started](../GETTING_STARTED.md) | [Architecture](../ARCHITECTURE.md) | [Contributing](../CONTRIBUTING.md)
