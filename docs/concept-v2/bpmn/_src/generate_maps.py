# -*- coding: utf-8 -*-
"""Generate КриD20 BPMN 2.0 maps from production-code inventory (origin/main @ 80947717)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bpmnlib import Diagram

OUT = Path(__file__).resolve().parents[1]

TW, TH = 210, 86
GW, GH = 50, 50
EW = 36
GAPX = 56

def mid(lane_y, lane_h, h):
    return lane_y + (lane_h - h) / 2

def xrow(start, count, w=TW, gap=GAPX):
    return [start + i * (w + gap) for i in range(count)]

def std_pools(d: Diagram, width: float, py, ph, my, mh, sy, sh, lanes_p=None, lanes_m=None, lanes_s=None):
    PX, PW = 40, width
    d.pool("Pool_Player", "Игрок", "Proc_Player", PX, py, PW, ph, lanes=lanes_p or [
        ("Lane_Player", "Игрок", PX + 30, py, PW - 30, ph)
    ])
    d.pool("Pool_Master", "Мастер", "Proc_Master", PX, my, PW, mh, lanes=lanes_m or [
        ("Lane_Master", "Мастер", PX + 30, my, PW - 30, mh)
    ])
    d.pool("Pool_System", "Система / бэкенд", "Proc_System", PX, sy, PW, sh, lanes=lanes_s or [
        ("Lane_System", "Система / бэкенд", PX + 30, sy, PW - 30, sh)
    ])
    return PX, PW


# ---------------------------------------------------------------------------
# 00 Overview
# ---------------------------------------------------------------------------
def map_overview() -> Diagram:
    d = Diagram("overview", "КриD20 — карта процессов верхнего уровня")
    W = 2680
    py, ph = 80, 280
    my, mh = 450, 250
    sy, sh = 790, 280
    std_pools(d, W, py, ph, my, mh, sy, sh)
    yp = mid(py, ph, TH)
    ym = mid(my, mh, TH)
    ys = mid(sy, sh, TH)
    xs = xrow(120, 9, 200, 60)

    d.add("start", "p_start", "Вход на creed20.tech", "Proc_Player", xs[0], mid(py, ph, EW))
    d.add("call", "p_auth", "1. Регистрация / вход, список, онбординг", "Proc_Player", xs[1], yp)
    d.add("exclusive", "p_gw", "Что дальше?", "Proc_Player", xs[2] + 70, mid(py, ph, GH))
    d.add("call", "p_create", "2. Создание персонажа\n2014 / 2024", "Proc_Player", xs[3], yp - 70, 200, 80)
    d.add("call", "p_sheet", "3. Жизнь ПК-листа\nвне игры и за столом", "Proc_Player", xs[4], yp - 70, 200, 80)
    d.add("call", "p_classic", "4. Классический лист\n(печать / PDF)", "Proc_Player", xs[5], yp - 70, 200, 80)
    d.add("call", "p_join", "5. Вход в лобби\nпо коду / QR", "Proc_Player", xs[3], yp + 70, 200, 80)
    d.add("call", "p_play", "6. Игровая сессия\nза столом", "Proc_Player", xs[6], yp)
    d.add("end", "p_end", "Конец сессии / выход", "Proc_Player", xs[7] + 20, mid(py, ph, EW))

    d.flow("pf1", "p_start", "p_auth")
    d.flow("pf2", "p_auth", "p_gw")
    d.flow("pf3", "p_gw", "p_create", "создать")
    d.flow("pf4", "p_gw", "p_sheet", "открыть лист")
    d.flow("pf5", "p_gw", "p_classic", "печать")
    d.flow("pf6", "p_gw", "p_join", "код лобби")
    d.flow("pf7", "p_create", "p_sheet")
    d.flow("pf8", "p_sheet", "p_classic", "бланк")
    d.flow("pf9", "p_join", "p_play")
    d.flow("pf10", "p_sheet", "p_play", "открытая сессия")
    d.flow("pf11", "p_play", "p_end")
    # reconnect classic back not needed

    d.add("start", "m_start", "Мастер входит", "Proc_Master", xs[0], mid(my, mh, EW))
    d.add("call", "m_lobby", "5. Создать лобби,\nправила, приглашение", "Proc_Master", xs[3], ym)
    d.add("call", "m_sess", "6. Вести сессию:\nбой, награды, отдых", "Proc_Master", xs[6], ym)
    d.add("end", "m_end", "Закрыть сессию", "Proc_Master", xs[7] + 20, mid(my, mh, EW))
    d.flow("mf1", "m_start", "m_lobby")
    d.flow("mf2", "m_lobby", "m_sess")
    d.flow("mf3", "m_sess", "m_end")

    d.add("start", "s_start", "API + сокеты", "Proc_System", xs[0], mid(sy, sh, EW))
    d.add("service", "s_auth", "REST /auth, /characters", "Proc_System", xs[1], ys)
    d.add("service", "s_lobby", "REST /lobbies, /sessions", "Proc_System", xs[3], ys)
    d.add("call", "s_sync", "7. Синхронизация\nлист ↔ лобби", "Proc_System", xs[5], ys)
    d.add("service", "s_ws", "WS /lobbies/{id}/ws\nи /sessions/{id}/ws", "Proc_System", xs[6], ys)
    d.add("end", "s_end", "Состояние сохранено", "Proc_System", xs[7] + 20, mid(sy, sh, EW))
    d.flow("sf1", "s_start", "s_auth")
    d.flow("sf2", "s_auth", "s_lobby")
    d.flow("sf3", "s_lobby", "s_sync")
    d.flow("sf4", "s_sync", "s_ws")
    d.flow("sf5", "s_ws", "s_end")

    d.flow("msg1", "p_auth", "s_auth", "логин, список", kind="message")
    d.flow("msg2", "p_join", "s_lobby", "join / copy", kind="message")
    d.flow("msg3", "m_lobby", "s_lobby", "создать лобби", kind="message")
    d.flow("msg4", "p_play", "s_ws", "ходы, броски", kind="message")
    d.flow("msg5", "m_sess", "s_ws", "бой, награды", kind="message")
    d.flow("msg6", "s_sync", "p_sheet", "session_changed,\nparty_rest", kind="message")
    d.note("n1", "Proc_System",
           "Источник истины — код прода origin/main @ 80947717. Ничего не выдумано. Подробности — в схемах 01–07 и DUPLICATES.md.",
           120, sy + 10, 420, 70)
    return d


# ---------------------------------------------------------------------------
# 01 Auth, list, onboarding
# ---------------------------------------------------------------------------
def map_auth() -> Diagram:
    d = Diagram("auth", "1. Регистрация / вход → список персонажей → онбординг")
    W = 3120
    py, ph = 70, 360
    my, mh = 520, 160
    sy, sh = 770, 340
    # two rows in player
    std_pools(d, W, py, ph, my, mh, sy, sh,
              lanes_p=[
                  ("Lane_P_auth", "Вход и аккаунт", 70, py, W - 30, 190),
                  ("Lane_P_list", "Список и онбординг", 70, py + 190, W - 30, 170),
              ])
    y1 = mid(py, 190, TH)
    y2 = mid(py + 190, 170, TH)
    ym = mid(my, mh, TH)
    ys = mid(sy, sh, TH)
    xs = xrow(120, 11, 200, 52)

    d.add("start", "p_start", "Открыть /login", "Proc_Player", xs[0], mid(py, 190, EW))
    d.add("exclusive", "p_has", "Есть аккаунт?", "Proc_Player", xs[1] + 80, mid(py, 190, GH))
    d.add("user", "p_reg", "Регистрация: почта, пароль ≥ 8, имя", "Proc_Player", xs[2], y1 - 50)
    d.add("user", "p_mail", "Подтвердить почту\n(/verify-email, /confirm-email)", "Proc_Player", xs[3], y1 - 50)
    d.add("user", "p_login", "Войти: почта + пароль\nили OAuth Яндекс / VK ID", "Proc_Player", xs[4], y1)
    d.add("user", "p_forgot", "Забыли пароль\n(/reset-password)", "Proc_Player", xs[3], y1 + 70)
    d.add("user", "p_list", "Список /characters", "Proc_Player", xs[5], y1)
    d.flow("a1", "p_start", "p_has")
    d.flow("a2", "p_has", "p_reg", "нет")
    d.flow("a3", "p_reg", "p_mail")
    d.flow("a4", "p_mail", "p_login")
    d.flow("a5", "p_has", "p_login", "да")
    d.flow("a6", "p_login", "p_list")
    d.flow("a7", "p_has", "p_forgot", "забыл пароль")
    d.flow("a8", "p_forgot", "p_login")

    d.add("user", "p_welcome", "«Добро пожаловать»:\nвпервые в D&D / тут впервые / пропустить", "Proc_Player", xs[5], y2)
    d.add("exclusive", "p_empty", "Есть персонажи?", "Proc_Player", xs[6] + 80, mid(py + 190, 170, GH))
    d.add("user", "p_empty_ui", "Пустой список: «Создать»,\nподсказка редакции, «Как это работает»", "Proc_Player", xs[7], y2)
    d.add("user", "p_cards", "Карточки персонажей\n(черновик, лист, классика, удалить)", "Proc_Player", xs[8], y2)
    d.add("user", "p_help", "Справка «Как это работает»\n(HelpDrawer)", "Proc_Player", xs[9], y2)
    d.add("end", "p_end", "К созданию / листу / лобби", "Proc_Player", xs[10], mid(py + 190, 170, EW))
    d.flow("a9", "p_list", "p_welcome")
    d.flow("a10", "p_welcome", "p_empty")
    d.flow("a11", "p_empty", "p_empty_ui", "нет")
    d.flow("a12", "p_empty", "p_cards", "да")
    d.flow("a13", "p_empty_ui", "p_help")
    d.flow("a14", "p_cards", "p_help")
    d.flow("a15", "p_help", "p_end")

    d.add("start", "m_start", "Тот же вход", "Proc_Master", xs[0], mid(my, mh, EW))
    d.add("user", "m_list", "Мастер пользуется тем же списком\nи кабинетом; лобби — отдельно", "Proc_Master", xs[5], ym, 260, 86)
    d.add("end", "m_end", "К лобби", "Proc_Master", xs[8], mid(my, mh, EW))
    d.flow("am1", "m_start", "m_list")
    d.flow("am2", "m_list", "m_end")

    d.add("start", "s_start", "Запрос", "Proc_System", xs[0], mid(sy, sh, EW))
    d.add("service", "s_reg", "POST /auth/register", "Proc_System", xs[2], ys - 60)
    d.add("service", "s_ver", "POST /auth/verify-email\nи /resend-verification", "Proc_System", xs[3], ys - 60)
    d.add("service", "s_login", "POST /auth/login\nGET /auth/oauth/{provider}/…", "Proc_System", xs[4], ys)
    d.add("service", "s_reset", "POST /auth/forgot-password\nPOST /auth/reset-password", "Proc_System", xs[3], ys + 70)
    d.add("service", "s_me", "GET /auth/me, refresh, logout,\nсессии устройства", "Proc_System", xs[5], ys)
    d.add("service", "s_chars", "GET /characters", "Proc_System", xs[6], ys)
    d.add("end", "s_end", "Сессия выдана", "Proc_System", xs[8], mid(sy, sh, EW))
    d.flow("s1", "s_start", "s_reg")
    d.flow("s2", "s_reg", "s_ver")
    d.flow("s3", "s_ver", "s_login")
    d.flow("s4", "s_login", "s_me")
    d.flow("s5", "s_start", "s_reset")
    d.flow("s6", "s_reset", "s_login")
    d.flow("s7", "s_me", "s_chars")
    d.flow("s8", "s_chars", "s_end")

    d.flow("msg_reg", "p_reg", "s_reg", "регистрация", kind="message")
    d.flow("msg_ver", "p_mail", "s_ver", "код из письма", kind="message")
    d.flow("msg_login", "p_login", "s_login", "логин / OAuth", kind="message")
    d.flow("msg_fg", "p_forgot", "s_reset", "сброс пароля", kind="message")
    d.flow("msg_list", "p_list", "s_chars", "список", kind="message")
    d.note("n_onb", "Proc_Player",
           "WelcomeDialog на /characters создание не запускает. Сегмент тура сохраняется в onboarding-хранилище. Гостю кнопки создания нет.",
           xs[6] - 10, py + 8, 320, 70, attach="p_welcome")
    return d


# ---------------------------------------------------------------------------
# 02 Character creation
# ---------------------------------------------------------------------------
def map_create() -> Diagram:
    d = Diagram("create", "2. Создание персонажа 2014 и 2024")
    W = 3300
    py, ph = 70, 420
    my, mh = 580, 200
    sy, sh = 870, 320
    std_pools(d, W, py, ph, my, mh, sy, sh, lanes_p=[
        ("Lane_P_in", "Входы", 70, py, W - 30, 160),
        ("Lane_P_form", "Форма 2014 / 2024", 70, py + 160, W - 30, 260),
    ])
    y0 = mid(py, 160, TH)
    y1 = mid(py + 160, 260, TH) - 60
    y2 = mid(py + 160, 260, TH) + 70
    ym = mid(my, mh, TH)
    ys = mid(sy, sh, TH)
    xs = xrow(110, 12, 200, 48)

    d.add("start", "p_start", "Вход в создание", "Proc_Player", xs[0], mid(py, 160, EW))
    d.add("exclusive", "p_src", "Откуда?", "Proc_Player", xs[1] + 80, mid(py, 160, GH))
    d.add("user", "p_btn", "Список: «Создать персонажа».\nФлаг 2024 открыт — выбор редакции", "Proc_Player", xs[2], y0 - 20)
    d.add("user", "p_draft", "Карточка черновика:\n/characters/create/:id (2014)", "Proc_Player", xs[3], y0 - 20)
    d.add("user", "p_forlob", "«Создать героя для этого лобби»\n(только форма 2014, без edition)", "Proc_Player", xs[4], y0 - 20)
    d.add("user", "p_copy", "Копия при конфликте лобби\n(action=copy → пайплайн копии)", "Proc_Player", xs[5], y0 - 20)
    d.flow("c1", "p_start", "p_src")
    d.flow("c2", "p_src", "p_btn", "список")
    d.flow("c3", "p_src", "p_draft", "черновик")
    d.flow("c4", "p_src", "p_forlob", "из лобби")
    d.flow("c5", "p_src", "p_copy", "копия")

    d.add("exclusive", "p_ed", "Редакция?", "Proc_Player", xs[2] + 80, mid(py + 160, 260, GH) - 10)
    d.add("user", "p_14", "2014: раса → черта* → предыстория\n→ класс → характеристики → прокачка", "Proc_Player", xs[3], y1, 230, 90)
    d.add("user", "p_14b", "Черновик / «Готово».\nМост «Персонаж готов»", "Proc_Player", xs[5], y1)
    d.add("user", "p_24", "2024: вид, родословная, предыстория,\nкласс, опции, превью, «Готово»", "Proc_Player", xs[3], y2, 230, 90)
    d.add("user", "p_24b", "POST /characters/create-2024\n(validate + languages)", "Proc_Player", xs[5], y2)
    d.add("exclusive", "p_lobbyq", "Для лобби?", "Proc_Player", xs[7] + 70, mid(py + 160, 260, GH))
    d.add("user", "p_join", "joinLobby(code, id):\nпосадка в состав", "Proc_Player", xs[8], mid(py + 160, 260, TH))
    d.add("end", "p_end_l", "В лобби", "Proc_Player", xs[10], mid(py + 160, 260, EW) - 50)
    d.add("end", "p_end_s", "На лист персонажа", "Proc_Player", xs[10], mid(py + 160, 260, EW) + 50)

    for src in ("p_btn", "p_draft", "p_forlob", "p_copy"):
        d.flow(f"c_{src}", src, "p_ed")
    d.flow("c10", "p_ed", "p_14", "2014")
    d.flow("c11", "p_14", "p_14b")
    d.flow("c12", "p_ed", "p_24", "2024")
    d.flow("c13", "p_24", "p_24b")
    d.flow("c14", "p_14b", "p_lobbyq")
    d.flow("c15", "p_24b", "p_lobbyq")
    d.flow("c16", "p_lobbyq", "p_join", "да, 2014")
    d.flow("c17", "p_lobbyq", "p_end_s", "нет")
    d.flow("c18", "p_join", "p_end_l")

    d.add("start", "m_start", "Правила уже заданы", "Proc_Master", xs[0], mid(my, mh, EW))
    d.add("user", "m_rules", "Правила старта лобби: уровень, запреты рас/классов,\nисточники. method/kit на готовом листе не проверяются", "Proc_Master", xs[4], ym, 280, 90)
    d.add("end", "m_end", "Ждёт героя в составе", "Proc_Master", xs[8], mid(my, mh, EW))
    d.flow("cm1", "m_start", "m_rules")
    d.flow("cm2", "m_rules", "m_end")

    d.add("start", "s_start", "Запрос", "Proc_System", xs[0], mid(sy, sh, EW))
    d.add("service", "s_c14", "POST /characters\n(create 2014, черновик)", "Proc_System", xs[3], ys - 50)
    d.add("service", "s_c24", "POST /characters/create-2024\nPOST …/validate, GET …/languages", "Proc_System", xs[3], ys + 55)
    d.add("service", "s_patch", "PATCH /characters/{id}\nsheet_version", "Proc_System", xs[5], ys)
    d.add("service", "s_clone", "join action=copy:\nклон-черновик « (копия)», version=1", "Proc_System", xs[7], ys - 50)
    d.add("service", "s_join", "POST /lobbies/join\n+ проверка редакции и start rules", "Proc_System", xs[7], ys + 55)
    d.add("end", "s_end", "Персонаж создан", "Proc_System", xs[10], mid(sy, sh, EW))
    d.flow("s1", "s_start", "s_c14")
    d.flow("s2", "s_start", "s_c24")
    d.flow("s3", "s_c14", "s_patch")
    d.flow("s4", "s_c24", "s_patch")
    d.flow("s5", "s_patch", "s_clone")
    d.flow("s6", "s_patch", "s_join")
    d.flow("s7", "s_clone", "s_end")
    d.flow("s8", "s_join", "s_end")

    d.flow("msg14", "p_14b", "s_c14", "create / PATCH черновик", kind="message")
    d.flow("msg24", "p_24b", "s_c24", "create-2024", kind="message")
    d.flow("msgcopy", "p_copy", "s_clone", "action=copy", kind="message")
    d.flow("msgjoin", "p_join", "s_join", "action=join", kind="message")
    d.note("n_2024", "Proc_Player",
           "Вход из лобби и копия на проде ведут в форму 2014 (параметра edition в createHeroForLobbyHref нет). Общего API clone/import вне action=copy нет.",
           xs[6], py + 8, 360, 80)
    return d


# ---------------------------------------------------------------------------
# 03 PC sheet life
# ---------------------------------------------------------------------------
def map_sheet() -> Diagram:
    d = Diagram("sheet", "3. Жизнь ПК-листа вне игры")
    W = 3240
    py, ph = 70, 380
    my, mh = 540, 220
    sy, sh = 850, 340
    std_pools(d, W, py, ph, my, mh, sy, sh)
    yp = mid(py, ph, TH) - 50
    yp2 = mid(py, ph, TH) + 70
    ym = mid(my, mh, TH)
    ys = mid(sy, sh, TH)
    xs = xrow(110, 11, 200, 52)

    d.add("start", "p_start", "Открыть /characters/:id", "Proc_Player", xs[0], mid(py, ph, EW) - 50)
    d.add("user", "p_ready", "«Персонаж готов», тур листа (5 шагов),\nсправка «Как это работает»", "Proc_Player", xs[1], yp)
    d.add("user", "p_edit", "Правка: основное, инвентарь,\nнапарники, ресурсы, прокачка", "Proc_Player", xs[3], yp)
    d.add("user", "p_rest", "Отдых (RestDialog)\nкороткий / длинный", "Proc_Player", xs[5], yp)
    d.add("user", "p_print", "Ссылка на классический бланк", "Proc_Player", xs[7], yp)
    d.add("user", "p_open", "Если есть open_session_id —\nк столу", "Proc_Player", xs[8], yp)
    d.add("end", "p_end1", "Лист в игре", "Proc_Player", xs[10], mid(py, ph, EW) - 50)

    d.add("user", "p_tab", "Баннер «Лист сохранён в другой вкладке»\n(BroadcastChannel)", "Proc_Player", xs[3], yp2)
    d.add("user", "p_conf", "Конфликт версий: обновить страницу\n(не перезаписать чужой PATCH)", "Proc_Player", xs[5], yp2)
    d.add("user", "p_del", "Удалить персонажа с карточки\n(есть окно «Удалить персонажа?»)", "Proc_Player", xs[7], yp2)
    d.add("end", "p_end2", "Удалён / обновлён", "Proc_Player", xs[10], mid(py, ph, EW) + 70)

    d.flow("h1", "p_start", "p_ready")
    d.flow("h2", "p_ready", "p_edit")
    d.flow("h3", "p_edit", "p_rest")
    d.flow("h4", "p_rest", "p_print")
    d.flow("h5", "p_print", "p_open")
    d.flow("h6", "p_open", "p_end1")
    d.flow("h7", "p_edit", "p_tab")
    d.flow("h8", "p_tab", "p_conf")
    d.flow("h9", "p_conf", "p_del")
    d.flow("h10", "p_del", "p_end2")

    d.add("start", "m_start", "Персонаж в его лобби", "Proc_Master", xs[0], mid(my, mh, EW))
    d.add("user", "m_view", "Просмотр листа: can_edit=false.\nPATCH запрещён (character_edit_forbidden)", "Proc_Master", xs[3], ym, 250, 90)
    d.add("user", "m_prest", "Партийный отдых из сессии\nоткрывает RestDialog на листах", "Proc_Master", xs[6], ym, 250, 90)
    d.add("end", "m_end", "Не владеет листом", "Proc_Master", xs[9], mid(my, mh, EW))
    d.flow("hm1", "m_start", "m_view")
    d.flow("hm2", "m_view", "m_prest")
    d.flow("hm3", "m_prest", "m_end")

    d.add("start", "s_start", "Запрос", "Proc_System", xs[0], mid(sy, sh, EW))
    d.add("service", "s_get", "GET /characters/{id}\nвладелец — правки; мастер лобби — чтение", "Proc_System", xs[1], ys)
    d.add("service", "s_patch", "PATCH /characters/{id}\nесли sheet_version не совпал → 409", "Proc_System", xs[3], ys)
    d.add("service", "s_fx", "POST …/effects/apply\nPOST …/effects/clear-concentration", "Proc_System", xs[5], ys)
    d.add("service", "s_av", "POST/DELETE …/avatar\nDELETE /characters/{id}", "Proc_System", xs[7], ys)
    d.add("service", "s_bc", "После PATCH: sheet_version += 1;\nесли за столом — session_changed", "Proc_System", xs[8], ys, 230, 90)
    d.add("end", "s_end", "Версия обновлена", "Proc_System", xs[10], mid(sy, sh, EW))
    d.flow("s1", "s_start", "s_get")
    d.flow("s2", "s_get", "s_patch")
    d.flow("s3", "s_patch", "s_fx")
    d.flow("s4", "s_fx", "s_av")
    d.flow("s5", "s_av", "s_bc")
    d.flow("s6", "s_bc", "s_end")

    d.flow("msg_g", "p_start", "s_get", "GET лист", kind="message")
    d.flow("msg_p", "p_edit", "s_patch", "PATCH + version", kind="message")
    d.flow("msg_r", "p_rest", "s_patch", "результат отдыха", kind="message")
    d.flow("msg_d", "p_del", "s_av", "DELETE", kind="message")
    d.flow("msg_pr", "m_prest", "p_rest", "WS party_rest", kind="message")
    d.flow("msg_cf", "s_patch", "p_conf", "409 conflict", kind="message")
    d.note("n_del", "Proc_Player",
           "Удаление атаки/предмета/напарника на листе — без окна (как на проде). Удаление самого персонажа с карточки — с подтверждением.",
           xs[8], py + 8, 300, 80)
    return d


# ---------------------------------------------------------------------------
# 04 Classic sheet
# ---------------------------------------------------------------------------
def map_classic() -> Diagram:
    d = Diagram("classic", "4. Классический лист (форма печати)")
    W = 2600
    py, ph = 80, 300
    my, mh = 480, 200
    sy, sh = 780, 280
    std_pools(d, W, py, ph, my, mh, sy, sh)
    yp = mid(py, ph, TH)
    ym = mid(my, mh, TH)
    ys = mid(sy, sh, TH)
    xs = xrow(120, 8, 220, 60)

    d.add("start", "p_start", "Вход в бланк", "Proc_Player", xs[0], mid(py, ph, EW))
    d.add("exclusive", "p_kind", "Какой бланк?", "Proc_Player", xs[1] + 80, mid(py, ph, GH))
    d.add("user", "p_filled", "/characters/:id/classic\nданные того же CharacterDetail", "Proc_Player", xs[2], yp - 60)
    d.add("user", "p_blank", "/classic/blank?layout=2014|2024\nпустой, без API", "Proc_Player", xs[2], yp + 70)
    d.add("user", "p_set", "«Правка печати»: только sheet.ui.classic_*\n(макет, шрифты, карандаш, доп. страницы)", "Proc_Player", xs[4], yp)
    d.add("user", "p_print", "Печать / PDF, холст A4 210×297\n(не Letter)", "Proc_Player", xs[5], yp)
    d.add("end", "p_end", "Бланк готов", "Proc_Player", xs[7], mid(py, ph, EW))
    d.flow("k1", "p_start", "p_kind")
    d.flow("k2", "p_kind", "p_filled", "персонаж")
    d.flow("k3", "p_kind", "p_blank", "пустой")
    d.flow("k4", "p_filled", "p_set")
    d.flow("k5", "p_blank", "p_print")
    d.flow("k6", "p_set", "p_print")
    d.flow("k7", "p_print", "p_end")

    d.add("start", "m_start", "Есть доступ на чтение?", "Proc_Master", xs[0], mid(my, mh, EW))
    d.add("user", "m_view", "Может открыть бланк чужого героя лобби\n(только просмотр). Настройки печати не пишет", "Proc_Master", xs[3], ym, 280, 90)
    d.add("end", "m_end", "Без правки листа", "Proc_Master", xs[6], mid(my, mh, EW))
    d.flow("km1", "m_start", "m_view")
    d.flow("km2", "m_view", "m_end")

    d.add("start", "s_start", "Запрос", "Proc_System", xs[0], mid(sy, sh, EW))
    d.add("service", "s_get", "GET /characters/{id}", "Proc_System", xs[2], ys)
    d.add("service", "s_patch", "PATCH только classic_* в sheet.ui.\nИгровые поля бланк не пишет", "Proc_System", xs[4], ys, 240, 90)
    d.add("end", "s_end", "Без BroadcastChannel", "Proc_System", xs[6], mid(sy, sh, EW))
    d.flow("s1", "s_start", "s_get")
    d.flow("s2", "s_get", "s_patch")
    d.flow("s3", "s_patch", "s_end")
    d.flow("msg1", "p_filled", "s_get", "чтение листа", kind="message")
    d.flow("msg2", "p_set", "s_patch", "настройки печати", kind="message")
    d.note("n_ed", "Proc_Player",
           "Переключатель 2014/2024 на бланке — это макет печати (classic_sheet_layout), не rules_edition персонажа. Classic — не второй редактор.",
           xs[4], py + 8, 360, 70)
    return d


# ---------------------------------------------------------------------------
# 05 Lobby
# ---------------------------------------------------------------------------
def map_lobby() -> Diagram:
    d = Diagram("lobby", "5. Лобби: создание, приглашение, посадка")
    W = 3360
    py, ph = 70, 360
    my, mh = 520, 340
    sy, sh = 950, 340
    std_pools(d, W, py, ph, my, mh, sy, sh)
    yp = mid(py, ph, TH) - 55
    yp2 = mid(py, ph, TH) + 70
    ym = mid(my, mh, TH) - 50
    ym2 = mid(my, mh, TH) + 70
    ys = mid(sy, sh, TH)
    xs = xrow(110, 11, 200, 50)

    d.add("start", "p_start", "Получил код / QR", "Proc_Player", xs[0], mid(py, ph, EW) - 55)
    d.add("user", "p_joinp", "Страница /join или /join/:code.\nСначала нужен вход", "Proc_Player", xs[1], yp)
    d.add("exclusive", "p_how", "Как войти?", "Proc_Player", xs[3] + 70, mid(py, ph, GH) - 10)
    d.add("user", "p_obs", "Без персонажа → наблюдатель\n(не владелец, не с героем в составе)", "Proc_Player", xs[4], yp)
    d.add("user", "p_hero", "С персонажем: проверка редакции\nлобби и правил старта", "Proc_Player", xs[4], yp2)
    d.add("exclusive", "p_mis", "Конфликт?", "Proc_Player", xs[6] + 70, mid(py, ph, GH) + 20)
    d.add("user", "p_copy", "action=copy: клон-черновик,\nправка в создании 2014, затем join", "Proc_Player", xs[7], yp)
    d.add("user", "p_tr", "action=transfer: уйти из другого\nлобби (если нет открытой сессии)", "Proc_Player", xs[7], yp2)
    d.add("user", "p_ack", "Подтвердить несоответствие\n(start_rules_ok=false, пока мастер не снимет)", "Proc_Player", xs[8], yp2, 230, 90)
    d.add("user", "p_in", "В составе лобби.\nСесть за стол — отдельно, в сессии", "Proc_Player", xs[9], mid(py, ph, TH))
    d.add("end", "p_end", "В лобби", "Proc_Player", xs[10], mid(py, ph, EW))
    d.flow("l1", "p_start", "p_joinp")
    d.flow("l2", "p_joinp", "p_how")
    d.flow("l3", "p_how", "p_obs", "без героя")
    d.flow("l4", "p_how", "p_hero", "с героем")
    d.flow("l5", "p_obs", "p_in")
    d.flow("l6", "p_hero", "p_mis")
    d.flow("l7", "p_mis", "p_copy", "копия")
    d.flow("l8", "p_mis", "p_tr", "уже в другом")
    d.flow("l9", "p_mis", "p_ack", "не по правилам")
    d.flow("l10", "p_mis", "p_in", "ок")
    d.flow("l11", "p_tr", "p_in")
    d.flow("l12", "p_ack", "p_in")
    d.flow("l13", "p_copy", "p_end")
    d.flow("l14", "p_in", "p_end")

    d.add("start", "m_start", "Создать стол", "Proc_Master", xs[0], mid(my, mh, EW) - 50)
    d.add("user", "m_new", "POST /lobbies: имя, редакция,\nправила кампании, видимость", "Proc_Master", xs[1], ym)
    d.add("user", "m_inv", "Код приглашения, QR, ротация кода", "Proc_Master", xs[3], ym)
    d.add("user", "m_roles", "Роли: сомастер, наблюдатель,\nпередача владения, «повести сегодня»", "Proc_Master", xs[5], ym)
    d.add("user", "m_wiki", "Сеттинг / вики, артефакты,\nжурнал, заметки, чаты", "Proc_Master", xs[7], ym)
    d.add("user", "m_waive", "Снять пометку «не по правилам старта»", "Proc_Master", xs[5], ym2)
    d.add("user", "m_sess", "Создать сессию: все члены состава\nпредвыбраны за столом (автопосадка)", "Proc_Master", xs[7], ym2, 230, 90)
    d.add("end", "m_end", "Сессия создана", "Proc_Master", xs[10], mid(my, mh, EW))
    d.flow("mm1", "m_start", "m_new")
    d.flow("mm2", "m_new", "m_inv")
    d.flow("mm3", "m_inv", "m_roles")
    d.flow("mm4", "m_roles", "m_wiki")
    d.flow("mm5", "m_roles", "m_waive")
    d.flow("mm6", "m_wiki", "m_sess")
    d.flow("mm7", "m_waive", "m_sess")
    d.flow("mm8", "m_sess", "m_end")

    d.add("start", "s_start", "Запрос", "Proc_System", xs[0], mid(sy, sh, EW))
    d.add("service", "s_crud", "POST/GET/PATCH/DELETE /lobbies\nGET /lobbies/invite/{code}", "Proc_System", xs[1], ys)
    d.add("service", "s_join", "POST /lobbies/join\nensure edition + start_rules", "Proc_System", xs[3], ys)
    d.add("service", "s_flags", "waive-start-rules,\nrecompute start_rules_ok", "Proc_System", xs[5], ys)
    d.add("service", "s_seats", "POST /sessions + seats\n(пустой character_ids ≠ «всем»)", "Proc_System", xs[7], ys, 230, 90)
    d.add("service", "s_ws", "WS /lobbies/{id}/ws:\nlobby_resync, чаты, журнал, заметки", "Proc_System", xs[9], ys, 230, 90)
    d.add("end", "s_end", "Состав обновлён", "Proc_System", xs[10] + 30, mid(sy, sh, EW))
    d.flow("s1", "s_start", "s_crud")
    d.flow("s2", "s_crud", "s_join")
    d.flow("s3", "s_join", "s_flags")
    d.flow("s4", "s_flags", "s_seats")
    d.flow("s5", "s_seats", "s_ws")
    d.flow("s6", "s_ws", "s_end")

    d.flow("msgj", "p_hero", "s_join", "join / transfer / copy", kind="message")
    d.flow("msgc", "m_new", "s_crud", "создать лобби", kind="message")
    d.flow("msgw", "m_waive", "s_flags", "waive", kind="message")
    d.flow("msgs", "m_sess", "s_seats", "character_ids", kind="message")
    d.flow("msgws", "s_ws", "p_in", "lobby_resync", kind="message")
    d.note("n_auto", "Proc_Master",
           "Автопосадка на проде: при создании сессии UI отмечает всех членов состава. В уже идущую сессию при join персонаж сам не сажается — нужна кнопка «Сесть за стол».",
           xs[8], my + 8, 340, 80)
    return d


# ---------------------------------------------------------------------------
# 06 Session play
# ---------------------------------------------------------------------------
def map_session() -> Diagram:
    d = Diagram("session", "6. Игровая сессия в лобби")
    W = 3500
    py, ph = 60, 400
    my, mh = 550, 400
    sy, sh = 1040, 360
    std_pools(d, W, py, ph, my, mh, sy, sh)
    yp = mid(py, ph, TH) - 60
    yp2 = mid(py, ph, TH) + 75
    ym = mid(my, mh, TH) - 60
    ym2 = mid(my, mh, TH) + 75
    ys = mid(sy, sh, TH)
    xs = xrow(100, 12, 200, 48)

    d.add("start", "p_start", "Открыть /sessions/:id", "Proc_Player", xs[0], mid(py, ph, EW) - 60)
    d.add("user", "p_seat", "Если не за столом — «Сесть за стол»\n(свой герой из состава)", "Proc_Player", xs[1], yp)
    d.add("user", "p_init", "Бросок инициативы, если слот «ждём бросок»", "Proc_Player", xs[3], yp)
    d.add("user", "p_turn", "Свой ход: экономика хода,\nатака с листа (sheet-attack)", "Proc_Player", xs[5], yp)
    d.add("user", "p_reac", "Окно «Есть ли реакция?»: объявить /\n«Нет реакции» / автопропуск 10 с", "Proc_Player", xs[7], yp, 230, 90)
    d.add("user", "p_dice", "Кубики и журнал сессии\n(ручной / цифровой бросок)", "Proc_Player", xs[8], yp)
    d.add("user", "p_hp", "Хиты: свои точно; чужие — по профилю\nвидимости (числа / полоса / скрыто)", "Proc_Player", xs[3], yp2, 230, 90)
    d.add("user", "p_death", "Свои спасброски смерти видны себе\n(и мастеру, если hidden_death_saves)", "Proc_Player", xs[5], yp2, 230, 90)
    d.add("user", "p_rest", "WS party_rest открывает RestDialog\nна листе — игрок сам завершает отдых", "Proc_Player", xs[7], yp2, 230, 90)
    d.add("end", "p_end", "Сессия закрыта", "Proc_Player", xs[10], mid(py, ph, EW))
    d.flow("p1", "p_start", "p_seat")
    d.flow("p2", "p_seat", "p_init")
    d.flow("p3", "p_init", "p_turn")
    d.flow("p4", "p_turn", "p_reac")
    d.flow("p5", "p_reac", "p_dice")
    d.flow("p6", "p_seat", "p_hp")
    d.flow("p7", "p_hp", "p_death")
    d.flow("p8", "p_death", "p_rest")
    d.flow("p9", "p_dice", "p_end")
    d.flow("p10", "p_rest", "p_end")

    d.add("start", "m_start", "Вести стол", "Proc_Master", xs[0], mid(my, mh, EW) - 60)
    d.add("user", "m_att", "Посещаемость: посадить / убрать\nс места", "Proc_Master", xs[1], ym)
    d.add("user", "m_comb", "Старт боя, противники, волны,\nбой из вики / генератор встреч", "Proc_Master", xs[3], ym)
    d.add("user", "m_init", "Инициатива партии (серверный бросок\nили ожидание игроков)", "Proc_Master", xs[5], ym)
    d.add("user", "m_atk", "Атака стола POST …/combat/attack;\nход next/prev, пропуск реакции", "Proc_Master", xs[7], ym, 230, 90)
    d.add("user", "m_awd", "XP, добыча, сундук, выдача в инвентарь,\nсостояния, эффекты, благочестие", "Proc_Master", xs[5], ym2, 230, 90)
    d.add("user", "m_rest", "Партийный отдых (не в бою,\nнужны места за столом)", "Proc_Master", xs[7], ym2)
    d.add("user", "m_close", "Закрыть сессию, опционально запись\nв журнал; снять retained seats", "Proc_Master", xs[9], ym2, 230, 90)
    d.add("end", "m_end", "Итог записан", "Proc_Master", xs[10] + 20, mid(my, mh, EW) + 70)
    d.flow("m1", "m_start", "m_att")
    d.flow("m2", "m_att", "m_comb")
    d.flow("m3", "m_comb", "m_init")
    d.flow("m4", "m_init", "m_atk")
    d.flow("m5", "m_atk", "m_awd")
    d.flow("m6", "m_awd", "m_rest")
    d.flow("m7", "m_rest", "m_close")
    d.flow("m8", "m_close", "m_end")

    d.add("start", "s_start", "Сессия открыта", "Proc_System", xs[0], mid(sy, sh, EW))
    d.add("service", "s_seat", "POST/DELETE …/seats\n(+ слот «ждём бросок», если бой идёт)", "Proc_System", xs[1], ys)
    d.add("service", "s_cb", "combat/start, initiative, attack,\nsheet-attack, reaction, patch", "Proc_System", xs[3], ys, 230, 90)
    d.add("service", "s_mut", "patch_seat_combat, companions,\nусловия, хиты, смерть — пишут sheet", "Proc_System", xs[5], ys, 230, 90)
    d.add("service", "s_aw", "award xp/loot, grants, transfer,\nparty-rest (событие, не применение)", "Proc_System", xs[7], ys, 230, 90)
    d.add("service", "s_ws", "WS: session_changed, session_event,\nparty_rest, turn_started, turn_economy_reset", "Proc_System", xs[9], ys, 250, 90)
    d.add("end", "s_end", "События в ленте", "Proc_System", xs[10] + 40, mid(sy, sh, EW))
    d.flow("s1", "s_start", "s_seat")
    d.flow("s2", "s_seat", "s_cb")
    d.flow("s3", "s_cb", "s_mut")
    d.flow("s4", "s_mut", "s_aw")
    d.flow("s5", "s_aw", "s_ws")
    d.flow("s6", "s_ws", "s_end")

    d.flow("msg_seat", "p_seat", "s_seat", "сесть", kind="message")
    d.flow("msg_atk", "p_turn", "s_cb", "sheet-attack", kind="message")
    d.flow("msg_re", "p_reac", "s_cb", "declare / skip", kind="message")
    d.flow("msg_matk", "m_atk", "s_cb", "combat/attack", kind="message")
    d.flow("msg_aw", "m_awd", "s_aw", "награды", kind="message")
    d.flow("msg_pr", "m_rest", "s_aw", "party-rest", kind="message")
    d.flow("msg_pr2", "s_ws", "p_rest", "party_rest", kind="message")
    d.flow("msg_hp", "s_ws", "p_hp", "session_changed", kind="message")
    d.note("n_npc", "Proc_Player",
           "Спасброски напарников: story и живой купленный скакун — да; зверь следопыта / primal / drake / призванные / облик — нет. У карточки врага (EnemyCard) UI спасбросков нет.",
           xs[8], py + 8, 360, 90)
    return d


# ---------------------------------------------------------------------------
# 07 Sync
# ---------------------------------------------------------------------------
def map_sync() -> Diagram:
    d = Diagram("sync", "7. Синхронизация лист ↔ лобби: владельцы данных и каналы")
    W = 3200
    py, ph = 70, 340
    my, mh = 500, 300
    sy, sh = 890, 420
    std_pools(d, W, py, ph, my, mh, sy, sh)
    yp = mid(py, ph, TH)
    ym = mid(my, mh, TH)
    ys1 = mid(sy, sh, TH) - 70
    ys2 = mid(sy, sh, TH) + 80
    xs = xrow(110, 10, 210, 55)

    d.add("start", "p_start", "Открыт лист и/или сессия", "Proc_Player", xs[0], mid(py, ph, EW))
    d.add("user", "p_own", "Владелец листа: имя, sheet JSON,\nхиты, инвентарь, отдых, прокачка", "Proc_Player", xs[2], yp)
    d.add("user", "p_tab", "Другая вкладка: BroadcastChannel\n«dvarf.character-sheet»", "Proc_Player", xs[4], yp)
    d.add("user", "p_live", "За столом получает session_changed,\nparty_rest, эффекты", "Proc_Player", xs[6], yp)
    d.add("end", "p_end", "Видит согласованное состояние", "Proc_Player", xs[8], mid(py, ph, EW))
    d.flow("p1", "p_start", "p_own")
    d.flow("p2", "p_own", "p_tab")
    d.flow("p3", "p_tab", "p_live")
    d.flow("p4", "p_live", "p_end")

    d.add("start", "m_start", "Ведёт лобби / сессию", "Proc_Master", xs[0], mid(my, mh, EW))
    d.add("user", "m_own", "Владелец: правила кампании, видимость,\nвики, журнал, состав, бой сессии", "Proc_Master", xs[2], ym, 230, 90)
    d.add("user", "m_mut", "Пишет в чужой sheet только через\nAPI сессии (урон, XP, лут, условия)", "Proc_Master", xs[5], ym, 250, 90)
    d.add("user", "m_no", "Прямой PATCH чужого персонажа — 403", "Proc_Master", xs[7], ym)
    d.add("end", "m_end", "Стол обновлён", "Proc_Master", xs[8], mid(my, mh, EW))
    d.flow("m1", "m_start", "m_own")
    d.flow("m2", "m_own", "m_mut")
    d.flow("m3", "m_mut", "m_no")
    d.flow("m4", "m_no", "m_end")

    d.add("start", "s_start", "Каналы синхронизации", "Proc_System", xs[0], mid(sy, sh, EW) - 70)
    d.add("service", "s_sheet", "Источник правды героя:\nтаблица characters + sheet\nОптимистичная блокировка sheet_version", "Proc_System", xs[2], ys1, 240, 100)
    d.add("service", "s_sess", "Источник правды боя:\nPlaySession.combat / combatants / seats", "Proc_System", xs[4], ys1, 240, 100)
    d.add("service", "s_lob", "Источник правды стола:\nlobby, members, campaign_rules,\nvisibility_profile", "Proc_System", xs[6], ys1, 240, 100)
    d.add("service", "s_from_s", "Мутации листа из сессии:\npatch_seat_combat, attack, xp/loot,\ncompanions, transfer, effects, piety", "Proc_System", xs[3], ys2, 250, 100)
    d.add("service", "s_ch", "Каналы: PATCH 409; BroadcastChannel;\nWS session_* / lobby_resync /\nsheet_effects_changed / party_rest", "Proc_System", xs[6], ys2, 260, 100)
    d.add("end", "s_end", "Оба клиента перечитали", "Proc_System", xs[8], mid(sy, sh, EW))
    d.flow("s1", "s_start", "s_sheet")
    d.flow("s2", "s_sheet", "s_sess")
    d.flow("s3", "s_sess", "s_lob")
    d.flow("s4", "s_sheet", "s_from_s")
    d.flow("s5", "s_from_s", "s_ch")
    d.flow("s6", "s_lob", "s_ch")
    d.flow("s7", "s_ch", "s_end")

    d.flow("msg1", "p_own", "s_sheet", "PATCH владельца", kind="message")
    d.flow("msg2", "m_mut", "s_from_s", "API сессии", kind="message")
    d.flow("msg3", "s_ch", "p_live", "WS / BC", kind="message")
    d.flow("msg4", "s_ch", "m_own", "lobby_resync", kind="message")
    d.note("n_rest", "Proc_System",
           "party_rest само хиты/ячейки не применяет: шлёт WS, игрок подтверждает RestDialog и делает PATCH. Два писателя в sheet (игрок и стол) сходятся через sheet_version.",
           xs[7], sy + 8, 340, 90)
    return d


MAPS = {
    "00-overview.bpmn": map_overview,
    "01-auth-list-onboarding.bpmn": map_auth,
    "02-character-creation.bpmn": map_create,
    "03-pc-sheet-life.bpmn": map_sheet,
    "04-classic-sheet.bpmn": map_classic,
    "05-lobby.bpmn": map_lobby,
    "06-session-play.bpmn": map_session,
    "07-sheet-lobby-sync.bpmn": map_sync,
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in MAPS.items():
        xml = fn().to_xml()
        path = OUT / name
        path.write_text(xml, encoding="utf-8")
        print(f"wrote {path} ({len(xml)} bytes)")


if __name__ == "__main__":
    main()
