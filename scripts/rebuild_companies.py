#!/usr/bin/env python3
"""Rebuild all company data from PPTX + PDF (Aug 2026 source on Desktop)."""
import json
import os
import re
import shutil
import subprocess
import sys

import pymupdf

sys.path.insert(0, os.path.dirname(__file__))
from company_ranges import PAGE_RANGES, company_pages

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
DESKTOP_PPTX = os.path.join(os.path.expanduser("~"), "Desktop", "شروط صرف التعاقدات اغسطس 2026.pptx")
DOWNLOADS_PDF = os.path.join(os.path.expanduser("~"), "Downloads", "شروط صرف التعاقدات اغسطس 2026.pdf")
PPTX_JSON = os.path.join(BASE, "data", "pptx_slides.json")
RAW = os.path.join(BASE, "data", "extracted_raw.json")
RULES = os.path.join(BASE, "data", "rules.json")
ASSETS = os.path.join(BASE, "data", "assets", "companies")

GLOBAL_TEMPLATE_XREFS = {5, 8, 10, 198}
GLOBAL_TEMPLATE_SIZES = {
    (318, 285), (877, 88), (1825, 171), (301, 109), (301, 98), (301, 60), (301, 58),
    (258, 109), (360, 88), (360, 115), (360, 228), (299, 123), (242, 244), (242, 243),
    (243, 244), (301, 269), (301, 216), (300, 168), (137, 4),
}


def run(cmd: list[str]):
    subprocess.check_call(cmd, cwd=BASE)


def slide_title(text: str, page: int) -> str:
    if not text.strip():
        return f"صفحة {page}"
    lines = [re.sub(r"\s+", " ", ln.strip()) for ln in text.split("\n") if ln.strip()]
    skip = ("الرجوع", "photo", "Photo", "Hotline", "http")
    for ln in lines[:10]:
        if len(ln) < 6:
            continue
        if any(s in ln for s in skip):
            continue
        return ln[:100]
    return lines[0][:100] if lines else f"صفحة {page}"


def parse_forms(text: str) -> list[str]:
    forms: list[str] = []
    keywords = ("نموذج", "روشت", "e-form", "eform", "علاج مسجل", "form")
    skip_starts = ("يلزم", "يجب", "يمكن", "لا ", "موافق", "انواع", "تعليمات")
    for ln in text.split("\n"):
        ln = ln.strip()
        m = re.match(r"^\d+\s*[-.)]\s*(.+)", ln)
        if not m:
            continue
        val = re.sub(r"\s+", " ", m.group(1)).strip()
        low = val.lower()
        if len(val) < 8 or len(val) > 100:
            continue
        if any(val.startswith(s) for s in skip_starts):
            continue
        if not any(k in low for k in keywords):
            continue
        forms.append(val)
    seen: set[str] = set()
    out = []
    for f in forms:
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out[:8]


def parse_notes(text: str) -> list[str]:
    notes: list[str] = []
    for ln in text.split("\n"):
        ln = re.sub(r"\s+", " ", ln.strip())
        if len(ln) < 12:
            continue
        if ln.startswith(("•", "-", "يلزم", "يجب", "لا ", "محظور", "ملاحظ", "تاريخ", "موافق")):
            notes.append(ln.lstrip("•- ").strip())
    return notes[:12]


def is_template(w, h, xref, counts):
    if xref in GLOBAL_TEMPLATE_XREFS or (w, h) in GLOBAL_TEMPLATE_SIZES:
        return True
    if counts.get(xref, 0) >= 3:
        return True
    if h <= 120 and w >= 500:
        return True
    if w >= 900 and 200 <= h <= 280:
        return True
    return False


def is_photo(w, h, xref, counts):
    if is_template(w, h, xref, counts):
        return False
    return w >= 140 and h >= 100


def crop_card(page):
    rect = page.rect
    top = rect.y0 + rect.height * 0.14
    bottom = rect.y1 - rect.height * 0.06
    clip = pymupdf.Rect(rect.x0, top, rect.x1, bottom)
    return page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), clip=clip, alpha=False)


