{ lib }:
{ root, dirs }:
let
  basePath = toString root;
in
lib.cleanSourceWith {
  filter = (path: type:
    let
      relPath = lib.removePrefix basePath (toString path);
      includePath = builtins.any
        (dir: lib.hasPrefix ("/" + dir) relPath)
        dirs;
    in
    # uncomment to debug:
      # builtins.trace "${relPath}: ${lib.boolToString includePath}"
    includePath
  );
  src = root;
}
