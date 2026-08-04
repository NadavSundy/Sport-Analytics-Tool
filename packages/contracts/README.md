# Shared contracts

This package is the compile-time and validation boundary shared by the frontend, backend, tests, and API documentation tooling.

It is **not** a deployable “middle application” and must not contain business logic, database access, secrets, or authentication decisions. Place only stable request/response schemas, event schemas, identifiers, enums, and generated-independent types here.

The backend remains authoritative. Every external request must still be validated and authorised by the backend even when the frontend already validated it.
