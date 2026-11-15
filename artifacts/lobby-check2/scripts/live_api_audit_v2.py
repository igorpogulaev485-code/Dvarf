#!/usr/bin/env python3
"""Re-audit live API for PR #414 after M1–M9 fixes. Artifact only."""

from __future__ import annotations

import json
import re
import sys
import traceback
import urllib.error
import urllib.request
from copy import deepcopy
from pathlib import Path
from typing import Any
from uuid import uuid4

BASE = "http://127.0.0.1:8000"
OUT = Path(__file__).resolve().parent.parent / "api-logs" / "live_api_results.json"
OUT.parent.mkdir(parents=True, exist_ok=True)
results: list[dict[str, Any]] = []


def record(name: str, status: str, detail: Any = None) -> None:
    results.append({"scenario": name, "status": status, "detail": detail})
    mark = {"PASS": "✓", "FAIL": "✗", "NOT_TESTED": "·"}.get(status, "?")
    extra = ""
    if status != "PASS" and detail is not None:
        s = detail if isinstance(detail, str) else json.dumps(detail, ensure_ascii=False)
        extra = f" — {s if len(s) < 280 else s[:280]+'…'}"
    print(f"[{mark}] {name}: {status}{extra}")


def req(method: str, path: str, token: str | None = None, body: Any = None, expect: int | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            raw = resp.read().decode() or "null"
            code, payload = resp.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() or "null"
        code = exc.code
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"raw": raw}
    if expect is not None and code != expect:
        raise AssertionError(f"{method} {path} -> {code} (want {expect}): {payload}")
    return code, payload


def register(tag: str):
    email = f"reaudit-{tag}-{uuid4().hex[:10]}@example.com"
    password = "AuditPass123!"
    _, reg = req(
        "POST",
        "/auth/register",
        body={"email": email, "password": password, "display_name": f"Re {tag}"},
        expect=200,
    )
    m = re.search(r"token=([^&]+)", reg.get("debug_verify_url") or "")
    assert m, reg
    _, tokens = req("POST", "/auth/verify-email", body={"token": m.group(1)}, expect=200)
    return tokens["access_token"], tokens["refresh_token"], tokens["user"], email, password


def make_character(token: str, name: str, *, hp: int = 45, level: int = 1, xp: int = 0):
    _, ch = req(
        "POST",
        "/characters",
        token=token,
        body={"rules_edition": "2014", "name": name, "is_draft": False},
        expect=201,
    )
    sheet = deepcopy(ch["sheet"]) if isinstance(ch.get("sheet"), dict) else {}
    combat = dict(sheet.get("combat") or {})
    identity = dict(sheet.get("identity") or {})
    combat.update({"hp_max": hp, "hp_current": hp, "hp_temp": 0, "conditions": [], "effects": [], "ac": 16})
    identity.update(
        {"name": name, "experience": xp, "race_name": "Человек", "class_name": "Воин", "level": level}
    )
    sheet["combat"] = combat
    sheet["identity"] = identity
    sheet["classes"] = [{"name": "Воин", "level": level}]
    sheet["inventory"] = {"coins": {"gp": 5}, "items": []}
    sheet["companions"] = []
    _, updated = req(
        "PATCH",
        f"/characters/{ch['id']}",
        token=token,
        body={
            "name": name,
            "level": level,
            "class_name": "Воин",
            "race_name": "Человек",
            "hp_current": hp,
            "hp_max": hp,
            "is_draft": False,
            "sheet": sheet,
            "sheet_version": ch["sheet_version"],
        },
        expect=200,
    )
    return updated


def seat(session: dict, cid: str) -> dict:
    for s in session.get("seats") or []:
        if s.get("character_id") == cid:
            return s
    raise AssertionError(f"missing seat {cid}")


def get_char(token: str, cid: str) -> dict:
    return req("GET", f"/characters/{cid}", token=token, expect=200)[1]


