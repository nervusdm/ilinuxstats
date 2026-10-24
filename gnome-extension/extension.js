import St from 'gi://St';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const API = 'http://127.0.0.1:8765/api/stats';
const SETTINGS_API = 'http://127.0.0.1:8765/api/settings';
const DASHBOARD = 'http://127.0.0.1:8765/';
const MENU_TEXT = {"fr": {"configure": "Configurer les widgets de la barre", "show": "Afficher dans la barre", "format": "Format", "color": "Couleur", "position": "Position", "left": "Déplacer vers la gauche  ←", "right": "Déplacer vers la droite  →", "details": "Détails du système", "open": "Ouvrir le tableau de bord", "mode_value": "Valeur détaillée", "mode_compact": "Valeur compacte", "mode_graph": "Mini-graphique", "color_auto": "Automatique", "color_green": "Vert", "color_cyan": "Cyan", "color_orange": "Orange", "color_white": "Blanc", "cpu": "Processeur", "memory": "Mémoire", "disk": "Stockage", "network": "Réseau", "uptime": "Temps de fonctionnement", "cpu_detail": "CPU : {value}% · {count} cœurs", "mem_detail": "Mémoire : {used} / {total} ({value}%)", "disk_detail": "Disque {mount} : {used} / {total} ({value}%)", "net_detail": "Réseau {name} : ↓ {down} · ↑ {up}", "uptime_detail": "Depuis le démarrage : {days} j {hours} h", "offline": "iLinux Stats · hors ligne", "starting": "Collecteur en démarrage…"}, "en": {"configure": "Configure top bar widgets", "show": "Show in top bar", "format": "Format", "color": "Color", "position": "Position", "left": "Move left  ←", "right": "Move right  →", "details": "System details", "open": "Open dashboard", "mode_value": "Detailed value", "mode_compact": "Compact value", "mode_graph": "Mini graph", "color_auto": "Automatic", "color_green": "Green", "color_cyan": "Cyan", "color_orange": "Orange", "color_white": "White", "cpu": "Processor", "memory": "Memory", "disk": "Storage", "network": "Network", "uptime": "Uptime", "cpu_detail": "CPU: {value}% · {count} cores", "mem_detail": "Memory: {used} / {total} ({value}%)", "disk_detail": "Disk {mount}: {used} / {total} ({value}%)", "net_detail": "Network {name}: ↓ {down} · ↑ {up}", "uptime_detail": "Uptime: {days} d {hours} h", "offline": "iLinux Stats · offline", "starting": "Starting collector…"}, "es": {"configure": "Configurar widgets de la barra", "show": "Mostrar en la barra", "format": "Formato", "color": "Color", "position": "Posición", "left": "Mover a la izquierda  ←", "right": "Mover a la derecha  →", "details": "Detalles del sistema", "open": "Abrir el panel", "mode_value": "Valor detallado", "mode_compact": "Valor compacto", "mode_graph": "Minigráfico", "color_auto": "Automático", "color_green": "Verde", "color_cyan": "Cian", "color_orange": "Naranja", "color_white": "Blanco", "cpu": "Procesador", "memory": "Memoria", "disk": "Almacenamiento", "network": "Red", "uptime": "Tiempo activo", "cpu_detail": "CPU: {value}% · {count} núcleos", "mem_detail": "Memoria: {used} / {total} ({value}%)", "disk_detail": "Disco {mount}: {used} / {total} ({value}%)", "net_detail": "Red {name}: ↓ {down} · ↑ {up}", "uptime_detail": "Tiempo activo: {days} d {hours} h", "offline": "iLinux Stats · sin conexión", "starting": "Iniciando el recolector…"}, "zh": {"configure": "配置顶部栏组件", "show": "显示在顶部栏", "format": "显示格式", "color": "颜色", "position": "位置", "left": "向左移动  ←", "right": "向右移动  →", "details": "系统详情", "open": "打开仪表板", "mode_value": "详细数值", "mode_compact": "紧凑数值", "mode_graph": "迷你图表", "color_auto": "自动", "color_green": "绿色", "color_cyan": "青色", "color_orange": "橙色", "color_white": "白色", "cpu": "处理器", "memory": "内存", "disk": "存储", "network": "网络", "uptime": "运行时间", "cpu_detail": "CPU：{value}% · {count} 个核心", "mem_detail": "内存：{used} / {total}（{value}%）", "disk_detail": "磁盘 {mount}：{used} / {total}（{value}%）", "net_detail": "网络 {name}：↓ {down} · ↑ {up}", "uptime_detail": "运行时间：{days} 天 {hours} 小时", "offline": "iLinux Stats · 离线", "starting": "正在启动采集器…"}, "ja": {"configure": "トップバーウィジェットを設定", "show": "トップバーに表示", "format": "表示形式", "color": "色", "position": "位置", "left": "左へ移動  ←", "right": "右へ移動  →", "details": "システムの詳細", "open": "ダッシュボードを開く", "mode_value": "詳細な値", "mode_compact": "コンパクトな値", "mode_graph": "ミニグラフ", "color_auto": "自動", "color_green": "緑", "color_cyan": "シアン", "color_orange": "オレンジ", "color_white": "白", "cpu": "プロセッサ", "memory": "メモリ", "disk": "ストレージ", "network": "ネットワーク", "uptime": "稼働時間", "cpu_detail": "CPU：{value}% · {count} コア", "mem_detail": "メモリ：{used} / {total}（{value}%）", "disk_detail": "ディスク {mount}：{used} / {total}（{value}%）", "net_detail": "ネットワーク {name}：↓ {down} · ↑ {up}", "uptime_detail": "稼働時間：{days}日 {hours}時間", "offline": "iLinux Stats · オフライン", "starting": "コレクターを起動中…"}};
const ITEMS = [
    ['cpu', 'Processeur', '◉'], ['memory', 'Mémoire', '▤'],
    ['disk', 'Stockage', '▰'], ['network', 'Réseau', '⇅'],
    ['uptime', 'Temps de fonctionnement', '◷'],
];
const DEFAULT_CONFIG = Object.fromEntries(ITEMS.map(([key]) => [key, {mode: 'value', color: 'auto'}]));
const MODES = ['value', 'compact', 'graph'];
const COLORS = ['auto', 'green', 'cyan', 'orange', 'white'];

