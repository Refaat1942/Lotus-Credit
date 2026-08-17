#!/usr/bin/env python3
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

with open(r"D:\Refaat\My Projects\Lotus Credit\data\pptx_slides.json", encoding="utf-8") as f:
    data = json.load(f)

COMPANY_MARKERS = [
    "AXA", "METLIFE", "Globemed", "GLOBEMED", "Nextcare", "NEXTCARE", "MedNet", "MEDNET",
    "Misr", "MISR", "AMC", "Medright", "MEDRIGHT", "Medmark", "MEDMARK", "Bupa", "BUPA",
    "EgyCare", "EGYCARE", "Care Plus", "Unicare", "UNICARE", "Atomic", "Sesco", "Petroshad",
    "Sumed", "SehaTech", "SEHATECH", "SehaOne", "Hotline", "Yodawy", "icare", "i-care",
]

for s in data["slides"]:
    t = s["text"]
    hits = [m for m in COMPANY_MARKERS if m.lower() in t.lower()]
    ext_links = [l for l in s["links"] if l["url"] and not l["url"].startswith("slide")]
    preview = t.replace("\x0b", " ").replace("\n", " | ")[:120]
    if hits or ext_links or (s["images"] >= 3 and preview.strip()):
        print(f"{s['slide']:3d} imgs={s['images']} ext_links={len(ext_links)} hits={hits}")
        if preview.strip():
            print(f"    {preview}")
        for l in ext_links:
            print(f"    URL: [{l['text'][:50]}] -> {l['url'][:100]}")
