# Contributing to AssetSim Pro

Thank you for your interest in contributing to AssetSim Pro! This document outlines our source control governance, git workflows, and development practices based on ADR-001 from our Architecture documentation.

## Table of Contents

- [Source Control Governance](#source-control-governance)
- [Commit Message Format](#commit-message-format)
- [Branching Strategy](#branching-strategy)
- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Pull Request Process](#pull-request-process)

## Source Control Governance

AssetSim Pro follows **ADR-001: Source Control Governance** to maintain a clean history, automate versioning, and ensure code quality. Our governance model consists of:

1. **Conventional Commits** for standardized commit messages
2. **Scaled Trunk-Based Development** for branching strategy
3. **Automated enforcement** via commitlint and Husky hooks

## Commit Message Format

All commit messages **MUST** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Structure

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Type

The type must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope

The scope is optional but recommended. It should be a noun describing a section of the codebase, enclosed in parentheses. Examples:

- `backend`
- `frontend`
- `api`
- `database`
- `auth`
- `trading`
- `portfolio`

### Description

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No period (.) at the end
- Maximum 100 characters for the entire header line

### Examples

#### Good Commit Messages ✅

```
feat(backend): implement multi-tenant ticker generator
fix(trading): correct order execution price calculation
docs(api): add OpenAPI schema for portfolio endpoints
refactor(auth): simplify JWT token validation logic
perf(database): add indexes to improve query performance
test(portfolio): add unit tests for position calculator
build(deps): upgrade Angular to v21.2
ci(pipeline): add code coverage reporting
chore(config): update TypeScript configuration
```

#### Bad Commit Messages ❌

```
update code                    # Missing type and unclear description
Fixed bug                      # Wrong tense and missing type
feat: Adding new feature.      # Has period at end, wrong tense
FEAT(backend): new api         # Type should be lowercase
feature(api): add endpoint     # Wrong type (should be "feat")
```

### Enforcement

Commit messages are automatically validated using **commitlint** in a Husky `commit-msg` hook. Invalid commit messages will be rejected before they are created.

## Branching Strategy

AssetSim Pro uses **Scaled Trunk-Based Development** to ensure rapid integration and deployment.

### Branch Structure

```
main (protected)
├── feat/add-crypto-support
├── fix/order-execution-bug
├── docs/update-api-guide
└── refactor/simplify-auth-flow
```

### Main Branch

- **Name**: `main`
- **Status**: Protected, always deployable
- **Rules**:
  - All commits must pass CI/CD pipeline
  - Direct pushes are **NOT** allowed
  - Requires pull request with review approval
  - Must be up-to-date before merging

### Feature Branches

Feature branches are **short-lived** branches created from `main` for specific work items.

#### Naming Convention

```
<type>/<brief-description>
```

**Examples:**

- `feat/add-crypto-ticker`
- `fix/portfolio-calculation-error`
- `docs/contributing-guide`
- `refactor/database-queries`
- `perf/optimize-signalr-broadcast`

#### Best Practices

1. **Keep branches short-lived**: Merge within 1-3 days
2. **One feature per branch**: Focus on a single, well-defined change
3. **Sync frequently**: Rebase from `main` regularly to avoid conflicts
4. **Delete after merge**: Clean up merged branches promptly

## Development Workflow

### 1. Create a Feature Branch

```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create and checkout a new feature branch
git checkout -b feat/your-feature-name
```

### 2. Make Changes and Commit

```bash
# Stage your changes
git add .

# Commit with a conventional commit message
git commit -m "feat(scope): add your feature description"
```

**Note**: The commit-msg hook will automatically validate your message format.

### 3. Keep Your Branch Updated

```bash
# Fetch latest changes from main
git fetch origin main

# Rebase your branch onto main
git rebase origin/main

# If conflicts occur, resolve them and continue
git rebase --continue
```

### 4. Push Your Branch

```bash
# Push your feature branch to the remote repository
git push origin feat/your-feature-name

# If you rebased, you may need to force push (use with caution)
git push --force-with-lease origin feat/your-feature-name
```

### 5. Create a Pull Request

1. Navigate to the repository on GitHub
2. Click "New Pull Request"
3. Select your feature branch as the source
4. Provide a clear title and description
5. Request reviews from team members
6. Ensure all CI checks pass

### 6. Merge Strategy

AssetSim Pro uses **Squash and Merge** to keep the main branch history clean.

#### Benefits:

- Creates a single commit on `main` per feature
- Eliminates "WIP" and "fix typo" commits from history
- Makes it easier to revert entire features if needed
- Maintains linear history

#### Process:

1. All commits in the PR are squashed into one
2. The squashed commit message should follow Conventional Commits format
3. The PR description becomes the commit body (optional)

## Code Quality Standards

### Pre-merge Checklist

Before creating a pull request, ensure:

- [ ] All commits follow Conventional Commits format
- [ ] Code builds successfully
- [ ] All tests pass
- [ ] Code is linted and formatted
- [ ] No security vulnerabilities introduced
- [ ] Documentation is updated (if applicable)
- [ ] Branch is up-to-date with `main`

### Automated Checks

All pull requests must pass:

1. **Commitlint validation**: Ensures all commit messages are valid
2. **Build verification**: Code compiles without errors
3. **Unit tests**: All tests pass with 80% code coverage minimum
4. **E2E tests**: Critical user journeys work as expected
5. **Security scanning**: No new vulnerabilities detected

## Pull Request Process

### Creating a Pull Request

1. **Title**: Use Conventional Commit format
   - Example: `feat(trading): implement limit order functionality`

2. **Description**: Include:
   - What changes were made and why
   - Link to related issues or tickets
   - Screenshots (for UI changes)
   - Testing notes
   - Any breaking changes

3. **Labels**: Add appropriate labels
   - `feature`, `bugfix`, `documentation`, `refactor`, etc.
   - Priority: `priority:high`, `priority:medium`, `priority:low`

### Review Process

1. **Request Reviews**: Assign 1-2 reviewers
2. **Address Feedback**: Make requested changes in new commits
3. **CI Validation**: Ensure all checks pass
4. **Approval Required**: At least 1 approval needed

### Merging

Once approved and all checks pass:

1. Use **Squash and Merge** button on GitHub
2. Edit the final commit message to ensure it follows Conventional Commits
3. Delete the feature branch after merging

## Local Development Setup

### Install Dependencies

```bash
npm install
```

This will automatically run the `prepare` script to set up Husky hooks.

### Verify Commitlint Setup

Test that commitlint is working:

```bash
# This should fail
echo "bad commit message" | npx commitlint

# This should pass
echo "feat(test): add new feature" | npx commitlint
```

### Testing Commit Hook

Try making a commit with an invalid message:

```bash
git commit -m "invalid message"
# Should be rejected by commitlint
```

Try making a commit with a valid message:

```bash
git commit -m "feat(docs): update contributing guide"
# Should be accepted
```

## Getting Help

If you have questions or need assistance:

1. Check the [ARCHITECTURE.md](./ARCHITECTURE.md) for architectural decisions
2. Review existing pull requests for examples
3. Consult the [GitHub Copilot custom instructions](./.github/copilot-instructions.md) for coding guidance
4. Reach out to the team via your communication channel

## AI-Assisted Development (ADR-006)

AssetSim Pro uses **GitHub Copilot Enterprise** with custom instructions to maintain consistent code quality and architectural standards.

### GitHub Copilot Setup

1. **Install GitHub Copilot** extension in your IDE (VS Code, JetBrains, etc.)
2. **Sign in** with your GitHub account that has Copilot access
3. **Custom instructions** are automatically loaded from `.github/copilot-instructions.md`

### Custom Instructions Overview

Repository-wide custom instructions guide Copilot to generate code that follows AssetSim Pro standards:

#### **Mandatory Requirements**

1. **Kendo Financial Charts**
   - Use Kendo UI for Angular components for all visualizations
   - Never use Chart.js, D3.js, or other charting libraries
   - Preferred components: `ChartComponent`, `StockChartComponent`, `SparklineComponent`
   - Use `candlestick` series for OHLC data, `line` for trends, `column` for volume

2. **Decimal.js for Financial Precision**
   - All monetary calculations must use `Decimal` from `decimal.js`
   - Never use native JavaScript number arithmetic for money
   - Apply to: portfolio valuations, order pricing, commissions, P&L calculations
   - Example: `new Decimal(price).times(quantity)` instead of `price * quantity`

3. **RxJS Throttling**
   - Always throttle real-time data streams
   - Market data: `throttleTime(250)` (typical; keep within 100–500ms based on feed characteristics)
   - User inputs: `debounceTime(300)`
   - Chart updates: `throttleTime(500)`
   - Never subscribe directly to SignalR streams without throttling

#### **Additional Standards**

- **Angular Signals**: Signals-first approach for state management
- **Logging**: Use `LoggerService` instead of `console.log()`
- **Validation**: Zod schemas for all API inputs
- **Security**: Zero Trust principles, no hard-coded credentials

### Using Copilot Effectively

#### **When Writing Code**

Copilot suggestions will automatically follow custom instructions:

```typescript
// ✅ Copilot will suggest this pattern:
const totalValue = new Decimal(price).times(quantity);

// ❌ Copilot will avoid suggesting this:
const totalValue = price * quantity;
```

#### **Code Review Considerations**

Even with Copilot:
- Always review generated code for correctness
- Verify financial calculations use Decimal.js
- Ensure RxJS operators are properly applied
- Confirm Kendo UI components are used for charts
- Run tests before committing

#### **Chat and Questions**

When asking Copilot questions:
- Copilot has context from `.github/copilot-instructions.md`
- Reference ADRs by number (e.g., "How does ADR-002 affect this?")
- Ask about specific patterns (e.g., "Show me the correct way to calculate commissions")

### Example Workflows

#### Creating a Trading Component

Ask Copilot: *"Create an order entry component with price chart"*

Copilot will generate code using:
- Kendo Chart for price visualization
- Decimal.js for order calculations
- RxJS throttling for price updates
- Angular Signals for state

#### Implementing Portfolio Calculations

Ask Copilot: *"Calculate portfolio value with positions and cash"*

Copilot will suggest:
- Decimal.js for all arithmetic
- Proper precision handling
- Error handling for edge cases

### Troubleshooting

**Copilot not following custom instructions?**
- Ensure `.github/copilot-instructions.md` is on the main branch
- Restart your IDE to reload instructions
- Check that Copilot extension is up to date

**Need to override instructions?**
- Add explicit comments in your code
- Example: `// Note: Using native math here for performance in tight loop`

For complete details, see [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).

## Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Trunk-Based Development](https://trunkbaseddevelopment.com/)
- [commitlint Documentation](https://commitlint.js.org/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [GitHub Copilot Custom Instructions](./.github/copilot-instructions.md)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)

---

Thank you for contributing to AssetSim Pro! Your adherence to these guidelines helps maintain code quality and project velocity.
