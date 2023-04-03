# getting wasm code

- run `./wasm-build.sh` in `bridge/fedi-wasm`
- run `./copy-from-out.sh` in `fedi-wasm-ui`
- run `npm install` and `npm run build`
- run `./insert-connect-info [FEDERATION-CONNECT-STRING]`.
- run a static web server in `./dist`
