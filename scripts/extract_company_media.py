"""Extract company cards/photos from PDF and merge into rules.json (logos are fetched separately)."""
import json
import os
import re
import shutil
import sys

import pymupdf

sys.path.insert(0, os.path.dirname(__file__))
from company_ranges import PAGE_RANGES

PDF = os.path.join(os.path.expanduser("~"), "Downloads", "شروط صرف التعاقدات اغسطس 2026.pdf")
BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
ASSETS = os.path.join(BASE, "data", "assets", "companies")
RULES = os.path.join(BASE, "data", "rules.json")
RAW = os.path.join(BASE, "data", "extracted_raw.json")

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


def collect_global_xrefs(doc) -> dict[int, int]:
    counts: dict[int, int] = {}
    for page_num in range(1, len(doc) + 1):
        for img in doc[page_num - 1].get_images(full=True):
            counts[img[0]] = counts.get(img[0], 0) + 1
    return counts


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

    existing_logos = {c["id"]: c.get("logoUrl") for c in rules["companies"]}

    doc = pymupdf.open(PDF)
    global_xref_counts = collect_global_xrefs(doc)
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
                if xref in company_xrefs[cid]:
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
        if existing_logos.get(cid):
            company["logoUrl"] = existing_logos[cid]

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in company_media.values())
    print(f"Updated {len(rules['companies'])} companies with {total} media items (logos unchanged)")


if __name__ == "__main__":
    extract()
