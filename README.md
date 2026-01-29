# AssetSim Pro

**Professional Asset Management Simulator**

Enterprise-grade simulation platform designed for **Asset Management Firms**, **Hedge Funds**, and **Proprietary Trading Desks**.

## Overview

AssetSim Pro serves as a high-fidelity **Simulation Sandbox** where Associates and Portfolio Managers can train on execution strategies, risk management, and portfolio construction in a controlled environment. Organizations run private **"Exchanges"** (Simulation Venues), allowing Risk Managers to configure specific market regimes (e.g., "High Volatility," "Liquidity Crisis") to test their team's performance under pressure.

## 🚀 Quick Start

**New to AssetSim Pro?** Start with **[GETTING_STARTED.md](./GETTING_STARTED.md)** for a streamlined setup guide that covers:

- Local development setup (Docker + npm)
- Azure deployment path (Bootstrap → Deploy → Verify)
- Common troubleshooting and next steps

This guide provides the fastest path from clone to running application.

## 🏗️ Workspace Structure (ADR-004)

AssetSim Pro uses an **Nx monorepo** with Angular 21+ and Kendo UI:

```
asset-sim-pro/
├── apps/
│   ├── client/          # Institutional Trading Portal (Angular + Kendo UI)
│   └── backend/         # Azure Function App (API & Market Engine)
├── libs/
│   ├── shared/
│   │   └── finance-models/    # Shared TypeScript types
│   └── client/
│       └── features/
│           └── trading/       # Trading execution logic
```

**Quick Start:**

```bash
npm install           # Install dependencies
npm start            # Start Angular dev server
npm run build:prod   # Build for production
```

See **[NX_WORKSPACE_GUIDE.md](./docs/development/NX_WORKSPACE_GUIDE.md)** for detailed workspace documentation.

## Documentation

### 📚 Documentation Hub

For comprehensive documentation navigation and complete index, visit:

**[Documentation Hub (`docs/README.md`)](./docs/README.md)** - Central index for all documentation

### Getting Started

- **[GETTING_STARTED.md](./GETTING_STARTED.md)**: 🚀 **Start here!** Quick setup guide for local dev and Azure deployment

### Project Status

- All phases 1-5 complete and verified ✅

### Architecture & Development

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Complete architectural decisions and technical specifications
- **[NX_WORKSPACE_GUIDE.md](./docs/development/NX_WORKSPACE_GUIDE.md)**: Nx workspace structure and development workflow
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Development guidelines, git workflows, and contribution process
- **[TESTING.md](./docs/development/TESTING.md)**: Testing strategy and quality gates (92.59% coverage)

### Infrastructure & Security

- **[BOOTSTRAP_GUIDE.md](./docs/deployment/BOOTSTRAP_GUIDE.md)**: Manual bootstrap procedures (Terraform state, Entra ID, DevOps) - ADR-012
- **[scripts/README.md](./scripts/README.md)**: Automated bootstrap scripts for Phases 1-2 - ADR-013
- **[DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md)**: Terraform deployment and application configuration
- **[VERIFICATION.md](./docs/architecture/VERIFICATION.md)**: Post-deployment verification and testing
- **[ZERO_TRUST_IMPLEMENTATION.md](./docs/architecture/ZERO_TRUST_IMPLEMENTATION.md)**: Zero Trust architecture implementation details

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Git
- Docker and Docker Compose (for local development)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/archubbuck/asset-sim-pro.git
   cd asset-sim-pro
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

   This will automatically set up Husky git hooks for commit message validation.

### Local Development Environment (ADR-003)

AssetSim Pro follows a **Zero Trust** architecture that prevents developers from connecting directly to Azure cloud resources during development. Instead, all services are emulated locally using Docker Compose.

#### Starting Local Services

1. Start all required services (SQL Server, Redis, Azurite, SignalR):

   ```bash
   docker compose up -d
   ```

2. Verify services are running:

   ```bash
   docker compose ps
   ```

3. Initialize the database with the schema:

   ```bash
   npm run db:init
   ```

4. Seed the database with demo data (ADR-024):

   ```bash
   npm run seed:local
   ```

   This will populate:
   - Demo Exchange with default configuration
   - 20 sample instruments (AAPL, MSFT, GOOGL, etc.)
   - 54,600 historical market data ticks (7 days of 1-minute OHLC data)
   - Demo portfolio with $10M starting cash
   - Redis cache with exchange config and latest quotes

   The seeding script is idempotent and can be run multiple times safely.

5. Check service health:
   ```bash
   docker compose logs
   ```

#### Local Services Configuration

The following services will be available:

- **SQL Server 2022**: `localhost:1433`
  - Username: `sa`
  - Password: `LocalDevPassword123!`
  - Database: `AssetSimPro` (created by `npm run db:init`)

- **Redis**: `localhost:6379`

- **Azurite (Azure Storage Emulator)**:
  - Blob Service: `localhost:10000`
  - Queue Service: `localhost:10001`
  - Table Service: `localhost:10002`

- **SignalR Emulator**: `localhost:8888`
  - Note: Uses community Docker image (klabbet/signalr-emulator) as Microsoft does not publish an official SignalR emulator to Docker Hub. The emulator is distributed as a .NET global tool.

#### Environment Configuration

Connection strings are configured in a `.env.local` file at the repository root, which should point to the local Docker services listed above. This file is automatically excluded from version control and **will not exist in a fresh clone**.

