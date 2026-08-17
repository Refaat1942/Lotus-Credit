#!/usr/bin/env python3
"""Verify each company.forms[] maps to the correct unique media via formMediaMap."""
import json
import os
import sys

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
RULES = os.path.join(BASE, "data", "rules.json")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    issues = []
    for company in rules["companies"]:
        cid = company["id"]
        forms = company.get("forms") or []
        fmap = company.get("formMediaMap") or {}
        media_by_id = {m["id"]: m for m in (company.get("media") or [])}

        seen_ids: set[str] = set()
        for form in forms:
            mid = fmap.get(form)
            if not mid:
                issues.append((cid, form, "NO MAP"))
                continue
            if mid in seen_ids:
                issues.append((cid, form, f"DUPLICATE MAP -> {mid}"))
            seen_ids.add(mid)
            item = media_by_id.get(mid)
            if not item:
                issues.append((cid, form, f"MISSING MEDIA {mid}"))
            elif item.get("type") != "form":
                issues.append((cid, form, f"NOT FORM {mid} type={item.get('type')}"))

    print(f"Issues: {len(issues)}")
    for row in issues:
        print(" | ".join(str(x) for x in row))

    # Show AXA mapping for manual sanity check
    axa = next(c for c in rules["companies"] if c["id"] == "axa")
    print("\nAXA formMediaMap:")
    for form, mid in (axa.get("formMediaMap") or {}).items():
        m = next(x for x in axa["media"] if x["id"] == mid)
        print(f"  {form}")
        print(f"    -> {mid} p{m['page']} | {m['title'][:70]}")


if __name__ == "__main__":
    main()
