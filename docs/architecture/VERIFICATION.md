# Verification Guide: Source Control Governance

This document provides verification steps to ensure the source control governance implementation is working correctly.

## Prerequisites

Before running verification steps:
- **Local Development**: See [GETTING_STARTED.md](../../GETTING_STARTED.md) for setup
- **Azure Deployment**: Complete [BOOTSTRAP_GUIDE.md](../deployment/BOOTSTRAP_GUIDE.md) first

## Related Documentation
- **[GETTING_STARTED.md](../../GETTING_STARTED.md)**: Initial setup guide
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)**: Development guidelines and git workflow
- **[ARCHITECTURE.md](../../ARCHITECTURE.md)**: See ADR-001 for governance specifications

---

## Quick Verification Checklist

### ✅ 1. Package Installation
```bash
# Verify required packages are installed
npm list @commitlint/cli @commitlint/config-conventional husky
```

Expected output should show all three packages with their versions.

### ✅ 2. Husky Hooks Setup
```bash
# Check that Husky hooks directory exists
ls -la .husky/

# Verify commit-msg hook exists and is executable
test -x .husky/commit-msg && echo "✓ commit-msg hook is executable" || echo "✗ commit-msg hook not executable"

# Verify pre-commit hook exists
test -f .husky/pre-commit && echo "✓ pre-commit hook exists" || echo "✗ pre-commit hook missing"
```

### ✅ 3. Commitlint Configuration
```bash
# Verify commitlint config exists
test -f .commitlintrc.json && echo "✓ commitlint config exists" || echo "✗ commitlint config missing"

# Test valid commit message
echo "feat(test): add new feature" | npx commitlint
# Should succeed with no output

# Test invalid commit message
echo "bad commit message" | npx commitlint
# Should fail with error messages
```

### ✅ 4. Test Commit Hook Integration

#### Test with Invalid Commit Message
```bash
# Create a test file
echo "test" > test-verification.txt
git add test-verification.txt

# Try to commit with invalid message (should be rejected)
git commit -m "this is not a valid message"

# Expected: Commit should be rejected by commitlint
# Clean up
git reset HEAD test-verification.txt
rm test-verification.txt
```

#### Test with Valid Commit Message
```bash
# Create a test file
echo "test" > test-verification.txt
git add test-verification.txt

# Commit with valid Conventional Commits message
git commit -m "test(verification): verify commit hook functionality"

# Expected: Commit should succeed
# Clean up
git reset --soft HEAD~1
git reset HEAD test-verification.txt
rm test-verification.txt
```

## Detailed Verification

### Verify Conventional Commits Types
Test each valid commit type:

```bash
# Valid types that should pass
echo "feat(scope): description" | npx commitlint
echo "fix(scope): description" | npx commitlint
echo "docs(scope): description" | npx commitlint
echo "style(scope): description" | npx commitlint
echo "refactor(scope): description" | npx commitlint
echo "perf(scope): description" | npx commitlint
echo "test(scope): description" | npx commitlint
echo "build(scope): description" | npx commitlint
echo "ci(scope): description" | npx commitlint
echo "chore(scope): description" | npx commitlint
echo "revert(scope): description" | npx commitlint
```

### Verify Commit Message Rules

#### Rule: Type must be lowercase
```bash
# Should fail
echo "FEAT(scope): description" | npx commitlint
echo "Feat(scope): description" | npx commitlint

# Should pass
echo "feat(scope): description" | npx commitlint
```

#### Rule: Scope must be lowercase
```bash
# Should fail
echo "feat(SCOPE): description" | npx commitlint

# Should pass
echo "feat(scope): description" | npx commitlint
```

#### Rule: No period at end of header
```bash
# Should fail
echo "feat(scope): description." | npx commitlint

# Should pass
echo "feat(scope): description" | npx commitlint
```

#### Rule: Header max length 100 characters
```bash
# Should fail (101+ characters)
echo "feat(scope): this is a very long description that exceeds the maximum allowed length of one hundred characters" | npx commitlint

# Should pass (≤100 characters)
echo "feat(scope): this is a valid length description" | npx commitlint
```

## Verification of Documentation

### ✅ 5. Documentation Files
```bash
# Verify all required documentation exists
test -f README.md && echo "✓ README.md exists" || echo "✗ README.md missing"
test -f CONTRIBUTING.md && echo "✓ CONTRIBUTING.md exists" || echo "✗ CONTRIBUTING.md missing"
test -f ARCHITECTURE.md && echo "✓ ARCHITECTURE.md exists" || echo "✗ ARCHITECTURE.md missing"
```

### ✅ 6. .gitignore Configuration
```bash
# Verify .gitignore includes Node.js artifacts
grep -q "node_modules" .gitignore && echo "✓ .gitignore includes node_modules" || echo "✗ Missing node_modules in .gitignore"
grep -q "*.log" .gitignore && echo "✓ .gitignore includes log files" || echo "✗ Missing log files in .gitignore"
```

## Integration Test: Full Workflow

### Scenario: Create a Valid Feature Branch Commit

1. **Create feature branch:**
   ```bash
   git checkout -b feat/test-governance
   ```

2. **Make a change:**
   ```bash
   echo "# Test" > test-file.md
   git add test-file.md
   ```

3. **Commit with valid message:**
   ```bash
   git commit -m "feat(test): add test file for governance verification"
   ```
   
   Expected: Commit succeeds ✓

4. **Try invalid message:**
   ```bash
   echo "# Test 2" >> test-file.md
   git add test-file.md
   git commit -m "Added something"
   ```
   
   Expected: Commit fails with commitlint error ✓

5. **Clean up:**
   ```bash
   git checkout main
   git branch -D feat/test-governance
   ```

## Troubleshooting

### Issue: Hooks not running
**Solution:** Reinstall Husky hooks
```bash
npm run prepare
```

### Issue: commitlint not found
**Solution:** Reinstall dependencies
```bash
npm install
```

### Issue: Permission denied on hooks
**Solution:** Make hooks executable
```bash
chmod +x .husky/commit-msg
chmod +x .husky/pre-commit
```

## Success Criteria

All verifications should pass with:
- ✅ commitlint installed and configured
- ✅ Husky hooks executable and running
- ✅ Invalid commits rejected automatically
- ✅ Valid commits accepted
- ✅ Documentation complete and accurate
- ✅ No security vulnerabilities in dependencies

## References

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [commitlint Documentation](https://commitlint.js.org/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Development workflow
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - See ADR-001 for governance requirements
- [GETTING_STARTED.md](../../GETTING_STARTED.md) - Setup guide

---

**Last Updated:** January 25, 2026  
**Version:** 2.0  
**Maintained By:** AssetSim Pro Engineering Team
