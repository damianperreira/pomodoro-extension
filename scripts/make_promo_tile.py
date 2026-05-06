"""Generate the 440x280 Chrome Web Store small promo tile."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 440, 280
BG_TOP = (240, 249, 247)
BG_BOTTOM = (224, 242, 238)
TEAL = (38, 166, 154)
TEAL_DARK = (20, 128, 118)
INK = (26, 32, 44)
SUB = (90, 103, 112)

out_dir = Path.home() / "Documents"
out_path = out_dir / "store-promo-440x280.png"

img = Image.new("RGB", (W, H), BG_TOP)
px = img.load()
for y in range(H):
    t = y / (H - 1)
    r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
    g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
    b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
    for x in range(W):
        px[x, y] = (r, g, b)

draw = ImageDraw.Draw(img, "RGBA")

# Timer ring on the left
cx, cy, r = 120, H // 2, 88
stroke = 14
# soft glow
for i, a in enumerate([18, 28, 40]):
    draw.ellipse(
        (cx - r - 10 + i * 3, cy - r - 10 + i * 3, cx + r + 10 - i * 3, cy + r + 10 - i * 3),
        outline=(38, 166, 154, a),
        width=3,
    )
# outer ring
draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=TEAL, width=stroke)
# inner white disc
inner = r - stroke + 2
draw.ellipse((cx - inner, cy - inner, cx + inner, cy + inner), fill=(255, 255, 255))

def load_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()

font_time = load_font(44, bold=True)
font_title = load_font(30, bold=True)
font_sub = load_font(17)
font_small = load_font(15)

# "25:00" in ring
time_text = "25:00"
tw = draw.textlength(time_text, font=font_time)
draw.text((cx - tw / 2, cy - 30), time_text, fill=INK, font=font_time)
fw = draw.textlength("focus", font=font_small)
draw.text((cx - fw / 2, cy + 18), "focus", fill=SUB, font=font_small)

# Right side text block
tx = 232
draw.text((tx, 60), "Pomodoro", fill=INK, font=font_title)
draw.text((tx, 96), "Timer", fill=TEAL_DARK, font=font_title)

# Tagline lines
taglines = [
    "Focus sessions, tasks,",
    "and ambient audio —",
    "right in your sidebar.",
]
ty = 150
for line in taglines:
    draw.text((tx, ty), line, fill=SUB, font=font_sub)
    ty += 22

img.save(out_path, "PNG", optimize=True)
print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")
