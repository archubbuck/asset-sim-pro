# Documentation Maintenance Guide

**Version:** 2.0.0  
**Last Updated:** January 26, 2026  
**Maintained By:** AssetSim Pro Engineering Team

## Purpose

This guide helps maintainers keep AssetSim Pro documentation accurate, consistent, and up-to-date. It defines the documentation structure, ownership, and update procedures.

---

## Documentation Organization (v2.0 - Updated Jan 26, 2026)

As of January 26, 2026, the documentation has been reorganized into a `docs/` folder structure for better organization and discoverability:

### Root-Level Documents (Essential Entry Points)

These remain in the repository root for maximum visibility:

- **README.md** - Project overview and quick start
- **GETTING_STARTED.md** - Primary entry point for new developers
- **ARCHITECTURE.md** - Complete architectural decision records (ADRs)
- **CONTRIBUTING.md** - Development guidelines and git workflow

### `docs/` Folder Structure

Supporting documentation is organized into themed subdirectories:

- **`docs/deployment/`** - Infrastructure and deployment guides
  - BOOTSTRAP_GUIDE.md, DEPLOYMENT_GUIDE.md
- **`docs/architecture/`** - Architecture and integration documents
  - BACKEND_FRONTEND_INTEGRATION.md, ZERO_TRUST_IMPLEMENTATION.md, VERIFICATION.md, OBSERVABILITY_ALERT_CONFIG.md
- **`docs/development/`** - Development guides and maintenance
  - NX_WORKSPACE_GUIDE.md, TESTING.md, DOCUMENTATION_MAINTENANCE.md (this file)

### Benefits of New Structure

- ✅ **Cleaner root directory** - Only essential entry points at top level
- ✅ **Better organization** - Related documents grouped together
- ✅ **Easier navigation** - Clear folder names indicate content type
- ✅ **Scalability** - Easy to add new documentation without cluttering root

---

## Documentation Structure

### Document Categories

#### 1. Entry Points (Must be kept current)

- **[GETTING_STARTED.md](../../GETTING_STARTED.md)**: Primary entry point for all users
  - **Owner:** DevOps Team
  - **Review Frequency:** Monthly or after major changes
  - **Dependencies:** README.md, BOOTSTRAP_GUIDE.md, DEPLOYMENT_GUIDE.md

- **[README.md](../../README.md)**: Project overview and navigation
  - **Owner:** Project Lead
  - **Review Frequency:** Quarterly or after major milestones
  - **Dependencies:** All documentation files

#### 2. Primary Procedure Documents (Authoritative sources)

- **[BOOTSTRAP_GUIDE.md](../deployment/BOOTSTRAP_GUIDE.md)**: Manual bootstrap procedures
  - **Owner:** DevOps Team
  - **Review Frequency:** After Azure service changes or automation updates
  - **Version:** Semantic versioning (currently v2.0.0)
- **[scripts/README.md](../../scripts/README.md)**: Automation script documentation
  - **Owner:** DevOps Team
  - **Review Frequency:** After script changes
  - **Version:** Semantic versioning (currently v1.1.0)

- **[DEPLOYMENT_GUIDE.md](../deployment/DEPLOYMENT_GUIDE.md)**: Terraform deployment procedures
  - **Owner:** Infrastructure Team
  - **Review Frequency:** After infrastructure changes

#### 3. Reference Documents (Background information)

- **[ARCHITECTURE.md](../../ARCHITECTURE.md)**: All ADRs and technical decisions
  - **Owner:** Architecture Team
  - **Review Frequency:** After each ADR addition or update
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)**: Development guidelines
  - **Owner:** Development Team
  - **Review Frequency:** Quarterly

- **[TESTING.md](./TESTING.md)**: Testing strategy
  - **Owner:** QA Team
  - **Review Frequency:** After test framework changes

#### 4. Verification Documents (Implementation proofs)

- **docs/architecture/VERIFICATION.md**: Source control verification
  - **Owner:** DevOps Team
  - **Review Frequency:** After tooling changes

---

## Documentation Hierarchy

