/* tslint:disable */
/* eslint-disable */
/**
* Returns a blob with log contents
* @returns {any}
*/
export function get_logs(): any;
/**
* @param {any} event_sink
* @returns {Promise<string>}
*/
export function fedimint_initialize(event_sink: any): Promise<string>;
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
  readonly fedimint_initialize: (a: number) => number;
  readonly fedimint_rpc: (a: number, b: number, c: number, d: number) => number;
  readonly fedimint_read_file: (a: number, b: number) => number;
  readonly fedimint_write_file: (a: number, b: number, c: number) => number;
  readonly ring_core_0_17_5_bn_mul_mont: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1zkp_v0_7_0_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1zkp_v0_7_0_default_error_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_6_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_6_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_6_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_6_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly wasm_bindgen__convert__closures__invoke1_mut__hf9468372f05d0c69: (a: number, b: number, c: number, d: number) => void;
  readonly wasm_bindgen__convert__closures__invoke0_mut__h5315baf25b532075: (a: number, b: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1_mut__h09f8e95eae18a864: (a: number, b: number, c: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1_mut__hcdf9301817a70b7f: (a: number, b: number, c: number) => void;
  readonly wasm_bindgen__convert__closures__invoke0_mut__h62a77050ef2881f6: (a: number, b: number) => void;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__h88ad8b4295ba9092: (a: number, b: number, c: number, d: number) => void;
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
