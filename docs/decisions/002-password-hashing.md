# Decision: Argon2id via hash-wasm for password hashing

## Status

Superseded by 003-password-hashing-scrypt

## Context

This project runs on Cloudflare Workers. We need a password hashing algorithm
that:

- Runs in the Workers V8 isolate (no Node.js native addons)
- Is resistant to offline brute-force attacks (GPU/ASIC cracking)
- Is recommended by current security standards

## Decision

Use **Argon2id** as the hashing algorithm, implemented via the **hash-wasm**
package.

### Why Argon2id over bcrypt/scrypt

Argon2id is the winner of the
[Password Hashing Competition (2015)](https://www.password-hashing.net/) and is
the primary recommendation in the
[OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Compared to bcrypt:

- **Memory-hard** — Argon2id requires a configurable amount of RAM per
  invocation, making large-scale GPU/ASIC attacks far more expensive. bcrypt
  uses a fixed, small memory footprint that modern GPUs can exploit cheaply.
- **Independent tuning knobs** — memory cost, time cost, and parallelism can
  each be increased independently as hardware improves. bcrypt only exposes a
  single work factor.
- **No 72-byte input limit** — bcrypt silently truncates passwords longer than
  72 bytes. Argon2id has no such limit.

scrypt is also memory-hard but its parameters (N, r, p) are coupled — N controls
both time and memory cost simultaneously, making it harder to tune one dimension
without affecting the other. It also has no side-channel resistance guarantees.
Argon2id's hybrid mode protects against both side-channel and GPU attacks,
making it the safer default.

### Why hash-wasm over bcryptjs

The popular `bcrypt` package uses a native C addon and cannot run in Workers.
The pure-JS fallback (`bcryptjs`) runs without native code but is slower and
still delivers the weaker bcrypt algorithm.

`hash-wasm` bundles Argon2id compiled to WASM, which:

- Runs natively in the Workers V8 isolate — WASM is a first-class citizen in
  Cloudflare Workers
- Delivers near-native performance (WASM vs. native is typically <2× overhead)
- Requires no bundler plugins or Vite configuration

### Parameters in use

```ts
argon2id({
	password: plain,
	salt, // 16 bytes, cryptographically random per hash
	parallelism: 1, // CF Workers are single-threaded
	iterations: 2, // time cost
	memorySize: 19456, // 19 MiB — OWASP minimum recommendation
	hashLength: 32,
	outputType: 'encoded', // PHC string format (includes params + salt)
})
```

The `encoded` output type stores the algorithm, parameters, salt, and hash in a
single self-describing PHC string, so future parameter upgrades do not require a
separate migration column.

The 19 MiB memory cost corresponds to one of the
[five equally-strong parameter sets recommended by OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id),
chosen as the lowest-memory option among those five configurations to fit
comfortably within the Cloudflare Workers 128 MiB per-isolate limit.

## Consequences

- **CF Workers memory limit** — Each `hashPassword` call allocates ~19 MiB for
  the Argon2id computation. The Workers 128 MiB limit is per isolate (not per
  request), so concurrent hashing calls on the same isolate share that budget.
  In practice this is only called on signup, login, and password change — low
  concurrency paths. Monitor isolate memory if traffic grows significantly.
- **~200–500 ms hashing time** — Intentional. This is the cost that makes
  offline cracking expensive. It is acceptable for auth endpoints but must never
  appear on hot paths.
- **No algorithm migration needed** — PHC-encoded output means `argon2Verify`
  reads the parameters from the stored string, so tuning parameters can be
  increased for new passwords without touching the schema.
