#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ARCHIVE="https://codeload.github.com/nervusdm/ilinuxstats/tar.gz/refs/heads/main"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    echo "Do not run this installer as root. It installs into your user account." >&2
    exit 1
fi

for command_name in curl tar python3; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Missing prerequisite: $command_name" >&2
        exit 1
    fi
done

temporary_dir="$(mktemp -d)"
trap 'rm -rf -- "$temporary_dir"' EXIT

echo "Downloading iLinux Stats from the official GitHub repository..."
curl --fail --location --silent --show-error --retry 3 \
    --proto '=https' --tlsv1.2 \
    "$REPOSITORY_ARCHIVE" -o "$temporary_dir/source.tar.gz"

mkdir "$temporary_dir/source"
tar -xzf "$temporary_dir/source.tar.gz" \
    --strip-components=1 -C "$temporary_dir/source"

bash "$temporary_dir/source/install.sh"
