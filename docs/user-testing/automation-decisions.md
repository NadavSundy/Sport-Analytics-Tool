# User Testing Automation Decisions

## Decision 1: Azure Blob Storage Evaluation

### Context

Azure Blob Storage was evaluated as the storage layer for automated feedback retrieval.

### Considered Architecture

Microsoft Forms
→ Power Automate
→ Azure Blob Storage
→ CI/CD
→ Evidence Generator

### Reason Not Selected

The Azure Blob connector required Power Automate Premium licensing.

The project required a free and reproducible workflow.

### Final Decision

Use Microsoft OneDrive storage because:

- available through existing Microsoft account;
- requires no additional licensing;
- integrates with Power Automate;
- supports JSON file storage.

### Decision 2: Microsoft Graph API Evaluation

### Considered Architecture

CI/CD runner
→ Microsoft Graph API
→ OneDrive responses

### Reason Not Selected

Application permissions required tenant administrator consent.

The Wits tenant did not provide student accounts with this permission.

### Final Decision

Use OneDrive synchronisation for development evidence generation.
