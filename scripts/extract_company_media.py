"""Extract company cards/photos and logos from PDF; merge into rules.json."""
import json
import os
import re
import shutil

import pymupdf

PDF = os.path.join(r"C:\Users\a.refaat\Downloads", "شروط صرف التعاقدات اغسطس 2026.pdf")
BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
ASSETS = os.path.join(BASE, "data", "assets", "companies")
RULES = os.path.join(BASE, "data", "rules.json")
RAW = os.path.join(BASE, "data", "extracted_raw.json")

PAGE_RANGES = {
    "axa": (7, 11),
    "metlife": (12, 20),
    "globemed": (21, 23),
    "nextcare": (24, 31),
    "mednet": (32, 35),
    "misr-healthcare": (36, 40),
    "amc": (41, 47),
    "medright": (48, 54),
    "medmark": (55, 63),
    "bupa": (65, 70),
    "egycare": (71, 76),
    "care-plus": (77, 82),
    "unicare": (83, 85),
    "atomic-energy": (86, 89),
    "sesco-care": (90, 96),
    "petroshad": (97, 99),
    "sumed": (100, 100),
    "sehatech": (101, 102),
}

# Verified logo xrefs from PDF index pages (override proximity when set)
MANUAL_LOGO_XREF: dict[str, int] = {
    "axa": 42,
    "metlife": 86,
    "globemed": 84,
    "nextcare": 99,
    "mednet": 193,
    "misr-healthcare": 200,
    "amc": 197,
    "medright": 215,
    "medmark": 287,
    "bupa": 283,
    "unicare": 285,
    "atomic-energy": 288,
    "egycare": 344,
    "sehatech": 349,
    "care-plus": 348,
    "sesco-care": 301,
    "petroshad": 346,
}

INDEX_PAGE_COMPANIES = {
    1: ["axa", "metlife", "globemed"],
    2: ["nextcare", "mednet", "misr-healthcare", "amc"],
    3: ["medright", "medmark", "bupa", "unicare", "atomic-energy"],
    4: ["egycare", "sehatech", "care-plus", "sesco-care", "petroshad", "sumed"],
}

GLOBAL_TEMPLATE_XREFS = {5, 8, 10, 198}
GLOBAL_TEMPLATE_SIZES = {
    (318, 285),
    (877, 88),
    (1825, 171),
    (301, 109),
    (301, 98),
    (301, 60),
    (301, 58),
    (258, 109),
    (360, 88),
    (360, 115),
    (360, 228),
    (299, 123),
    (242, 244),
    (242, 243),
    (243, 244),
    (301, 269),
    (301, 216),
    (300, 168),
    (137, 4),
}


def page_title(text: str, page: int) -> str:
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    for ln in lines[:8]:
        if len(ln) > 8 and not ln.startswith("http") and "Hotline" not in ln:
            clean = re.sub(r"\s+", " ", ln)[:80]
            if clean:
                return clean
    return f"صفحة {page}"


def is_template_image(w: int, h: int, xref: int, global_xref_counts: dict[int, int]) -> bool:
    if xref in GLOBAL_TEMPLATE_XREFS:
        return True
    if (w, h) in GLOBAL_TEMPLATE_SIZES:
        return True
    if h <= 120 and w >= 500:
        return True
    if h <= 180 and w >= 900:
        return True
    if global_xref_counts.get(xref, 0) >= 3:
        return True
    if w >= 900 and 200 <= h <= 280:
        return True
    if w >= 500 and 260 <= h <= 280:
        return True
    return False


def is_gallery_photo(w: int, h: int, xref: int, global_xref_counts: dict[int, int]) -> bool:
    if is_template_image(w, h, xref, global_xref_counts):
        return False
    if w < 140 or h < 100:
        return False
    return True


def is_logo_candidate(w: int, h: int, xref: int) -> bool:
    if xref in GLOBAL_TEMPLATE_XREFS or (w, h) in GLOBAL_TEMPLATE_SIZES:
        return False
    if w < 100 or h < 70 or w > 480 or h > 260:
        return False
    if h <= 130 and w >= 500:
        return False
    if w / max(h, 1) > 3.5:
        return False
    return True


def collect_global_xrefs(doc) -> dict[int, int]:
    counts: dict[int, int] = {}
    for page_num in range(1, len(doc) + 1):
        for img in doc[page_num - 1].get_images(full=True):
            counts[img[0]] = counts.get(img[0], 0) + 1
    return counts


def page_logo_candidates(page, doc) -> list[dict]:
    items = []
    for img in page.get_images(full=True):
        xref = img[0]
        try:
            base = doc.extract_image(xref)
        except Exception:
            continue
        w, h = base["width"], base["height"]
        if not is_logo_candidate(w, h, xref):
            continue
        rects = page.get_image_rects(xref)
        if not rects:
            continue
        r = rects[0]
        if r.y0 > 520 or r.y0 < -5:
            continue
        items.append({"xref": xref, "w": w, "h": h, "x": r.x0, "y": r.y0, "ext": base.get("ext", "png")})
    return items


def hotline_anchors(page) -> list[dict]:
    anchors = []
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", []))
            digits = re.findall(r"\d{4,5}", text)
            if not digits:
                continue
            if not re.search(r"hot|line|whats|tel", text, re.I) and "@" not in text:
                continue
            y = line["bbox"][1]
            anchors.append({"y": y, "digits": digits[0], "text": text.strip()[:50]})
    anchors.sort(key=lambda a: a["y"])
    return anchors


