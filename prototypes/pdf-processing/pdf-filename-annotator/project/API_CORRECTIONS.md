# API Corrections and Knowledge Updates

This document tracks corrections and updates to library APIs that differ from Claude's knowledge.

## PDF Processing Libraries

| Claude's Knowledge | Latest API (2021+) | Notes |
|-------------------|---------------------|-------|
| Using both `pdf-rs` and `lopdf` | Using only `lopdf` | Removed dependency on pdf-rs for simplicity and compatibility |
| `pdf::Document::load(file)` | N/A | Removed pdf-rs library in favor of using only lopdf |
| `lopdf::Document::load(file)` | `lopdf::Document::load(file)` | API remains consistent |
| `document.get_pages()` returns type with `.iter()` | Same behavior | No change needed |

## Font Handling

| Claude's Knowledge | Latest API (2021+) | Notes |
|-------------------|---------------------|-------|
| `rusttype::Font::from_file(file)` | `std::fs::read(file).and_then(\|data\| rusttype::Font::try_from_vec(data))` | Updated pattern for loading fonts from files |

## Error Handling

| Claude's Knowledge | Latest API (2021+) | Notes |
|-------------------|---------------------|-------|
| `failure::Error` | `anyhow::Error` and `thiserror::Error` | Modern Rust uses anyhow for application errors and thiserror for library error definitions |
| `pdf::error::PdfError` to `PdfError` conversion | Removed | No longer needed as pdf-rs dependency was removed |

## File System Operations

| Claude's Knowledge | Latest API (2021+) | Notes |
|-------------------|---------------------|-------|
| `std::fs::walk_dir(path)` | `walkdir::WalkDir::new(path)` | The standard library doesn't have a recursive directory walking function |

## Configuration Handling

| Claude's Knowledge | Latest API (2021+) | Notes |
|-------------------|---------------------|-------|
| `serde_json::from_reader(file)` | `serde_json::from_reader(file)` | API remains consistent |
| `serde_derive` | Now included in `serde` with the `derive` feature | Package structure has changed |

## Command Line Argument Parsing

| Claude's Knowledge | Latest API (2021+) | Notes |
|-------------------|---------------------|-------|
| `clap::App::new()` | `clap::Command::new()` | The App struct was renamed to Command in newer versions |
| `structopt` | Now integrated into `clap` with the `derive` feature | Package structure has changed |

## Lopdf-Specific Changes

| Claude's Knowledge | Latest API (2021+) | Notes |
|-------------------|---------------------|-------|
| `page_id: lopdf::ObjectId` | `page_id: (u32, u16)` | ObjectId in lopdf is a tuple type of (u32, u16) where first element is object ID and second is generation number |
| `doc.trailer.get(b"Info").and_then(|obj| obj.as_reference().ok())` | `doc.trailer.get(b"Info").map(|obj| obj.as_reference().ok())` | Updated chain of methods to use map + ok() pattern |
| `String::from_utf8_lossy(s).to_string()` | `String::from_utf8_lossy(bytes).into_owned()` | More efficient conversion from bytes to String |
