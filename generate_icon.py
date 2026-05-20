"""
Generate FreshPrep Android launcher icons.
Design: dark navy background + leaf icon matching the app header SVG.
"""
import math
import os
from PIL import Image, ImageDraw

BG_COLOR   = (255, 255, 255)  # #FFFFFF — white background
LEAF_COLOR = (46, 112, 80)   # #2E7050 — deep forest green (brand accent)
WHITE      = (255, 255, 255)  # #FFFFFF

def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + 2*radius, y0 + 2*radius], fill=fill)
    draw.ellipse([x1 - 2*radius, y0, x1, y0 + 2*radius], fill=fill)
    draw.ellipse([x0, y1 - 2*radius, x0 + 2*radius, y1], fill=fill)
    draw.ellipse([x1 - 2*radius, y1 - 2*radius, x1, y1], fill=fill)

def draw_bezier_filled(draw, pts, color, steps=60):
    """Approximate a cubic bezier with a filled polygon."""
    p0, p1, p2, p3 = pts
    poly = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3*p0[0] + 3*u**2*t*p1[0] + 3*u*t**2*p2[0] + t**3*p3[0]
        y = u**3*p0[1] + 3*u**2*t*p1[1] + 3*u*t**2*p2[1] + t**3*p3[1]
        poly.append((x, y))
    if len(poly) >= 3:
        draw.polygon(poly, fill=color)

def draw_leaf_icon(size):
    """
    Draws the FreshPrep leaf icon matching the SVG in Layout.tsx:
      - Stem: vertical line from bottom center up
      - Left leaf: curves left from stem mid
      - Right leaf: curves right from stem upper
      - Top shoot: small curved tip at top
    Returns an RGBA image.
    """
    scale = size / 24  # SVG viewBox is 24x24

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    lw = max(1, round(1.5 * scale))  # stroke width scaled

    def s(v):
        return v * scale

    # --- Stem: M12 21 V13 ---
    draw.line([(s(12), s(21)), (s(12), s(13))], fill=LEAF_COLOR, width=lw)

    # --- Left leaf: M12 16 C10 14 7 14 5 15 C6 18 9 18 12 16Z ---
    # Two cubic beziers forming a closed shape
    # Bezier 1: (12,16) -> (10,14) -> (7,14) -> (5,15)
    # Bezier 2: (5,15) -> (6,18) -> (9,18) -> (12,16)
    leaf_pts = []
    for i in range(61):
        t = i / 60
        u = 1-t
        p0,p1,p2,p3 = (s(12),s(16)),(s(10),s(14)),(s(7),s(14)),(s(5),s(15))
        x = u**3*p0[0]+3*u**2*t*p1[0]+3*u*t**2*p2[0]+t**3*p3[0]
        y = u**3*p0[1]+3*u**2*t*p1[1]+3*u*t**2*p2[1]+t**3*p3[1]
        leaf_pts.append((x,y))
    for i in range(61):
        t = i / 60
        u = 1-t
        p0,p1,p2,p3 = (s(5),s(15)),(s(6),s(18)),(s(9),s(18)),(s(12),s(16))
        x = u**3*p0[0]+3*u**2*t*p1[0]+3*u*t**2*p2[0]+t**3*p3[0]
        y = u**3*p0[1]+3*u**2*t*p1[1]+3*u*t**2*p2[1]+t**3*p3[1]
        leaf_pts.append((x,y))
    if len(leaf_pts) >= 3:
        draw.polygon(leaf_pts, fill=LEAF_COLOR)

    # --- Right leaf: M12 13 C14 11 17 11 19 12 C18 15 15 15 12 13Z ---
    leaf2_pts = []
    for i in range(61):
        t = i / 60
        u = 1-t
        p0,p1,p2,p3 = (s(12),s(13)),(s(14),s(11)),(s(17),s(11)),(s(19),s(12))
        x = u**3*p0[0]+3*u**2*t*p1[0]+3*u*t**2*p2[0]+t**3*p3[0]
        y = u**3*p0[1]+3*u**2*t*p1[1]+3*u*t**2*p2[1]+t**3*p3[1]
        leaf2_pts.append((x,y))
    for i in range(61):
        t = i / 60
        u = 1-t
        p0,p1,p2,p3 = (s(19),s(12)),(s(18),s(15)),(s(15),s(15)),(s(12),s(13))
        x = u**3*p0[0]+3*u**2*t*p1[0]+3*u*t**2*p2[0]+t**3*p3[0]
        y = u**3*p0[1]+3*u**2*t*p1[1]+3*u*t**2*p2[1]+t**3*p3[1]
        leaf2_pts.append((x,y))
    if len(leaf2_pts) >= 3:
        draw.polygon(leaf2_pts, fill=LEAF_COLOR)

    # --- Top shoot: M12 13 C12 11 13 9 12 7 (open stroke) ---
    shoot_pts = []
    for i in range(61):
        t = i / 60
        u = 1-t
        p0,p1,p2,p3 = (s(12),s(13)),(s(12),s(11)),(s(13),s(9)),(s(12),s(7))
        x = u**3*p0[0]+3*u**2*t*p1[0]+3*u*t**2*p2[0]+t**3*p3[0]
        y = u**3*p0[1]+3*u**2*t*p1[1]+3*u*t**2*p2[1]+t**3*p3[1]
        shoot_pts.append((x,y))
    # Draw as a thick line/stroke
    for i in range(len(shoot_pts)-1):
        draw.line([shoot_pts[i], shoot_pts[i+1]], fill=LEAF_COLOR, width=lw)

    return img