```
GETTING_STARTED.md (Entry Point) ← Always start here
├── Local Development Path
│   ├── README.md (Overview)
│   ├── docs/development/NX_WORKSPACE_GUIDE.md (Workspace)
│   ├── CONTRIBUTING.md (Guidelines)
│   └── docs/development/TESTING.md (Testing)
│
└── Azure Deployment Path
    ├── docs/deployment/BOOTSTRAP_GUIDE.md (Primary: Manual procedures) ← Authoritative
    │   └── scripts/README.md (Primary: Automation) ← Authoritative
    │
    ├── docs/deployment/DEPLOYMENT_GUIDE.md (Primary: Terraform)
    └── docs/architecture/VERIFICATION.md (Verification procedures)

Reference Layer (Supporting documentation - organized in docs/ folder)
├── ARCHITECTURE.md (ADRs - root level)
├── docs/architecture/
│   ├── BACKEND_FRONTEND_INTEGRATION.md
│   ├── ZERO_TRUST_IMPLEMENTATION.md
│   ├── VERIFICATION.md
│   └── OBSERVABILITY_ALERT_CONFIG.md
└── docs/development/
    ├── DOCUMENTATION_MAINTENANCE.md (this file)
    ├── NX_WORKSPACE_GUIDE.md
    └── TESTING.md
```

---

## Maintenance Procedures

### When to Update Documentation

#### After Code Changes

- **Function/API changes**: Update backend README and OpenAPI docs
- **Component changes**: Update frontend READMEs and component docs
- **Script changes**: Update scripts/README.md
- **Configuration changes**: Update relevant setup guides

#### After Infrastructure Changes

- **Azure service updates**: Update BOOTSTRAP_GUIDE.md, DEPLOYMENT_GUIDE.md
- **Terraform changes**: Update DEPLOYMENT_GUIDE.md
- **Network changes**: Update ZERO_TRUST_IMPLEMENTATION.md

#### After Process Changes

- **Git workflow updates**: Update CONTRIBUTING.md
- **CI/CD updates**: Update azure-pipelines.yml comments
- **Testing strategy changes**: Update TESTING.md

### How to Update Documentation

#### 1. Identify Affected Documents

Use the dependency map above to find all documents that need updates.

**Example:** If you update a bootstrap script:

1. Update `scripts/README.md` (primary)
2. Check if `BOOTSTRAP_GUIDE.md` needs updates (it references scripts)
3. Check if `GETTING_STARTED.md` needs updates (it references both)
4. Update `IMPLEMENTATION_ADR_013.md` if verification criteria changed

#### 2. Follow the Update Order

Always update in this order to maintain consistency:

1. **Primary documents** (authoritative sources)
2. **Entry points** (GETTING_STARTED.md, README.md)
3. **Verification documents** (IMPLEMENTATION*ADR*\*.md)
4. **Reference documents** (cross-references)

#### 3. Version Updates

Use semantic versioning for major documents:

- **Major (X.0.0)**: Breaking changes, major restructuring
- **Minor (x.Y.0)**: New sections, significant additions
- **Patch (x.y.Z)**: Corrections, clarifications, small updates

**Documents with versions:**

- BOOTSTRAP_GUIDE.md (currently v2.0.0)
- scripts/README.md (currently v1.1.0)
- IMPLEMENTATION_ADR_012.md (currently v2.0.0)
- IMPLEMENTATION_ADR_013.md (currently v2.0.0)

#### 4. Update Checklist

For each documentation update:

- [ ] Update "Last Updated" date in document header
- [ ] Update version number if applicable
- [ ] Check all internal cross-references are still valid
- [ ] Update dependent documents
- [ ] Run link checker (if available)
- [ ] Review for consistency with related docs
- [ ] Update DOCUMENTATION_MAINTENANCE.md if structure changed

---

## Consistency Guidelines

### Cross-References

**Always use relative links:**

```markdown
✅ Good: [BOOTSTRAP_GUIDE.md](../deployment/BOOTSTRAP_GUIDE.md)
❌ Bad: [BOOTSTRAP_GUIDE.md](/BOOTSTRAP_GUIDE.md)
❌ Bad: [BOOTSTRAP_GUIDE.md](https://github.com/archubbuck/asset-sim-pro/blob/main/BOOTSTRAP_GUIDE.md)
```

**Always provide context:**

```markdown
✅ Good: See [BOOTSTRAP_GUIDE.md Phase 2](../deployment/BOOTSTRAP_GUIDE.md#phase-2-entra-id-api-consent) for Entra ID setup
❌ Bad: See BOOTSTRAP_GUIDE.md
```

### Document Headers

