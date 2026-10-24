#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
INSTALL_DIR="$HOME/.local/share/ilinuxstats"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/ilinuxstats"
python3 - <<'PY'
import importlib.util, sys
if importlib.util.find_spec('psutil') is None:
    sys.exit('psutil est requis. Installez-le avec : python3 -m pip install --user psutil')
PY
mkdir -p "$INSTALL_DIR/locales" "$HOME/.local/share/applications" "$HOME/.local/share/gnome-shell/extensions/ilinuxstats@local"
cp "$APP_DIR/server.py" "$APP_DIR/index.html" "$APP_DIR/run.sh" "$APP_DIR/uninstall.sh" "$INSTALL_DIR/"
cp "$APP_DIR"/locales/*.json "$INSTALL_DIR/locales/"
cp -R "$APP_DIR/gnome-extension/." "$HOME/.local/share/gnome-shell/extensions/ilinuxstats@local/"
chmod +x "$INSTALL_DIR/run.sh"
chmod +x "$INSTALL_DIR/uninstall.sh"
if [[ -f "$STATE_DIR/server.pid" ]]; then
    server_pid="$(cat "$STATE_DIR/server.pid")"
    if [[ -r "/proc/$server_pid/cmdline" ]] && tr '\0' ' ' < "/proc/$server_pid/cmdline" | grep -Fq "$INSTALL_DIR/server.py"; then
        kill "$server_pid" 2>/dev/null || true
    fi
    rm -f "$STATE_DIR/server.pid"
fi
cat > "$HOME/.local/share/applications/ilinuxstats.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=iLinux Stats
Comment=Statistiques système en temps réel
Exec=$INSTALL_DIR/run.sh
Icon=utilities-system-monitor
Terminal=false
Categories=System;Monitor;
DESKTOP
chmod +x "$APP_DIR/run.sh" "$APP_DIR/install.sh" "$APP_DIR/uninstall.sh"
if command -v gsettings >/dev/null 2>&1; then
    current="$(gsettings get org.gnome.shell enabled-extensions 2>/dev/null || echo '[]')"
    updated="$(python3 -c 'import ast,sys; values=list(ast.literal_eval(sys.argv[1])); values.append("ilinuxstats@local") if "ilinuxstats@local" not in values else None; print(repr(values))' "$current")"
    gsettings set org.gnome.shell enabled-extensions "$updated"
fi
echo "iLinux Stats installé dans $INSTALL_DIR."
echo "Indicateur GNOME : CPU et RAM dans la barre supérieure, clic pour les détails."
echo "Déconnectez-vous puis reconnectez-vous pour charger l'extension GNOME (session Wayland)."
