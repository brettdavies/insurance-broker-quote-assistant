# Evaluation Report

Generated: {{timestamp}}

## Executive Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Routing Accuracy | ≥90% | {{routingAccuracy}}% | {{routingStatus}} |
| Intake Completeness | ≥95% | {{intakeCompleteness}}% | {{intakeStatus}} |
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
- **Pass Rate:** {{passRate}}%

