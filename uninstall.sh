#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$HOME/.local/share/ilinuxstats"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/ilinuxstats@local"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/ilinuxstats"
DESKTOP_FILE="$HOME/.local/share/applications/ilinuxstats.desktop"

if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions disable ilinuxstats@local 2>/dev/null || true
fi

# Stop only processes launched from this app's own installation directory.
for cmdline in /proc/[0-9]*/cmdline; do
    [[ -r "$cmdline" ]] || continue
    if tr '\0' ' ' < "$cmdline" | grep -Fq "$APP_DIR/server.py"; then
        pid="${cmdline#/proc/}"
        pid="${pid%/cmdline}"
        [[ "$pid" == "$$" ]] || kill "$pid" 2>/dev/null || true
    fi
done

rm -rf -- "$APP_DIR" "$EXT_DIR"
rm -f -- "$DESKTOP_FILE"

if command -v gsettings >/dev/null 2>&1; then
    current="$(gsettings get org.gnome.shell enabled-extensions 2>/dev/null || echo '[]')"
    updated="$(python3 -c 'import ast,sys; values=[x for x in ast.literal_eval(sys.argv[1]) if x != "ilinuxstats@local"]; print(repr(values))' "$current")"
    gsettings set org.gnome.shell enabled-extensions "$updated" 2>/dev/null || true
fi

echo "Application, extension GNOME et raccourci supprimés."
if [[ -d "$STATE_DIR" ]]; then
    read -r -p "Supprimer aussi les statistiques enregistrées et la configuration ? [y/N] " answer
    case "$answer" in
        y|Y|yes|YES|o|O|oui|OUI) rm -rf -- "$STATE_DIR"; echo "Historique et configuration supprimés." ;;
        *) echo "Historique et configuration conservés dans $STATE_DIR." ;;
    esac
fi
echo "Les préférences d'affichage du navigateur (localStorage) peuvent être supprimées via les données du site http://127.0.0.1:8765."
