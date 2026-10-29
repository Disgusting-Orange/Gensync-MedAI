import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('recordings/overlays', exist_ok=True)

SCENE_META = [
    {
        'id': 'scene_1_intro',
        'chapter': 'CHAPTER 1 / 8',
        'title': 'GenSync-MedAI — Safety-Aware Semantic Cache for Clinical GenAI',
        'subtitle': 'Motivation • Serverless Zero-Vector-DB Architecture • AWS ap-south-1',
        'tag': 'SYSTEM OVERVIEW',
        'tag_color': '#3b82f6'
    },
    {
        'id': 'scene_2_hit',
        'chapter': 'CHAPTER 2 / 8',
        'title': 'Scenario 1: Verified Safe Semantic Cache Hit',
        'subtitle': 'Mayo Clinic Provenance • 99.5% Cosine Match • Sub-220ms Response Time',
        'tag': 'SAFE CACHE HIT',
        'tag_color': '#10b981'
    },
    {
        'id': 'scene_3_miss',
        'chapter': 'CHAPTER 3 / 8',
        'title': 'Scenario 2: Controlled Cache Miss & Offline SLM Review Queue',
        'subtitle': 'Conservative Medical Refusal • Zero Speculation • DynamoDB Async Curation',
        'tag': 'CONTROLLED MISS',
        'tag_color': '#0284c7'
    },
    {
        'id': 'scene_4_referral',
        'chapter': 'CHAPTER 4 / 8',
        'title': 'Scenario 3: Strict Pediatric Safety Intervention',
        'subtitle': 'Deterministic Gating • Raw Milligram Dosages Withheld • Verified NHS Guidance',
        'tag': 'PEDIATRIC REFERRAL',
        'tag_color': '#f59e0b'
    },
    {
        'id': 'scene_5_emergency',
        'chapter': 'CHAPTER 5 / 8',
        'title': 'Scenario 4: Critical Emergency Fast-Path Bypass',
        'subtitle': '0ms Vector Bypass • Immediate tel:112 CTA • Automated Amazon SNS Broadcast',
        'tag': 'EMERGENCY BYPASS',
        'tag_color': '#ef4444'
    },
    {
        'id': 'scene_6_architecture',
        'chapter': 'CHAPTER 6 / 8',
        'title': 'Interactive Architecture: Zero Dedicated Vector DB',
        'subtitle': 'DynamoDB Inverted Centroid Search • INT8 ONNX MiniLM • Always Free Tier',
        'tag': 'CLOUD ARCHITECTURE',
        'tag_color': '#8b5cf6'
    },
    {
        'id': 'scene_7_aws_cloud',
        'chapter': 'CHAPTER 7 / 8',
        'title': 'AWS Cloud Infrastructure Verification & Live Telemetry',
        'subtitle': 'Account 471597060887 • API Gateway • Lambda • DynamoDB (4 Tables) • CloudWatch',
        'tag': 'AWS CONSOLE VERIFICATION',
        'tag_color': '#ff9900'
    },
    {
        'id': 'scene_8_benchmark',
        'chapter': 'CHAPTER 8 / 8',
        'title': 'Adversarial Benchmarks & Clinical Evaluation',
        'subtitle': '31/32 Pass Rate (96.9%) • 0.0% False Hits • HIT-10 Boundary Robustness',
        'tag': 'CLINICAL BENCHMARKS',
        'tag_color': '#059669'
    }
]

def get_font(size, bold=False):
    # Try system fonts on Windows
    paths = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf"
    ]
    if bold:
        paths = [
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf"
        ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

def create_overlay(meta):
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Lower-third banner container at the bottom left
    # Box dimensions: x: 60, y: 920, w: 1200, h: 110
    bx, by, bw, bh = 60, 920, 1280, 115
    radius = 16

    # Frosted glass dark surface with subtle border
    # Background rectangle with rounded corners
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=radius, fill=(15, 23, 42, 235), outline=(51, 65, 85, 255), width=2)

    # Accent color pill badge
    badge_x = bx + 24
    badge_y = by + 18
    badge_w = 210
    badge_h = 28
    draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=6, fill=meta['tag_color'])
    
    font_badge = get_font(14, bold=True)
    draw.text((badge_x + 12, badge_y + 6), meta['tag'], fill=(255, 255, 255, 255), font=font_badge)

    # Chapter indicator text next to pill
    font_chap = get_font(14, bold=True)
    draw.text((badge_x + badge_w + 16, badge_y + 6), meta['chapter'], fill=(148, 163, 184, 255), font=font_chap)

    # Main title
    font_title = get_font(23, bold=True)
    draw.text((bx + 24, by + 54), meta['title'], fill=(255, 255, 255, 255), font=font_title)

    # Subtitle / Details
    font_sub = get_font(16, bold=False)
    draw.text((bx + 24, by + 84), meta['subtitle'], fill=(203, 213, 225, 255), font=font_sub)

    out_file = f"recordings/overlays/{meta['id']}.png"
    img.save(out_file, 'PNG')
    print(f"Generated overlay: {out_file}")

for m in SCENE_META:
    create_overlay(m)

print("All lower-third overlays generated successfully!")
