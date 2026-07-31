# ── Build ───────────────────────────────────────────────────────────
# Cross-compiled with pure Go (CGO_ENABLED=0), so this stage runs natively on
# the builder and never needs QEMU, whatever the target arch.
FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS bchd-build

ARG BCHD_VERSION=v0.22.2
# Redeclared without a default on purpose: giving a predefined build arg a value
# shadows the one buildx injects, so `ARG TARGETARCH=amd64` would pin every target
# to an amd64 binary.
ARG TARGETOS
ARG TARGETARCH

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl tar && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN curl -fL --retry 6 --retry-delay 5 --retry-all-errors \
    -o /tmp/bchd.tar.gz "https://github.com/gcash/bchd/archive/refs/tags/${BCHD_VERSION}.tar.gz" && \
    mkdir -p /build/bchd && \
    tar -xzf /tmp/bchd.tar.gz --strip-components=1 -C /build/bchd && \
    rm -f /tmp/bchd.tar.gz

WORKDIR /build/bchd
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /usr/local/bin/bchd . && \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /usr/local/bin/bchctl ./cmd/bchctl && \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /usr/local/bin/gencerts ./cmd/gencerts

# ── Runtime ─────────────────────────────────────────────────────────
FROM debian:stable-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        netcat-openbsd \
        e2fsprogs \
        stunnel4 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=bchd-build /usr/local/bin/bchd /usr/local/bin/
COPY --from=bchd-build /usr/local/bin/bchctl /usr/local/bin/
COPY --from=bchd-build /usr/local/bin/gencerts /usr/local/bin/

RUN mkdir -p /data
VOLUME /data
EXPOSE 8332 8333 8334 8335

ENTRYPOINT ["bchd"]
