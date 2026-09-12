"""
Truck Performance - Multimapa
Janela simples (Tkinter) que fala com o serviço local (api.py) por HTTP.
Empacotada em .exe com PyInstaller - ver build.bat.
"""
import json
import math
import sys
import threading
import tkinter as tk
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from patch_labels import friendly_label
from state import load_state, save_state
from audit import log_apply
from map_switch_data import (
    MAP_SWITCH_TABLES, read_global_params, read_rpm_limiter,
    RAL_TABLES, read_ral_global, read_ral_enabled,
)

BASE_URL = "http://127.0.0.1:8787"

# Caminho fixo do .env no PC do usuário (onde o serviço/ agente vive).
ENV_PATH = Path(r"C:\Users\Avell\OneDrive\Desktop\truck-performance\services\simos18-agent\.env")

# Paleta (bate com o icone: fundo escuro + laranja de destaque)
BG = "#14161c"
PANEL = "#1c1f27"
BORDER = "#2a2e38"
FG = "#e8e8ea"
MUTED = "#9aa0ab"
ACCENT = "#ff7a1a"
ACCENT_ACTIVE = "#ffa14d"
ACCENT_DARK = "#c75f14"


def resource_path(name: str) -> str:
    """Acha um arquivo empacotado junto do .exe (PyInstaller) ou, em
    desenvolvimento, ao lado deste script."""
    base = getattr(sys, "_MEIPASS", None) or Path(__file__).parent
    return str(Path(base) / name)


def read_api_key() -> str:
    if not ENV_PATH.is_file():
        return ""
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if line.startswith("API_KEY="):
            return line.split("=", 1)[1].strip()
    return ""