def make_launcher_icon(size):
    """Compose background + centered leaf on a rounded-square canvas."""
    scale = size / 24
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded square background (corner radius ~22%)
    r = round(size * 0.22)
    draw_rounded_rect(draw, [0, 0, size-1, size-1], r, BG_COLOR + (255,))

    # Draw leaf centered in the icon
    leaf = draw_leaf_icon(size)
    img = Image.alpha_composite(img, leaf)
    return img


def make_foreground_icon(size):
    """
    Foreground layer for adaptive icons: transparent bg, leaf centered.
    Adaptive foreground is 108dp, with 72dp safe zone. Scale leaf to fit.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Draw leaf at 72/108 = 66.7% of icon size, centered
    inner = round(size * 0.667)
    leaf = draw_leaf_icon(inner)
    offset = (size - inner) // 2
    img.paste(leaf, (offset, offset), leaf)
    return img


DENSITIES = {
    'mipmap-mdpi':    {'launcher': 48,  'foreground': 108},
    'mipmap-hdpi':    {'launcher': 72,  'foreground': 162},
    'mipmap-xhdpi':   {'launcher': 96,  'foreground': 216},
    'mipmap-xxhdpi':  {'launcher': 144, 'foreground': 324},
    'mipmap-xxxhdpi': {'launcher': 192, 'foreground': 432},
}

RES_DIR = "android/app/src/main/res"

for density, sizes in DENSITIES.items():
    folder = os.path.join(RES_DIR, density)
    os.makedirs(folder, exist_ok=True)

    # ic_launcher.png (legacy square icon)
    launcher = make_launcher_icon(sizes['launcher'])
    launcher_rgb = Image.new("RGB", launcher.size, (0,0,0))
    launcher_rgb.paste(launcher, mask=launcher.split()[3])
    launcher_rgb.save(os.path.join(folder, "ic_launcher.png"))

    # ic_launcher_round.png (legacy circle icon)
    sz = sizes['launcher']
    circle_mask = Image.new("L", (sz, sz), 0)
    ImageDraw.Draw(circle_mask).ellipse([0, 0, sz-1, sz-1], fill=255)
    launcher_round = make_launcher_icon(sz)
    result = Image.new("RGBA", (sz, sz), (0,0,0,0))
    result.paste(launcher_round, mask=circle_mask)
    result_rgb = Image.new("RGB", (sz, sz), (0,0,0))
    result_rgb.paste(result, mask=result.split()[3])
    result_rgb.save(os.path.join(folder, "ic_launcher_round.png"))

    # ic_launcher_foreground.png (adaptive icon foreground)
    fg = make_foreground_icon(sizes['foreground'])
    fg.save(os.path.join(folder, "ic_launcher_foreground.png"))

    print(f"Generated {density}: launcher={sizes['launcher']}px foreground={sizes['foreground']}px")

print("Done!")
