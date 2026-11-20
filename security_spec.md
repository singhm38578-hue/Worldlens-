# WorldLens Firestore Security Specification (Phase 0 — Payload-First TDD)

## 1. Data Invariants & Relationship Mapping
- **Master Source of Truth**: `/users/{userId}` is the parent owner profile document for an authenticated, email-verified user (`request.auth.uid == userId && request.auth.token.email_verified == true`).
- **PII & Private Data Isolation**: No public/global readable collections exist. All `/users/{userId}`, `/users/{userId}/scans/{scanId}`, and `/users/{userId}/translations/{translationId}` documents are strictly owner-only. No blanket `isSignedIn()` reads or client-delegated list queries are permitted.
- **Master Gate (Relational Sync)**: Creating a scan or translation inside `/users/{userId}/scans/{scanId}` or `/users/{userId}/translations/{translationId}` requires the parent `/users/{userId}` document to exist via `exists(...)`.
- **No Images in Firestore**: `ScanRecord` strictly enforces allowed keys (`hasOnly`) and forbids binary image/thumbnail fields in Firestore.
- **Temporal & Identity Integrity**: `ownerId` must always equal `request.auth.uid` and `userId`, `createdAt` must equal `request.time` on creation and remain immutable on update, and `updatedAt` must equal `request.time` on update.
- **Bounded Sizes**: Every string field enforces explicit `.size()` bounds matching `firebase-blueprint.json`, every array field enforces `<= 10` elements with first-element type checks, and single-document IDs enforce `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars).

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: Read or write `/users/alice/scans/scan_1` with `request.auth == null`.
2. **Unverified Email Spoof**: Write `/users/alice` with `request.auth.uid == "alice"` and `request.auth.token.email_verified == false`.
3. **Cross-User PII Read**: User `bob` attempts `get` on `/users/alice`.
4. **Cross-User List Scraping**: User `bob` attempts `list` on `/users/alice/scans` or queries without `ownerId == request.auth.uid`.
5. **Identity Spoofing on Create**: User `alice` creates `/users/alice/scans/scan_1` with `ownerId: "bob"`.
6. **Shadow / Ghost Field Injection (Create)**: User `alice` creates `/users/alice` with extra field `isAdmin: true` or `role: "admin"`.
7. **Shadow / Ghost Field Injection (Update)**: User `alice` updates `/users/alice` adding `isVerified: true` alongside `preferredLanguage: "hi"`.
8. **Immutable Field Tampering**: User `alice` updates `/users/alice` attempting to alter `createdAt` or `ownerId`.
9. **Client Timestamp Forgery**: User `alice` creates `/users/alice/scans/scan_1` with a forged past `createdAt` (`!= request.time`).
10. **ID Poisoning Attack**: User `alice` creates `/users/alice/scans/<200-char-invalid-id-with-spaces-and-symbols>` violating `isValidId()`.
11. **Denial-of-Wallet String / Array Overflow**: User `alice` creates `/users/alice/scans/scan_1` with `explanation` > 3000 chars or `characteristics` with 25 items or non-string element `[123]`.
12. **Orphaned Subcollection Write**: User `alice` attempts to create `/users/alice/scans/scan_1` before `/users/alice` exists (fails Master Gate `exists(...)`), OR attempts to mutate an immutable history record via `update` on `/users/alice/scans/scan_1` (updates on history records are denied).