def multipart_request(path: str, fields: dict, files: dict, api_key: str, method: str = "POST"):
    """fields: {name: str}. files: {name: (filename, filepath)}. Returns (status, bytes)."""
    boundary = uuid.uuid4().hex
    body = bytearray()

    for name, value in fields.items():
        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
        body += f"{value}\r\n".encode()

    for name, (filename, filepath) in files.items():
        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode()
        body += b"Content-Type: application/octet-stream\r\n\r\n"
        body += Path(filepath).read_bytes()
        body += b"\r\n"

    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=bytes(body),
        method=method,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Truck Performance - Multimapa")
        self.geometry("820x1000")
        self.resizable(False, False)
        self.configure(bg=BG)

        try:
            self.iconbitmap(resource_path("icon.ico"))
        except Exception:
            pass

        self._header_img = tk.PhotoImage(file=resource_path("icon_header.png"))
        self._setup_style()

        self._state = load_state()

        self.api_key = read_api_key()
        self.bin_path = tk.StringVar()
        self.hw_code = tk.StringVar(value="-")
        self.software_code = tk.StringVar(value="-")
        self.mode = tk.StringVar(value=self._state.get("last_mode", "ignore"))
        self.mode.trace_add("write", self._on_mode_change)
        self.patch_names: list[str] = []
        self.xdf_entries: list[dict] = []
        self.hw_short = ""
        self.sim_rpm = tk.IntVar(value=3000)
        self.sim_pedal = tk.IntVar(value=80)
        self.sim_slot = tk.IntVar(value=1)
        self.sim_ral_active = tk.BooleanVar(value=False)
        self.edc_bin_path = tk.StringVar()
        self.edc_hw_code = tk.StringVar(value="-")
        self.edc_software_code = tk.StringVar(value="-")
        self.edc_patch_path = tk.StringVar()
        self._sim_data: bytes | None = None
        self._sim_data_path: str | None = None
        self._sim_params: dict | None = None
        self._map_box_rects: list = []

        self._build_ui()
        self._draw_dashboard()
        self._check_server()

    # ---------------------------------------------------------------- UI --
    def _setup_style(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure(".", background=BG, foreground=FG, font=("Segoe UI", 9))
        style.configure("TFrame", background=BG)
        style.configure("TLabel", background=BG, foreground=FG)
        style.configure("Muted.TLabel", background=BG, foreground=MUTED)
        style.configure("Value.TLabel", background=BG, foreground=ACCENT, font=("Segoe UI", 9, "bold"))

        style.configure("TLabelframe", background=BG, bordercolor=BORDER, relief="solid")
        style.configure("TLabelframe.Label", background=BG, foreground=ACCENT, font=("Segoe UI", 9, "bold"))

        style.configure("TButton", background=PANEL, foreground=FG, bordercolor=BORDER,
                         focuscolor=BG, padding=(10, 6), relief="flat")
        style.map("TButton", background=[("active", BORDER)])

        style.configure("Accent.TButton", background=ACCENT, foreground="#171717",
                         bordercolor=ACCENT_DARK, padding=(12, 8), font=("Segoe UI", 9, "bold"))
        style.map("Accent.TButton", background=[("active", ACCENT_ACTIVE)])

        style.configure("TRadiobutton", background=BG, foreground=FG)
        style.map("TRadiobutton", background=[("active", BG)])

        style.configure("TEntry", fieldbackground=PANEL, foreground=FG,
                         insertcolor=FG, bordercolor=BORDER)

        style.configure("Vertical.TScrollbar", background=PANEL, troughcolor=BG,
                         bordercolor=BG, arrowcolor=MUTED)

        style.configure("TNotebook", background=BG, borderwidth=0)
        style.configure("TNotebook.Tab", background=PANEL, foreground=MUTED,
                         padding=(16, 8), font=("Segoe UI", 9, "bold"))
        style.map("TNotebook.Tab", background=[("selected", BG)], foreground=[("selected", ACCENT)])

    def _listbox(self, parent, **kwargs) -> tk.Listbox:
        return tk.Listbox(
            parent, bg=PANEL, fg=FG, selectbackground=ACCENT, selectforeground="#171717",
            activestyle="none", highlightthickness=0, borderwidth=0, **kwargs,
        )

    def _build_ui(self):
        pad = {"padx": 12, "pady": 3}

        header = tk.Frame(self, bg=PANEL)
        header.pack(fill="x")
        tk.Label(header, image=self._header_img, bg=PANEL).pack(side="left", padx=14, pady=6)
        title_box = tk.Frame(header, bg=PANEL)
        title_box.pack(side="left", pady=6)
        tk.Label(title_box, text="TRUCK PERFORMANCE", bg=PANEL, fg=ACCENT,
                 font=("Segoe UI", 14, "bold")).pack(anchor="w")
        tk.Label(title_box, text="Agente de Multimapa — Simos18", bg=PANEL, fg=MUTED,
                 font=("Segoe UI", 9)).pack(anchor="w")

        self.status = tk.StringVar(value="Verificando serviço local...")
        tk.Label(self, textvariable=self.status, bg=BG, fg=MUTED, anchor="w").pack(
            side="bottom", fill="x", padx=14, pady=(2, 10))

        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True)
        self.notebook = notebook

        tab1 = ttk.Frame(notebook)
        tab2 = ttk.Frame(notebook)
        notebook.add(tab1, text="  Simos18 — Multimapa  ")
        notebook.add(tab2, text="  EDC17 (Amarok V6) — Teste  ")

        self._build_simos_tab(tab1, pad)
        self._build_edc17_tab(tab2, pad)

    def _build_simos_tab(self, tab1, pad):
        frm_bin = ttk.LabelFrame(tab1, text="1.  Arquivo do cliente (.bin)")
        frm_bin.pack(fill="x", **pad)
        ttk.Entry(frm_bin, textvariable=self.bin_path, width=70).pack(side="left", padx=8, pady=8)
        ttk.Button(frm_bin, text="Escolher...", command=self.choose_bin).pack(side="left")

        frm_info = ttk.LabelFrame(tab1, text="2.  Identificação")
        frm_info.pack(fill="x", **pad)
        ttk.Button(frm_info, text="Identificar", command=self.on_identify).pack(side="left", padx=8, pady=8)
        ttk.Label(frm_info, text="Hardware:", style="Muted.TLabel").pack(side="left", padx=(20, 4))
        ttk.Label(frm_info, textvariable=self.hw_code, style="Value.TLabel").pack(side="left")
        ttk.Label(frm_info, text="Software code:", style="Muted.TLabel").pack(side="left", padx=(20, 4))
        ttk.Label(frm_info, textvariable=self.software_code, style="Value.TLabel").pack(side="left")

        frm_patch = ttk.LabelFrame(tab1, text="3.  Patch(es) a aplicar")
        frm_patch.pack(fill="both", expand=True, **pad)
        self.listbox = self._listbox(frm_patch, selectmode="multiple", height=4)
        self.listbox.pack(side="left", fill="both", expand=True, padx=8, pady=8)
        scroll = ttk.Scrollbar(frm_patch, command=self.listbox.yview)
        scroll.pack(side="left", fill="y")
        self.listbox.config(yscrollcommand=scroll.set)

        frm_mode = ttk.LabelFrame(tab1, text="4.  Modo")
        frm_mode.pack(fill="x", **pad)
        for text, value in [("ignore  —  preserva o Stage do cliente (padrão)", "ignore"),
                             ("normal  —  recusa se o CAL já foi alterado", "normal"),
                             ("force  —  sobrescreve tudo, inclusive calibração", "force")]:
            ttk.Radiobutton(frm_mode, text=text, value=value, variable=self.mode).pack(anchor="w", padx=8, pady=1)

        frm_action = ttk.Frame(tab1)
        frm_action.pack(fill="x", **pad)
        ttk.Button(frm_action, text="Aplicar e salvar como...", style="Accent.TButton",
                   command=self.on_apply).pack(side="left")

        frm_xdf = ttk.LabelFrame(tab1, text="5.  XDF compatível  (editar mapas no WinOLS/TunerPro)")
        frm_xdf.pack(fill="both", expand=True, **pad)
        self.xdf_listbox = self._listbox(frm_xdf, selectmode="browse", height=3)
        self.xdf_listbox.pack(side="left", fill="both", expand=True, padx=8, pady=8)
        xdf_scroll = ttk.Scrollbar(frm_xdf, command=self.xdf_listbox.yview)
        xdf_scroll.pack(side="left", fill="y")
        self.xdf_listbox.config(yscrollcommand=xdf_scroll.set)
        ttk.Button(frm_xdf, text="Baixar XDF\nselecionado", command=self.on_download_xdf).pack(side="left", padx=8)

        frm_sim = ttk.LabelFrame(tab1, text="6.  Painel de troca de mapa  (ao vivo, lê os valores reais do arquivo)")
        frm_sim.pack(fill="both", expand=True, **pad)

        sliders = ttk.Frame(frm_sim)
        sliders.pack(fill="x", padx=8, pady=(8, 0))

        tk.Scale(sliders, from_=0, to=5000, orient="horizontal", length=280, resolution=50,
                 variable=self.sim_rpm, command=lambda _e: self._on_sim_change(),
                 bg=PANEL, fg=FG, troughcolor=BORDER, highlightthickness=0,
                 activebackground=ACCENT, label="RPM atual").pack(side="left", padx=(0, 20))

        tk.Scale(sliders, from_=0, to=100, orient="horizontal", length=170, resolution=1,
                 variable=self.sim_pedal, command=lambda _e: self._on_sim_change(),
                 bg=PANEL, fg=FG, troughcolor=BORDER, highlightthickness=0,
                 activebackground=ACCENT, label="Pedal atual (%)").pack(side="left", padx=(0, 20))

        ral_btn = tk.Checkbutton(
            sliders, text="🔥 Simular corte\nAnti-Lag (pé fora)", variable=self.sim_ral_active,
            command=self._on_sim_change, indicatoron=False, selectcolor=ACCENT_DARK,
            bg=PANEL, fg=FG, activebackground=BORDER, activeforeground=FG,
            highlightthickness=0, relief="flat", padx=10, pady=6, font=("Segoe UI", 9, "bold"),
        )
        ral_btn.pack(side="left", anchor="s")

        self.sim_canvas = tk.Canvas(frm_sim, width=780, height=320, bg=PANEL, highlightthickness=0)
        self.sim_canvas.pack(padx=8, pady=8)
        self.sim_canvas.bind("<Button-1>", self._on_canvas_click)

        ttk.Label(frm_sim, text="Clique num quadrado \"Mapa N\" pra selecioná-lo.",
                  style="Muted.TLabel").pack(anchor="w", padx=8, pady=(0, 8))

    def _build_edc17_tab(self, tab2, pad):
        warn = ttk.LabelFrame(tab2, text="⚠ Experimental")
        warn.pack(fill="x", **pad)
        ttk.Label(
            warn, style="Muted.TLabel", wraplength=740, justify="left",
            text="EDC17CP54 (Amarok V6 diesel) - não sabemos o layout real de calibração dessa "
                 "plataforma, então só o modo FORCE tem efeito (sobrescreve tudo). Nunca testado "
                 "em bancada real, só validado byte a byte contra um arquivo de referência. "
                 "O patch só se aplica ao software code exato pra que foi criado (o motor recusa "
                 "aplicar em software code diferente).",
        ).pack(fill="x", padx=8, pady=8)

        frm_bin = ttk.LabelFrame(tab2, text="1.  Arquivo do cliente (.bin/.ori)")
        frm_bin.pack(fill="x", **pad)
        ttk.Entry(frm_bin, textvariable=self.edc_bin_path, width=70).pack(side="left", padx=8, pady=8)
        ttk.Button(frm_bin, text="Escolher...", command=self.choose_edc_bin).pack(side="left")

        frm_info = ttk.LabelFrame(tab2, text="2.  Identificação")
        frm_info.pack(fill="x", **pad)
        ttk.Button(frm_info, text="Identificar", command=self.on_edc_identify).pack(side="left", padx=8, pady=8)
        ttk.Label(frm_info, text="Hardware:", style="Muted.TLabel").pack(side="left", padx=(20, 4))
        ttk.Label(frm_info, textvariable=self.edc_hw_code, style="Value.TLabel").pack(side="left")
        ttk.Label(frm_info, text="Software code:", style="Muted.TLabel").pack(side="left", padx=(20, 4))
        ttk.Label(frm_info, textvariable=self.edc_software_code, style="Value.TLabel").pack(side="left")

        frm_patch = ttk.LabelFrame(tab2, text="3.  Patch (.btp) a aplicar")
        frm_patch.pack(fill="x", **pad)
        ttk.Entry(frm_patch, textvariable=self.edc_patch_path, width=70).pack(side="left", padx=8, pady=8)
        ttk.Button(frm_patch, text="Escolher .btp...", command=self.choose_edc_patch).pack(side="left")

        frm_action = ttk.Frame(tab2)
        frm_action.pack(fill="x", **pad)
        ttk.Button(frm_action, text="Aplicar (modo force) e salvar como...", style="Accent.TButton",
                   command=self.on_edc_apply).pack(side="left")
        ttk.Label(frm_action, text="modo: force (fixo nessa aba)", style="Muted.TLabel").pack(side="left", padx=(16, 0))

    # ------------------------------------------------------------ helpers --
    def _check_server(self):
        def run():
            try:
                urllib.request.urlopen(f"{BASE_URL}/health", timeout=3)
                self.status.set("Serviço local conectado.")
            except Exception:
                self.status.set(
                    "Não consegui falar com o serviço local (127.0.0.1:8787). "
                    "Ele está rodando? (deveria subir sozinho no login)"
                )
        threading.Thread(target=run, daemon=True).start()

    def _on_mode_change(self, *_args):
        self._state["last_mode"] = self.mode.get()
        save_state(self._state)

    def choose_bin(self):
        path = filedialog.askopenfilename(
            title="Escolha o .bin do cliente",
            initialdir=self._state.get("last_dir") or None,
            filetypes=[("BIN files", "*.bin"), ("Todos", "*.*")],
        )
        if path:
            self.bin_path.set(path)
            self._state["last_dir"] = str(Path(path).parent)
            save_state(self._state)

    def on_identify(self):
        if not self.bin_path.get():
            messagebox.showwarning("Atenção", "Escolha o arquivo .bin primeiro.")
            return
        if not self.api_key:
            messagebox.showerror("Erro", f"Não achei API_KEY em {ENV_PATH}")
            return

        def run():
            self.status.set("Identificando...")
            status, data = multipart_request(
                "/identify", {}, {"bin": (Path(self.bin_path.get()).name, self.bin_path.get())}, self.api_key
            )
            if status != 200:
                self.status.set("Falha ao identificar.")
                messagebox.showerror("Erro", data.decode(errors="replace"))
                return

            info = json.loads(data)
            self.hw_code.set(info["hardware"])
            self.software_code.set(info["software_code"])
            self.hw_short = "".join(ch for ch in info["software_code"] if ch.isalnum())[-3:]
            self.status.set("Identificado. Buscando patches e XDFs disponíveis...")
            self._load_patches(info["software_code"])
            self._load_xdf(info["software_code"])
            self._refresh_sim_data()

        threading.Thread(target=run, daemon=True).start()

    def _refresh_sim_data(self):
        """Recarrega os bytes do bin atual pro painel (seção 6) e redesenha."""
        path = self.bin_path.get()
        try:
            self._sim_data = Path(path).read_bytes()
            self._sim_data_path = path
        except Exception:
            self._sim_data = None
            self._sim_data_path = None

        if self._sim_data is not None and self.hw_short in MAP_SWITCH_TABLES:
            self._sim_params = read_global_params(self._sim_data, self.hw_short)
        else:
            self._sim_params = None

        self._draw_dashboard()

    def _on_sim_change(self):
        # o arquivo pode ter mudado (ex.: escolheu outro) sem re-identificar -
        # so recarrega se ainda nao tiver dado em cache pra esse caminho
        if self._sim_data is None or self._sim_data_path != self.bin_path.get():
            self._refresh_sim_data()
        else:
            self._draw_dashboard()

    def _on_canvas_click(self, event):
        for (x1, y1, x2, y2, slot) in self._map_box_rects:
            if x1 <= event.x <= x2 and y1 <= event.y <= y2:
                self.sim_slot.set(slot)
                self.sim_rpm.set(slot * 1000)  # so o painel reage visivelmente ao trocar de mapa
                self._draw_dashboard()
                return

    def _draw_dashboard(self):
        c = self.sim_canvas
        c.delete("all")
        w, h = 780, 320

        if not self.hw_short:
            c.create_text(w / 2, h / 2, fill=MUTED, font=("Segoe UI", 10),
                           text="Escolha e identifique um arquivo (seção 1-2) pra ver o painel.")
            return
        if self.hw_short not in MAP_SWITCH_TABLES:
            c.create_text(w / 2, h / 2, fill=MUTED, font=("Segoe UI", 10),
                           text=f"Painel ainda não configurado para o hardware code '{self.hw_short}' (só S50 por enquanto).")
            return
        if self._sim_params is None:
            c.create_text(w / 2, h / 2, fill=MUTED, font=("Segoe UI", 10), text="Não consegui ler o arquivo.")
            return

        rpm = self.sim_rpm.get()
        pedal = self.sim_pedal.get()
        slot = self.sim_slot.get()
        params = self._sim_params
        min_rpm = params["min_rpm"]["value"]
        min_pedal = params["min_pedal_pct"]["value"]
        rpm_ok = rpm >= min_rpm
        pedal_ok = pedal >= min_pedal
        allowed = rpm_ok and pedal_ok

        # --- medidor de RPM (semicirculo) ---
        cx, cy, r = 140, 175, 105
        max_rpm = 5000

        def angle_for(value):
            frac = max(0.0, min(1.0, value / max_rpm))
            return 180 - 180 * frac

        c.create_arc(cx - r, cy - r, cx + r, cy + r, start=0, extent=180,
                     style="arc", outline=BORDER, width=16)
        ok_extent = angle_for(min_rpm)
        c.create_arc(cx - r, cy - r, cx + r, cy + r, start=0, extent=ok_extent,
                     style="arc", outline=(ACCENT if rpm_ok else ACCENT_DARK), width=16)
        needle_angle = math.radians(angle_for(rpm))
        nx = cx + (r - 14) * math.cos(needle_angle)
        ny = cy - (r - 14) * math.sin(needle_angle)
        c.create_line(cx, cy, nx, ny, fill=FG, width=3)
        c.create_oval(cx - 7, cy - 7, cx + 7, cy + 7, fill=FG, outline=FG)
        c.create_text(cx, cy + 28, text=f"{rpm} rpm", fill=FG, font=("Segoe UI", 13, "bold"))
        c.create_text(cx, cy + 48, text=f"mín. p/ trocar: {min_rpm:.0f} rpm", fill=MUTED, font=("Segoe UI", 8))

        # --- barra de pedal (vertical) ---
        bx, by, bw, bh = 310, 40, 44, 160
        c.create_rectangle(bx, by, bx + bw, by + bh, outline=BORDER, width=2)
        fill_h = bh * (pedal / 100)
        c.create_rectangle(bx, by + bh - fill_h, bx + bw, by + bh,
                            fill=(ACCENT if pedal_ok else ACCENT_DARK), outline="")
        marker_y = by + bh - bh * (min_pedal / 100)
        c.create_line(bx - 8, marker_y, bx + bw + 8, marker_y, fill=FG, width=2, dash=(3, 2))
        c.create_text(bx + bw / 2, by - 16, text="Pedal", fill=MUTED, font=("Segoe UI", 8))
        c.create_text(bx + bw / 2, by + bh + 20, text=f"{pedal}%", fill=FG, font=("Segoe UI", 12, "bold"))
        c.create_text(bx + bw / 2, by + bh + 38, text=f"mín: {min_pedal:.0f}%", fill=MUTED, font=("Segoe UI", 8))

        # --- quadrados dos mapas (clicaveis) ---
        self._map_box_rects = []
        box_w, box_h, gap = 72, 55, 8
        start_x = 420
        for i in range(1, 5):
            x1 = start_x + (i - 1) * (box_w + gap)
            y1 = 20
            x2, y2 = x1 + box_w, y1 + box_h
            selected = (i == slot)
            if selected:
                fill = ACCENT if allowed else "#c0392b"
                outline = FG
                text_color = "#171717"
            else:
                fill = BG
                outline = BORDER
                text_color = MUTED
            c.create_rectangle(x1, y1, x2, y2, fill=fill, outline=outline, width=2)
            c.create_text((x1 + x2) / 2, (y1 + y2) / 2, text=f"Mapa {i}", fill=text_color,
                           font=("Segoe UI", 10, "bold"))
            self._map_box_rects.append((x1, y1, x2, y2, i))

        # --- status + limitador do mapa selecionado ---
        limiter = read_rpm_limiter(self._sim_data, self.hw_short, slot)
        status_text = "TROCA PERMITIDA" if allowed else "TROCA BLOQUEADA"
        status_color = ACCENT if allowed else "#e05c4a"
        cx2 = start_x + 2 * (box_w + gap) - gap / 2
        c.create_text(cx2, 100, text=status_text, fill=status_color, font=("Segoe UI", 15, "bold"))

        if limiter is None:
            limiter_text = "Limitador de RPM: não encontrado"
        elif limiter == 0:
            limiter_text = f"Limitador de RPM do Mapa {slot}: 0 (ainda não configurado no WinOLS)"
        else:
            limiter_text = f"Limitador de RPM do Mapa {slot}: {limiter} rpm"
        c.create_text(cx2, 135, text=limiter_text, fill=MUTED, font=("Segoe UI", 9))
        c.create_text(cx2, 160, text=f"Timeout da troca: {params['timeout_ms']['value']} ms", fill=MUTED, font=("Segoe UI", 9))
        c.create_text(cx2, 185, text=f"RPM alvo pós-troca: {params['target_rpm']['value']} rpm", fill=MUTED, font=("Segoe UI", 9))
        c.create_text(cx2, 220, text="(calculadora sobre a calibração - não substitui teste em bancada)",
                      fill=MUTED, font=("Segoe UI", 7, "italic"))

        # --- Anti-Lag (RAL) ---
        c.create_line(20, 240, w - 20, 240, fill=BORDER, width=1)

        ral = read_ral_global(self._sim_data, self.hw_short) if self.hw_short in RAL_TABLES else {}
        ral_enabled_file = read_ral_enabled(self._sim_data, self.hw_short, slot) if ral else None

        lift_off = pedal <= 10
        ral_would_fire = self.sim_ral_active.get() and lift_off and rpm >= 1500

        flame_cx, flame_cy = 90, 285
        flame_color = "#ff5a1f" if ral_would_fire else BORDER
        c.create_text(flame_cx, flame_cy, text="🔥", font=("Segoe UI Emoji", 26),
                      fill=flame_color)

        ral_status = "ANTI-LAG ATIVO" if ral_would_fire else "Anti-Lag inativo"
        ral_color = "#ff5a1f" if ral_would_fire else MUTED
        c.create_text(180, 265, text=ral_status, fill=ral_color, font=("Segoe UI", 12, "bold"), anchor="w")

        if ral:
            cond_text = (
                f"Precisa: pé fora (≤10%) e RPM ≥1500  |  motor ≥ {ral['min_oil_temp_c']['value']:.0f}°C óleo, "
                f"≥ {ral['min_coolant_temp_c']['value']:.0f}°C arrefecimento, desacelerando < {ral['max_accel_ms2']['value']:.2f} m/s²"
            )
            c.create_text(180, 288, text=cond_text, fill=MUTED, font=("Segoe UI", 7), anchor="w")
            if ral_enabled_file is False:
                c.create_text(180, 305, anchor="w", fill=MUTED, font=("Segoe UI", 7, "italic"),
                              text=f"(o Mapa {slot} ainda está com RAL desligado no arquivo - isto é ilustrativo)")
        else:
            c.create_text(180, 288, text="Anti-Lag não configurado para este hardware code.",
                          fill=MUTED, font=("Segoe UI", 8), anchor="w")

    def _load_patches(self, software_code: str):
        # o código de hardware (ex. S50) normalmente são os 3 últimos
        # caracteres úteis do software code retornado pelo /identify
        hw_hint = "".join(ch for ch in software_code if ch.isalnum())[-3:]

        req = urllib.request.Request(
            f"{BASE_URL}/patches?hw_code={hw_hint}",
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
        except Exception as e:
            self.status.set(f"Erro ao listar patches: {e}")
            return

        self.patch_names = result.get("patches", [])
        self.listbox.delete(0, "end")
        for name in self.patch_names:
            self.listbox.insert("end", friendly_label(name))

        # pre-marca o combo recomendado (SwitchPatch + anti-brick) - o usuario
        # pode desmarcar se nao quiser
        RECOMMENDED = ("sl patch", "sl cbrick")
        for i, name in enumerate(self.patch_names):
            if name.lower().startswith(RECOMMENDED):
                self.listbox.selection_set(i)

        self.status.set(f"{len(self.patch_names)} patch(es) disponível(is) para {hw_hint}.")

    def _load_xdf(self, software_code: str):
        hw_hint = "".join(ch for ch in software_code if ch.isalnum())[-3:]

        req = urllib.request.Request(
            f"{BASE_URL}/xdf?hw_code={hw_hint}",
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
        except Exception as e:
            self.status.set(f"Erro ao listar XDFs: {e}")
            return

        self.xdf_entries = result.get("xdf", [])
        self.xdf_listbox.delete(0, "end")
        for entry in self.xdf_entries:
            self.xdf_listbox.insert("end", f"{entry['name']}   [{entry['folder']}]")

    def on_download_xdf(self):
        selection = self.xdf_listbox.curselection()
        if not selection:
            messagebox.showwarning("Atenção", "Selecione um XDF na lista primeiro (identifique um bin antes).")
            return

        entry = self.xdf_entries[selection[0]]
        output_path = filedialog.asksaveasfilename(
            title="Salvar XDF",
            defaultextension=".xdf",
            filetypes=[("XDF files", "*.xdf")],
            initialfile=entry["name"],
        )
        if not output_path:
            return

        def run():
            self.status.set(f"Baixando {entry['name']}...")
            req = urllib.request.Request(
                f"{BASE_URL}/xdf/download?path={urllib.parse.quote(entry['path'])}",
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    Path(output_path).write_bytes(resp.read())
                self.status.set(f"XDF salvo em {output_path}")
            except Exception as e:
                self.status.set("Falha ao baixar XDF.")
                messagebox.showerror("Erro", str(e))

        threading.Thread(target=run, daemon=True).start()

    # ------------------------------------------------------- aba EDC17 --
    def choose_edc_bin(self):
        path = filedialog.askopenfilename(
            title="Escolha o .bin/.ori do cliente (EDC17CP54)",
            initialdir=self._state.get("last_dir_edc17") or None,
            filetypes=[("BIN/ORI files", "*.bin *.ori"), ("Todos", "*.*")],
        )
        if path:
            self.edc_bin_path.set(path)
            self._state["last_dir_edc17"] = str(Path(path).parent)
            save_state(self._state)

    def choose_edc_patch(self):
        path = filedialog.askopenfilename(
            title="Escolha o patch .btp",
            initialdir=self._state.get("last_dir_edc17_patch") or None,
            filetypes=[("BTP files", "*.btp"), ("Todos", "*.*")],
        )
        if path:
            self.edc_patch_path.set(path)
            self._state["last_dir_edc17_patch"] = str(Path(path).parent)
            save_state(self._state)

    def on_edc_identify(self):
        if not self.edc_bin_path.get():
            messagebox.showwarning("Atenção", "Escolha o arquivo .bin/.ori primeiro.")
            return
        if not self.api_key:
            messagebox.showerror("Erro", f"Não achei API_KEY em {ENV_PATH}")
            return

        def run():
            self.status.set("Identificando (EDC17)...")
            status, data = multipart_request(
                "/identify", {}, {"bin": (Path(self.edc_bin_path.get()).name, self.edc_bin_path.get())}, self.api_key
            )
            if status != 200:
                self.status.set("Falha ao identificar.")
                messagebox.showerror("Erro", data.decode(errors="replace"))
                return

            info = json.loads(data)
            self.edc_hw_code.set(info["hardware"])
            self.edc_software_code.set(info["software_code"])
            self.status.set("Identificado.")

        threading.Thread(target=run, daemon=True).start()

    def on_edc_apply(self):
        if not self.edc_bin_path.get():
            messagebox.showwarning("Atenção", "Escolha o arquivo .bin/.ori primeiro.")
            return
        if not self.edc_patch_path.get():
            messagebox.showwarning("Atenção", "Escolha o patch .btp primeiro.")
            return

        output_path = filedialog.asksaveasfilename(
            title="Salvar bin com patch aplicado",
            defaultextension=".bin",
            filetypes=[("BIN files", "*.bin")],
            initialfile=Path(self.edc_bin_path.get()).stem + "_multimapa.bin",
        )
        if not output_path:
            return

        input_bin = self.edc_bin_path.get()
        patch_path = self.edc_patch_path.get()

        def run():
            self.status.set("Aplicando patch (EDC17, modo force)...")
            status, data = self._apply_with_uploaded_patch(input_bin, patch_path, "force", Path(output_path).name)

            if status == 200:
                Path(output_path).write_bytes(data)
                self.status.set(f"OK - salvo em {output_path}")
                log_apply(input_bin=input_bin, output_bin=output_path, hardware=self.edc_hw_code.get(),
                          software_code=self.edc_software_code.get(), patches=[Path(patch_path).name],
                          mode="force", success=True, detail="EDC17CP54 (experimental)")
                messagebox.showinfo("Sucesso", f"Arquivo gerado:\n{output_path}\n\nLembre-se: EDC17CP54 é experimental, nunca testado em bancada. Confira com cuidado antes de gravar numa ECU real.")
            else:
                self.status.set("Falha ao aplicar.")
                try:
                    err = json.loads(data)
                    detail = "\n".join(err.get("log", [str(err)]))
                except Exception:
                    detail = data.decode(errors="replace")
                log_apply(input_bin=input_bin, output_bin=output_path, hardware=self.edc_hw_code.get(),
                          software_code=self.edc_software_code.get(), patches=[Path(patch_path).name],
                          mode="force", success=False, detail=detail)
                messagebox.showerror("Erro", detail)

        threading.Thread(target=run, daemon=True).start()

    def _apply_with_uploaded_patch(self, bin_path: str, patch_path: str, mode: str, output_name: str):
        """Igual ao /apply, mas envia o .btp direto (nao vem do catalogo do
        servidor - PATCHES_DIR) via multipart 'patch_files'."""
        boundary = uuid.uuid4().hex
        body = bytearray()

        def add_field(name, value):
            nonlocal body
            body += f"--{boundary}\r\n".encode()
            body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
            body += f"{value}\r\n".encode()

        add_field("mode", mode)
        add_field("output_name", output_name)

        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="bin"; filename="{Path(bin_path).name}"\r\n'.encode()
        body += b"Content-Type: application/octet-stream\r\n\r\n"
        body += Path(bin_path).read_bytes()
        body += b"\r\n"

        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="patch_files"; filename="{Path(patch_path).name}"\r\n'.encode()
        body += b"Content-Type: application/octet-stream\r\n\r\n"
        body += Path(patch_path).read_bytes()
        body += b"\r\n"
        body += f"--{boundary}--\r\n".encode()

        req = urllib.request.Request(
            f"{BASE_URL}/apply",
            data=bytes(body),
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def on_apply(self):
        if not self.bin_path.get():
            messagebox.showwarning("Atenção", "Escolha o arquivo .bin primeiro.")
            return
        selected = [self.patch_names[i] for i in self.listbox.curselection()]
        if not selected:
            messagebox.showwarning("Atenção", "Selecione ao menos um patch na lista.")
            return

        output_path = filedialog.asksaveasfilename(
            title="Salvar bin com patch aplicado",
            defaultextension=".bin",
            filetypes=[("BIN files", "*.bin")],
            initialfile=Path(self.bin_path.get()).stem + "_multimapa.bin",
        )
        if not output_path:
            return

        input_bin = self.bin_path.get()
        mode = self.mode.get()

        def run():
            self.status.set("Aplicando patch(es)...")
            fields = {"mode": mode, "output_name": Path(output_path).name}
            status, data = self._apply_multi(input_bin, selected, fields)

            if status == 200:
                Path(output_path).write_bytes(data)
                self.bin_path.set(output_path)
                self._refresh_sim_data()
                self.status.set(f"OK - salvo em {output_path}")
                log_apply(input_bin=input_bin, output_bin=output_path, hardware=self.hw_code.get(),
                          software_code=self.software_code.get(), patches=selected, mode=mode, success=True)
                messagebox.showinfo("Sucesso", f"Arquivo gerado:\n{output_path}\n\nLembre-se: a próxima gravação na ECU precisa ser um flash completo.\n\nO painel (seção 6) já foi atualizado com este arquivo.")
            else:
                self.status.set("Falha ao aplicar.")
                try:
                    err = json.loads(data)
                    detail = "\n".join(err.get("log", [str(err)]))
                except Exception:
                    detail = data.decode(errors="replace")
                log_apply(input_bin=input_bin, output_bin=output_path, hardware=self.hw_code.get(),
                          software_code=self.software_code.get(), patches=selected, mode=mode, success=False, detail=detail)
                messagebox.showerror("Erro", detail)

        threading.Thread(target=run, daemon=True).start()

    def _apply_multi(self, bin_path: str, patch_names: list[str], fields: dict):
        """multipart/form-data com múltiplos campos 'patch_names' (um por patch)."""
        boundary = uuid.uuid4().hex
        body = bytearray()

        def add_field(name, value):
            nonlocal body
            body += f"--{boundary}\r\n".encode()
            body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
            body += f"{value}\r\n".encode()

        for name in patch_names:
            add_field("patch_names", name)
        for key, value in fields.items():
            add_field(key, value)

        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="bin"; filename="{Path(bin_path).name}"\r\n'.encode()
        body += b"Content-Type: application/octet-stream\r\n\r\n"
        body += Path(bin_path).read_bytes()
        body += b"\r\n"
        body += f"--{boundary}--\r\n".encode()

        req = urllib.request.Request(
            f"{BASE_URL}/apply",
            data=bytes(body),
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()


if __name__ == "__main__":
    App().mainloop()
