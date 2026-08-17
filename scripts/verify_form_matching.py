#!/usr/bin/env python3
"""Verify each company forms[] entry maps to a type=form media item."""
import json
import os
import re
import sys

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
RULES = os.path.join(BASE, "data", "rules.json")


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower()).strip()


def form_keywords(form: str) -> list[str]:
    n = normalize(form)
    keys = [n]
    if "أصفر" in n or "اصفر" in form:
        keys.extend(["أصفر", "اصفر", "yellow"])
    if "كربون" in n:
        keys.append("كربون")
    if "أزرق" in n or "ازرق" in form:
        keys.extend(["أزرق", "ازرق", "blue"])
    if "روشت" in n:
        keys.extend(["روشت", "روشتة"])
    if "e-form" in n or "eform" in n:
        keys.extend(["form", "e-form", "eform"])
    if any(x in n for x in ("yodawy", "يواد", "يوداو")):
        keys.extend(["yodawy", "يوادوي", "يوداوي", "e-form"])
    if any(x in n for x in ("one health", "onehealth", "وان هيلث", " one")):
        keys.extend(["one health", "onehealth", "وان هيلث", "one"])
    if "خارج" in n:
        keys.extend(["خارج", "خارجية", "external"])
    if "أبيض" in form or "ابيض" in n:
        keys.extend(["أبيض", "ابيض", "white"])
    if "مسجل" in n:
        keys.extend(["مسجل", "برنامج"])
    if "مزمن" in n or "شهري" in n:
        keys.extend(["مزمن", "شهري", "chronic"])
    if "e-prescription" in n or "eprescription" in n:
        keys.extend(["e-prescription", "prescription", "روشتة", "إلكترون"])
    return keys


def score(form: str, item: dict) -> int:
    total = 0
    texts = list(item.get("formTags") or [])
    texts.append(item.get("title", ""))
    for text in texts:
        t = normalize(text)
        for kw in form_keywords(form):
            k = normalize(kw)
            if len(k) >= 3 and k in t:
                total += 3
    if item.get("type") == "form":
        total += 4
    elif item.get("type") == "photo":
        total += 1
    elif item.get("type") == "card":
        total -= 2
    return total


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    issues = []
    for company in rules["companies"]:
        cid = company["id"]
        media = company.get("media") or []
        for form in company.get("forms") or []:
            ranked = sorted(((score(form, m), m) for m in media), reverse=True, key=lambda x: x[0])
            if not ranked or ranked[0][0] <= 0:
                issues.append((cid, form, "NO MATCH", None))
                continue
            best_score, best = ranked[0]
            if best_score < 6:
                issues.append((cid, form, f"WEAK score={best_score}", best.get("title")))
            elif best.get("type") != "form":
                issues.append((cid, form, f"NOT FORM score={best_score}", best.get("title")))

    print(f"Issues: {len(issues)}")
    for row in issues:
        print(" | ".join(str(x) for x in row if x is not None))


if __name__ == "__main__":
    main()
