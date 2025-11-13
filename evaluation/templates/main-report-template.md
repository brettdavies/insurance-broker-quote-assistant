# Evaluation Report

**Generated:** {{timestamp}}

## Table of Contents

- [Evaluation Report](#evaluation-report)
  - [Table of Contents](#table-of-contents)
  - [Conversational Flow Metrics](#conversational-flow-metrics)
  - [Policy Flow Metrics](#policy-flow-metrics)
  - [Per-Carrier Routing Accuracy](#per-carrier-routing-accuracy)
  - [Per-State Routing Accuracy](#per-state-routing-accuracy)
  - [LLM Token Usage \& Cost](#llm-token-usage--cost)
  - [Test Case Details](#test-case-details)
  - [Summary Statistics](#summary-statistics)

---

## Conversational Flow Metrics

**Tests:** {{convTestCount}}

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Routing Accuracy | ≥90% | {{convRoutingAccuracy}} | {{convRoutingStatus}} |
| Intake Completeness | ≥95% | {{convIntakeCompleteness}} | {{convIntakeStatus}} |
| Prefill Completeness | ≥95% | {{convPrefillCompleteness}} | {{convPrefillStatus}} |
| Compliance Pass Rate | 100% | {{convCompliancePassRate}} | {{convComplianceStatus}} |

**Conversational Flow Status:** {{convOverallStatus}}

## Policy Flow Metrics

**Tests:** {{policyTestCount}}

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Intake Completeness | ≥95% | {{policyIntakeCompleteness}} | {{policyIntakeStatus}} |
| Discount Accuracy | ≥90% | {{policyDiscountAccuracy}} | {{policyDiscountStatus}} |
| Savings Pitch Clarity | ≥85% | {{policyPitchClarity}} | {{policyPitchStatus}} |
| Compliance Pass Rate | 100% | {{policyCompliancePassRate}} | {{policyComplianceStatus}} |

**Policy Flow Status:** {{policyOverallStatus}}

## Per-Carrier Routing Accuracy

| Carrier | Accuracy |
|---------|----------|
{{carrierTableRows}}

## Per-State Routing Accuracy

| State | Accuracy |
|-------|----------|
{{stateTableRows}}

## LLM Token Usage & Cost

- **Total Input Tokens:** {{totalInputTokens}}
- **Total Output Tokens:** {{totalOutputTokens}}
- **Estimated Cost:** {{totalCost}}

## Test Case Details

{{testCaseDetails}}

## Summary Statistics

- **Total Tests:** {{totalTests}}
- **Passed:** {{passedTests}}
- **Failed:** {{failedTests}}
- **Pass Rate:** {{passRate}}

