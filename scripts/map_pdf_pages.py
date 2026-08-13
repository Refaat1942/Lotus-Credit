import json
out = []
with open(r"D:\Refaat\My Projects\Lotus Credit\data\extracted_raw.json", encoding="utf-8") as f:
    raw = json.load(f)
for p in raw["pdf_text"]:
    t = p["text"][:100].replace("\n", " ")
    out.append(f"{p['page']:3d}: {t}")
with open(r"D:\Refaat\My Projects\Lotus Credit\data\page_map.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("written", len(out))
