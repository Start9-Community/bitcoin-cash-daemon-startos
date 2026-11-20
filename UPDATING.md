# Updating the upstream version

This package builds **BCHD** (Go BCH full node) from source in `Dockerfile`'s `bchd-build` stage.
Upstream releases live at [github.com/gcash/bchd](https://github.com/gcash/bchd/releases).

## Determining the upstream version

Check the latest tag on the [releases page](https://github.com/gcash/bchd/releases).
The current pin is `ARG BCHD_VERSION=` in `Dockerfile`, with `ARG BCHD_SHA256=` the SHA-256 of that tag's source archive.

## Applying the bump

1. Update `ARG BCHD_VERSION=v<new version>` in `Dockerfile`.
2. Update `ARG BCHD_SHA256=` to the new archive's SHA-256. Upstream publishes no checksums or
   signatures for its source, so hash the exact archive the build downloads, and confirm it was cut
   from the tag's commit:

   ```sh
   curl -fsSLo bchd.tar.gz https://github.com/gcash/bchd/archive/refs/tags/v<new version>.tar.gz
   sha256sum bchd.tar.gz
   zcat bchd.tar.gz | git get-tar-commit-id   # must match the commit below
   git ls-remote https://github.com/gcash/bchd.git 'refs/tags/v<new version>*'   # the ^{} line, if any
   ```
3. Update version references in `README.md` and `instructions.md`.
