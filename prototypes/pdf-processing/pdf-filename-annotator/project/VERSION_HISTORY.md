# Version History

This file tracks dependency and crate version changes throughout the project lifecycle.

## Dependency Updates

| Date | Dependency | Old Version | New Version | Notes |
|------|------------|-------------|-------------|-------|
| 2025-03-25 | lopdf | ^0.30.0 | ^0.30.0 | Initial documentation |
| 2025-03-25 | clap | ^4.4.0 | ^4.4.0 | Initial documentation |
| 2025-03-25 | serde | ^1.0.190 | ^1.0.190 | Initial documentation |
| 2025-03-25 | serde_json | ^1.0.108 | ^1.0.108 | Initial documentation |
| 2025-03-25 | anyhow | ^1.0.75 | ^1.0.75 | Initial documentation |
| 2025-03-25 | thiserror | ^1.0.50 | ^1.0.50 | Initial documentation |
| 2025-03-25 | walkdir | ^2.4.0 | ^2.4.0 | Initial documentation |
| 2025-03-25 | log | ^0.4.20 | ^0.4.20 | Initial documentation |
| 2025-03-25 | env_logger | ^0.10.0 | ^0.10.0 | Initial documentation |
| 2025-03-25 | rusttype | ^0.9.3 | ^0.9.3 | Initial documentation |
| 2025-03-25 | tempfile | ^3.8.1 | ^3.8.1 | Initial documentation (dev) |
| 2025-03-25 | assert_fs | ^1.0.13 | ^1.0.13 | Initial documentation (dev) |
| 2025-03-25 | predicates | ^3.0.4 | ^3.0.4 | Initial documentation (dev) |

## Rust Toolchain Updates

| Date | Component | Old Version | New Version | Notes |
|------|-----------|-------------|-------------|-------|
| 2025-03-25 | rustc | Unknown | 1.77.0 | Initial documentation |
| 2025-03-25 | cargo | Unknown | 1.77.0 | Initial documentation |
| 2025-03-25 | rustfmt | Unknown | 1.77.0 | Initial documentation |
| 2025-03-25 | clippy | Unknown | 1.77.0 | Initial documentation |

## Compatibility Checks

| Date | Test | Status | Notes |
|------|------|--------|-------|
| 2025-03-25 (initial) | cargo check | ❌ Failing | ObjectId type issues in processor.rs |
| 2025-03-25 (initial) | cargo test | ⚠️ Partial | Some tests pass, processor.rs tests fail |
| 2025-03-25 (initial) | cargo clippy | ❌ Failing | Same issues as cargo check |
| 2025-03-25 (initial) | cargo audit | ✅ Passing | No known vulnerabilities |
| 2025-03-25 (updated) | cargo check | ✅ Passing | All compilation issues fixed |
| 2025-03-25 (updated) | cargo test | ✅ Passing | All tests now pass successfully |
| 2025-03-25 (updated) | cargo clippy | ✅ Passing | Minor warnings for unused imports |
| 2025-03-25 (updated) | cargo audit | ✅ Passing | No known vulnerabilities |

## Build Verification Results

| Date | Build Target | Status | Performance | Notes |
|------|--------------|--------|------------|-------|
| 2025-03-25 (initial) | Debug | ❌ Failing | N/A | Compilation errors in processor.rs |
| 2025-03-25 (initial) | Release | ❌ Failing | N/A | Same issues as debug build |
| 2025-03-25 (initial) | Tests | ⚠️ Partial | Test time: ~0.5s | Some tests pass, processor.rs tests fail |
| 2025-03-25 (updated) | Debug | ✅ Passing | Build time: ~0.9s | Successful build with warnings |
| 2025-03-25 (updated) | Release | ✅ Passing | Build time: ~1.2s | Successful release build |
| 2025-03-25 (updated) | Tests | ✅ Passing | Test time: ~0.1s | All tests pass successfully |

## Package Audit History

| Date | Command | Result | Notes |
|------|---------|--------|-------|
| 2025-03-25 | cargo audit | 0 vulnerabilities | No known vulnerabilities in dependencies |
| 2025-03-25 | cargo outdated | Pending | Need to run to check for outdated dependencies |

## API Compatibility Notes

| Date | Component | Issue | Resolution |
|------|-----------|-------|------------|
| 2025-03-25 (initial) | lopdf::ObjectId | Code using tuple (u32, u16) but needs struct | Need to update to use proper ObjectId construction |
| 2025-03-25 (initial) | lopdf Document borrowing | Mutable borrowing conflicts in content stream handling | Need to restructure to avoid multiple mutable borrows |
| 2025-03-25 (resolved) | lopdf::ObjectId | Type mismatch with ObjectId | Fixed by using ObjectId::from() for proper type conversion |
| 2025-03-25 (resolved) | lopdf Document borrowing | Multiple mutable borrows | Resolved through restructuring code to collect data first and then modify |