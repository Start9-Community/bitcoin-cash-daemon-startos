# Updating the upstream version

This package builds **BCHD** (Go BCH full node) from source in `Dockerfile`'s `bchd-build` stage.
Upstream releases live at [github.com/gcash/bchd](https://github.com/gcash/bchd/releases).

## Determining the upstream version

Check the latest tag on the [releases page](https://github.com/gcash/bchd/releases).
The current pin is `ARG BCHD_VERSION=` in `Dockerfile`.

## Applying the bump

1. Update `ARG BCHD_VERSION=v<new version>` in `Dockerfile`.
2. Add a new `startos/versions/v<X>.<Y>.<Z>.0.ts` file and update `startos/versions/index.ts` to set it as `current`.
3. Update version references in `README.md` and `instructions.md`.
4. Push to `master` — `tagAndRelease` builds and releases. The daily **Check Upstream** workflow does steps 1–2 automatically.
