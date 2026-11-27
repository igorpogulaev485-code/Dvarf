#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pixel compare of approved к20 crops and illustrated backgrounds vs etalon frames."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path("/workspace/dark-theme-concept")
# Mean absolute difference allowed between 52×52 dice crops (antialiasing / subpixel).
DICE_MAD_MAX = 18.0
# Pattern must not be a flat fill. Sidebar/canvas samples after a light blur.
BG_STD_MIN = 2.0

def mad(a: Image.Image, b: Image.Image) -> float:
    a = a.convert("RGB")
    b = b.convert("RGB")
    if a.size != b.size:
        b = b.resize(a.size, Image.Resampling.LANCZOS)
    diff = ImageChops.difference(a, b)
    hist = diff.histogram()
    # 3 channels
    total = a.size[0] * a.size[1]
    acc = 0
    for ch in range(3):
        base = ch * 256
        acc += sum(i * hist[base + i] for i in range(256))
    return acc / (total * 3)


def mad_circle(a: Image.Image, b: Image.Image) -> float:
    a = a.convert("RGB")
    b = b.convert("RGB")
    if a.size != b.size:
        b = b.resize(a.size, Image.Resampling.LANCZOS)
    w, h = a.size
    cx, cy, rad = w / 2, h / 2, min(w, h) / 2 - 1
    pa, pb = a.load(), b.load()
    acc = n = 0
    for y in range(h):
        for x in range(w):
            if (x - cx) ** 2 + (y - cy) ** 2 > rad * rad:
                continue
            ca, cb = pa[x, y], pb[x, y]
            acc += sum(abs(int(ca[i]) - int(cb[i])) for i in range(3)) / 3
            n += 1
    return acc / n if n else 999.0

def stddev_rgb(im: Image.Image) -> float:
    gray = im.convert("L")
    hist = gray.histogram()
    n = sum(hist) or 1
    mean = sum(i * c for i, c in enumerate(hist)) / n
    var = sum(((i - mean) ** 2) * c for i, c in enumerate(hist)) / n
    return var ** 0.5

def crop(im: Image.Image, box: dict) -> Image.Image:
    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
    x, y = int(max(0, x)), int(max(0, y))
    r = int(min(im.width, x + w))
    b = int(min(im.height, y + h))
    return im.crop((x, y, r, b))

def font(sz: int, bold: bool = False):
    p = Path("/usr/share/fonts/truetype/dejavu") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")
    return ImageFont.truetype(str(p), sz) if p.exists() else ImageFont.load_default()

def compose_compare(out: Path, records: dict) -> None:
    """Etalon accepted frame beside a lobby frame, plus 2× dice crops, for L3/I2 × 1440/390."""
    prefer = {
        "desktop-l3": ["hub-master-l3-1440.png", "list-master-l3-1440.png"],
        "desktop-i2": ["hub-master-i2-1440.png", "list-master-i2-1440.png"],
        "phone-l3": ["hub-master-l3-390.png", "list-master-l3-390.png"],
        "phone-i2": ["hub-master-i2-390.png"],
    }
    titles = {
        "desktop-l3": "ПК 1440 · свет L3 · Пергамент + к20",
        "desktop-i2": "ПК 1440 · тьма I2 · Чернила + к20",
        "phone-l3": "Телефон 390 · свет L3 · Пергамент + к20",
        "phone-i2": "Телефон 390 · тьма I2 · Чернила + к20",
    }
    by_file = {s["file"]: s for s in records["shots"]}
    rows = []
    out_dir = Path(records.get("out_dir") or Path(out).parent)
    for key, title in titles.items():
        lobby_name = next((n for n in prefer[key] if n in by_file and (out_dir / n).exists()), None)
        if not lobby_name:
            lobby_name = next((s["file"] for s in records["shots"] if s.get("etalonKey") == key and (out_dir / s["file"]).exists()), None)
        if not lobby_name:
            continue
        et = records["etalon"][key]
        rows.append((title, Path(et["png"]), out_dir / lobby_name, Path(et["crop"]), Path(by_file[lobby_name]["crop"])))

    thumb_w_desk = 520
    gap, pad, cap, head, dice_cell = 20, 28, 24, 64, 120
    # Two columns of page thumbs + two dice
    cols_w = thumb_w_desk * 2 + dice_cell * 2 + gap * 3
    # Compute row heights from actual images
    prepared = []
    row_hs = []
    for title, et_path, lob_path, et_dice, lob_dice in rows:
        et = Image.open(et_path).convert("RGB")
        lob = Image.open(lob_path).convert("RGB")
        tw = thumb_w_desk
        et_h = int(et.height * tw / et.width)
        lob_h = int(lob.height * tw / lob.width)
        et_t = et.resize((tw, et_h), Image.Resampling.LANCZOS)
        lob_t = lob.resize((tw, lob_h), Image.Resampling.LANCZOS)
        ed = Image.open(et_dice).convert("RGB")
        ld = Image.open(lob_dice).convert("RGB")
        scale = 2
        ed2 = ed.resize((ed.width * scale, ed.height * scale), Image.Resampling.NEAREST)
        ld2 = ld.resize((ld.width * scale, ld.height * scale), Image.Resampling.NEAREST)
        rh = max(et_t.height, lob_t.height, ed2.height + 28, ld2.height + 28) + cap
        prepared.append((title, et_t, lob_t, ed2, ld2))
        row_hs.append(rh)

    W = pad * 2 + cols_w
    H = pad + head + sum(row_hs) + gap * (len(row_hs) - 1) + pad
    img = Image.new("RGB", (W, H), "#f4efe4")
    draw = ImageDraw.Draw(img)
    draw.text((pad, 16), "Сравнение с принятыми экранами: к20 (вариант C) и подложка с рисунком", font=font(18, True), fill="#1c1917")
    draw.text((pad, 40), "Слева — эталон (создание, пустой список). Справа — лобби. Кубики кропнуты 2×.", font=font(12), fill="#444")
    y = pad + head
    labels_col = ["Эталон", "Лобби", "к20 эталон", "к20 лобби"]
    for i, ((title, et_t, lob_t, ed2, ld2), rh) in enumerate(zip(prepared, row_hs)):
        draw.text((pad, y), title, font=font(13, True), fill="#1c1917")
        y_img = y + cap
        x = pad
        for label, im, tw in (
            ("Эталон", et_t, et_t.width),
            ("Лобби", lob_t, lob_t.width),
        ):
            draw.text((x, y_img - 16), label, font=font(11), fill="#444")
            img.paste(im, (x, y_img))
            x += tw + gap
        # dice column
        draw.text((x, y_img - 16), "к20 эталон", font=font(11), fill="#444")
        img.paste(ed2, (x, y_img + 8))
        x += dice_cell + gap
        draw.text((x, y_img - 16), "к20 лобби", font=font(11), fill="#444")
        img.paste(ld2, (x, y_img + 8))
        y += rh + gap
    img.save(out)
    print("wrote", out, img.size)

