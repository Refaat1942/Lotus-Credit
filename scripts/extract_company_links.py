#!/usr/bin/env python3
"""Rebuild company links — only from pages inside each company's section (no overview bleed)."""
import json
import os
import re
import sys
from urllib.parse import unquote

sys.path.insert(0, os.path.dirname(__file__))
from company_ranges import PAGE_RANGES, page_to_company

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
RULES = os.path.join(BASE, "data", "rules.json")
RAW = os.path.join(BASE, "data", "extracted_raw.json")


def link_type(url: str) -> str:
    if url.startswith("mailto:"):
        return "email"
    if url.startswith("tel:"):
        return "phone"
    return "portal"


def link_label(url: str) -> str:
    if url.startswith("mailto:"):
        return f"بريد: {url.replace('mailto:', '')}"
    if url.startswith("tel:"):
        return f"اتصال: {url.replace('tel:', '')}"
    u = unquote(url.lower())
    if "yodawy" in u:
        return "بوابة Yodawy"
    if "i-care" in u or "icare" in u:
        return "بوابة i*care"
    if "pulse" in u or "nextcare" in u:
        return "بوابة Pulse / Nextcare"
    if "mednet" in u:
        return "بوابة MedNeXt"
    if "nicedeer" in u:
        return "بوابة Nice Deer"
    if "med-right" in u or "etpa" in u:
        return "بوابة Medright ETPA"
    if "zoho" in u:
        return "بوابة Medmark (Zoho)"
    if "uni-act" in u:
        return "بوابة Unicare"
    if "sehatech" in u:
        return "بوابة SehaOne"
    try:
        host = re.sub(r"^https?://", "", url).split("/")[0]
        return f"رابط {host}"
    except Exception:
        return "رابط خارجي"


def normalize_url(url: str) -> str:
    return url.strip().rstrip("/")


def links_by_page(raw: dict) -> dict[int, list[dict]]:
    pages: dict[int, dict[str, dict]] = {}
    for item in raw.get("pdf_links", []):
        page = item["page"]
        cid = page_to_company(page)
        if not cid:
            continue
        url = normalize_url(item["uri"])
        pages.setdefault(page, {})
        key = url.lower()
        if key not in pages[page]:
            pages[page][key] = {
                "id": f"{cid}-p{page}-link-{len(pages[page]) + 1}",
                "label": link_label(url),
                "url": url,
                "type": link_type(url),
                "page": page,
            }
    return {p: list(bucket.values()) for p, bucket in pages.items()}


def main():
    with open(RAW, encoding="utf-8") as f:
        raw = json.load(f)
    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    page_links = links_by_page(raw)
    company_page_links: dict[str, dict[str, dict]] = {cid: {} for cid in PAGE_RANGES}

    for page, links in page_links.items():
        cid = page_to_company(page)
        if not cid:
            continue
        for link in links:
            key = link["url"].lower()
            if key not in company_page_links[cid]:
                company_page_links[cid][key] = {**link, "id": f"{cid}-link-{len(company_page_links[cid]) + 1}"}

    for company in rules["companies"]:
        cid = company["id"]
        if cid not in company_page_links:
            continue
        bucket = company_page_links[cid]

        if company.get("approvalPortal"):
            url = normalize_url(company["approvalPortal"])
            key = url.lower()
            if key not in bucket:
                bucket[key] = {
                    "id": f"{cid}-portal",
                    "label": f"بوابة الموافقات ({company.get('approvalSystem', '')})".strip(),
                    "url": url,
                    "type": "portal",
                    "page": 0,
                }

        for contact in company.get("contacts") or []:
            val = contact["value"].strip()
            ctype = contact.get("type", "").lower()
            if "@" in val:
                url = f"mailto:{val}" if not val.startswith("mailto:") else val
                t, label = "email", f"بريد: {val.replace('mailto:', '')}"
            elif val.replace("+", "").replace(" ", "").isdigit() or val.startswith("0"):
                url = f"tel:{val.replace(' ', '')}"
                t, label = "phone", f"{ctype or 'هاتف'}: {val}"
            elif val.startswith("http"):
                url, t, label = val, "website", link_label(val)
            else:
                continue
            key = url.lower()
            if key not in bucket:
                bucket[key] = {
                    "id": f"{cid}-contact-{len(bucket)}",
                    "label": label,
                    "url": url,
                    "type": t,
                    "page": 0,
                }

        company["links"] = sorted(
            bucket.values(),
            key=lambda x: (0 if x["type"] == "portal" else 1, x.get("page", 99), x["label"]),
        )

        for media in company.get("media") or []:
            pg = media.get("page")
            media["links"] = page_links.get(pg, []) if pg else []

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    total = sum(len(c.get("links", [])) for c in rules["companies"])
    paired = sum(len(m.get("links") or []) for c in rules["companies"] for m in c.get("media") or [])
    print(f"Company links: {total} | Media-page links paired: {paired}")


if __name__ == "__main__":
    main()
