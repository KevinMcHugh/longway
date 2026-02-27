.PHONY: codex-config-pull

CONTAINER_CODEX_HOME ?= /home/node/.codex
LOCAL_CODEX_HOME ?= $(HOME)/.codex
CONTAINER ?=

codex-config-pull:
	@command -v docker >/dev/null 2>&1 || { \
		echo "docker not found in PATH."; \
		exit 1; \
	}
	@cid="$(CONTAINER)"; \
	if [ -z "$$cid" ]; then \
		cid="$$(docker ps --filter "label=devcontainer.local_folder=$(abspath .)" --format '{{.ID}}' | head -n 1)"; \
	fi; \
	if [ -z "$$cid" ]; then \
		echo "No running devcontainer found for $(abspath .)."; \
		echo "Set CONTAINER=<name-or-id> to override."; \
		exit 1; \
	fi; \
	mkdir -p "$(LOCAL_CODEX_HOME)"; \
	docker cp "$$cid:$(CONTAINER_CODEX_HOME)/." "$(LOCAL_CODEX_HOME)/"; \
	echo "Copied Codex config from $$cid:$(CONTAINER_CODEX_HOME) to $(LOCAL_CODEX_HOME)"
