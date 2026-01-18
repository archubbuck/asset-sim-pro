# AssetSim Pro

**Professional Asset Management Simulator**

Enterprise-grade simulation platform designed for **Asset Management Firms**, **Hedge Funds**, and **Proprietary Trading Desks**.

## Overview

AssetSim Pro serves as a high-fidelity **Simulation Sandbox** where Associates and Portfolio Managers can train on execution strategies, risk management, and portfolio construction in a controlled environment. Organizations run private **"Exchanges"** (Simulation Venues), allowing Risk Managers to configure specific market regimes (e.g., "High Volatility," "Liquidity Crisis") to test their team's performance under pressure.

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Complete architectural decisions and technical specifications
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Development guidelines, git workflows, and contribution process

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Git

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
- **ADR-001**: Source Control Governance (Conventional Commits, Trunk-Based Development)
- **ADR-002**: Zero Trust Network Architecture
- **ADR-003**: Docker Compose for Local Development
- **ADR-004**: Nx Workspace with Angular 21+ and Kendo UI
- **ADR-005**: Vitest for Unit Testing, Playwright for E2E
- **ADR-006**: GitHub Copilot Enterprise for AI-Assisted Development

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

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

All contributions must follow:
- Conventional Commits specification
- Trunk-Based Development workflow
- Code quality standards (80% test coverage)

## License

ISC License

## Status

**Status**: Approved  
**Version**: 7.1.0 (Final Release)  
**Date**: January 17, 2026  
**Architect**: Senior Architect

---

For detailed architectural decisions and implementation specifications, see [ARCHITECTURE.md](./ARCHITECTURE.md).
