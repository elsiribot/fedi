pub mod bridge;
pub mod federation_v0;
pub mod federation_v1;
pub mod federation_v2;
// FIXME: kinda feels like this should just be it's own crate ...
pub mod constants;
pub mod error;
pub mod event;
#[cfg(not(target_family = "wasm"))]
mod ffi;
#[cfg(not(target_family = "wasm"))]
pub mod logging;
#[cfg(not(target_family = "wasm"))]
pub mod remote;
pub mod rpc;
pub mod social;
pub mod storage;
pub mod translate;
pub mod types;
pub mod utils;

#[cfg(not(target_family = "wasm"))]
// nosemgrep: ban-wildcard-imports
use ffi::*;

#[cfg(not(target_family = "wasm"))]
uniffi::include_scaffolding!("fedi");
