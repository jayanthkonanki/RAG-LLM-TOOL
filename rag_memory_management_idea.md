# RAG Memory Management for Reliable API Tool Intelligence  
Using Milvus + PostgreSQL + LangChain

---

# Objective

Build a production-grade RAG system where the LLM can:

- select the correct API endpoint
- generate exact endpoint syntax with near-zero errors
- support future API updates safely
- scale across hundreds/thousands of internal tools
- prevent hallucinated API usage
- enable safe deletion and version control

Core principle:

```text
Milvus decides WHICH API

PostgreSQL decides EXACTLY HOW to use it
```

This is the foundation.

---

# System Philosophy

Traditional RAG fails because:

```text
LLM tries to guess syntax from vector search
```

This creates:

- wrong endpoints
- wrong payloads
- missing headers
- hallucinated parameters
- invalid tool execution

Our system prevents this by separating:

## Semantic Retrieval

from

## Exact Contract Validation

This ensures trust.

---

# Core Architecture

```text
User Query
↓
Intent Understanding
↓
Milvus Semantic Retrieval
↓
Best Matching API Candidate
↓
PostgreSQL Exact Contract Fetch
↓
Validation Layer
↓
LLM Final Response
↓
Execution Safe Output
```

---

# Layer 1 — Milvus (Semantic Intent Layer)

## Purpose

Milvus is responsible for:

```text
Which API should be used?
```

It should never decide exact syntax.

Only semantic selection.

---

# What We Store in Milvus

We store embeddings of:

## High-Level API Descriptions

Each endpoint includes:

### 1. What it does

Example:

```text
Creates a customer refund request
```

---

### 2. When to use it

Example:

```text
Use only after payment settlement is completed
```

---

### 3. Business Scenarios

Example:

```text
Customer requests refund after failed product delivery
```

---

### 4. Common Mistakes

Example:

```text
Do not trigger before transaction status = success
```

---

### 5. Domain Tags

Example:

```text
payments
refunds
customer-support
finance
```

---

### 6. Example Intent Phrases

Example:

```text
refund payment
reverse payment
customer refund request
```

These improve retrieval precision.

---

# What We DO NOT Store in Milvus

Never store:

```text
full Swagger specs
full JSON payload definitions
auth secrets
critical validation logic
source of truth
```

Milvus is retrieval-only.

---

# Layer 2 — PostgreSQL (Source of Truth)

## Purpose

PostgreSQL is responsible for:

```text
What is the exact endpoint syntax?
```

This is the truth source.

Always.

---

# PostgreSQL Core Tables

---

# Table 1 — api_registry

Stores exact endpoint contract.

```sql
CREATE TABLE api_registry (
    api_id UUID PRIMARY KEY,
    api_name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    version TEXT,
    status TEXT DEFAULT 'active',
    auth_type TEXT,
    service_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# Table 2 — api_parameters

Stores required fields.

```sql
CREATE TABLE api_parameters (
    param_id UUID PRIMARY KEY,
    api_id UUID REFERENCES api_registry(api_id),
    param_name TEXT,
    param_type TEXT,
    required BOOLEAN DEFAULT FALSE,
    location TEXT,
    default_value TEXT
);
```

Includes:

- query params
- path params
- headers
- body params

---

# Table 3 — api_examples

Stores real usage examples.

```sql
CREATE TABLE api_examples (
    example_id UUID PRIMARY KEY,
    api_id UUID REFERENCES api_registry(api_id),
    request_example JSONB,
    response_example JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Examples reduce hallucination dramatically.

---

# Table 4 — vector_mapping

Maps SQL records to vector IDs.

```sql
CREATE TABLE vector_mapping (
    mapping_id UUID PRIMARY KEY,
    api_id UUID REFERENCES api_registry(api_id),
    vector_id TEXT NOT NULL,
    embedding_model TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Critical for:

safe update + safe deletion

---

# Layer 3 — LangChain (Orchestration Layer)

## Purpose

LangChain handles:

- retrieval flow
- metadata filtering
- re-ranking
- SQL fetch logic
- validation pipeline
- final response formatting

This is the system brain.

---

# Query Flow

## Step 1 — User Query

Example:

```text
Create customer refund request
```

---

## Step 2 — Semantic Search in Milvus

Milvus retrieves:

```text
Refund API
because business intent matches
```

Returns:

```text
api_id
```

Only identity.

Not syntax.

---

## Step 3 — PostgreSQL Contract Fetch

Using api_id:

Fetch:

```text
POST /v2/payments/refund
Authorization required
required body:
transaction_id
refund_amount
reason
```

This prevents guessing.

---

## Step 4 — Validation Layer

System checks:

```text
endpoint exists?
method valid?
required params present?
version active?
deprecated?
auth valid?
```

Only valid responses proceed.

---

## Step 5 — LLM Response Generation

Only after validation:

LLM formats:

- developer-friendly response
- exact endpoint syntax
- request examples
- operational notes

LLM explains.

It does not invent.

---

# Update Flow

## Future Endpoint Change

When API changes:

```text
v1 → v2
```

Never overwrite.

Always version.

Flow:

```text
update PostgreSQL
↓
update embedding summary
↓
replace Milvus vector
↓
audit log entry
```

Safe evolution.

---

# Deletion Flow

## Required for enterprise governance

Delete by:

- api_id
- service
- deprecated endpoint
- legal requirement
- ownership transfer

Flow:

```text
find api_id
↓
find vector_id
↓
delete vector
↓
mark SQL inactive
↓
write audit log
```

Deletion must be reliable.

---

# Golden Rules

---

# Rule 1

```text
Never let vector DB be source of truth
```

---

# Rule 2

```text
Never let LLM infer endpoint syntax
```

---

# Rule 3

```text
Always validate before final output
```

---

# Rule 4

```text
Always version — never overwrite
```

---

# Final System Principle

```text
Milvus = API Discovery

PostgreSQL = API Truth

Validator = Safety Gate

LangChain = Orchestration

LLM = Communication Layer
```

This creates:

## reliable  
## scalable  
## maintainable  
## production-safe API intelligence system


Git + YAML + Worker Job
```text
Simple.
Auditable.
Version controlled.
Production safe.
```

Folder Structure
''' sql
api_registry/

├── payments/
│   ├── refund.yaml
│   ├── charge.yaml
│
├── users/
│   ├── create_user.yaml
│
├── inventory/
│   ├── stock_update.yaml
'''



'''