export default class ILinuxStatsExtension extends Extension {
    enable() {
        this._session = new Soup.Session();
        const locale = GLib.get_language_names().map(name => name.slice(0, 2).toLowerCase());
        this._language = locale.find(name => MENU_TEXT[name]) ?? 'en';
        this._widgets = ['cpu', 'memory'];
        this._panelConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this._history = Object.fromEntries(ITEMS.map(([key]) => [key, []]));
        this._panelLabels = {};
        this._loadingSettings = false;
        this._indicator = new PanelMenu.Button(0.0, 'iLinux Stats', false);
        this._panelBox = new St.BoxLayout({style_class: 'ilinuxstats-panel-box', y_align: 2});
        this._indicator.add_child(this._panelBox);

        this._cpuItem = new PopupMenu.PopupMenuItem('CPU : lecture…');
        this._memItem = new PopupMenu.PopupMenuItem('Mémoire : lecture…');
        this._diskItem = new PopupMenu.PopupMenuItem('Disque : lecture…');
        this._networkItem = new PopupMenu.PopupMenuItem('Réseau : lecture…');
        this._uptimeItem = new PopupMenu.PopupMenuItem('Depuis le démarrage : lecture…');

        const configTitle = new PopupMenu.PopupMenuItem(this._t('configure'));
        configTitle.setSensitive(false);
        this._indicator.menu.addMenuItem(configTitle);
        this._switches = {};
        this._buildWidgetSubmenus();
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const detailTitle = new PopupMenu.PopupMenuItem(this._t('details'));
        detailTitle.setSensitive(false);
        this._indicator.menu.addMenuItem(detailTitle);
        for (const item of [this._cpuItem, this._memItem, this._diskItem, this._networkItem, this._uptimeItem]) {
            item.setSensitive(false);
            this._indicator.menu.addMenuItem(item);
        }
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const openItem = new PopupMenu.PopupMenuItem(this._t('open'));
        openItem.connect('activate', () => Gio.AppInfo.launch_default_for_uri(DASHBOARD, null));
        this._indicator.menu.addMenuItem(openItem);

        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');
        this._startServer();
        this._loadSettings();
        this._refresh();
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            this._refresh();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _buildWidgetSubmenus() {
        for (const [key, title, icon] of ITEMS) {
            const group = new PopupMenu.PopupSubMenuMenuItem(`${icon}  ${this._t(key)}`, true);
            // Attach the submenu before adding child entries. GNOME Shell needs
            // its parent actor to exist while PopupMenu creates child actors.
            this._indicator.menu.addMenuItem(group);
            const visible = new PopupMenu.PopupSwitchMenuItem(this._t('show'), this._widgets.includes(key));
            visible.connect('toggled', (_item, state) => {
                if (this._loadingSettings)
                    return;
                this._widgets = state ? [...new Set([...this._widgets, key])] : this._widgets.filter(name => name !== key);
                this._savePanelConfig();
                this._rebuildPanel();
            });
            group.menu.addMenuItem(visible);
            this._switches[key] = visible;

            const formatTitle = new PopupMenu.PopupMenuItem(this._t('format'));
            formatTitle.setSensitive(false);
            group.menu.addMenuItem(formatTitle);
            this._modeItems ??= {};
            this._modeItems[key] = {};
            for (const mode of MODES) {
                const option = new PopupMenu.PopupMenuItem(this._t(`mode_${mode}`));
                option.connect('activate', () => {
                    this._panelConfig[key].mode = mode;
                    this._savePanelConfig();
                    this._refreshPanel();
                    this._updateOptionChecks(key);
                });
                this._modeItems[key][mode] = option;
                group.menu.addMenuItem(option);
            }

            const colorTitle = new PopupMenu.PopupMenuItem(this._t('color'));
            colorTitle.setSensitive(false);
            group.menu.addMenuItem(colorTitle);
            this._colorItems ??= {};
            this._colorItems[key] = {};
            for (const color of COLORS) {
                const option = new PopupMenu.PopupMenuItem(this._t(`color_${color}`));
                option.connect('activate', () => {
                    this._panelConfig[key].color = color;
                    this._savePanelConfig();
                    this._refreshPanel();
                    this._updateOptionChecks(key);
                });
                this._colorItems[key][color] = option;
                group.menu.addMenuItem(option);
            }

            const orderTitle = new PopupMenu.PopupMenuItem(this._t('position'));
            orderTitle.setSensitive(false);
            group.menu.addMenuItem(orderTitle);
            const moveUp = new PopupMenu.PopupMenuItem(this._t('left'));
            const moveDown = new PopupMenu.PopupMenuItem(this._t('right'));
            moveUp.connect('activate', () => this._moveWidget(key, -1));
            moveDown.connect('activate', () => this._moveWidget(key, 1));
            group.menu.addMenuItem(moveUp);
            group.menu.addMenuItem(moveDown);
        }
    }

    _updateOptionChecks(key) {
        const config = this._panelConfig[key];
        for (const [mode, item] of Object.entries(this._modeItems[key]))
            item.label.text = `${config.mode === mode ? '✓  ' : '    '}${this._t(`mode_${mode}`)}`;
        for (const [color, item] of Object.entries(this._colorItems[key]))
            item.label.text = `${config.color === color ? '✓  ' : '    '}${this._t(`color_${color}`)}`;
    }

    _moveWidget(key, direction) {
        const index = this._widgets.indexOf(key);
        if (index < 0)
            return;
        const next = Math.max(0, Math.min(this._widgets.length - 1, index + direction));
        if (next === index)
            return;
        const [item] = this._widgets.splice(index, 1);
        this._widgets.splice(next, 0, item);
        this._savePanelConfig();
        this._rebuildPanel();
    }

    _loadSettings() {
        const message = Soup.Message.new('GET', SETTINGS_API);
        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                const settings = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                this._widgets = settings.panel_widgets ?? ['cpu', 'memory'];
                this._panelConfig = {...JSON.parse(JSON.stringify(DEFAULT_CONFIG)), ...(settings.panel_config ?? {})};
                for (const key of Object.keys(DEFAULT_CONFIG))
                    this._panelConfig[key] = {...DEFAULT_CONFIG[key], ...(this._panelConfig[key] ?? {})};
                this._loadingSettings = true;
                for (const [key, item] of Object.entries(this._switches))
                    item.setToggleState(this._widgets.includes(key));
                this._loadingSettings = false;
                for (const [key] of ITEMS)
                    this._updateOptionChecks(key);
                this._rebuildPanel();
            } catch (_e) {
                // The metrics collector may still be starting.
            }
        });
    }

    _savePanelConfig() {
        const message = Soup.Message.new('POST', SETTINGS_API);
        message.set_request_body_from_bytes('application/json', GLib.Bytes.new(JSON.stringify({
            panel_widgets: this._widgets,
            panel_config: this._panelConfig,
        })));
        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try { session.send_and_read_finish(result); } catch (_e) {}
        });
    }

    _rebuildPanel() {
        for (const child of this._panelBox.get_children())
            this._panelBox.remove_child(child);
        this._panelLabels = {};
        for (const key of this._widgets) {
            const label = new St.Label({text: '—', y_align: 2});
            this._panelLabels[key] = label;
            this._panelBox.add_child(label);
        }
        this._refreshPanel();
    }

    _refreshPanel() {
        if (!this._latest)
            return;
        const s = this._latest;
        const disk = s.disks.find(d => d.mount === '/') ?? s.disks[0];
        const net = s.network.find(n => n.name !== 'lo' && n.up);
        const values = {
            cpu: {percent: s.cpu.percent, detail: `CPU ${Math.round(s.cpu.percent)}%`, compact: `${Math.round(s.cpu.percent)}%`},
            memory: {percent: s.memory.percent, detail: `RAM ${Math.round(s.memory.percent)}%`, compact: `${Math.round(s.memory.percent)}%`},
            disk: {percent: disk?.percent ?? 0, detail: disk ? `DISK ${Math.round(disk.percent)}%` : 'DISK —', compact: disk ? `${Math.round(disk.percent)}%` : '—'},
            network: {percent: net ? net.download + net.upload : 0, detail: net ? `↓${this._formatRate(net.download)} ↑${this._formatRate(net.upload)}` : 'Réseau —', compact: net ? `↓${this._formatRate(net.download)}` : '—'},
            uptime: {percent: 0, detail: `Uptime ${Math.floor(s.system.uptime / 3600 / 24)}j ${Math.floor(s.system.uptime / 3600) % 24}h`, compact: `${Math.floor(s.system.uptime / 3600 / 24)}j${Math.floor(s.system.uptime / 3600) % 24}h`},
        };
        for (const [key, value] of Object.entries(values)) {
            const series = this._history[key];
            series.push(value.percent);
            if (series.length > 12)
                series.shift();
            const config = this._panelConfig[key] ?? DEFAULT_CONFIG[key];
            const label = this._panelLabels[key];
            if (!label)
                continue;
            const mode = config.mode ?? 'value';
            let text = mode === 'compact' ? value.compact : value.detail;
            if (mode === 'graph' && key !== 'uptime')
                text = `${ITEMS.find(x => x[0] === key)[2]} ${this._sparkline(series)}`;
            label.set_text(text);
            label.set_style(`padding: 0 6px; color: ${this._color(config.color, value.percent, key)};`);
        }
    }

    _sparkline(values) {
        const glyphs = '▁▂▃▄▅▆▇█';
        if (!values.length)
            return '▁';
        const max = Math.max(...values, 1);
        return values.map(value => glyphs[Math.min(7, Math.round((value / max) * 7))]).join('');
    }

    _color(color, value, key) {
        if (color === 'auto') {
            if (['cpu', 'memory', 'disk'].includes(key) && value >= 92)
                return '#ff7878';
            if (['cpu', 'memory', 'disk'].includes(key) && value >= 80)
                return '#ffb86b';
            return ({cpu: '#b6f36b', memory: '#6de3cf', disk: '#ffb86b', network: '#6de3cf', uptime: '#c4cec6'})[key];
        }
        return ({green: '#b6f36b', cyan: '#6de3cf', orange: '#ffb86b', white: '#f0f4ef'})[color] ?? '#b6f36b';
    }

    _startServer() {
        const server = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'ilinuxstats', 'server.py']);
        if (!GLib.file_test(server, GLib.FileTest.EXISTS))
            return;
        try {
            this._serverProcess = Gio.Subprocess.new(['python3', server], Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE);
        } catch (e) {
            console.error(`iLinux Stats: impossible de démarrer le collecteur : ${e.message}`);
        }
    }

    _refresh() {
        const message = Soup.Message.new('GET', API);
        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                const stats = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                this._latest = stats;
                this._refreshPanel();
                const cpu = Math.round(stats.cpu.percent);
                const ram = Math.round(stats.memory.percent);
                this._cpuItem.label.text = this._t('cpu_detail', {value: cpu, count: stats.cpu.count});
                this._memItem.label.text = this._t('mem_detail', {used: this._formatBytes(stats.memory.used), total: this._formatBytes(stats.memory.total), value: ram});
                const disk = stats.disks.find(d => d.mount === '/') ?? stats.disks[0];
                this._diskItem.label.text = disk ? this._t('disk_detail', {mount: disk.mount, used: this._formatBytes(disk.used), total: this._formatBytes(disk.total), value: Math.round(disk.percent)}) : `${this._t('disk')} —`;
                const net = stats.network.find(n => n.name !== 'lo' && n.up);
                this._networkItem.label.text = net ? this._t('net_detail', {name: net.name, down: this._formatRate(net.download), up: this._formatRate(net.upload)}) : `${this._t('network')} —`;
                const uptime = Math.floor(stats.system.uptime / 3600);
                this._uptimeItem.label.text = this._t('uptime_detail', {days: Math.floor(uptime / 24), hours: uptime % 24});
            } catch (_e) {
                if (!this._latest)
                    this._panelLabels.cpu?.set_text(this._t('offline'));
                this._cpuItem.label.text = this._t('starting');
            }
        });
    }

    _t(key, values = {}) {
        return (MENU_TEXT[this._language][key] ?? MENU_TEXT.en[key] ?? key).replace(/\{(\w+)\}/g, (_m, name) => values[name] ?? '');
    }

    _formatBytes(value) {
        const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
        let i = 0;
        while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
        return `${value.toFixed(i < 2 ? 0 : 1)} ${units[i]}`;
    }

    _formatRate(value) { return `${this._formatBytes(value)}/s`; }

    disable() {
        if (this._timer) {
            GLib.source_remove(this._timer);
            this._timer = null;
        }
        this._session?.abort();
        this._indicator?.destroy();
        this._indicator = null;
        this._latest = null;
        this._session = null;
    }
}
