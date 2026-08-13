#!/usr/bin/env python3
"""Extract dispensing rules from شروط صرف التعاقدات PDF/PPTX."""
import json
import os
import sys

try:
    import pymupdf
    from pptx import Presentation
except ImportError:
    print("Install: pip install pymupdf python-pptx")
    sys.exit(1)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS = os.path.expanduser("~/Downloads")
PDF = os.path.join(DOWNLOADS, "شروط صرف التعاقدات اغسطس 2026.pdf")
OUT = os.path.join(BASE, "data", "extracted_raw.json")


def extract():
    doc = pymupdf.open(PDF)
    pdf_text, pdf_links = [], []
    for i, page in enumerate(doc):
        pdf_text.append({"page": i + 1, "text": page.get_text()})
        for link in page.get_links():
            if link.get("uri"):
                pdf_links.append({"page": i + 1, "uri": link["uri"]})
    all_links = list({l["uri"] for l in pdf_links if l.get("uri")})
    result = {"pdf_text": pdf_text, "pdf_links": pdf_links, "all_links": all_links}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Extracted {len(pdf_text)} pages, {len(all_links)} unique links -> {OUT}")


if __name__ == "__main__":
    extract()
