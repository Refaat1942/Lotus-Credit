#!/usr/bin/env python3
"""Extract form images from PDF (accurate crops) + PPTX (labels/captions)."""
from __future__ import annotations

import json
import os
import re
import sys

import pymupdf
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

sys.path.insert(0, os.path.dirname(__file__))
from company_ranges import PAGE_RANGES

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
PPTX = os.path.join(os.path.expanduser("~"), "Desktop", "شروط صرف التعاقدات اغسطس 2026.pptx")
PDF = os.path.join(os.path.expanduser("~"), "Downloads", "شروط صرف التعاقدات اغسطس 2026.pdf")
ASSETS = os.path.join(BASE, "data", "assets", "companies")
RULES = os.path.join(BASE, "data", "rules.json")

FORM_WORDS = ("نموذج", "روشت", "e-form", "eform", "علاج مسجل", "كربون", "مزمن", "form")
SKIP_LINE = ("الرجوع", "photo", "Photo", "Hotline", "http", "click to add")

# Tiny PDF icons/logos to ignore (width x height in PDF points, approx).
MIN_FORM_W = 180
MIN_FORM_H = 250


def iter_shapes(shapes):
    for shape in shapes:
        yield shape
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            yield from iter_shapes(shape.shapes)


def shape_text(shape) -> str:
    if not shape.has_text_frame:
        return ""
    return shape.text.replace("\x0b", "\n")


def clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line.strip())[:120]


def is_formish(line: str) -> bool:
    low = line.lower()
    return any(w in low or w in line for w in FORM_WORDS)


def is_valid_form_label(line: str) -> bool:
    if not line or any(s in line for s in SKIP_LINE):
        return False
    if is_formish(line):
        return True
    if re.match(r"^\d+\s*[-.)]", line):
        return False
    return len(line) >= 15 and any(
        w in line.lower() for w in ("approval", "prior", "موافق", "icare", "yodawy", "يوداو", "مزمن", "مسجل")
    )


def extract_numbered_lines(blocks: list[str]) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for block in blocks:
        text = block.replace("\x0b", "\n")
        for line in text.split("\n"):
            line = clean_line(line)
            if is_valid_form_label(line) and re.match(r"^\d+\s*[-.)]", line) and line not in seen:
                seen.add(line)
                found.append(line)
        for m in re.finditer(r"\d+\s*[-.)]\s*[^0-9\n]+", text):
            line = clean_line(m.group(0))
            if is_valid_form_label(line) and line not in seen:
                seen.add(line)
                found.append(line)
    return found


def extract_formish_lines(blocks: list[str]) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for block in blocks:
        for line in block.split("\n"):
            line = clean_line(line)
            if is_valid_form_label(line) and line not in seen:
                seen.add(line)
                found.append(line)
    return found


def caption_shapes_from_slide(slide) -> list[dict]:
    caps = []
    for shape in iter_shapes(slide.shapes):
        if not shape.has_text_frame:
            continue
        line = clean_line(shape_text(shape))
        if re.match(r"^\d+\s*[-.)]", line) and is_valid_form_label(line):
            caps.append({
                "text": line,
                "center_x": shape.left + shape.width / 2,
            })
    return caps


def form_tags_from_label(label: str) -> list[str]:
    n = label.lower()
    tags = [label]
    if "اصفر" in n or "أصفر" in label:
        tags.extend(["أصفر", "اصفر", "yellow", "كربون", "نموذج أصفر", "بالكربون"])
    if "ازرق" in n or "أزرق" in label:
        tags.extend(["أزرق", "ازرق", "blue"])
    if "ابيض" in n or "أبيض" in label:
        tags.extend(["أبيض", "ابيض", "white"])
    if "وان هيلث" in n or "one health" in n or "onehealth" in n:
        tags.extend(["one health", "onehealth", "وان هيلث", "روشتة one health", "one"])
    if "خارج" in n:
        tags.extend(["خارجية", "خارج", "external", "out of network"])
    if "e-form" in n or "eform" in n or "يواد" in n or "yodawy" in n or "يوداو" in n:
        tags.extend(["e-form", "eform", "yodawy", "يوادوي", "يوداوي"])
    if "مزمن" in n or "شهري" in n:
        tags.extend(["مزمن", "شهري", "chronic"])
    if "مسجل" in n or "برنامج" in n:
        tags.extend(["مسجل", "برنامج", "علاج مسجل"])
    if "نموذج" in label:
        tags.append("نموذج")
    if "روشت" in label:
        tags.append("روشتة")
    return list(dict.fromkeys(tags))


def line_sort_key(line: str) -> tuple:
    m = re.match(r"^(\d+)", line)
    return (int(m.group(1)) if m else 99, line)