def extract_media(pdf_path: str, slide_texts: dict[int, str]) -> dict[str, list]:
    doc = pymupdf.open(pdf_path)
    counts: dict[int, int] = {}
    for i in range(len(doc)):
        for img in doc[i].get_images(full=True):
            counts[img[0]] = counts.get(img[0], 0) + 1

    media: dict[str, list] = {cid: [] for cid in PAGE_RANGES}
    xrefs: dict[str, set] = {cid: set() for cid in PAGE_RANGES}

    for cid, (start, end) in PAGE_RANGES.items():
        folder = os.path.join(ASSETS, cid)
        os.makedirs(folder, exist_ok=True)
        for page_num in range(start, end + 1):
            page = doc[page_num - 1]
            title = slide_title(slide_texts.get(page_num, ""), page_num)
            card_name = f"slide{page_num:03d}_card.png"
            crop_card(page).save(os.path.join(folder, card_name))
            media[cid].append({
                "id": f"{cid}-s{page_num}-card",
                "type": "card",
                "title": title,
                "url": f"/assets/companies/{cid}/{card_name}",
                "page": page_num,
            })
            for img_idx, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                if xref in xrefs[cid]:
                    continue
                try:
                    base = doc.extract_image(xref)
                except Exception:
                    continue
                w, h = base.get("width", 0), base.get("height", 0)
                if not is_photo(w, h, xref, counts):
                    continue
                xrefs[cid].add(xref)
                ext = base.get("ext", "png")
                photo_name = f"slide{page_num:03d}_photo{img_idx + 1}.{ext}"
                with open(os.path.join(folder, photo_name), "wb") as out:
                    out.write(base["image"])
                media[cid].append({
                    "id": f"{cid}-s{page_num}-photo{img_idx + 1}",
                    "type": "photo",
                    "title": f"{title} — صورة {img_idx + 1}",
                    "url": f"/assets/companies/{cid}/{photo_name}",
                    "page": page_num,
                    "width": w,
                    "height": h,
                })
    return media


def merge_company_content(rules: dict, slide_texts: dict[int, str]):
    for company in rules["companies"]:
        cid = company["id"]
        if cid not in PAGE_RANGES:
            continue
        chunks = [slide_texts.get(p, "") for p in company_pages(cid)]
        full = "\n".join(chunks)
        card_lines = []
        for ln in full.split("\n"):
            ln = ln.strip()
            if "كارن" in ln or "screen" in ln.lower() or "التطبيق" in ln:
                if 10 < len(ln) < 200:
                    card_lines.append(re.sub(r"\s+", " ", ln))
        if card_lines:
            company["cardInstructions"] = list(dict.fromkeys(card_lines))[:6]


def main():
    if not os.path.exists(DESKTOP_PPTX):
        raise FileNotFoundError(DESKTOP_PPTX)
    if not os.path.exists(DOWNLOADS_PDF):
        raise FileNotFoundError(DOWNLOADS_PDF)

    run([sys.executable, os.path.join(BASE, "scripts", "explore_pptx.py")])

    with open(PPTX_JSON, encoding="utf-8") as f:
        slides = json.load(f)["slides"]
    slide_texts = {s["slide"]: s["text"] for s in slides}

    run([sys.executable, os.path.join(BASE, "scripts", "extract_rules.py")])

    if os.path.exists(ASSETS):
        shutil.rmtree(ASSETS)
    os.makedirs(ASSETS, exist_ok=True)

    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)
    logos = {c["id"]: c.get("logoUrl") for c in rules["companies"]}
    orders = {c["id"]: c.get("order") for c in rules["companies"]}

    company_media = extract_media(DOWNLOADS_PDF, slide_texts)
    merge_company_content(rules, slide_texts)

    for company in rules["companies"]:
        cid = company["id"]
        company["media"] = company_media.get(cid, [])
        if logos.get(cid):
            company["logoUrl"] = logos[cid]
        if orders.get(cid):
            company["order"] = orders[cid]

    rules["meta"]["lastUpdated"] = "2026-08-17"
    rules["meta"]["sourceDocument"] = "شروط صرف التعاقدات اغسطس 2026.pptx"
    rules["general"]["lastUpdated"] = "2026-08-17"
    rules["general"]["sourceDocument"] = "شروط صرف التعاقدات اغسطس 2026.pptx"

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    run([sys.executable, os.path.join(BASE, "scripts", "extract_company_links.py")])

    total_media = sum(len(c.get("media") or []) for c in rules["companies"])
    print(f"Rebuild complete: {len(PAGE_RANGES)} companies, {total_media} media items")


if __name__ == "__main__":
    main()
