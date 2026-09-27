# Object storage

Shared provider-independent streaming object-storage boundary. Applications compose either their
Azure Blob adapter or the development-only atomic filesystem adapter around this interface. The
boundary exposes streams and opaque keys only; it never exposes provider URLs or credentials.

## AI Declaration

This shared boundary documentation was created with the assistance of Codex[GPT-5].
