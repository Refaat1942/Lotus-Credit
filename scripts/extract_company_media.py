"""Extract company cards/photos from PDF and merge into rules.json."""
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


def page_title(text: str, page: int) -> str:
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    for ln in lines[:8]:
        if len(ln) > 8 and not ln.startswith("http") and "Hotline" not in ln:
            clean = re.sub(r"\s+", " ", ln)[:80]
            if clean:
                return clean
    return f"صفحة {page}"


def extract():
    if os.path.exists(ASSETS):
        shutil.rmtree(ASSETS)
    os.makedirs(ASSETS, exist_ok=True)

    with open(RAW, encoding="utf-8") as f:
        page_texts = {p["page"]: p["text"] for p in json.load(f)["pdf_text"]}

    doc = pymupdf.open(PDF)
    company_media: dict[str, list] = {k: [] for k in PAGE_RANGES}

    for cid, (start, end) in PAGE_RANGES.items():
        folder = os.path.join(ASSETS, cid)
        os.makedirs(folder, exist_ok=True)
        seen_xrefs = set()

        for page_num in range(start, end + 1):
            page = doc[page_num - 1]
            text = page_texts.get(page_num, "")
            title = page_title(text, page_num)

            # Full page card (slide snapshot)
            card_name = f"page{page_num:03d}_card.png"
            card_path = os.path.join(folder, card_name)
            pix = page.get_pixmap(matrix=pymupdf.Matrix(1.8, 1.8), alpha=False)
            pix.save(card_path)
            company_media[cid].append(
                {
                    "id": f"{cid}-p{page_num}-card",
                    "type": "card",
                    "title": title,
                    "url": f"/assets/companies/{cid}/{card_name}",
                    "page": page_num,
                }
            )

            # Embedded photos (insurance cards, forms, screenshots)
            for img_idx, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                if xref in seen_xrefs:
                    continue
                seen_xrefs.add(xref)
                try:
                    base = doc.extract_image(xref)
                except Exception:
                    continue
                w, h = base.get("width", 0), base.get("height", 0)
                ext = base.get("ext", "png")
                if w < 140 or h < 100:
                    continue
                if ext not in ("jpeg", "jpg", "png", "webp"):
                    continue
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

    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    for company in rules["companies"]:
        cid = company["id"]
        company["media"] = company_media.get(cid, [])

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in company_media.values())
    print(f"Updated {len(rules['companies'])} companies with {total} media items")


if __name__ == "__main__":
    extract()
