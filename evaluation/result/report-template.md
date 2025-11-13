# Evaluation Report

**Generated:** {{timestamp}}

## Table of Contents

- [Evaluation Report](#evaluation-report)
  - [Table of Contents](#table-of-contents)
  - [Executive Summary](#executive-summary)
  - [Per-Carrier Routing Accuracy](#per-carrier-routing-accuracy)
  - [Per-State Routing Accuracy](#per-state-routing-accuracy)
  - [Field Completeness](#field-completeness)
  - [LLM Token Usage \& Cost](#llm-token-usage--cost)
    - [Summary](#summary)
    - [Per Test Case](#per-test-case)
  - [Sample Decision Traces](#sample-decision-traces)
  - [Test Case Details](#test-case-details)
  - [Summary Statistics](#summary-statistics)

---

## Executive Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Routing Accuracy | ≥90% | {{routingAccuracy}}% | {{routingStatus}} |
| Intake Completeness | ≥95% | {{intakeCompleteness}}% | {{intakeStatus}} |
| Discount Accuracy | ≥90% | {{discountAccuracy}}% | {{discountStatus}} |
| Savings Pitch Clarity | ≥85% | {{pitchClarity}}% | {{pitchStatus}} |
| Compliance Pass Rate | 100% | {{compliancePassRate}}% | {{complianceStatus}} |

**Overall Status:** {{overallStatus}}

## Per-Carrier Routing Accuracy

| Carrier | Accuracy |
|---------|----------|
{{carrierTableRows}}

## Per-State Routing Accuracy

| State | Accuracy |
|-------|----------|
{{stateTableRows}}

## Field Completeness

| Field | Completeness |
|-------|--------------|
{{fieldTableRows}}

## LLM Token Usage & Cost

### Summary

- Total Input Tokens: {{totalInputTokens}}
- Total Output Tokens: {{totalOutputTokens}}
- Estimated Cost: {{totalCost}}

### Per Test Case

| Test ID | Input Tokens | Output Tokens | Cost |
|---------|--------------|---------------|------|
{{tokenTableRows}}

## Sample Decision Traces

{{sampleTracesSection}}

## Test Case Details

{{testCaseDetails}}

## Summary Statistics

- **Total Tests:** {{totalTests}}
- **Passed:** {{passedTests}}
- **Failed:** {{failedTests}}
- **Pass Rate:** {{passRate}}