def slide_labels(slide) -> list[str]:
    blocks = [shape_text(s) for s in iter_shapes(slide.shapes) if s.has_text_frame and s.text.strip()]
    labels = extract_numbered_lines(blocks)
    if not labels:
        labels = extract_formish_lines(blocks)
    return labels


def pdf_form_regions(page) -> list[dict]:
    """Collect large embedded image regions on a PDF page."""
    regions: list[dict] = []
    seen: set[tuple] = set()

    for img in page.get_images(full=True):
        xref = img[0]
        for rect in page.get_image_rects(xref):
            w, h = rect.width, rect.height
            if w < MIN_FORM_W or h < MIN_FORM_H:
                continue
            key = (round(rect.x0), round(rect.y0), round(rect.x1), round(rect.y1))
            if key in seen:
                continue
            seen.add(key)
            regions.append({
                "rect": rect,
                "center_x": (rect.x0 + rect.x1) / 2,
                "width": w,
                "height": h,
            })

    # Drop near-duplicate overlapping regions (jpeg/png pairs).
    deduped: list[dict] = []
    for r in sorted(regions, key=lambda x: (-x["width"] * x["height"], -x["center_x"])):
        if any(
            abs(r["center_x"] - d["center_x"]) < 20 and abs(r["rect"].y0 - d["rect"].y0) < 20
            for d in deduped
        ):
            continue
        deduped.append(r)
    return deduped


def emu_to_pdf_x(emu_x: float, page_width: float, slide_width_emu: float = 12192000) -> float:
    return emu_x / slide_width_emu * page_width


def match_labels_to_regions(labels: list[str], caps: list[dict], regions: list[dict], page_width: float) -> list[tuple[dict, str]]:
    if not labels or not regions:
        return []

    # Map PPTX caption EMU x -> PDF x for proximity matching.
    def pdf_x(cap: dict) -> float:
        return emu_to_pdf_x(cap["center_x"], page_width)

    if caps:
        used: set[int] = set()
        pairs: list[tuple[dict, str]] = []
        for cap in sorted(caps, key=lambda c: -c["center_x"]):
            cx = pdf_x(cap)
            best_i, best_dist = None, float("inf")
            for i, reg in enumerate(regions):
                if i in used:
                    continue
                dist = abs(reg["center_x"] - cx)
                if dist < best_dist:
                    best_dist, best_i = dist, i
            if best_i is not None and best_dist <= max(regions[best_i]["width"], 120):
                used.add(best_i)
                pairs.append((regions[best_i], cap["text"]))
        if pairs:
            return pairs

    sorted_regs = sorted(regions, key=lambda r: -r["center_x"])
    sorted_labels = sorted(labels, key=line_sort_key)
    n = min(len(sorted_regs), len(sorted_labels))
    return [(sorted_regs[i], sorted_labels[i]) for i in range(n)]


def extract_slide_forms_from_pdf(page, slide, slide_num: int) -> list[dict]:
    labels = slide_labels(slide)
    caps = caption_shapes_from_slide(slide)
    regions = pdf_form_regions(page)
    if not regions:
        return []

    pairs = match_labels_to_regions(labels, caps, regions, page.rect.width)
    if not pairs and len(regions) == 1 and labels:
        pairs = [(regions[0], labels[0])]

    forms = []
    for reg, label in pairs:
        clip = reg["rect"] + (-2, -2, 2, 2)
        pix = page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=clip, alpha=False)
        forms.append({
            "label": label[:120],
            "tags": form_tags_from_label(label),
            "png": pix.tobytes("png"),
            "slide": slide_num,
            "width": int(reg["width"]),
            "height": int(reg["height"]),
        })
    return forms


def normalize_key(text: str) -> str:
    t = clean_line(text).lower()
    return re.sub(r"^\d+\s*[-.)]\s*", "", t)