To create your local environment configuration:

1. In the project root (`asset-sim-pro`), create a new file named `.env.local` if it does not already exist.
2. Add the connection strings and settings required by the application, pointing them to the local Docker endpoints. Use `.env.local.example` as a template:
   ```bash
   cp .env.local.example .env.local
   ```
3. Review and adjust the connection strings as needed for your local setup.
4. Save the file. The application will read these values from `.env.local` when running locally.

#### Stopping Services

```bash
# Stop services but keep data
docker compose stop

# Stop and remove containers (keeps volumes)
docker compose down

# Stop and remove everything including data volumes
docker compose down -v
```

#### Backend Development

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install backend dependencies:

   ```bash
   npm install
   ```

3. Create your local settings file:

   ```bash
   cp local.settings.json.example local.settings.json
   ```

4. Start the Azure Functions runtime:
   ```bash
   npm start
   ```

The Azure Functions backend reads its configuration from `backend/local.settings.json`. Use the provided `local.settings.json.example` template which includes all required connection strings pointing to the local Docker services.

### Source Control Governance

This project enforces strict source control governance (ADR-001):

- **Commit Message Format**: [Conventional Commits](https://www.conventionalcommits.org/) enforced via commitlint
- **Branching Strategy**: Scaled Trunk-Based Development with `main` as the protected branch
- **Merge Strategy**: Squash and Merge for clean history

All commits are automatically validated. Invalid commit messages will be rejected.

**Example of valid commit:**

```bash
git commit -m "feat(backend): implement multi-tenant ticker generator"
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for complete workflow documentation.

## Project Structure

```
asset-sim-pro/
├── .husky/              # Git hooks configuration
├── ARCHITECTURE.md      # Technical architecture and ADRs
├── CONTRIBUTING.md      # Development guidelines
├── README.md           # This file
├── package.json        # Project dependencies and scripts
└── .commitlintrc.json  # Commit message validation rules
```

## Development Workflow

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make changes** and commit using Conventional Commits format:

   ```bash
   git commit -m "feat(scope): description of changes"
   ```

3. **Push and create a Pull Request**:

   ```bash
   git push origin feat/your-feature-name
   ```

4. **Squash and Merge** after approval

## Architecture Highlights

Based on the architectural definitions in ARCHITECTURE.md:

### Phase 1: Governance & Foundations

- **ADR-001**: Source Control Governance (Conventional Commits, Trunk-Based Development) ✅ Implemented
- **ADR-002**: Zero Trust Network Architecture ✅ Implemented
- **ADR-003**: Docker Compose for Local Development ✅ Implemented
- **ADR-004**: Nx Workspace with Angular 21+ and Kendo UI
- **ADR-005**: Vitest for Unit Testing, Playwright for E2E
- **ADR-006**: GitHub Copilot Enterprise for AI-Assisted Development ✅ Implemented

### Phase 2: Core Architecture

- Azure Static Web Apps for frontend
- Azure Function App (Premium Plan) for backend
- Azure SQL Database with Row-Level Security
- Azure Cache for Redis
- Azure SignalR Service with MessagePack

### Phase 3: Infrastructure

- Terraform for Infrastructure as Code
- Private Endpoints for all data services
- VNet integration for secure communication

## Key Features (Planned)

- Multi-tenant simulation venues (Exchanges)
- Real-time market data streaming via SignalR
- Advanced order types (Market, Limit, Stop)
- Portfolio management and risk analytics
- Configurable market regimes (volatility, liquidity)
- Role-based access control (RiskManager, PortfolioManager, Analyst)

## Technology Stack

### Frontend

- Angular 21+ (Signals-first, Zoneless-ready)
- Kendo UI for Angular
- TypeScript
- Nx Build System

### Backend

- Azure Functions (Node.js 20)
- TypeScript
- Zod for validation

### Infrastructure

- Azure Static Web Apps
- Azure Function App (Premium)
- Azure SQL Database
- Azure Cache for Redis
- Azure SignalR Service
- Azure Event Hubs

## AI-Assisted Development (ADR-006)

AssetSim Pro uses **GitHub Copilot Enterprise** with custom instructions to accelerate development while maintaining architectural standards.

### Custom Instructions

Custom coding guidance is configured in [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) and automatically applies to all Copilot suggestions in supported IDEs and GitHub.com.

**Key Focus Areas:**

- **Kendo Financial Charts**: Mandatory for all data visualizations and charting
- **Decimal.js**: Required for all financial calculations to ensure precision
- **RxJS Throttling**: Enforced for real-time data streams to prevent UI performance issues

### Using GitHub Copilot

1. **IDE Setup**: Ensure GitHub Copilot extension is installed in VS Code or your preferred IDE
2. **Repository Context**: Copilot automatically reads `.github/copilot-instructions.md` from the repository
3. **Consistent Suggestions**: All code suggestions will follow AssetSim Pro's architectural standards
4. **Code Reviews**: Copilot-generated code still requires peer review before merge

For complete AI-assisted development guidelines, see the [custom instructions file](./.github/copilot-instructions.md).

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

All contributions must follow:

- Conventional Commits specification
- Trunk-Based Development workflow
- Code quality standards (80% test coverage)
- AI-assisted development guidelines (ADR-006)

## License

ISC License

---

For detailed architectural decisions and implementation specifications, see [ARCHITECTURE.md](./ARCHITECTURE.md).