def main() -> int:
    json_path = Path(sys.argv[1])
    records = json.loads(json_path.read_text())
    out_dir = json_path.parent
    records["out_dir"] = str(out_dir)
    pixel_issues = []

    def is_overlay(rec: dict) -> bool:
        if rec.get("overlay"):
            return True
        name = rec.get("file") or ""
        return any(tag in name for tag in ("-session-", "-transfer-", "-assign-", "-lead-", "-newcode-", "-kick-"))

    for rec in records["shots"]:
        file = rec["file"]
        if is_overlay(rec):
            rec["pixel_skipped"] = "overlay"
            rec["dice_mad"] = None
            rec["bg_std_best"] = None
            continue
        # Dice crop vs etalon crop
        a = Image.open(rec["crop"]).convert("RGB")
        b = Image.open(rec["etalonCrop"]).convert("RGB")
        score = mad_circle(a, b)
        rec["dice_mad"] = round(score, 3)
        rec["dice_mad_raw"] = round(mad(a, b), 3)
        if score > DICE_MAD_MAX:
            pixel_issues.append({"file": file, "stage": "pixel-dice", "mad": rec["dice_mad"], "raw": rec["dice_mad_raw"], "max": DICE_MAD_MAX})

        # Background variance on the lobby screenshot (saved frame).
        frame = Image.open(out_dir / file).convert("RGB")
        stds = []
        for sample in rec.get("samples") or []:
            patch = crop(frame, sample)
            if patch.width < 8 or patch.height < 8:
                continue
            s = stddev_rgb(patch)
            stds.append({"where": sample.get("where"), "std": round(s, 3), **sample})
        rec["bg_samples"] = stds
        if not stds:
            # Fallback: desktop sidebar band or phone canvas left margin, even if we couldn't pre-filter.
            key = rec["etalonKey"]
            if key.startswith("desktop"):
                patch = frame.crop((24, 480, 220, 680))
            else:
                # thin left gutter + a mid band that often sits between cards
                patch = frame.crop((0, 200, 12, 520))
            s = stddev_rgb(patch)
            stds.append({"where": "fallback", "std": round(s, 3)})
            rec["bg_samples"] = stds
        # Pass if any valid sample shows pattern variance, or the best one does.
        best = max((s["std"] for s in stds), default=0)
        rec["bg_std_best"] = best
        if best < BG_STD_MIN:
            pixel_issues.append({"file": file, "stage": "pixel-bg", "std": best, "min": BG_STD_MIN, "samples": stds})

    records["pixelIssues"] = pixel_issues
    records["pixelIssueCount"] = len(pixel_issues)
    json_path.write_text(json.dumps(records, ensure_ascii=False, indent=2))

    compare_path = out_dir / "contact-compare-dice-bg.png"
    compose_compare(compare_path, records)

    if pixel_issues:
        print("PIXEL FAIL", json.dumps(pixel_issues, ensure_ascii=False, indent=2))
        return 1
    print("pixel compare: pass, dice MAD max among shots will be in json")
    mads = [s["dice_mad"] for s in records["shots"] if s.get("dice_mad") is not None]
    stds = [s["bg_std_best"] for s in records["shots"] if s.get("bg_std_best") is not None]
    print("max dice MAD", max(mads) if mads else "n/a", "over", len(mads), "frames")
    print("min bg std", min(stds) if stds else "n/a", "over", len(stds), "frames")
    skipped = sum(1 for s in records["shots"] if s.get("pixel_skipped"))
    if skipped:
        print("pixel skip overlay", skipped)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
