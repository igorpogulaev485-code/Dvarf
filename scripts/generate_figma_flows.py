#!/usr/bin/env python3
"""Generate Figma-importable SVG flowcharts for Dvarf user flows.

Import into Figma: File → Place image… / drag SVG onto canvas.
Each file is one artboard (frame). Nodes are separate <g> groups so Figma
keeps them as editable vector layers when possible.
"""

from __future__ import annotations

import html
from dataclasses import dataclass, field
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs" / "figma-flows"

# Visual tokens (olive desk direction — not purple/cream AI defaults)
C = {
    "bg": "#F7F5F0",
    "frame": "#EDE8DC",
    "ink": "#1C241C",
    "muted": "#5C6B5C",
    "line": "#6B7B6B",
    "start": "#2F4A3A",
    "start_text": "#F7F5F0",
    "screen": "#DCE8DC",
    "screen_stroke": "#2F4A3A",
    "action": "#F0E6D4",
    "action_stroke": "#8A6A3A",
    "decision": "#FFF3D6",
    "decision_stroke": "#A67C2A",
    "end": "#2F4A3A",
    "note": "#F3E4DC",
    "note_stroke": "#9A4F2E",
    "role": "#D9E3F0",
    "role_stroke": "#3A557A",
}


@dataclass
class Node:
    id: str
    kind: str  # start | end | screen | action | decision | note | role
    label: str
    x: float
    y: float
    w: float = 200
    h: float = 56


@dataclass
class Edge:
    a: str
    b: str
    label: str = ""
    via: list[tuple[float, float]] = field(default_factory=list)  # optional waypoints


@dataclass
class Flow:
    slug: str
    title: str
    subtitle: str
    nodes: list[Node]
    edges: list[Edge]
    width: int = 1280
    height: int = 900
    legend: bool = True


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def wrap_lines(text: str, max_chars: int = 28) -> list[str]:
    words = text.replace("\n", " \n ").split()
    lines: list[str] = []
    cur: list[str] = []
    for w in words:
        if w == "\n":
            lines.append(" ".join(cur))
            cur = []
            continue
        trial = (" ".join(cur + [w])).strip()
        if cur and len(trial) > max_chars:
            lines.append(" ".join(cur))
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(" ".join(cur))
    return lines or [""]


def node_center(n: Node) -> tuple[float, float]:
    return n.x + n.w / 2, n.y + n.h / 2


def edge_points(nodes: dict[str, Node], e: Edge) -> list[tuple[float, float]]:
    a, b = nodes[e.a], nodes[e.b]
    ax, ay = node_center(a)
    bx, by = node_center(b)
    # exit/enter at box edges (vertical-ish flows preferred)
    if abs(by - ay) >= abs(bx - ax):
        if by >= ay:
            start = (ax, a.y + a.h)
            end = (bx, b.y)
        else:
            start = (ax, a.y)
            end = (bx, b.y + b.h)
    else:
        if bx >= ax:
            start = (a.x + a.w, ay)
            end = (b.x, by)
        else:
            start = (a.x, ay)
            end = (b.x + b.w, by)
    pts = [start, *e.via, end]
    return pts


