"""Merge PDF hyperlinks into each company in rules.json."""
import json
import os
import re
from urllib.parse import unquote

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
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

# Overview pages 1–4: link URI patterns → company
URI_COMPANY_HINTS = [
    (r"yodawy", "axa"),
    (r"metlife|Approval\.Requests@metlife", "metlife"),
    (r"globemed|approvals@globemed|psu@globemed|pbm", "globemed"),
    (r"nextcare|pulsepp", "nextcare"),
    (r"mednet|MedNeXt", "mednet"),
    (r"misrins|19114", "misr-healthcare"),
    (r"nicedeer", "misr-healthcare"),  # also amc/egycare — refined below
    (r"med-right|16830", "medright"),
    (r"medmark|medmak|zoho", "medmark"),
    (r"Prescription@lotus|bupa", "bupa"),
    (r"uni-act|unicare", "unicare"),
    (r"sehatech", "sehatech"),
    (r"provider\.sehatech", "sehatech"),
]

OVERVIEW_PAGE_COMPANIES = {
    1: ["axa", "metlife", "globemed"],
    2: ["nextcare", "mednet", "misr-healthcare"],
    3: ["medright", "medmark", "bupa", "unicare", "atomic-energy"],
    4: ["egycare", "sehatech", "care-plus", "sesco-care", "petroshad", "sumed"],
}

NICEDEER_COMPANIES = {"misr-healthcare", "amc", "egycare"}


def page_to_companies(page: int) -> list[str]:
    for cid, (start, end) in PAGE_RANGES.items():
        if start <= page <= end:
            return [cid]
    if page in OVERVIEW_PAGE_COMPANIES:
        return OVERVIEW_PAGE_COMPANIES[page]
    return []


def link_type(url: str) -> str:
    if url.startswith("mailto:"):
        return "email"
    if url.startswith("tel:"):
        return "phone"
    return "portal"


def link_label(url: str, company_name: str = "") -> str:
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
    if "med-right.com" in u:
        return "موقع Medright"
    try:
        host = re.sub(r"^https?://", "", url).split("/")[0]
        return f"رابط {host}"
    except Exception:
        return "رابط خارجي"


def normalize_url(url: str) -> str:
    return url.strip().rstrip("/")


def main():
    with open(RAW, encoding="utf-8") as f:
        raw = json.load(f)
    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    company_links: dict[str, dict[str, dict]] = {c["id"]: {} for c in rules["companies"]}

    for item in raw.get("pdf_links", []):
        url = normalize_url(item["uri"])
        page = item["page"]
        companies = page_to_companies(page)
        if not companies and page <= 4:
            for pattern, cid in URI_COMPANY_HINTS:
                if re.search(pattern, url, re.I):
                    companies = [cid]
                    break
        if "nicedeer" in url.lower() and page in (36, 37, 38, 39, 40):
            companies = ["misr-healthcare"]
        elif "nicedeer" in url.lower() and page in range(41, 48):
            companies = ["amc"]
        elif "nicedeer" in url.lower() and page in range(71, 77):
            companies = ["egycare"]
        elif "yodawy" in url.lower() and page in range(77, 83):
            companies = ["care-plus"]
        elif "yodawy" in url.lower() and page in range(7, 12):
            companies = ["axa"]

        for cid in companies:
            if cid not in company_links:
                continue
            key = url.lower()
            if key not in company_links[cid]:
                company_links[cid][key] = {
                    "id": f"{cid}-link-{len(company_links[cid]) + 1}",
                    "label": link_label(url),
                    "url": url,
                    "type": link_type(url),
                    "page": page,
                }

    for company in rules["companies"]:
        cid = company["id"]
        bucket = company_links[cid]

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
                t = "email"
                label = f"بريد: {val.replace('mailto:', '')}"
            elif val.replace("+", "").replace(" ", "").isdigit() or val.startswith("0"):
                url = f"tel:{val.replace(' ', '')}"
                t = "phone"
                label = f"{ctype or 'هاتف'}: {val}"
            elif val.startswith("http"):
                url = val
                t = "website"
                label = link_label(val, company["nameAr"])
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

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    total = sum(len(c.get("links", [])) for c in rules["companies"])
    print(f"Added {total} links across {len(rules['companies'])} companies")


if __name__ == "__main__":
    main()
