# Decision: scrypt via node:crypto for password hashing

## Status

Accepted (supersedes 002-password-hashing)

## Context

The previous implementation used Argon2id via the `hash-wasm` package. While
Argon2id is an excellent algorithm, `hash-wasm` loads a WASM binary at runtime.
This caused failures in Playwright E2E tests where the WASM loading mechanism
was incompatible with the test environment.

Cloudflare Workers now supports `node:crypto` via the `nodejs_compat`
compatibility flag, making Node's native `scrypt` available with zero additional
dependencies. scrypt is OWASP's #2 recommended password hashing algorithm
(behind Argon2id), is memory-hard, and works identically across Cloudflare
Workers, Vitest, and Playwright.

## Decision

Use **scrypt** via `node:crypto` for password hashing, replacing Argon2id via
`hash-wasm`.

### Why scrypt over continued Argon2id

- **Zero dependencies** — `node:crypto` is built into Node.js and available in
  Workers via `nodejs_compat`. No WASM binary to load, no package to maintain.
- **Universal runtime compatibility** — Works identically in Cloudflare Workers,
  Vitest unit tests, and Playwright E2E tests. Eliminates the WASM loading
  failures that motivated this change.
- **Still memory-hard** — scrypt provides the same class of protection as
  Argon2id against GPU/ASIC attacks. It is OWASP's second recommendation.
- **Constant-time comparison** — `timingSafeEqual` from `node:crypto` provides
  native constant-time hash comparison.

### Why not bcrypt or PBKDF2

- **bcrypt** — Fixed small memory footprint exploitable by modern GPUs; 72-byte
  password truncation; the native `bcrypt` package cannot run in Workers.
- **PBKDF2** — Not memory-hard; vulnerable to GPU parallelism. OWASP lists it as
  a last resort.

### Parameters

```ts
scrypt(password, salt, keyLength, { N: 16384, r: 8, p: 5 })
```

- **N = 16384 (ln=14)** — CPU/memory cost factor. Each hash uses ~16 MiB of
  memory (`128 * N * r` bytes). scrypt runs `p` sequential passes over the same
  memory block, so memory usage does not scale with `p`.
- **r = 8** — Block size. Standard value that balances memory bandwidth usage.
- **p = 5** — Parallelism / iteration count. Together with N=2^14 and r=8, this
  matches one of the five OWASP-recommended equivalent configurations for
  scrypt, providing the same total work factor as N=2^17, r=8, p=1 while keeping
  memory at ~16 MiB to fit within the Workers 128 MiB isolate limit.
- **Salt** — 16 bytes, cryptographically random per hash.
- **Key length** — 32 bytes.

### Storage format

```
$scrypt$ln=14,r=8,p=5$<base64url_salt>$<base64url_hash>
```

PHC-like self-describing format. Parameters are stored with the hash so future
parameter bumps work transparently — `verifyPassword` reads parameters from the
stored string.

## Consequences

- **`nodejs_compat` required** — The `wrangler.jsonc` must include
  `"compatibility_flags": ["nodejs_compat"]`. This flag may already be needed by
  other features in the future.
- **No backward compatibility with Argon2id hashes** — Existing Argon2id hashes
  from the prior implementation are not verifiable. Since this is a starter
  template without production users, this is acceptable. A production migration
  would need a verify-and-rehash strategy.
- **~16 MiB memory per hash** — Comparable to the prior ~19 MiB. Fits
  comfortably within the Workers 128 MiB per-isolate limit for low-concurrency
  auth endpoints.
- **~100–300 ms hashing time** — Intentional. Comparable to prior Argon2id
  timing. Acceptable for auth endpoints, must not appear on hot paths.