All primary documents should have:

```markdown
# Document Title

**Status:** [Status]
**Version:** X.Y.Z (if versioned)
**Date:** January DD, 2026
**ADR Reference:** (if applicable)
```

### Related Documents Section

Add at the end of each document:

```markdown
---

**Last Updated:** January DD, 2026
**Version:** X.Y.Z (if applicable)
**Maintained By:** [Team Name]

**Related Documents:**

- [Document 1](./doc1.md) - Purpose
- [Document 2](./doc2.md) - Purpose
```

### Automation Markers

Use consistent markers in BOOTSTRAP_GUIDE.md:

- 🤖 **Automation Available:** For steps that can be automated
- ⚠️ **Manual Setup Required:** For steps without automation

---

## Common Maintenance Tasks

### Adding a New Script

1. Create the script in `/scripts/`
2. Update `scripts/README.md` with:
   - Script description
   - Prerequisites
   - Usage examples
   - Manual alternative reference
3. Update `BOOTSTRAP_GUIDE.md` with automation marker
4. Update `GETTING_STARTED.md` if it changes the quick path
5. Update `IMPLEMENTATION_ADR_013.md` verification

### Adding a New ADR

1. Add ADR to `ARCHITECTURE.md`
2. Create `IMPLEMENTATION_ADR_XXX.md` for verification
3. Update implementation guides as needed
4. Update relevant evaluation documents
5. Update `README.md` if it affects project status

### Deprecating a Document

**Never delete documentation.** Instead:

1. Add deprecation notice at top
2. Link to replacement document
3. Update all references to point to new document
4. Keep deprecated document for historical reference

**Example:**

```markdown
# Old Document (DEPRECATED)

⚠️ **DEPRECATED:** This document has been superseded by [NEW_DOCUMENT.md](./NEW_DOCUMENT.md).
Please refer to the new document for current information.

---

[Original content remains for reference]
```

---

## Quality Checks

### Before Committing Documentation Changes

- [ ] All links work (no 404s)
- [ ] Cross-references are bidirectional where appropriate
- [ ] No duplicate information (use references instead)
- [ ] Dates are current
- [ ] Version numbers are updated
- [ ] Grammar and spelling checked
- [ ] Code examples are tested
- [ ] Consistent formatting (headings, lists, code blocks)

### Quarterly Review Checklist

Every quarter, review:

- [ ] All entry points are accurate
- [ ] Dependencies listed are current
- [ ] Examples and commands still work
- [ ] External links are not broken
- [ ] Screenshots are current (if any)
- [ ] Version numbers make sense
- [ ] No obsolete information
- [ ] Automation status is accurate

---

## Documentation Debt

Track documentation that needs attention:

### Known Issues

- None currently

### Future Improvements

- Add architecture diagrams to DEPLOYMENT_GUIDE.md
- Create video walkthrough for bootstrap procedures
- Add interactive documentation with examples
- Create printable quick reference cards

---

## Tools and Automation

### Recommended Tools

**Link Checking:**

```bash
# Use markdown-link-check (install via npm)
npm install -g markdown-link-check
find . -name "*.md" -not -path "./node_modules/*" | xargs markdown-link-check
```

**Spelling:**

```bash
# Use cspell (install via npm)
npm install -g cspell
cspell "**/*.md"
```

**Formatting:**

```bash
# Use prettier (already in project)
npx prettier --write "**/*.md"
```

### Automated Checks (Future)

Consider adding to CI/CD:

- Link validation
- Spelling check
- Cross-reference validation
- Last updated date validation (warn if > 90 days)

---

## Contact and Escalation

### Documentation Questions

- Create an issue with label `documentation`
- Tag: @archubbuck or relevant team

### Major Documentation Changes

- Propose changes in a PR
- Request review from at least 2 team members
- Update DOCUMENTATION_MAINTENANCE.md if structure changes

---

## Version History

| Version | Date             | Changes                                                                          |
| ------- | ---------------- | -------------------------------------------------------------------------------- |
| 2.0.0   | January 26, 2026 | Reorganized documentation into docs/ folder structure with themed subdirectories |
| 1.0.0   | January 25, 2026 | Initial documentation maintenance guide                                          |

---

**Maintained By:** AssetSim Pro Documentation Team  
**Review Schedule:** Quarterly  
**Next Review:** April 25, 2026
