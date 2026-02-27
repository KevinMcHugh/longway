FROM node:20-bookworm-slim

ARG GO_VERSION=1.22.6

# install OS deps as root
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
         git ca-certificates curl bash; \
    curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tgz; \
    tar -C /usr/local -xzf /tmp/go.tgz; \
    rm /tmp/go.tgz; \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/local/go/bin:${PATH}"

# we are root by default, so this USER root is optional
USER root

# install codex globally as root
RUN npm install -g @openai/codex \
    && chmod +x /usr/local/bin/codex

# ---- still root here ----

ENV XDG_CONFIG_HOME=/home/node/.config
ENV XDG_DATA_HOME=/home/node/.local/share
ENV CODEX_HOME=/home/node/.codex

# create codex + xdg dirs as root for now
RUN mkdir -p "$CODEX_HOME" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" /opt/codex-seed

# seed codex home from files in the image. At runtime, /home/node/.codex is host-mounted
# and postCreateCommand copies missing files from /opt/codex-seed into that mount.
COPY auth.json /opt/codex-seed/auth.json
COPY local/codex/ /opt/codex-seed/

# 🔑 FIX: hand ownership of everything under /home/node to the node user
RUN chown -R node:node /home/node /opt/codex-seed

# now drop to the built-in non-root user from the node image
USER node
WORKDIR /workspaces/project