def find_anchor_y(page, hotline: str | None) -> float | None:
    if not hotline:
        return None
    needle = re.sub(r"\D", "", hotline)[:5]
    if not needle:
        return None
    for anchor in hotline_anchors(page):
        if needle in re.sub(r"\D", "", anchor["text"]):
            return anchor["y"]
    return None


def match_logos_on_index_pages(doc, companies_by_id: dict) -> tuple[dict[str, str], set[int]]:
    logos: dict[str, str] = {}
    used_xrefs: set[int] = set()

    def save_logo(cid: str, xref: int, page_num: int, manual: bool = False) -> bool:
        try:
            base = doc.extract_image(xref)
        except Exception as exc:
            print(f"  logo {cid}: skip xref {xref} ({exc})")
            return False
        w, h = base["width"], base["height"]
        if not manual and not is_logo_candidate(w, h, xref):
            print(f"  logo {cid}: skip template {w}x{h}")
            return False
        folder = os.path.join(ASSETS, cid)
        os.makedirs(folder, exist_ok=True)
        ext = base.get("ext", "png")
        ext = ext if ext != "jpg" else "jpeg"
        logo_name = f"logo.{ext}"
        with open(os.path.join(folder, logo_name), "wb") as out:
            out.write(base["image"])
        logos[cid] = f"/assets/companies/{cid}/{logo_name}"
        used_xrefs.add(xref)
        print(f"  logo {cid}: xref={xref} {w}x{h} (page {page_num}) -> {logo_name}")
        return True

    for cid, xref in MANUAL_LOGO_XREF.items():
        page_num = next(p for p, ids in INDEX_PAGE_COMPANIES.items() if cid in ids)
        save_logo(cid, xref, page_num, manual=True)

    for page_num, company_ids in INDEX_PAGE_COMPANIES.items():
        page = doc[page_num - 1]
        candidates = page_logo_candidates(page, doc)

        for cid in company_ids:
            if cid in logos:
                continue
            company = companies_by_id[cid]
            anchor_y = find_anchor_y(page, company.get("hotline"))

            best = None
            best_score = float("inf")
            for cand in candidates:
                if cand["xref"] in used_xrefs or cand["x"] < 400:
                    continue
                score = abs(cand["y"] - anchor_y) if anchor_y is not None else cand["y"]
                if score < best_score:
                    best_score = score
                    best = cand

            if best is None:
                print(f"  logo {cid}: not found on page {page_num}")
                continue
            save_logo(cid, best["xref"], page_num)

    return logos, used_xrefs


def crop_page_card(page, clip_ratio_top=0.14, clip_ratio_bottom=0.06):
    rect = page.rect
    top = rect.y0 + rect.height * clip_ratio_top
    bottom = rect.y1 - rect.height * clip_ratio_bottom
    clip = pymupdf.Rect(rect.x0, top, rect.x1, bottom)
    return page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), clip=clip, alpha=False)


def extract():
    if not os.path.exists(PDF):
        raise FileNotFoundError(f"PDF not found: {PDF}")

    if os.path.exists(ASSETS):
        shutil.rmtree(ASSETS)
    os.makedirs(ASSETS, exist_ok=True)

    with open(RAW, encoding="utf-8") as f:
        page_texts = {p["page"]: p["text"] for p in json.load(f)["pdf_text"]}

    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    companies_by_id = {c["id"]: c for c in rules["companies"]}
    doc = pymupdf.open(PDF)
    global_xref_counts = collect_global_xrefs(doc)

    print("Extracting company logos from index pages...")
    logos, logo_xrefs = match_logos_on_index_pages(doc, companies_by_id)

    company_media: dict[str, list] = {k: [] for k in PAGE_RANGES}
    company_xrefs: dict[str, set] = {k: set() for k in PAGE_RANGES}

    for cid, (start, end) in PAGE_RANGES.items():
        folder = os.path.join(ASSETS, cid)
        os.makedirs(folder, exist_ok=True)

        for page_num in range(start, end + 1):
            page = doc[page_num - 1]
            text = page_texts.get(page_num, "")
            title = page_title(text, page_num)

            card_name = f"page{page_num:03d}_card.png"
            card_path = os.path.join(folder, card_name)
            crop_page_card(page).save(card_path)
            company_media[cid].append(
                {
                    "id": f"{cid}-p{page_num}-card",
                    "type": "card",
                    "title": title,
                    "url": f"/assets/companies/{cid}/{card_name}",
                    "page": page_num,
                }
            )

            for img_idx, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                if xref in company_xrefs[cid] or xref in logo_xrefs:
                    continue
                try:
                    base = doc.extract_image(xref)
                except Exception:
                    continue
                w, h = base.get("width", 0), base.get("height", 0)
                ext = base.get("ext", "png")
                if not is_gallery_photo(w, h, xref, global_xref_counts):
                    continue
                company_xrefs[cid].add(xref)
                photo_name = f"page{page_num:03d}_photo{img_idx + 1}.{ext}"
                photo_path = os.path.join(folder, photo_name)
                with open(photo_path, "wb") as out:
                    out.write(base["image"])
                company_media[cid].append(
                    {
                        "id": f"{cid}-p{page_num}-photo{img_idx + 1}",
                        "type": "photo",
                        "title": f"{title} — صورة {img_idx + 1}",
                        "url": f"/assets/companies/{cid}/{photo_name}",
                        "page": page_num,
                        "width": w,
                        "height": h,
                    }
                )

    for company in rules["companies"]:
        cid = company["id"]
        company["media"] = company_media.get(cid, [])
        if cid in logos:
            company["logoUrl"] = logos[cid]

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in company_media.values())
    print(f"Updated {len(rules['companies'])} companies with {total} media items, {len(logos)} logos")


if __name__ == "__main__":
    extract()
