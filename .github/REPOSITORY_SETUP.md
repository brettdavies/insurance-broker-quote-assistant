# Repository Setup Guide

This guide documents the manual GitHub repository settings that need to be configured by repository administrators.

## Overview

Since we're on a **free GitHub account**, we cannot enforce merge strategies through Branch Protection Rules or Rulesets. However, we can configure repository defaults and rely on team discipline and code review.

## Branch Configuration

### Default Branch

✅ **Already configured**: `main` is the default branch

- New clones check out `main` by default
- Feature PRs target `dev`, the integration branch

### Branch Protection (via GitHub Actions)

✅ **Already configured**: GitHub Actions protect both branches

- `.github/workflows/protect-main.yml` - Blocks direct commits to `main`
- `.github/workflows/protect-dev.yml` - Blocks direct commits to `dev`
- `.github/workflows/ci.yml` - Runs tests on both branches

## Merge Button Settings

✅ **Already configured** under **Settings → General → Pull Requests**:

```
Pull Requests Section:

☐ Allow merge commits

☑ Allow squash merging
  Default commit message: Pull request title and description

☐ Allow rebase merging
```

### Why These Settings?

1. **Squash only**: every PR, into `dev` or `main`, lands as one commit
2. **PR title and description as the commit message**: the squash commit
   carries the PR's summary
3. **No merge commits or rebase merges**: there is no strategy to choose per
   PR, so nothing relies on contributors picking the right button

## What We Cannot Do on Free Tier

### Features Requiring GitHub Pro/Team ($4/user/month)

❌ **Enforce specific merge strategies** per branch
❌ **Require PR approvals** (can require PRs, but not reviews)
❌ **Code owners** automatic review assignment
❌ **Branch protection rules** for private repositories
❌ **Required status checks** with specific checks
❌ **Restrict who can push** to protected branches (via settings)

### What We Use Instead

✅ **GitHub Actions** for branch protection (free)
✅ **Clear documentation** in CONTRIBUTING.md
✅ **PR template** to remind contributors
✅ **Team discipline** and code review
✅ **Repository defaults** to encourage correct behavior

## CI/CD Configuration

### GitHub Actions

✅ **Already configured**: All workflows are set up

**Active Workflows**:

1. `ci.yml` - Runs on push/PR to `main` and `dev`
   - Type checking
   - Linting
   - Unit and integration tests

2. `protect-main.yml` - Runs on push to `main`
   - Blocks direct commits
   - Validates PR merges

3. `protect-dev.yml` - Runs on push to `dev`
   - Blocks direct commits
   - Validates PR merges

### Required Status Checks

Since we're on free tier and cannot enforce status checks, we rely on:

- CI workflow must pass before merge (contributor discipline)
- Green checkmark visibility on PRs
- Auto-merge can be configured to require checks

## Git Flow Workflow Summary

### Development Flow

```
┌─────────────┐
│  feature/*  │
│   fix/*     │  ← Create feature branches
│ refactor/*  │
└──────┬──────┘
       │
       │ PR with "Squash and merge"
       ↓
┌─────────────┐
│     dev     │  ← Integration branch
└──────┬──────┘
       │
       │ PR with "Squash and merge"
       ↓
┌─────────────┐
│    main     │  ← Production, default branch
└─────────────┘
```

### Merge Strategy Summary

| Source Branch | Target Branch | Merge Strategy   | Why                                              |
| ------------- | ------------- | ---------------- | ------------------------------------------------ |
| `feature/*`   | `dev`         | **Squash merge** | One commit per feature, described by its PR      |
| `fix/*`       | `dev`         | **Squash merge** | One commit per fix, described by its PR          |
| `refactor/*`  | `dev`         | **Squash merge** | One commit per refactor, described by its PR     |
| `dev`         | `main`        | **Squash merge** | Clean production history, one commit per release |

## Repository Settings Checklist

Use this checklist when setting up the repository:

### General Settings

- [x] Default branch set to `main`
- [x] Merge button settings configured (squash only, see above)
- [ ] Add repository description
- [ ] Add repository topics/tags
- [ ] Configure social preview image (optional)

### Branch Protection (Manual)

Since we're on free tier:

- [x] GitHub Actions workflows created for branch protection
- [ ] Educate team on merge strategies
- [ ] Review CONTRIBUTING.md with all contributors

### Collaboration Settings

- [ ] Configure outside collaborators (if any)
- [ ] Set up team permissions (if using GitHub Team/Org)
- [ ] Configure issue templates (optional)
- [ ] Configure discussion categories (optional)

### Security Settings

- [ ] Enable Dependabot alerts
- [ ] Enable Dependabot security updates
- [ ] Configure secret scanning (private repos require Advanced Security)
- [ ] Review security policy

### Code & Automation

- [x] GitHub Actions enabled
- [x] CI/CD workflows configured
- [ ] Configure deployment environments (when ready)
- [ ] Set up secrets for CI/CD (when needed)

## Upgrading to GitHub Pro/Team

If you decide to upgrade for better control:

### Benefits of GitHub Pro ($4/user/month)

✅ **Enforce merge strategies** per branch (restrict to merge/squash/rebase)
✅ **Require PR approvals** (1+ reviewers)
✅ **Code owners** for automatic review assignment
✅ **Protected branches** with full control
✅ **Required status checks** with specific checks
✅ **Advanced security features** (secret scanning, etc.)

### Migration Steps

1. Upgrade account to GitHub Pro/Team
2. Configure Branch Protection Rules:
   - `dev` and `main`: Require squash merges only
3. Set required reviewers (1+)
4. Enable required status checks
5. Set up CODEOWNERS file
6. Update CONTRIBUTING.md to reflect enforced rules

## Questions?

Contact repository administrators for:

- Access requests
- Permission changes
- Security concerns
- Configuration questions

---

**Last Updated**: 2026-09-25
**Maintained By**: Repository Administrators
