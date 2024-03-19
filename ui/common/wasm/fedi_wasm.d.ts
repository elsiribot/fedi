/* tslint:disable */
/* eslint-disable */
/**
* Returns a blob with log contents
* @returns {any}
*/
export function get_logs(): any;
/**
* @param {any} event_sink
* @param {string} device_identifier
* @returns {Promise<string>}
*/
export function fedimint_initialize(event_sink: any, device_identifier: string): Promise<string>;
/**
* @param {string} method
* @param {string} payload
* @returns {Promise<string>}
*/
export function fedimint_rpc(method: string, payload: string): Promise<string>;
/**
* Read file in bridge VFS.
* @param {string} path
* @returns {Promise<Uint8Array>}
*/
export function fedimint_read_file(path: string): Promise<Uint8Array>;
/**
* Write file in bridge VFS.
* @param {string} path
* @param {Uint8Array} data
* @returns {Promise<void>}
*/
export function fedimint_write_file(path: string, data: Uint8Array): Promise<void>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly get_logs: () => number;
  readonly fedimint_initialize: (a: number, b: number, c: number) => number;
  readonly fedimint_rpc: (a: number, b: number, c: number, d: number) => number;
  readonly fedimint_read_file: (a: number, b: number) => number;
  readonly fedimint_write_file: (a: number, b: number, c: number) => number;
  readonly ffi_matrix_sdk_base_uniffi_contract_version: () => number;
  readonly ffi_matrix_sdk_base_rustbuffer_alloc: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rustbuffer_from_bytes: (a: number, b: number, c: number, d: number) => void;
  readonly ffi_matrix_sdk_base_rustbuffer_free: (a: number, b: number, c: number, d: number) => void;
  readonly ffi_matrix_sdk_base_rustbuffer_reserve: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_complete_u8: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_i8: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_u16: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_i16: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_i32: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_i64: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_poll_f32: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_f32: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_complete_f32: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_free_f32: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_complete_f64: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_rust_buffer: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_complete_void: (a: number, b: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_u8: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_u16: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_i8: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_u32: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_i32: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_u64: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_i64: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_i16: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_f64: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_pointer: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_rust_buffer: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_poll_void: (a: number, b: number, c: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_complete_u32: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_u64: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_complete_pointer: (a: number, b: number) => number;
  readonly ffi_matrix_sdk_base_rust_future_free_u8: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_u16: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_i8: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_u32: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_i32: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_u64: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_i64: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_i16: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_f64: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_pointer: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_rust_buffer: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_free_void: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_u8: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_u16: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_i8: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_u32: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_i32: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_u64: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_i64: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_i16: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_f64: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_pointer: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_rust_buffer: (a: number) => void;
  readonly ffi_matrix_sdk_base_rust_future_cancel_void: (a: number) => void;
  readonly ring_core_0_17_5_bn_mul_mont: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly rustsecp256k1zkp_v0_7_0_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1zkp_v0_7_0_default_error_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_6_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_6_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_6_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_6_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly wasm_bindgen__convert__closures__invoke1_mut__h5447df33f6507363: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1_mut__h463daa050639e1c5: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1_mut__h84f639ac6cb54765: (a: number, b: number, c: number, d: number) => void;
  readonly _dyn_core__ops__function__Fn_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h7210db8221fd9d36: (a: number, b: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1__he943d4edbd2d9acc: (a: number, b: number, c: number) => void;
  readonly wasm_bindgen__convert__closures__invoke0_mut__hf9f7a4ee335bb1df: (a: number, b: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1_mut__h1b67d2575e24c0ac: (a: number, b: number, c: number) => void;
  readonly wasm_bindgen__convert__closures__invoke0_mut__h9bc0cd98e4fedf4e: (a: number, b: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1_mut__h7cdb5ae210b2b6ce: (a: number, b: number, c: number) => void;
  readonly wasm_bindgen__convert__closures__invoke0_mut__h3b0a5823e9fedb65: (a: number, b: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__ha346e6559c9f889a: (a: number, b: number, c: number, d: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
