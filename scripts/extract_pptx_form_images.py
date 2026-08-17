#!/usr/bin/env python3
"""Extract individual form images from PPTX slides with labels from caption text."""
from __future__ import annotations

import json
import os
import re
import sys

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

sys.path.insert(0, os.path.dirname(__file__))
from company_ranges import PAGE_RANGES

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
PPTX = os.path.join(os.path.expanduser("~"), "Desktop", "شروط صرف التعاقدات اغسطس 2026.pptx")
ASSETS = os.path.join(BASE, "data", "assets", "companies")
RULES = os.path.join(BASE, "data", "rules.json")


def iter_shapes(shapes):
    for shape in shapes:
        yield shape
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            yield from iter_shapes(shape.shapes)


def shape_text(shape) -> str:
    if not shape.has_text_frame:
        return ""
    return re.sub(r"\s+", " ", shape.text.replace("\x0b", " ").strip())


def form_tags_from_label(label: str) -> list[str]:
    n = label.lower()
    tags = [label]
    if "اصفر" in n or "أصفر" in label:
        tags.extend(["أصفر", "اصفر", "yellow", "كربون", "نموذج أصفر"])
    if "ازرق" in n or "أزرق" in label:
        tags.extend(["أزرق", "ازرق", "blue"])
    if "وان هيلث" in n or "one health" in n or "onehealth" in n:
        tags.extend(["one health", "onehealth", "وان هيلث", "روشتة one health", "one"])
    if "خارج" in n:
        tags.extend(["خارجية", "خارج", "external", "out of network"])
    if "e-form" in n or "eform" in n or "يواد" in n or "yodawy" in n:
        tags.extend(["e-form", "eform", "yodawy", "يوادوي", "يوداوي"])
    if "ابيض" in n or "أبيض" in label:
        tags.extend(["أبيض", "ابيض", "white"])
    if "مزمن" in n:
        tags.append("مزمن")
    if "نموذج" in label:
        tags.append("نموذج")
    if "روشت" in label:
        tags.append("روشتة")
    return list(dict.fromkeys(tags))


def extract_slide_forms(slide, slide_num: int) -> list[dict]:
    pics = []
    captions = []
    for shape in iter_shapes(slide.shapes):
        t = shape_text(shape)
        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
            pics.append({
                "left": shape.left,
                "top": shape.top,
                "width": shape.width,
                "height": shape.height,
                "center_x": shape.left + shape.width / 2,
                "blob": shape.image.blob,
                "ext": shape.image.ext or "png",
            })
        elif t and re.match(r"^\d+\s*[-.)]", t):
            captions.append({
                "left": shape.left,
                "center_x": shape.left + shape.width / 2,
                "text": t,
            })

    if len(pics) < 2 or len(captions) < 2:
        return []

    # Form-sized images (skip tiny logos)
    form_pics = [p for p in pics if p["height"] >= 900_000 and p["width"] >= 900_000]
    if len(form_pics) < 2:
        return []

    used_labels: set[str] = set()
    forms = []
    for pic in sorted(form_pics, key=lambda p: -p["left"]):
        best = None
        best_dist = float("inf")
        for cap in captions:
            if cap["text"] in used_labels:
                continue
            dist = abs(cap["center_x"] - pic["center_x"])
            if dist < best_dist:
                best_dist = dist
                best = cap
        if not best or best_dist > pic["width"] * 1.2:
            continue
        used_labels.add(best["text"])
        label = best["text"][:120]
        forms.append({
            "label": label,
            "tags": form_tags_from_label(label),
            "blob": pic["blob"],
            "ext": pic["ext"],
            "slide": slide_num,
        })

    forms.sort(key=lambda f: f["label"])
    return forms


def main():
    prs = Presentation(PPTX)
    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    form_media_by_company: dict[str, list[dict]] = {cid: [] for cid in PAGE_RANGES}

    for cid, (start, end) in PAGE_RANGES.items():
        folder = os.path.join(ASSETS, cid)
        os.makedirs(folder, exist_ok=True)
        for slide_num in range(start, end + 1):
            slide = prs.slides[slide_num - 1]
            extracted = extract_slide_forms(slide, slide_num)
            for idx, item in enumerate(extracted, 1):
                safe = f"form{idx}"
                fname = f"slide{slide_num:03d}_{safe}.{item['ext']}"
                path = os.path.join(folder, fname)
                with open(path, "wb") as out:
                    out.write(item["blob"])
                form_media_by_company[cid].append({
                    "id": f"{cid}-s{slide_num}-form{idx}",
                    "type": "form",
                    "title": item["label"],
                    "formTags": item["tags"],
                    "url": f"/assets/companies/{cid}/{fname}",
                    "page": slide_num,
                    "links": [],
                })

    for company in rules["companies"]:
        cid = company["id"]
        new_forms = form_media_by_company.get(cid, [])
        if not new_forms:
            continue
        existing = company.get("media") or []
        form_slides = {m["page"] for m in new_forms}
        kept = [
            m for m in existing
            if not (m.get("page") in form_slides and m.get("type") in ("photo", "card"))
        ]
        merged = kept + new_forms
        merged.sort(key=lambda m: (m.get("page", 0), 0 if m.get("type") == "form" else 1))
        company["media"] = merged

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in form_media_by_company.values())
    print(f"Extracted {total} labeled form images")


if __name__ == "__main__":
    main()