def score_form_label(form_name: str, media_title: str, page: int) -> int:
    form_k = normalize_key(form_name)
    title_k = normalize_key(media_title)
    if not form_k or not title_k:
        return 0
    score = 0
    if form_k in title_k or title_k in form_k:
        score += 30
    if re.match(r"^\d+\s*[-.)]", media_title.strip()):
        score += 15
    if any(w in media_title for w in ("موافقات", "انواع الموافقات", "لا تحتاج")):
        score -= 20
    if "أصفر" in form_name and ("اصفر" in title_k or "أصفر" in media_title):
        score += 20
    if "روشت" in form_k and "روشت" in title_k:
        score += 8
    if "one" in form_k and ("one" in title_k or "وان" in title_k):
        score += 12
    if "خارج" in form_k and "خارج" in title_k:
        score += 12
    if ("e-form" in form_k or "يوداو" in form_name) and ("e-form" in title_k or "يوداو" in title_k or "eform" in title_k):
        score += 12
    if "مسجل" in form_k and ("مسجل" in title_k or "برنامج" in title_k):
        score += 10
    score += max(0, 10 - page // 3)
    return score


def build_form_media_map(company: dict, form_media: list[dict]) -> dict[str, str]:
    forms_list = company.get("forms") or []
    if not forms_list or not form_media:
        return {}

    used: set[str] = set()
    result: dict[str, str] = {}

    for i, form_name in enumerate(forms_list):
        prefix = f"{i + 1}"
        for m in form_media:
            if m["id"] in used:
                continue
            if re.match(rf"^{prefix}\s*[-.)]", m.get("title", "").strip()):
                result[form_name] = m["id"]
                used.add(m["id"])
                break

    for form_name in forms_list:
        if form_name in result:
            continue
        ranked = sorted(
            (
                (score_form_label(form_name, m["title"], m["page"]), m["page"], m["id"])
                for m in form_media
                if m["id"] not in used
            ),
            key=lambda x: (-x[0], x[1]),
        )
        if ranked and ranked[0][0] >= 8:
            result[form_name] = ranked[0][2]
            used.add(ranked[0][2])

    remaining_forms = [f for f in forms_list if f not in result]
    remaining_media = sorted(
        [m for m in form_media if m["id"] not in used],
        key=lambda m: (m["page"], m["id"]),
    )
    for form_name, media in zip(remaining_forms, remaining_media):
        result[form_name] = media["id"]
        used.add(media["id"])

    for form_name, mid in result.items():
        for m in form_media:
            if m["id"] == mid:
                m["matchedForm"] = form_name
                break
    return result


def main():
    if not os.path.exists(PPTX):
        raise FileNotFoundError(PPTX)
    if not os.path.exists(PDF):
        raise FileNotFoundError(PDF)

    sys.stdout.reconfigure(encoding="utf-8")
    prs = Presentation(PPTX)
    doc = pymupdf.open(PDF)

    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    form_media_by_company: dict[str, list[dict]] = {cid: [] for cid in PAGE_RANGES}
    slide_counts: dict[str, int] = {}

    for cid, (start, end) in PAGE_RANGES.items():
        folder = os.path.join(ASSETS, cid)
        os.makedirs(folder, exist_ok=True)
        for slide_num in range(start, end + 1):
            page = doc[slide_num - 1]
            extracted = extract_slide_forms_from_pdf(page, prs.slides[slide_num - 1], slide_num)
            if not extracted:
                continue
            slide_counts[cid] = slide_counts.get(cid, 0) + 1
            for idx, item in enumerate(extracted, 1):
                fname = f"slide{slide_num:03d}_form{idx}.png"
                with open(os.path.join(folder, fname), "wb") as out:
                    out.write(item["png"])
                form_media_by_company[cid].append({
                    "id": f"{cid}-s{slide_num}-form{idx}",
                    "type": "form",
                    "title": item["label"],
                    "formTags": item["tags"],
                    "url": f"/assets/companies/{cid}/{fname}",
                    "page": slide_num,
                    "width": item["width"],
                    "height": item["height"],
                    "links": [],
                })

    for company in rules["companies"]:
        cid = company["id"]
        new_forms = form_media_by_company.get(cid, [])
        kept = [m for m in (company.get("media") or []) if m.get("type") != "form"]
        if not new_forms:
            company["media"] = kept
            company.pop("formMediaMap", None)
            continue

        form_slides = {m["page"] for m in new_forms}
        kept = [
            m for m in kept
            if not (m.get("type") in ("photo", "card") and m.get("page") in form_slides)
        ]
        merged = kept + new_forms
        merged.sort(key=lambda m: (m.get("page", 0), 0 if m.get("type") == "form" else 1, m.get("id", "")))
        company["media"] = merged
        company["formMediaMap"] = build_form_media_map(company, new_forms)

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in form_media_by_company.values())
    mapped = sum(len(c.get("formMediaMap") or {}) for c in rules["companies"])
    print(f"PDF form crops: {total} images, {mapped} mapped labels")
    axa = next(c for c in rules["companies"] if c["id"] == "axa")
    print("\nAXA yellow form mapping:")
    for form, mid in (axa.get("formMediaMap") or {}).items():
        if "أصفر" in form or "اصفر" in form:
            m = next(x for x in axa["media"] if x["id"] == mid)
            print(f"  {form} -> {mid} p{m['page']} | {m['title'][:60]}")


if __name__ == "__main__":
    main()