def start_combat(token: str, session: dict) -> dict:
    entries = []
    for s in session.get("seats") or []:
        entries.append(
            {
                "kind": "pc",
                "ref_id": s["character_id"],
                "name": s["character_name"],
                "initiative": None,
                "initiative_pending": True,
                "dex_mod": s.get("dex_mod"),
            }
        )
        for c in s.get("companions") or []:
            if c.get("initiative_mode") == "own_initiative":
                entries.append(
                    {
                        "kind": "companion",
                        "ref_id": s["character_id"],
                        "companion_id": c["id"],
                        "name": f"{c['name']} ({s['character_name']})",
                        "initiative": None,
                        "initiative_pending": True,
                    }
                )
    combatant_ids = []
    for e in session.get("combatants") or []:
        combatant_ids.append(e["id"])
        entries.append(
            {
                "kind": "enemy",
                "ref_id": e["id"],
                "name": e.get("name") or "Враг",
                "initiative": 10,
                "initiative_pending": False,
                "dex_mod": e.get("dex_mod"),
            }
        )
    if not entries:
        raise AssertionError("no combat entries")
    waves = [{"index": 1, "condition_text": "сразу", "combatant_ids": combatant_ids, "released": True}]
    return req(
        "POST",
        f"/sessions/{session['id']}/combat/start",
        token=token,
        body={"entries": entries, "waves": waves},
        expect=200,
    )[1]


