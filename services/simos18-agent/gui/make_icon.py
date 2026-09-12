"""One-off script: generates gui/icon.ico (a simple boost-gauge monogram)."""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG = (17, 19, 23, 255)          # near-black
ORANGE = (255, 122, 26, 255)    # accent
ORANGE_DIM = (120, 62, 20, 255)
WHITE = (240, 240, 240, 255)


def build(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.04)
    radius = int(size * 0.22)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=BG)

    # gauge arc (boost gauge feel)
    cx, cy = size / 2, size * 0.58
    r = size * 0.34
    start_angle, end_angle = 135, 405
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=start_angle, end=end_angle,
              fill=ORANGE_DIM, width=max(2, int(size * 0.035)))
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=start_angle, end=210,
              fill=ORANGE, width=max(2, int(size * 0.035)))

    # needle
    needle_angle_deg = 300
    needle_len = r * 0.9
    a = math.radians(needle_angle_deg)
    nx = cx + needle_len * math.cos(a)
    ny = cy + needle_len * math.sin(a)
    draw.line([cx, cy, nx, ny], fill=WHITE, width=max(2, int(size * 0.03)))
    hub_r = size * 0.035
    draw.ellipse([cx - hub_r, cy - hub_r, cx + hub_r, cy + hub_r], fill=WHITE)

    # "TP" letters up top
    try:
        font = ImageFont.truetype("segoeuib.ttf", int(size * 0.30))
    except Exception:
        font = ImageFont.load_default()
    text = "TP"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((size / 2 - tw / 2 - bbox[0], size * 0.10 - bbox[1]), text, font=font, fill=WHITE)

    return img


def main():
    # Pillow's ICO writer downsamples ONE source image to each requested
    # size - build a single high-res image and let it do that.
    base = build(256)
    out = Path(__file__).parent / "icon.ico"
    base.save(out, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"wrote {out}")

    # small PNG for the in-window header (Tk loads PNG natively, no Pillow
    # needed at runtime - this file just needs to ship alongside the exe).
    header = build(56)
    header_path = Path(__file__).parent / "icon_header.png"
    header.save(header_path, format="PNG")
    print(f"wrote {header_path}")


if __name__ == "__main__":
    main()