def polyline(pts: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def render_node(n: Node) -> str:
    lines = wrap_lines(n.label, 26 if n.kind != "decision" else 18)
    # auto height for wrapped text
    line_h = 16
    pad = 14
    need_h = pad * 2 + max(1, len(lines)) * line_h
    h = max(n.h, need_h)
    w = n.w
    x, y = n.x, n.y
    cx, cy = x + w / 2, y + h / 2

    if n.kind in ("start", "end"):
        fill, stroke, tc = C["start"], C["start"], C["start_text"]
        shape = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="28" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    elif n.kind == "decision":
        fill, stroke, tc = C["decision"], C["decision_stroke"], C["ink"]
        # diamond
        mid_top = (cx, y)
        mid_right = (x + w, cy)
        mid_bot = (cx, y + h)
        mid_left = (x, cy)
        d = f"M{mid_top[0]},{mid_top[1]} L{mid_right[0]},{mid_right[1]} L{mid_bot[0]},{mid_bot[1]} L{mid_left[0]},{mid_left[1]} Z"
        shape = f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    elif n.kind == "screen":
        fill, stroke, tc = C["screen"], C["screen_stroke"], C["ink"]
        shape = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    elif n.kind == "note":
        fill, stroke, tc = C["note"], C["note_stroke"], C["ink"]
        shape = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.5" stroke-dasharray="5 3"/>'
    elif n.kind == "role":
        fill, stroke, tc = C["role"], C["role_stroke"], C["ink"]
        shape = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    else:  # action
        fill, stroke, tc = C["action"], C["action_stroke"], C["ink"]
        shape = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'

    text_y0 = cy - (len(lines) - 1) * line_h / 2 + 5
    text_bits = []
    for i, line in enumerate(lines):
        text_bits.append(
            f'<text x="{cx}" y="{text_y0 + i * line_h}" text-anchor="middle" '
            f'font-family="IBM Plex Sans, Inter, Arial, sans-serif" font-size="13" '
            f'font-weight="{"600" if n.kind in ("start","end","screen") else "500"}" fill="{tc}">{esc(line)}</text>'
        )
    return (
        f'<g id="node-{esc(n.id)}" data-name="{esc(n.label)}">\n'
        f"  {shape}\n  " + "\n  ".join(text_bits) + "\n</g>"
    )


def render_edge(nodes: dict[str, Node], e: Edge, idx: int) -> str:
    pts = edge_points(nodes, e)
    mid = pts[len(pts) // 2]
    label = ""
    if e.label:
        label = (
            f'<rect x="{mid[0] - 28}" y="{mid[1] - 20}" width="56" height="16" rx="4" fill="{C["bg"]}" opacity="0.92"/>'
            f'<text x="{mid[0]}" y="{mid[1] - 8}" text-anchor="middle" '
            f'font-family="IBM Plex Sans, Inter, Arial, sans-serif" font-size="11" fill="{C["muted"]}">{esc(e.label)}</text>'
        )
    return (
        f'<g id="edge-{idx}" data-name="{esc(e.a)}→{esc(e.b)}">\n'
        f'  <polyline points="{polyline(pts)}" fill="none" stroke="{C["line"]}" '
        f'stroke-width="2" marker-end="url(#arrow)"/>\n'
        f"  {label}\n</g>"
    )


def legend_svg(x: float, y: float) -> str:
    items = [
        ("start", "Старт / финиш"),
        ("screen", "Экран / маршрут"),
        ("action", "Действие пользователя"),
        ("decision", "Развилка"),
        ("note", "Ограничение / stub"),
        ("role", "Роль"),
    ]
    parts = [f'<g id="legend" data-name="Legend" transform="translate({x},{y})">']
    parts.append(
        f'<text x="0" y="0" font-family="IBM Plex Sans, Inter, Arial, sans-serif" '
        f'font-size="12" font-weight="600" fill="{C["muted"]}">Легенда</text>'
    )
    ox = 0
    for kind, title in items:
        sample = Node("lg-" + kind, kind, "·", ox, 12, 28, 18)
        # tiny swatch
        if kind == "decision":
            parts.append(
                f'<path d="M{ox+14},12 L{ox+28},21 L{ox+14},30 L{ox},21 Z" fill="{C["decision"]}" stroke="{C["decision_stroke"]}"/>'
            )
        elif kind in ("start", "end"):
            parts.append(
                f'<rect x="{ox}" y="14" width="28" height="16" rx="8" fill="{C["start"]}"/>'
            )
        elif kind == "screen":
            parts.append(
                f'<rect x="{ox}" y="14" width="28" height="16" rx="4" fill="{C["screen"]}" stroke="{C["screen_stroke"]}"/>'
            )
        elif kind == "note":
            parts.append(
                f'<rect x="{ox}" y="14" width="28" height="16" rx="3" fill="{C["note"]}" stroke="{C["note_stroke"]}" stroke-dasharray="3 2"/>'
            )
        elif kind == "role":
            parts.append(
                f'<rect x="{ox}" y="14" width="28" height="16" rx="4" fill="{C["role"]}" stroke="{C["role_stroke"]}"/>'
            )
        else:
            parts.append(
                f'<rect x="{ox}" y="14" width="28" height="16" rx="3" fill="{C["action"]}" stroke="{C["action_stroke"]}"/>'
            )
        parts.append(
            f'<text x="{ox + 34}" y="26" font-family="IBM Plex Sans, Inter, Arial, sans-serif" '
            f'font-size="11" fill="{C["ink"]}">{esc(title)}</text>'
        )
        ox += 150
        _ = sample
    parts.append("</g>")
    return "\n".join(parts)


def render_flow(flow: Flow) -> str:
    nodes = {n.id: n for n in flow.nodes}
    body_nodes = "\n".join(render_node(n) for n in flow.nodes)
    body_edges = "\n".join(render_edge(nodes, e, i) for i, e in enumerate(flow.edges))
    legend = legend_svg(48, flow.height - 56) if flow.legend else ""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{flow.width}" height="{flow.height}"
     viewBox="0 0 {flow.width} {flow.height}" role="img"
     aria-label="{esc(flow.title)}" data-name="{esc(flow.title)}">
  <title>{esc(flow.title)}</title>
  <desc>{esc(flow.subtitle)}</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="{C["line"]}"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="{C["bg"]}"/>
  <rect x="24" y="24" width="{flow.width - 48}" height="{flow.height - 48}"
        rx="16" fill="{C["frame"]}" stroke="#D5CFC0" stroke-width="1"/>
  <text x="48" y="64" font-family="IBM Plex Sans, Inter, Arial, sans-serif"
        font-size="22" font-weight="700" fill="{C["ink"]}">{esc(flow.title)}</text>
  <text x="48" y="88" font-family="IBM Plex Sans, Inter, Arial, sans-serif"
        font-size="13" fill="{C["muted"]}">{esc(flow.subtitle)}</text>
  <g id="edges">
{body_edges}
  </g>
  <g id="nodes">
{body_nodes}
  </g>
{legend}
</svg>
'''


def col(x0: float, y0: float, gap: float, specs: list[tuple[str, str, str]], w=210, h=56) -> list[Node]:
    nodes = []
    y = y0
    for nid, kind, label in specs:
        nodes.append(Node(nid, kind, label, x0, y, w, h))
        y += h + gap
    return nodes


def chain(ids: list[str], labels: list[str] | None = None) -> list[Edge]:
    labels = labels or [""] * (len(ids) - 1)
    return [Edge(ids[i], ids[i + 1], labels[i] if i < len(labels) else "") for i in range(len(ids) - 1)]


def case_flow_branched(
    num: int,
    title: str,
    subtitle: str,
    steps: list[tuple[str, str]],
    side: list[tuple[int, str, str, str]] | None = None,
) -> Flow:
    """steps linear; side = (from_index, kind, node_label, edge_label) placed to the right."""
    nodes: list[Node] = []
    y = 120
    w = 260
    xs = 80
    for i, (kind, label) in enumerate(steps):
        nid = f"n{i}"
        if i == 0 and kind != "start":
            kind = "start"
        if i == len(steps) - 1 and kind not in ("end", "note"):
            kind = "end"
        h = 70 if kind == "decision" else 52
        nodes.append(Node(nid, kind, label, xs, y, w, h))
        y += h + 22
    edges = chain([f"n{i}" for i in range(len(steps))])
    width = 420
    if side:
        for si, (from_i, kind, label, elabel) in enumerate(side):
            src = nodes[from_i]
            nid = f"s{si}"
            nodes.append(Node(nid, kind, label, 380, src.y, 220, 52))
            edges.append(Edge(f"n{from_i}", nid, elabel))
            width = 660
    return Flow(
        slug=f"K{num:02d}",
        title=f"K{num} · {title}",
        subtitle=subtitle,
        nodes=nodes,
        edges=edges,
        width=width,
        height=max(520, int(y + 80)),
        legend=False,
    )


def build_case_flows() -> list[Flow]:
    """All 28 sheet cases from PLAY_DESK_MICROFLOWS.md §0."""
    c = case_flow_branched
    cases: list[Flow] = []

    cases.append(c(1, "Desk ≥960px", "Открыл лист на планшете/ПК", [
        ("start", "Список → /characters/:id"),
        ("decision", "Ширина ≥ 960px?"),
        ("screen", "Play desk"),
        ("action", "Режим Бой / Исслед. / …"),
        ("screen", "Панель сцены"),
        ("end", "Играю за столом"),
    ], side=[(1, "screen", "Mobile layout", "нет")]))

    cases.append(c(2, "Телефон · одна зона", "Mobile: панель через select", [
        ("start", "/characters/:id · <960px"),
        ("action", "Выбрать режим"),
        ("action", "Select «Панель»"),
        ("decision", "MOB или WAVE mobile?"),
        ("screen", "MOB: одна панель"),
        ("end", "Смотрю нужную зону"),
    ], side=[(3, "note", "WAVE: стек панелей", "WAVE")]))

    cases.append(c(3, "Урон / лечение", "Vitals · HP pad", [
        ("start", "Шапка листа"),
        ("action", "Tap текущие HP"),
        ("decision", "MOB или WAVE?"),
        ("action", "MOB: Урон / Вылечить"),
        ("end", "HP обновлены"),
    ], side=[(2, "action", "WAVE: pad «Хиты»", "WAVE")]))

    cases.append(c(4, "0 HP · смерть", "Death saves", [
        ("start", "HP ≤ 0"),
        ("screen", "Death UI в шапке/pad"),
        ("action", "Пип Успехи / Провалы"),
        ("note", "WAVE: «При смерти»"),
        ("end", "Статус dying обновлён"),
    ]))

    cases.append(c(5, "Концентрация + урон", "WAVE concentration check", [
        ("start", "Есть концентрация"),
        ("action", "Получил урон"),
        ("screen", "Dialog «Концентрация»"),
        ("decision", "Удержал?"),
        ("action", "Удержал — держит"),
        ("end", "Концентрация решена"),
    ], side=[
        (3, "action", "Сорвалось → снять", "нет"),
        (0, "action", "Снять вручную", "без урона"),
    ]))

    cases.append(c(6, "Отдых", "Короткий / продолжительный", [
        ("start", "Нужен отдых"),
        ("decision", "MOB или WAVE?"),
        ("screen", "MOB: Состояния и ресурсы"),
        ("decision", "Короткий или длинный?"),
        ("action", "Кость / сброс short"),
        ("end", "Ресурсы обновлены"),
    ], side=[
        (1, "screen", "WAVE: «Отдых»", "WAVE"),
        (3, "action", "Продолжительный отдых", "длинный"),
    ]))

    cases.append(c(7, "Атака оружием", "Режим Бой → Атаки", [
        ("start", "Режим «Бой»"),
        ("screen", "Панель Атаки"),
        ("action", "Выбрать атаку / оружие"),
        ("note", "WAVE: клик = toast-бросок"),
        ("action", "взять / убрать (held)"),
        ("end", "Атака объявлена"),
    ]))

    cases.append(c(8, "Надел доспех / щит", "Экип → КД", [
        ("start", "Снаряжение"),
        ("action", "Из справочника / список"),
        ("action", "Надето / В руке"),
        ("action", "КД пересчитан"),
        ("end", "Защита актуальна"),
    ]))

    cases.append(c(9, "Конфликт рук", "2H vs 1H×2", [
        ("start", "Equip «В руках»"),
        ("decision", "Двуручное?"),
        ("action", "Вытеснить одноручные"),
        ("end", "Слоты рук согласованы"),
    ], side=[(1, "action", "Max 2× одноручных", "нет")]))

    cases.append(c(10, "Нет владения доспехом", "Equip blocked", [
        ("start", "Надеть доспех"),
        ("decision", "Есть владение?"),
        ("note", "Блок / авто-снятие + toast"),
        ("end", "Доспех не надет"),
    ], side=[(1, "action", "Надето → КД", "да")]))

    cases.append(c(11, "Attunement", "Настройка магии", [
        ("start", "Настройка (attunement)"),
        ("action", "Выбрать из инвентаря"),
        ("action", "Авто-надевание wear"),
        ("note", "Лимит слотов PHB"),
        ("end", "Предмет настроен"),
    ]))

    cases.append(c(12, "Каст заклинания", "Prepare → Cast", [
        ("start", "Заклинания"),
        ("action", "Подготовить / Гримуар"),
        ("action", "Каст"),
        ("decision", "Источник?"),
        ("action", "Слот / upcast"),
        ("end", "Каст применён"),
    ], side=[
        (3, "action", "Pact / Ритуал / Грант", "др."),
    ]))

    cases.append(c(13, "Каст при концентрации", "Смена концентрации", [
        ("start", "Активная концентрация"),
        ("action", "Каст с концентрацией"),
        ("screen", "Смена концентрации"),
        ("action", "Сменить и кастовать"),
        ("end", "Новая концентрация"),
    ]))

    cases.append(c(14, "Нет ячеек", "Cast disabled", [
        ("start", "Каст"),
        ("note", "Нет ячеек / грант исчерпан"),
        ("action", "Hint: отдых / pact / грант"),
        ("end", "Каст недоступен"),
    ]))

    cases.append(c(15, "Сброс short-rest", "Pact / короткие ресурсы", [
        ("start", "Потратил pact / short ресурс"),
        ("screen", "Короткий отдых"),
        ("action", "Сброс коротких ресурсов"),
        ("end", "Ресурсы вернулись"),
    ]))

    cases.append(c(16, "Level-up / мультикласс", "+1 уровень", [
        ("start", "Основное → +1 уровень"),
        ("screen", "Повышение уровня"),
        ("decision", "Этот класс | Мультикласс"),
        ("action", "HP среднее / вручную"),
        ("screen", "Wizard / ASI"),
        ("end", "Уровень +1"),
    ]))

    cases.append(c(17, "Смена архетипа", "Subclass change", [
        ("start", "Combobox архетипа"),
        ("screen", "Сменить архетип?"),
        ("decision", "Все | только будущие"),
        ("screen", "SubclassSetup"),
        ("end", "Архетип сменён"),
    ]))

    cases.append(c(18, "Донастройка после create", "createGuide grants", [
        ("start", "Лист после create"),
        ("action", "Scroll: фон → класс → раса"),
        ("screen", "Setup dialogs"),
        ("decision", "Выбрать или Позже?"),
        ("action", "Гранты применены"),
        ("end", "Онбординг закрыт"),
    ], side=[(3, "action", "Бейдж «не выбрано»", "Позже")]))

    cases.append(c(19, "Напарники", "Спутник / призвать", [
        ("start", "Режим Напарники"),
        ("decision", "Вручную или умение?"),
        ("action", "+ Спутник / + Напарник"),
        ("end", "Свита на листе"),
    ], side=[(1, "action", "Призвать… из умений", "умение")]))

    cases.append(c(20, "Тексты и заметки", "Личность / скрыть", [
        ("start", "Тексты и заметки"),
        ("action", "Фильтр Личность / Умения…"),
        ("action", "Править / Скрыть / ресурс"),
        ("end", "Блок сохранён"),
    ]))

    cases.append(c(21, "Аватар персонажа", "Upload / delete", [
        ("start", "Клик аватара"),
        ("action", "Загрузить фото"),
        ("decision", "Удалить?"),
        ("end", "Аватар на карточке и в шапке"),
    ], side=[(2, "action", "Удалить файл", "да")]))

    cases.append(c(22, "В лобби с листа", "Код мастера", [
        ("start", "Кнопка «В лобби»"),
        ("screen", "Вступить кодом"),
        ("action", "Код от мастера"),
        ("action", "Добавить этого персонажа"),
        ("end", "/lobbies/:id"),
    ]))

    cases.append(c(23, "Конфликт вкладок", "Version conflict", [
        ("start", "Две вкладки правят лист"),
        ("decision", "Banner или dialog?"),
        ("action", "Позже / Обновить"),
        ("end", "Версия согласована"),
    ], side=[
        (1, "action", "MOB: Обновить / Оставить", "dialog MOB"),
        (1, "action", "WAVE: Мои / С сервера", "dialog WAVE"),
    ]))

    cases.append(c(24, "Classic печать", "Классический лист 2014", [
        ("start", "Классический лист 2014"),
        ("screen", "/characters/:id/classic"),
        ("action", "Печать / PDF"),
        ("action", "← К карточке"),
        ("end", "Тот же документ сохранён"),
    ]))

    cases.append(c(25, "Проверка навыка", "Skill strip / колонка", [
        ("start", "Нужна проверка"),
        ("action", "норм / преим. / помеха"),
        ("action", "Клик навыка (strip/колонка)"),
        ("note", "Toast броска [WAVE]"),
        ("end", "Результат объявлен"),
    ]))

    cases.append(c(26, "Расходник в бою", "Избранное ≤3", [
        ("start", "Бой · compact"),
        ("action", "+ в избранное (N/3)"),
        ("action", "потратить"),
        ("note", "Уже 3 → toast"),
        ("end", "Расходник списан"),
    ]))

    cases.append(c(27, "Перегруз", "СИЛ × 15", [
        ("start", "Инвентарь тяжёлый"),
        ("decision", "Вес > СИЛ×15?"),
        ("note", "Danger line перегруз"),
        ("end", "Игрок видит лимит"),
    ], side=[(1, "end", "Ок — без предупреждения", "нет")]))

    cases.append(c(28, "Очки чародейства", "Sorcery points", [
        ("start", "Умения классов"),
        ("screen", "Очки чародейства"),
        ("action", "Потратить / flexible casting"),
        ("end", "Ресурс обновлён"),
    ]))

    return cases


def build_flows() -> list[Flow]:
    flows: list[Flow] = []

    # 01 Happy path — two columns: auth left, logged-in spine center/right
    n = [
        Node("s", "start", "Открыл сайт /", 360, 120, 220, 52),
        Node("tok", "decision", "Есть токен?", 350, 210, 240, 70),
        # left: no token
        Node("login", "screen", "/login", 80, 330, 200, 52),
        Node("reg", "action", "Регистрация + ник", 80, 420, 200, 52),
        Node("ver", "screen", "/verify-email", 80, 510, 200, 52),
        # spine: characters
        Node("chars", "screen", "/characters", 360, 330, 220, 52),
        Node("cab", "screen", "/cabinet", 640, 330, 180, 52),
        Node("create", "decision", "Создать?", 350, 430, 240, 64),
        Node("p2014", "screen", "2014 · /characters/create", 200, 540, 230, 52),
        Node("p2024", "screen", "2024 · лист + wizard", 480, 540, 230, 52),
        Node("sheet", "screen", "/characters/:id · лист", 360, 640, 220, 52),
        Node("play", "action", "Игра на play desk", 200, 740, 200, 52),
        Node("classic", "screen", "/classic · печать", 480, 740, 200, 52),
        Node("lobby", "screen", "/lobbies или /join", 360, 840, 220, 52),
        Node("e", "end", "Сессия за столом", 360, 940, 220, 52),
    ]
    e = [
        Edge("s", "tok"),
        Edge("tok", "login", "нет", via=[(180, 245)]),
        Edge("tok", "chars", "да"),
        Edge("login", "reg"),
        Edge("reg", "ver"),
        Edge("ver", "chars", via=[(180, 556), (470, 556)]),
        Edge("chars", "cab"),
        Edge("chars", "create"),
        Edge("create", "p2014", "2014"),
        Edge("create", "p2024", "2024"),
        Edge("p2014", "sheet"),
        Edge("p2024", "sheet"),
        Edge("sheet", "play"),
        Edge("sheet", "classic"),
        Edge("play", "lobby"),
        Edge("lobby", "e"),
    ]
    flows.append(Flow("01-happy-path", "01 · Happy path", "Сквозной путь игрока: аккаунт → персонаж → лист → лобби", n, e, 900, 1060))

    # 02 Auth
    n = [
        Node("s", "start", "Нужен аккаунт", 80, 120, 200, 52),
        Node("login", "screen", "/login", 80, 210, 200, 52),
        Node("mode", "decision", "Вход или регистрация?", 60, 300, 240, 70),
        Node("in", "action", "Email + пароль", 80, 420, 200, 52),
        Node("oauth", "action", "Яндекс OAuth", 340, 420, 200, 52),
        Node("vk", "note", "VK — заглушка", 580, 420, 180, 52),
        Node("reg", "action", "Регистрация + ник", 80, 520, 200, 52),
        Node("mail", "action", "Письмо на email", 80, 620, 200, 52),
        Node("ver", "screen", "/verify-email", 80, 720, 200, 52),
        Node("forgot", "action", "Забыл пароль", 340, 520, 200, 52),
        Node("reset", "screen", "/reset-password", 340, 620, 200, 52),
        Node("cab", "screen", "/cabinet", 580, 620, 200, 52),
        Node("email2", "screen", "/confirm-email", 580, 720, 200, 52),
        Node("next", "decision", "Есть ?next= ?", 320, 720, 220, 70),
        Node("chars", "screen", "/characters", 80, 840, 200, 52),
        Node("dest", "screen", "Вернуться в next", 340, 840, 200, 52),
        Node("e", "end", "В системе", 80, 940, 200, 52),
    ]
    e = [
        Edge("s", "login"), Edge("login", "mode"),
        Edge("mode", "in", "вход"), Edge("mode", "reg", "регистрация"),
        Edge("mode", "oauth", "oauth"), Edge("oauth", "vk"),
        Edge("in", "next"), Edge("oauth", "next"),
        Edge("reg", "mail"), Edge("mail", "ver"), Edge("ver", "chars"),
        Edge("in", "forgot"), Edge("forgot", "reset"), Edge("reset", "login"),
        Edge("cab", "email2"), Edge("email2", "cab"),
        Edge("next", "chars", "нет"), Edge("next", "dest", "да"),
        Edge("chars", "e"), Edge("dest", "e"),
    ]
    flows.append(Flow("02-auth-cabinet", "02 · Аккаунт и кабинет", "Регистрация, verify, OAuth, сброс пароля, смена email", n, e, 900, 1060))

    # 03 Create 2014
    n = col(80, 120, 22, [
        ("s", "start", "Создать → 2014"),
        ("r1", "screen", "1. Раса + имя"),
        ("r2", "decision", "Раса даёт черту?"),
        ("feat", "screen", "2. Черта"),
        ("bg", "screen", "3. Предыстория"),
        ("cls", "screen", "4. Класс + setup"),
        ("abi", "screen", "5. Характеристики"),
        ("lvl", "screen", "6. Прокачка"),
        ("gate", "decision", "Гейты «Готово» ок?"),
        ("draft", "action", "Черновик is_draft"),
        ("done", "action", "Готово → лист"),
        ("e", "end", "/characters/:id"),
    ], w=240)
    n += [
        Node("skip", "action", "Шаг черты скрыт", 420, 120 + 2 * (56 + 22), 200, 52),
        Node("ls", "note", "F5: localStorage v2", 420, 120 + 8 * (56 + 22), 200, 52),
        Node("resume", "screen", "Продолжить создание", 420, 120 + 9 * (56 + 22), 200, 52),
    ]
    e = [
        Edge("s", "r1"), Edge("r1", "r2"),
        Edge("r2", "feat", "да"), Edge("r2", "skip", "нет"), Edge("skip", "bg"), Edge("feat", "bg"),
        Edge("bg", "cls"), Edge("cls", "abi"), Edge("abi", "lvl"), Edge("lvl", "gate"),
        Edge("gate", "done", "да"), Edge("gate", "draft", "нет / сохранить"),
        Edge("draft", "ls"), Edge("ls", "resume"), Edge("resume", "r1"),
        Edge("done", "e"),
    ]
    flows.append(Flow("03-create-2014", "03 · Создание персонажа 2014", "Пайплайн /characters/create · черновик · готово", n, e, 760, 1020))

    # 04 Create 2024 / guided
    n = col(80, 120, 28, [
        ("s", "start", "Создать → 2024"),
        ("api", "action", "API create → лист"),
        ("w", "screen", "GuidedWizard"),
        ("bg", "action", "Предыстория"),
        ("cls", "action", "Класс (+ без дублей)"),
        ("fork", "action", "Expertise / ASI / архетип"),
        ("race", "action", "Раса"),
        ("feat", "note", "Черта (скоро) если надо"),
        ("later", "action", "«Позже» → бейдж"),
        ("e", "end", "Лист готов к игре"),
    ], w=240)
    e = chain(["s", "api", "w", "bg", "cls", "fork", "race", "feat", "e"])
    e.append(Edge("fork", "later"))
    e.append(Edge("later", "race"))
    flows.append(Flow("04-create-2024-wizard", "04 · Создание 2024 + GuidedWizard", "background-first на листе; level-up — тот же движок", n, e, 600, 920))

    # 05 Lobby
    n = [
        Node("m", "role", "Мастер", 80, 120, 160, 48),
        Node("p", "role", "Игрок", 520, 120, 160, 48),
        Node("ml", "screen", "/lobbies → создать", 80, 210, 220, 52),
        Node("md", "screen", "/lobbies/:id", 80, 300, 220, 52),
        Node("qr", "action", "Код + QR /join/CODE", 80, 390, 220, 52),
        Node("set", "screen", "/settings/:id (опц.)", 80, 480, 220, 52),
        Node("ses", "screen", "/sessions/:id", 80, 570, 220, 52),
        Node("seat", "action", "Посадка персонажей", 80, 660, 220, 52),
        Node("gap", "note", "Бой / лут — ещё нет", 80, 750, 220, 52),
        Node("join", "screen", "/join/:code", 520, 210, 220, 52),
        Node("auth", "decision", "Залогинен?", 520, 300, 220, 64),
        Node("login", "screen", "/login?next=…", 520, 410, 220, 52),
        Node("pick", "action", "Выбрать персонажа", 520, 510, 220, 52),
        Node("in", "screen", "/lobbies/:id", 520, 600, 220, 52),
        Node("alt", "action", "Код с листа «В лобби»", 520, 690, 220, 52),
        Node("e", "end", "За столом", 300, 840, 200, 52),
    ]
    e = [
        Edge("m", "ml"), Edge("ml", "md"), Edge("md", "qr"), Edge("md", "set"), Edge("md", "ses"),
        Edge("ses", "seat"), Edge("seat", "gap"), Edge("gap", "e"),
        Edge("p", "join"), Edge("join", "auth"),
        Edge("auth", "login", "нет"), Edge("auth", "pick", "да"),
        Edge("login", "pick"), Edge("pick", "in"), Edge("in", "e"),
        Edge("p", "alt"), Edge("alt", "in"),
        Edge("qr", "join"),
    ]
    flows.append(Flow("05-lobby-session", "05 · Лобби и сессия", "Мастер создаёт стол; игрок входит по коду/QR", n, e, 860, 960))

    # 06 Sheet modes
    n = [
        Node("s", "start", "/characters/:id", 80, 120, 220, 52),
        Node("bp", "decision", "Ширина ≥ 960px?", 70, 210, 240, 64),
        Node("desk", "screen", "Play desk", 80, 330, 200, 52),
        Node("mob", "screen", "Mobile layout", 400, 330, 200, 52),
        Node("m1", "action", "Бой", 80, 430, 140, 44),
        Node("m2", "action", "Исследование", 240, 430, 140, 44),
        Node("m3", "action", "Общение", 400, 430, 140, 44),
        Node("m4", "action", "Напарники", 560, 430, 140, 44),
        Node("m5", "action", "Способности [WAVE]", 80, 510, 160, 44),
        Node("m6", "action", "ЕЩЁ [WAVE]", 260, 510, 140, 44),
        Node("panel", "screen", "Панель сцены", 80, 610, 200, 52),
        Node("split", "action", "Split заклинания [WAVE]", 320, 610, 220, 52),
        Node("rail", "action", "Колонка характеристик", 80, 710, 220, 52),
        Node("e", "end", "Игровой контур", 80, 810, 200, 52),
    ]
    e = [
        Edge("s", "bp"), Edge("bp", "desk", "да"), Edge("bp", "mob", "нет"),
        Edge("desk", "m1"), Edge("desk", "m2"), Edge("desk", "m3"), Edge("desk", "m4"),
        Edge("mob", "m1"),
        Edge("m1", "panel"), Edge("m2", "panel"), Edge("m3", "panel"), Edge("m4", "panel"),
        Edge("m5", "panel"), Edge("m6", "panel"),
        Edge("panel", "split"), Edge("panel", "rail"), Edge("rail", "e"), Edge("split", "e"),
    ]
    flows.append(Flow("06-sheet-modes", "06 · Режимы play desk", "Breakpoint 960px · Бой/Исслед./Общение/Напарники (+ WAVE)", n, e, 820, 920))

    # 07 Combat vitals cases
    n = [
        Node("s", "start", "Бой / vitals", 80, 120, 200, 52),
        Node("hp", "action", "Tap HP", 80, 210, 200, 52),
        Node("dmg", "action", "Урон / Вылечить", 80, 300, 200, 52),
        Node("zero", "decision", "HP ≤ 0?", 70, 390, 220, 64),
        Node("death", "action", "Успехи / Провалы", 80, 510, 200, 52),
        Node("conc", "decision", "Есть концентрация?", 360, 300, 240, 64),
        Node("hold", "action", "Удержал / Сорвалось", 380, 420, 220, 52),
        Node("insp", "action", "Вдохновение toggle", 640, 210, 200, 52),
        Node("exh", "action", "Истощение 0→6", 640, 300, 200, 52),
        Node("coin", "action", "Монеты [WAVE]", 640, 390, 200, 52),
        Node("rest", "screen", "→ Отдых", 640, 480, 200, 52),
        Node("e", "end", "Статус обновлён", 80, 620, 200, 52),
    ]
    e = [
        Edge("s", "hp"), Edge("hp", "dmg"), Edge("dmg", "zero"),
        Edge("zero", "death", "да"), Edge("zero", "e", "нет"), Edge("death", "e"),
        Edge("dmg", "conc"), Edge("conc", "hold", "да"), Edge("conc", "e", "нет"), Edge("hold", "e"),
        Edge("s", "insp"), Edge("s", "exh"), Edge("s", "coin"), Edge("s", "rest"),
    ]
    flows.append(Flow("07-vitals-combat", "07 · Vitals и бой (K3–K5)", "Урон, смерть, концентрация, вдохновение", n, e, 960, 760))

    # 08 Rest
    n = col(80, 120, 28, [
        ("s", "start", "Нужен отдых"),
        ("ui", "decision", "MOB или WAVE?"),
        ("mob", "screen", "Состояния и ресурсы"),
        ("wave", "screen", "Dialog «Отдых»"),
        ("kind", "decision", "Короткий или длинный?"),
        ("short", "action", "Потратить кость + сброс short"),
        ("long", "action", "Полные HP, слоты, −1 истощение"),
        ("e", "end", "Ресурсы восстановлены"),
    ], w=260)
    e = [
        Edge("s", "ui"), Edge("ui", "mob", "MOB"), Edge("ui", "wave", "WAVE"),
        Edge("mob", "kind"), Edge("wave", "kind"),
        Edge("kind", "short", "короткий"), Edge("kind", "long", "продолжит."),
        Edge("short", "e"), Edge("long", "e"),
    ]
    flows.append(Flow("08-rest", "08 · Отдых (K6, K15)", "Короткий / продолжительный · pact reset", n, e, 560, 820))

    # 09 Inventory
    n = [
        Node("s", "start", "Снаряжение", 80, 120, 200, 52),
        Node("pick", "action", "Из справочника / своя строка", 60, 210, 240, 52),
        Node("eq", "decision", "Что надеть?", 70, 300, 220, 64),
        Node("hand", "action", "В руках / Убран", 80, 420, 200, 52),
        Node("wear", "action", "Надето / Снято", 320, 420, 200, 52),
        Node("hands", "decision", "Конфликт рук?", 70, 520, 220, 64),
        Node("swap", "action", "Вытеснить / max 2×1H", 80, 630, 200, 52),
        Node("prof", "decision", "Владение доспехом?", 320, 520, 220, 64),
        Node("block", "note", "Снято — нет владения", 320, 630, 200, 52),
        Node("ac", "action", "КД пересчитан", 560, 420, 200, 52),
        Node("att", "action", "Настройка (attune)", 560, 520, 200, 52),
        Node("enc", "note", "Перегруз СИЛ×15?", 560, 630, 200, 52),
        Node("e", "end", "Экип готов", 80, 740, 200, 52),
    ]
    e = [
        Edge("s", "pick"), Edge("pick", "eq"),
        Edge("eq", "hand", "оружие"), Edge("eq", "wear", "доспех/прочее"),
        Edge("hand", "hands"), Edge("hands", "swap", "да"), Edge("hands", "ac", "нет"), Edge("swap", "ac"),
        Edge("wear", "prof"), Edge("prof", "block", "нет"), Edge("prof", "ac", "да"),
        Edge("ac", "att"), Edge("att", "enc"), Edge("ac", "e"), Edge("block", "e"), Edge("enc", "e"),
    ]
    flows.append(Flow("09-inventory-gear", "09 · Инвентарь и экип (K8–K11, K27)", "Hands, wear, attunement, AC, перегруз", n, e, 880, 860))

    # 10 Spells
    n = col(80, 120, 24, [
        ("s", "start", "Хочу кастовать"),
        ("prep", "action", "Подготовить / Гримуар"),
        ("cast", "action", "Каст"),
        ("src", "decision", "Источник?"),
        ("slot", "action", "Ячейка N / upcast"),
        ("pact", "action", "Pact N"),
        ("rit", "action", "Ритуал"),
        ("grant", "action", "Грант / заряд"),
        ("conc", "decision", "Уже концентрация?"),
        ("swap", "action", "Сменить и кастовать"),
        ("ok", "action", "Каст применён"),
        ("noslot", "note", "Нет ячеек → disabled"),
        ("e", "end", "Эффект / концентрация"),
    ], w=240)
    n += [
        Node("rest", "screen", "→ короткий отдых", 420, 120 + 11 * (56 + 24) - 80, 200, 52),
    ]
    e = [
        Edge("s", "prep"), Edge("prep", "cast"), Edge("cast", "src"),
        Edge("src", "slot", "слот"), Edge("src", "pact", "pact"),
        Edge("src", "rit", "ритуал"), Edge("src", "grant", "грант"),
        Edge("src", "noslot", "нет ресурса"),
        Edge("slot", "conc"), Edge("pact", "conc"), Edge("rit", "ok"), Edge("grant", "conc"),
        Edge("conc", "swap", "да"), Edge("conc", "ok", "нет"), Edge("swap", "ok"),
        Edge("ok", "e"), Edge("noslot", "rest"), Edge("rest", "s"),
    ]
    flows.append(Flow("10-spells-cast", "10 · Заклинания (K12–K15)", "Prepare · cast · upcast · pact · концентрация", n, e, 740, 1100))

    # 11 Level-up
    n = col(80, 120, 26, [
        ("s", "start", "Основное → +1 уровень"),
        ("dlg", "screen", "Повышение уровня"),
        ("path", "decision", "Этот класс | Мультикласс"),
        ("same", "action", "Select текущего класса"),
        ("mc", "action", "Новый класс (гейты способностей)"),
        ("hp", "action", "HP: среднее | вручную"),
        ("wiz", "screen", "GuidedWizard / ASI / архетип"),
        ("arch", "action", "Сменить архетип?"),
        ("mode", "decision", "Все | только будущие"),
        ("setup", "screen", "SubclassSetup"),
        ("e", "end", "Уровень применён"),
    ], w=260)
    e = [
        Edge("s", "dlg"), Edge("dlg", "path"),
        Edge("path", "same", "этот"), Edge("path", "mc", "мульти"),
        Edge("same", "hp"), Edge("mc", "hp"), Edge("hp", "wiz"), Edge("wiz", "e"),
        Edge("wiz", "arch"), Edge("arch", "mode"), Edge("mode", "setup"), Edge("setup", "e"),
    ]
    flows.append(Flow("11-levelup-archetype", "11 · Level-up и архетип (K16–K18)", "Мультикласс, ASI, смена подкласса", n, e, 560, 980))

    # 12 Sheet extras + sync
    n = [
        Node("s", "start", "Доп. действия на листе", 80, 120, 240, 52),
        Node("comp", "action", "Напарники / призвать", 80, 220, 220, 52),
        Node("txt", "action", "Тексты и заметки", 340, 220, 220, 52),
        Node("ava", "action", "Аватар персонажа", 600, 220, 200, 52),
        Node("lob", "action", "В лобби + код", 80, 320, 220, 52),
        Node("cls", "screen", "Классический лист 2014", 340, 320, 240, 52),
        Node("print", "action", "Печать / PDF", 340, 420, 200, 52),
        Node("save", "decision", "Конфликт версий?", 600, 320, 220, 64),
        Node("mob", "action", "MOB: Обновить / Оставить", 580, 430, 260, 52),
        Node("wave", "action", "WAVE: Мои / С сервера", 580, 520, 260, 52),
        Node("banner", "action", "Banner другой вкладки", 580, 610, 260, 52),
        Node("e", "end", "Лист согласован", 80, 520, 200, 52),
    ]
    e = [
        Edge("s", "comp"), Edge("s", "txt"), Edge("s", "ava"), Edge("s", "lob"), Edge("s", "cls"), Edge("s", "save"),
        Edge("cls", "print"), Edge("print", "e"), Edge("lob", "e"), Edge("comp", "e"), Edge("txt", "e"), Edge("ava", "e"),
        Edge("save", "mob", "MOB"), Edge("save", "wave", "WAVE"), Edge("save", "banner", "cross-tab"),
        Edge("mob", "e"), Edge("wave", "e"), Edge("banner", "e"),
    ]
    flows.append(Flow("12-sheet-extras-sync", "12 · Напарники, classic, sync (K19–K24)", "Лобби с листа, конфликт вкладок, печать", n, e, 960, 760))

    # 13 Index — product flows + all 28 case boards
    n = [
        Node("title", "role", "Индекс схем Dvarf", 80, 120, 240, 52),
        Node("prod", "screen", "01–12 продуктовые flow", 80, 210, 240, 52),
        Node("cases", "screen", "K01–K28 кейсы листа", 360, 210, 240, 52),
        Node("a", "action", "K1–K2 Режимы", 80, 300, 180, 44),
        Node("b", "action", "K3–K6 Vitals/отдых", 280, 300, 200, 44),
        Node("c", "action", "K7–K11 Бой/экип", 500, 300, 180, 44),
        Node("d", "action", "K12–K15 Заклинания", 80, 380, 200, 44),
        Node("e1", "action", "K16–K21 Прокачка/соц", 300, 380, 220, 44),
        Node("f", "action", "K22–K28 Лобби/sync/прочее", 540, 380, 240, 44),
        Node("doc", "screen", "PLAY_DESK_MICROFLOWS.md", 80, 480, 260, 52),
        Node("fig", "screen", "docs/figma-flows/", 360, 480, 220, 52),
    ]
    e = [
        Edge("title", "prod"), Edge("title", "cases"),
        Edge("cases", "a"), Edge("cases", "b"), Edge("cases", "c"),
        Edge("cases", "d"), Edge("cases", "e1"), Edge("cases", "f"),
        Edge("a", "doc"), Edge("prod", "fig"), Edge("doc", "fig"),
    ]
    flows.append(Flow("00-index", "00 · Индекс схем Dvarf", "13 продуктовых + 28 кейсов K01–K28 · drag-and-drop в Figma", n, e, 880, 640, legend=True))

    flows.extend(build_case_flows())
    return flows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    flows = build_flows()
    for flow in flows:
        path = OUT / f"{flow.slug}.svg"
        path.write_text(render_flow(flow), encoding="utf-8")
        print(f"wrote {path.relative_to(OUT.parent.parent)} ({flow.width}×{flow.height})")
    # index markdown
    product = [f for f in flows if not f.slug.startswith("K")]
    cases = [f for f in flows if f.slug.startswith("K")]
    lines = [
        "# Figma flows — Dvarf",
        "",
        f"Блок-схемы в SVG для Figma / FigJam: **{len(product)} продуктовых** + **{len(cases)} кейсов листа (K1–K28)**.",
        "",
        "## Как импортировать",
        "",
        "1. Открой Figma (Design или FigJam).",
        "2. Перетащи файл `.svg` на холст **или** `File → Place image…` / `Shift+Ctrl+K`.",
        "3. Каждый файл = один фрейм (artboard). При необходимости `Ungroup` — узлы векторные.",
        "4. Шрифт: IBM Plex Sans (фолбэк Inter/Arial).",
        "",
        "## Легенда",
        "",
        "| Форма | Значение |",
        "|-------|----------|",
        "| Тёмная капсула | Старт / финиш |",
        "| Зелёный прямоугольник | Экран / маршрут |",
        "| Песочный прямоугольник | Действие пользователя |",
        "| Ромб | Развилка |",
        "| Пунктир | Stub / ограничение |",
        "| Голубой | Роль |",
        "",
        "## Продуктовые flow (01–12)",
        "",
    ]
    for flow in sorted(product, key=lambda f: f.slug):
        lines.append(f"- [`{flow.slug}.svg`]({flow.slug}.svg) — **{flow.title}** — {flow.subtitle}")
    lines += ["", "## Кейсы листа K1–K28", "", "По одному artboard на кейс из [`PLAY_DESK_MICROFLOWS.md`](../../PLAY_DESK_MICROFLOWS.md) §0.", ""]
    for flow in sorted(cases, key=lambda f: f.slug):
        lines.append(f"- [`{flow.slug}.svg`]({flow.slug}.svg) — **{flow.title}** — {flow.subtitle}")
    lines += [
        "",
        "## Источники",
        "",
        "- [`USER_FLOW.md`](../../USER_FLOW.md)",
        "- [`PLAY_DESK_MICROFLOWS.md`](../../PLAY_DESK_MICROFLOWS.md)",
        "",
        "## Перегенерация",
        "",
        "```bash",
        "python3 scripts/generate_figma_flows.py",
        "```",
        "",
    ]
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote docs/figma-flows/README.md ({len(flows)} diagrams: {len(product)} product + {len(cases)} cases)")


if __name__ == "__main__":
    main()
