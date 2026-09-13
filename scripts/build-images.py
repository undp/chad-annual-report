#!/usr/bin/env python3
"""Derives the web-ready images in src/assets/img from the raw Figma exports in
src/assets/figma. Raw exports are 2-15 MB camera JPEGs (served by Figma with a
.png extension); the site only ever shows them at ~350-650 CSS px, so we cap the
long edge at 1400 px, strip EXIF and emit a WebP next to each JPEG.
Re-runnable: overwrite the raw export and run `npm run images`."""
from PIL import Image, ImageOps
from pathlib import Path
import subprocess, sys

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "src/assets/figma", ROOT / "src/assets/img"
MAX_EDGE, JPEG_Q, WEBP_Q = 1400, 82, 80

# target name -> raw Figma export (node name kept in the comment for traceability)
PHOTOS = {
    "hero-01":    "099aeb31dccacf43b0118608cdf6352dbd6a6600.png",  # Échelle IMG_5494
    "hero-02":    "e3c5f65a28362b34b429f8da8358a08daff0b7f6.png",  # UNDP Chad © 2024 (5)
    "trust-01":   "9e1b4358b77245457549606d45c5cfe13eb30e39.png",  # Lake province Tchad (11)
    "trust-02":   "beedfba3561e0acc64e6044457377bee2c72f33f.png",  # Des institutions plus inclusives (7)
    "crises-01":  "b0e148cd61139d13c31cd444292cb938e26aee3a.png",  # Lake province Tchad (7)
    "crises-02":  "2ae86298e402694051c04192d54b337d346e41ca.png",  # Accueillir les réfugiés
    "climate-01": "bdc65c2b6fb02faac6359b111d0e1e9c9f44d923.png",  # Des villes mieux protégées
    "energy-01":  "0785d43d068afb4db78a46c3c0edc8569ab00437.png",  # Transformer l'énergie (8)
    "energy-02":  "20aab1ea25c1223601acb42f8337b6b0bca1b6de.png",  # Transformer l'énergie (4)
    "health-01":  "867bc284c6667ef0dc4d3471ebaab94c71f7426f.png",  # Protection contre le paludisme (2)
    "health-02":  "f3dec83e724999749ac4b1da1ef868d754dcaa93.png",  # Protection contre le paludisme (3)
    "youth-01":   "698da4eb91fc2e634c322a74871dcb9100cebc20.png",  # YouthConnekt Sahel © PNUD-2025 (15)
    "youth-02":   "1e74c8cbab759e7a105f39ea17f6a83b96692946.png",  # UK-LAC-21 Mai
}
# Full-bleed mesh gradients from the design. They are smooth, so they survive a
# hard downscale and land in the tens of KB — but they are not reproducible as a
# CSS gradient, unlike the flat chapter bands.
BACKDROPS = {
    "hero-bg":     "d27374ef9016740658a13eb8a425ec5e6f546f1b.png",  # Background-4 copia
    "youth-panel": "27c4c3e0c766becf19e382d8bdd4c326aeb7b87b.png",  # Union
}
BACKDROP_EDGE = 1800

SVGS = {
    "chad-map":  "4392b1eae1a43789fe5323f54efe6c895b0bb3fb.svg",
    "undp-logo": "28b203773e3fe9fd76a0bad2617f6c7c0a99ca60.svg",
}
OG_SOURCE, OG_SIZE = "hero-02", (1200, 630)


def emit(img: Image.Image, stem: str) -> None:
    jpg = OUT / f"{stem}.jpg"
    img.convert("RGB").save(jpg, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
    subprocess.run(["cwebp", "-quiet", "-q", str(WEBP_Q), str(jpg), "-o", str(OUT / f"{stem}.webp")], check=True)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    missing = [f for f in (*PHOTOS.values(), *BACKDROPS.values(), *SVGS.values()) if not (RAW / f).exists()]
    if missing:
        print("missing raw exports:", *missing, sep="\n  ")
        return 1

    for stem, raw in PHOTOS.items():
        img = ImageOps.exif_transpose(Image.open(RAW / raw))
        img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
        emit(img, stem)
        print(f"{stem:<11} {img.width}x{img.height}  {(OUT / f'{stem}.jpg').stat().st_size // 1024} KB")

    for stem, raw in BACKDROPS.items():
        img = ImageOps.exif_transpose(Image.open(RAW / raw))
        img.thumbnail((BACKDROP_EDGE, BACKDROP_EDGE), Image.LANCZOS)
        emit(img, stem)
        print(f"{stem:<11} {img.width}x{img.height}  {(OUT / f'{stem}.jpg').stat().st_size // 1024} KB")

    og = ImageOps.fit(Image.open(OUT / f"{OG_SOURCE}.jpg"), OG_SIZE, Image.LANCZOS, centering=(0.5, 0.4))
    emit(og, "og-en")
    emit(og, "og-fr")
    for stem, raw in SVGS.items():
        # The Chad map is 161 paths exported at full float precision (~1 MB). One
        # decimal on a 3619-unit viewBox is far below a device pixel and cuts the
        # eagerly-loaded hero map to a third of its transfer size.
        subprocess.run(["npx", "--no-install", "svgo", "-i", str(RAW / raw),
                        "-o", str(OUT / f"{stem}.svg"), "--config", str(ROOT / "svgo.config.mjs"), "-q"], check=True)
        print(f"{stem:<11} {(OUT / f'{stem}.svg').stat().st_size // 1024} KB")
    print(f"\ntotal src/assets/img: {sum(f.stat().st_size for f in OUT.iterdir()) // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