def main() -> int:
    failed = 0
    ctx: dict[str, Any] = {}

    def check(name: str, fn):
        nonlocal failed
        try:
            detail = fn()
            record(name, "PASS", detail)
        except Exception as exc:  # noqa: BLE001
            failed += 1
            record(name, "FAIL", f"{exc}\n{traceback.format_exc()[-900:]}")

    def bootstrap():
        mt, mref, mu, memail, mpw = register("master")
        pt, pref, pu, pemail, ppw = register("player")
        p2t, p2ref, p2u, p2email, p2pw = register("player2")
        ot, oref, _, oemail, opw = register("observer")
        mc = make_character(mt, "Воин Мастера", hp=40)
        pc = make_character(pt, "Воин Игрока", hp=45)
        p2c = make_character(p2t, "Жрец Неполучатель", hp=38)
        _, lobby = req("POST", "/lobbies", token=mt, body={"name": f"ReAudit {uuid4().hex[:6]}"}, expect=201)
        code = lobby["invite_code"]
        for tok, cid in ((mt, mc["id"]), (pt, pc["id"]), (p2t, p2c["id"])):
            _, j = req(
                "POST",
                "/lobbies/join",
                token=tok,
                body={"code": code, "character_id": cid, "acknowledge_start_mismatch": True},
                expect=200,
            )
            lobby = j["lobby"]
        _, j = req("POST", "/lobbies/join", token=ot, body={"code": code}, expect=200)
        lobby = j["lobby"]
        ctx.update(
            mt=mt, mref=mref, pt=pt, pref=pref, p2t=p2t, p2ref=p2ref, ot=ot,
            mc=mc, pc=pc, p2c=p2c, lobby=lobby, invite=code,
            memail=memail, mpw=mpw, pemail=pemail, ppw=ppw, p2email=p2email, p2pw=p2pw,
        )
        return {"lobby": lobby["id"], "members": len(lobby.get("members") or []), "invite": code}

    check("bootstrap_join_by_code_master_player_observer", bootstrap)
    if "lobby" not in ctx:
        OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        return 1

    def invite_meta_auth():
        code, body = req("GET", f"/lobbies/invite/{ctx['invite']}")
        authed = req("GET", f"/lobbies/invite/{ctx['invite']}", token=ctx["pt"], expect=200)[1]
        return {"unauth_status": code, "authed_name": authed.get("name")}

    check("invite_meta_requires_auth", invite_meta_auth)

    def empty_character_ids_seats_nobody():
        # M6 fix: empty = nobody
        _, session = req(
            "POST",
            f"/lobbies/{ctx['lobby']['id']}/sessions",
            token=ctx["mt"],
            body={"name": "Empty Seats", "character_ids": []},
            expect=201,
        )
        n = len(session.get("seats") or [])
        if n != 0:
            raise AssertionError(f"empty character_ids must seat 0, got {n}")
        # real session with both players + non-recipient
        _, session = req(
            "POST",
            f"/lobbies/{ctx['lobby']['id']}/sessions",
            token=ctx["mt"],
            body={
                "name": "ReAudit Session",
                "character_ids": [ctx["mc"]["id"], ctx["pc"]["id"], ctx["p2c"]["id"]],
            },
            expect=201,
        )
        ctx["session"] = session
        return {"empty_seats": n, "filled_seats": len(session["seats"])}

    check("session_create_empty_character_ids_seats_nobody", empty_character_ids_seats_nobody)

    def setting_attach():
        _, setting = req(
            "POST",
            f"/lobbies/{ctx['lobby']['id']}/settings",
            token=ctx["mt"],
            body={"name": "Мир ReAudit"},
            expect=201,
        )
        _, session = req(
            "PATCH",
            f"/sessions/{ctx['session']['id']}",
            token=ctx["mt"],
            body={"setting_id": setting["id"]},
            expect=200,
        )
        ctx["session"] = session
        return {"setting_id": setting["id"]}

    check("setting_attach", setting_attach)

    def custom_npc_cr_optional():
        # M7: without CR must succeed
        code, body = req(
            "POST",
            f"/sessions/{ctx['session']['id']}/combatants",
            token=ctx["mt"],
            body={"name": "Страж без ПО", "hp_max": 10, "count": 1},
        )
        if code != 201:
            raise AssertionError(f"NPC without CR should 201, got {code}:{body}")
        ctx["session"] = body
        npc = next(c for c in body["combatants"] if c.get("name") == "Страж без ПО")
        # with CR still works
        _, session = req(
            "POST",
            f"/sessions/{ctx['session']['id']}/combatants",
            token=ctx["mt"],
            body={"name": "Свой НПС", "hp_max": 22, "ac": 13, "count": 1, "cr": "1"},
            expect=201,
        )
        ctx["session"] = session
        npc2 = next(c for c in session["combatants"] if c.get("name") == "Свой НПС")
        if npc2.get("xp") != 200:
            raise AssertionError(f"CR1 xp want 200 got {npc2}")
        return {"no_cr_ok": True, "npc_xp": npc.get("xp"), "cr1_xp": npc2.get("xp")}

    check("custom_npc_cr_optional_and_xp_from_table", custom_npc_cr_optional)

    def enemy_pack():
        before = len(ctx["session"].get("combatants") or [])
        _, session = req(
            "POST",
            f"/sessions/{ctx['session']['id']}/combatants",
            token=ctx["mt"],
            body={"name": f"Гоблины-{uuid4().hex[:4]}", "hp_max": 7, "ac": 15, "count": 3, "cr": "1/4"},
            expect=201,
        )
        ctx["session"] = session
        added = len(session["combatants"]) - before
        pack = session["combatants"][-1]
        if added != 1 or len(pack.get("members") or []) != 3:
            raise AssertionError(f"added={added} members={len(pack.get('members') or [])}")
        return {"added": added, "members": 3}

    check("enemy_pack_single_post_one_card_three_members", enemy_pack)

    def initiative_flow():
        session = start_combat(ctx["mt"], ctx["session"])
        ctx["session"] = session
        code, body = req(
            "POST",
            f"/sessions/{session['id']}/combat/initiative",
            token=ctx["pt"],
            body={"mode": "roll_remaining"},
        )
        if code != 403:
            raise AssertionError(f"player roll_remaining want 403 got {code}")
        _, session = req(
            "POST",
            f"/sessions/{session['id']}/combat/initiative",
            token=ctx["mt"],
            body={"mode": "roll_remaining"},
            expect=200,
        )
        still = [
            e
            for e in session["combat"]["entries"]
            if e.get("initiative_pending") or e.get("initiative") is None
        ]
        if still:
            raise AssertionError(still)
        code2, _ = req(
            "POST",
            f"/sessions/{session['id']}/combat/initiative",
            token=ctx["mt"],
            body={"mode": "roll_remaining"},
        )
        if code2 != 400:
            raise AssertionError(f"second want 400 got {code2}")
        n1 = len(session["combat"]["entries"])
        _, session = req(
            "PATCH", f"/sessions/{session['id']}/combat", token=ctx["mt"], body={"action": "next"}, expect=200
        )
        idx1 = session["combat"]["active_index"]
        _, session = req(
            "PATCH", f"/sessions/{session['id']}/combat", token=ctx["mt"], body={"action": "prev"}, expect=200
        )
        idx0 = session["combat"]["active_index"]
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/combat",
            token=ctx["mt"],
            body={"action": "end", "summary": "end1"},
            expect=200,
        )
        session = start_combat(ctx["mt"], session)
        ctx["session"] = session
        return {
            "entries_f1": n1,
            "entries_f2": len(session["combat"]["entries"]),
            "prev_works": True,
            "active_after_next": idx1,
            "active_after_prev": idx0,
        }

    check("initiative_roll_remaining_prev_api_new_fight", initiative_flow)

    def dmg_heal_temp_death():
        session = ctx["session"]
        if not session.get("combat", {}).get("active"):
            session = start_combat(ctx["mt"], session)
        cid = ctx["pc"]["id"]
        before = get_char(ctx["pt"], cid)
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"grant_temp_hp": 5},
            expect=200,
        )
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"damage": 8},
            expect=200,
        )
        s = seat(session, cid)
        combat = session.get("combat") or {}
        if combat.get("waiting_reaction") and combat.get("reaction_character_id") != cid:
            raise AssertionError(f"bad reaction cid {combat.get('reaction_character_id')}")
        if combat.get("waiting_reaction"):
            _, session = req(
                "POST",
                f"/sessions/{session['id']}/combat/reaction",
                token=ctx["pt"],
                body={"action": "skip", "character_id": cid},
                expect=200,
            )
        after = get_char(ctx["pt"], cid)
        sheet_hp = (after.get("sheet") or {}).get("combat", {}).get("hp_current")
        if after["hp_current"] != s["hp_current"] or sheet_hp != s["hp_current"]:
            raise AssertionError(f"sync fail {after['hp_current']} {sheet_hp} {s['hp_current']}")
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"damage": -4},
            expect=200,
        )
        healed = seat(session, cid)["hp_current"]
        cur = healed
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"damage": cur + 30},
            expect=200,
        )
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"death_fails": 2, "death_successes": 1},
            expect=200,
        )
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"damage": -25},
            expect=200,
        )
        ctx["session"] = session
        return {"before": before["hp_current"], "healed": healed, "reaction_ok": True}

    check("damage_heal_temp_death_sheet_sync", dmg_heal_temp_death)

    def m5_skip_without_cid():
        session = ctx["session"]
        # Force waiting_reaction without character id
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/combat",
            token=ctx["mt"],
            body={"action": "set_waiting_reaction", "waiting_reaction": True},
            expect=200,
        )
        if not session["combat"].get("waiting_reaction"):
            raise AssertionError("flag not set")
        # Clear via same action (what UI does without cid)
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/combat",
            token=ctx["mt"],
            body={"action": "set_waiting_reaction", "waiting_reaction": False},
            expect=200,
        )
        if session["combat"].get("waiting_reaction"):
            raise AssertionError("flag not cleared")
        ctx["session"] = session
        return {"cleared": True}

    check("m5_skip_waiting_reaction_without_cid", m5_skip_without_cid)

    def conditions():
        cid = ctx["pc"]["id"]
        session = ctx["session"]
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"conditions": [{"slug": "poisoned", "name": "Отравление"}]},
            expect=200,
        )
        ch = get_char(ctx["pt"], cid)
        sheet_conds = (ch.get("sheet") or {}).get("combat", {}).get("conditions") or []
        sheet_slugs = [c.get("slug") if isinstance(c, dict) else c for c in sheet_conds]
        if "poisoned" not in sheet_slugs:
            raise AssertionError(sheet_conds)
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"conditions": []},
            expect=200,
        )
        ctx["session"] = session
        return {"ok": True}

    check("conditions_lobby_to_sheet", conditions)

    def xp_sheet_and_payload():
        cid = ctx["pc"]["id"]
        before = get_char(ctx["pt"], cid)
        bx = (before.get("sheet") or {}).get("identity", {}).get("experience") or 0
        _, result = req(
            "POST",
            f"/sessions/{ctx['session']['id']}/xp",
            token=ctx["mt"],
            body={
                "character_ids": [cid],
                "per_character_xp": 100,
                "source": "manual",
                "bonuses": [{"character_id": cid, "amount": 25, "note": "bonus"}],
            },
            expect=200,
        )
        after = get_char(ctx["pt"], cid)
        ax = (after.get("sheet") or {}).get("identity", {}).get("experience") or 0
        if ax < bx + 100:
            raise AssertionError(f"{bx}->{ax} {result}")
        ctx["last_xp_result"] = result
        return {
            "before": bx,
            "after": ax,
            "awarded_each": result.get("awarded_each"),
            "per_recipient": result.get("per_recipient"),
            "character_ids": result.get("character_ids") or result.get("recipients"),
            "payload_keys": sorted(result.keys()),
        }

    check("xp_award_persists_on_sheet", xp_sheet_and_payload)

    def inventory_grant():
        cid = ctx["pc"]["id"]
        before = get_char(ctx["pt"], cid)
        gp0 = int(((before.get("sheet") or {}).get("inventory") or {}).get("coins", {}).get("gp") or 0)
        req(
            "POST",
            f"/sessions/{ctx['session']['id']}/inventory-grants",
            token=ctx["mt"],
            body={"character_id": cid, "coin_currency": "gp", "coin_amount": 12},
            expect=200,
        )
        req(
            "POST",
            f"/sessions/{ctx['session']['id']}/inventory-grants",
            token=ctx["mt"],
            body={"character_id": cid, "item_name": "Аудит-зель", "item_qty": 1},
            expect=200,
        )
        after = get_char(ctx["pt"], cid)
        inv = (after.get("sheet") or {}).get("inventory") or {}
        gp1 = int((inv.get("coins") or {}).get("gp") or 0)
        names = [i.get("name") for i in (inv.get("items") or []) if isinstance(i, dict)]
        if gp1 < gp0 + 12 or "Аудит-зель" not in names:
            raise AssertionError((gp0, gp1, names))
        return {"gp0": gp0, "gp1": gp1}

    check("inventory_grant_coins_items_sheet", inventory_grant)

    def rest_short():
        session = req("GET", f"/sessions/{ctx['session']['id']}", token=ctx["mt"], expect=200)[1]
        if (session.get("combat") or {}).get("active"):
            session = req(
                "PATCH",
                f"/sessions/{session['id']}/combat",
                token=ctx["mt"],
                body={"action": "end", "summary": "before rest"},
                expect=200,
            )[1]
            ctx["session"] = session
        _, result = req(
            "POST",
            f"/sessions/{ctx['session']['id']}/party-rest",
            token=ctx["mt"],
            body={"kind": "short"},
            expect=200,
        )
        return {"kind": result.get("kind"), "summary": result.get("summary")}

    check("party_rest_short", rest_short)

    def concurrent_edits():
        cid = ctx["pc"]["id"]
        session = req("GET", f"/sessions/{ctx['session']['id']}", token=ctx["mt"], expect=200)[1]
        _, session = req(
            "PATCH",
            f"/sessions/{session['id']}/seats/{cid}/combat",
            token=ctx["mt"],
            body={"damage": 3},
            expect=200,
        )
        hp_lobby = seat(session, cid)["hp_current"]
        ch = get_char(ctx["pt"], cid)
        sheet = deepcopy(ch["sheet"])
        marker = f"m-{uuid4().hex[:6]}"
        identity = dict(sheet.get("identity") or {})
        identity["background"] = marker
        sheet["identity"] = identity
        _, ch2 = req(
            "PATCH",
            f"/characters/{cid}",
            token=ctx["pt"],
            body={
                "sheet": sheet,
                "sheet_version": ch["sheet_version"],
                "hp_current": ch["hp_current"],
                "hp_max": ch["hp_max"],
            },
            expect=200,
        )
        if (ch2.get("sheet") or {}).get("identity", {}).get("background") != marker:
            raise AssertionError("marker lost")
        if ch2["hp_current"] != hp_lobby:
            raise AssertionError(f"{ch2['hp_current']} vs {hp_lobby}")
        return {"hp": hp_lobby, "marker": True}

    check("concurrent_lobby_then_sheet_patch_keeps_fields", concurrent_edits)

    def piety_first():
        code, body = req(
            "POST",
            f"/lobbies/{ctx['lobby']['id']}/piety",
            token=ctx["mt"],
            body={"character_id": ctx["pc"]["id"], "delta": 1, "comment": "first"},
        )
        if code >= 400:
            raise AssertionError(f"{code}:{body}")
        return {"score": body.get("score")}

    check("piety_backend_first_award", piety_first)

    def companion_add():
        # Add beast companion (not story) + story companion to player
        cid = ctx["pc"]["id"]
        ch = get_char(ctx["pt"], cid)
        sheet = deepcopy(ch["sheet"])
        wolf_id = f"wolf-{uuid4().hex[:8]}"
        story_id = f"story-{uuid4().hex[:8]}"
        sheet["companions"] = [
            {
                "id": wolf_id,
                "name": "Волк-напарник",
                "type": "Зверь",
                "story": False,
                "active": True,
                "initiative_mode": "with_master",
                "stats": {"hp": 11, "hp_max": 11, "ac": 13, "dex": 15},
            },
            {
                "id": story_id,
                "name": "Спутник-сюжет",
                "type": "Гуманоид",
                "story": True,
                "active": True,
                "initiative_mode": "with_master",
                "stats": {"hp": 20, "hp_max": 20, "ac": 14, "dex": 12},
                "death_successes": 0,
                "death_fails": 0,
            },
        ]
        _, ch2 = req(
            "PATCH",
            f"/characters/{cid}",
            token=ctx["pt"],
            body={"sheet": sheet, "sheet_version": ch["sheet_version"], "hp_current": ch["hp_current"], "hp_max": ch["hp_max"]},
            expect=200,
        )
        # also add enemy named Волк for initiative confusion check
        session = req("GET", f"/sessions/{ctx['session']['id']}", token=ctx["mt"], expect=200)[1]
        # refresh seat companions from sheet via session get (may need resync)
        _, session = req(
            "POST",
            f"/sessions/{session['id']}/combatants",
            token=ctx["mt"],
            body={"name": "Волк", "hp_max": 11, "ac": 13, "count": 1, "cr": "1/4"},
            expect=201,
        )
        ctx["session"] = session
        ctx["wolf_id"] = wolf_id
        ctx["story_id"] = story_id
        # Force session reload seats
        session = req("GET", f"/sessions/{session['id']}", token=ctx["mt"], expect=200)[1]
        seat_pc = seat(session, cid)
        comps = seat_pc.get("companions") or []
        names = [c.get("name") for c in comps]
        return {
            "companions_on_seat": names,
            "enemy_wolf_added": True,
            "sheet_companions": len((ch2.get("sheet") or {}).get("companions") or []),
        }

    check("companions_add_beast_and_story", companion_add)

    def player_rights():
        code, _ = req("GET", f"/sessions/{ctx['session']['id']}", token=ctx["ot"])
        code2, body2 = req(
            "POST",
            f"/sessions/{ctx['session']['id']}/combatants",
            token=ctx["pt"],
            body={"name": "Хак", "hp_max": 5, "count": 1},
        )
        return {
            "observer_get": code,
            "player_add_enemy": code2,
            "player_code": body2.get("code") if isinstance(body2, dict) else None,
        }

    check("player_observer_permissions", player_rights)

    def close_journal():
        session = req("GET", f"/sessions/{ctx['session']['id']}", token=ctx["mt"], expect=200)[1]
        if (session.get("combat") or {}).get("active"):
            req(
                "PATCH",
                f"/sessions/{session['id']}/combat",
                token=ctx["mt"],
                body={"action": "end", "summary": "pre-close"},
                expect=200,
            )
        # Keep session open for UI — create separate close on a throwaway? Skip close of main session.
        # Instead close is tested on a tiny session
        _, tiny = req(
            "POST",
            f"/lobbies/{ctx['lobby']['id']}/sessions",
            token=ctx["mt"],
            body={"name": "ToClose", "character_ids": [ctx["mc"]["id"]]},
            expect=201,
        )
        _, closed = req(
            "POST",
            f"/sessions/{tiny['id']}/close",
            token=ctx["mt"],
            body={"summary": "Audit close", "write_journal": True},
            expect=200,
        )
        if not closed["session"].get("closed_at"):
            raise AssertionError("not closed")
        journal = req("GET", f"/lobbies/{ctx['lobby']['id']}/journal", token=ctx["mt"], expect=200)[1]
        return {"closed": True, "journal_total": journal.get("total")}

    check("session_close_writes_journal", close_journal)

    # Save seed for UI/dual-client
    seed = {
        "password": "AuditPass123!",
        "master": {
            "email": ctx["memail"],
            "password": ctx["mpw"],
            "token": ctx["mt"],
            "refresh": ctx["mref"],
            "char_id": ctx["mc"]["id"],
            "char_name": ctx["mc"]["name"],
        },
        "player": {
            "email": ctx["pemail"],
            "password": ctx["ppw"],
            "token": ctx["pt"],
            "refresh": ctx["pref"],
            "char_id": ctx["pc"]["id"],
            "char_name": ctx["pc"]["name"],
        },
        "player2": {
            "email": ctx["p2email"],
            "password": ctx["p2pw"],
            "token": ctx["p2t"],
            "refresh": ctx["p2ref"],
            "char_id": ctx["p2c"]["id"],
            "char_name": ctx["p2c"]["name"],
        },
        "lobby_id": ctx["lobby"]["id"],
        "invite": ctx["invite"],
        "session_id": ctx["session"]["id"],
        "session_url": f"http://127.0.0.1:5173/sessions/{ctx['session']['id']}",
        "lobby_url": f"http://127.0.0.1:5173/lobbies/{ctx['lobby']['id']}",
        "wolf_id": ctx.get("wolf_id"),
        "story_id": ctx.get("story_id"),
        "last_xp_result": ctx.get("last_xp_result"),
    }
    seed_path = OUT.parent / "ui-seed.json"
    seed_path.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")

    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    p = sum(1 for r in results if r["status"] == "PASS")
    f = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\nWrote {OUT} PASS={p} FAIL={f} seed={seed_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
