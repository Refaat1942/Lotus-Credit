#!/usr/bin/env python3
"""Shared company page/slide ranges — source: شروط صرف التعاقدات اغسطس 2026."""
from __future__ import annotations

# PDF page numbers == PPTX slide numbers for company sections (1-based).
PAGE_RANGES: dict[str, tuple[int, int]] = {
    "axa": (6, 11),
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
    "petroshad": (97, 98),
    "sumed": (99, 100),
    "sehatech": (101, 102),
}

OVERVIEW_PAGES = {1, 2, 3, 4, 5}


def page_to_company(page: int) -> str | None:
    for cid, (start, end) in PAGE_RANGES.items():
        if start <= page <= end:
            return cid
    return None


def company_pages(cid: str) -> range:
    start, end = PAGE_RANGES[cid]
    return range(start, end + 1)
