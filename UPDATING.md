# Updating the upstream version

This package builds **BCHD** (the Go BCH full node) from source in `Dockerfile`.
Upstream releases live at [github.com/gcash/bchd](https://github.com/gcash/bchd/releases).

## Determining the upstream version

The current pin is `ARG BCHD_VERSION=` near the top of `Dockerfile`.
Check the latest tag on the [releases page](https://github.com/gcash/bchd/releases).

## Applying the bump

1. Update `ARG BCHD_VERSION=v<new version>` in `Dockerfile`.
2. Update `version` and `releaseNotes` in `startos/versions/current.ts` in place — the
   latest version always lives in that file. A new version file is only needed when the
   bump carries a data migration (see [Versions](https://docs.start9.com/packaging/versions.html)).
3. If upstream has moved the patched code, refresh `patches/fix-getblocktemplate-upgrade9.patch`
   — or drop the patch (and the `RUN patch` line in `Dockerfile`) if the fix has been merged upstream.
4. Update any version-specific references in `README.md` and `instructions.md`.
5. `make x86 install` to build and test, then open a PR to `master`.
