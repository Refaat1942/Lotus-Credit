"""Download company logos from the web (not PDF) and update rules.json."""
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from io import BytesIO

try:
    from PIL import Image
except ImportError:
    Image = None

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)))
RULES = os.path.join(BASE, "data", "rules.json")
OUT_DIR = os.path.join(BASE, "frontend", "public", "logos")

UA = "LotusCreditBot/1.0 (+https://lotuspharmacies.com)"

# Curated online sources per company (first success wins)
LOGO_SOURCES: dict[str, list[str]] = {
    "axa": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/AXA_Logo.svg/330px-AXA_Logo.svg.png",
        "https://icons.duckduckgo.com/ip3/axa.com.ico",
    ],
    "metlife": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/MetLife_logo.svg/330px-MetLife_logo.svg.png",
        "https://icons.duckduckgo.com/ip3/metlife.com.ico",
    ],
    "globemed": [
        "https://www.globemedgroup.com/favicon.ico",
        "https://icons.duckduckgo.com/ip3/globemedegypt.com.ico",
    ],
    "nextcare": [
        "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://pulsepp-egp.nextcarehealth.com&size=128",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Allianz_logo.svg/330px-Allianz_logo.svg.png",
        "https://icons.duckduckgo.com/ip3/allianz.com.ico",
    ],
    "mednet": [
        "https://icons.duckduckgo.com/ip3/mednet-egypt.com.ico",
        "https://icons.duckduckgo.com/ip3/mednet.com.ico",
    ],
    "misr-healthcare": [
        "http://nicedeer.net/favicon.ico",
        "https://icons.duckduckgo.com/ip3/nicedeer.net.ico",
    ],
    "amc": [
        "http://nicedeer.net/favicon.ico",
        "https://icons.duckduckgo.com/ip3/nicedeer.net.ico",
    ],
    "medright": [
        "https://icons.duckduckgo.com/ip3/med-right.com.ico",
        "https://icons.duckduckgo.com/ip3/etpa.med-right.com.ico",
    ],
    "medmark": [
        "https://icons.duckduckgo.com/ip3/medmark.eg.ico",
        "https://icons.duckduckgo.com/ip3/provider.medmark.eg.ico",
    ],
    "bupa": [
        "https://upload.wikimedia.org/wikipedia/en/thumb/3/33/Bupa_logo.svg/330px-Bupa_logo.svg.png",
        "https://icons.duckduckgo.com/ip3/bupa.com.ico",
    ],
    "egycare": [
        "https://icons.duckduckgo.com/ip3/nicedeer.net.ico",
        "https://icons.duckduckgo.com/ip3/egycare.com.ico",
    ],
    "care-plus": [
        "https://icons.duckduckgo.com/ip3/portal.yodawy.com.ico",
        "https://icons.duckduckgo.com/ip3/yodawy.com.ico",
    ],
    "unicare": [
        "https://icons.duckduckgo.com/ip3/unicare-egypt.com.ico",
        "https://icons.duckduckgo.com/ip3/uni-act.org.ico",
    ],
    "atomic-energy": [
        "https://icons.duckduckgo.com/ip3/nppa.gov.eg.ico",
        "https://icons.duckduckgo.com/ip3/ea.gov.eg.ico",
    ],
    "sesco-care": [
        "https://icons.duckduckgo.com/ip3/sesco-eg.com.ico",
    ],
    "petroshad": [
        "https://www.petrojet.com.eg/favicon.ico",
        "https://icons.duckduckgo.com/ip3/petrojet.com.eg.ico",
    ],
    "sumed": [
        "https://icons.duckduckgo.com/ip3/sumed.org.ico",
    ],
    "sehatech": [
        "https://icons.duckduckgo.com/ip3/sehatech.xyz.ico",
        "https://icons.duckduckgo.com/ip3/provider.sehatech.xyz.ico",
    ],
}


def fetch_url(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
            data = resp.read()
            if len(data) < 200:
                return None
            return data
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None


def portal_favicon_url(portal: str | None) -> str | None:
    if not portal:
        return None
    try:
        host = urllib.parse.urlparse(portal).netloc
    except Exception:
        return None
    if not host:
        return None
    return f"https://icons.duckduckgo.com/ip3/{host}.ico"


def save_png(company_id: str, data: bytes) -> str | None:
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"{company_id}.png")

    if data[:4] == b"\x89PNG":
        with open(out_path, "wb") as f:
            f.write(data)
        return f"/logos/{company_id}.png"

    if Image is None:
        # Save raw if Pillow missing (ico/jpeg may still render in some browsers)
        ext = "ico" if data[:4] in (b"\x00\x00\x01\x00", b"\x00\x00\x02\x00") else "bin"
        alt = os.path.join(OUT_DIR, f"{company_id}.{ext}")
        with open(alt, "wb") as f:
            f.write(data)
        return f"/logos/{company_id}.{ext}"

    try:
        img = Image.open(BytesIO(data))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        img.thumbnail((256, 256), Image.Resampling.LANCZOS)
        img.save(out_path, format="PNG")
        return f"/logos/{company_id}.png"
    except Exception:
        return None


def generate_fallback_logo(company_id: str, name: str, color: str) -> str | None:
    if Image is None:
        return None
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"{company_id}.png")
    hex_color = (color or "#14b8a6").lstrip("#")
    if len(hex_color) == 6:
        bg = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    else:
        bg = (20, 184, 166)
    label = (name or company_id)[:3].upper()
    img = Image.new("RGB", (256, 256), bg)
    try:
        from PIL import ImageDraw, ImageFont

        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 96)
        except Exception:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((256 - tw) / 2, (256 - th) / 2), label, fill="white", font=font)
    except Exception:
        pass
    img.save(out_path, format="PNG")
    return f"/logos/{company_id}.png"


def main():
    with open(RULES, encoding="utf-8") as f:
        rules = json.load(f)

    updated = 0
    for company in rules["companies"]:
        cid = company["id"]
        urls = list(LOGO_SOURCES.get(cid, []))
        portal_url = portal_favicon_url(company.get("approvalPortal"))
        if portal_url and portal_url not in urls:
            urls.append(portal_url)

        logo_path = None
        for url in urls:
            data = fetch_url(url)
            if not data:
                continue
            logo_path = save_png(cid, data)
            if logo_path:
                print(f"  {cid}: {url[:70]} -> {logo_path}")
                break
            time.sleep(0.3)

        if logo_path:
            company["logoUrl"] = logo_path
            updated += 1
        else:
            fallback = generate_fallback_logo(
                cid,
                company.get("nameEn") or company.get("nameAr") or cid,
                company.get("color") or "#14b8a6",
            )
            if fallback:
                company["logoUrl"] = fallback
                updated += 1
                print(f"  {cid}: generated fallback -> {fallback}")
            else:
                print(f"  {cid}: no online logo found")
                company.pop("logoUrl", None)

        time.sleep(0.25)

    with open(RULES, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    print(f"Set {updated} online logos -> frontend/public/logos/")


if __name__ == "__main__":
    main()
