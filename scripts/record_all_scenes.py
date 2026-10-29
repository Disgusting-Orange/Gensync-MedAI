import asyncio
import os
import json
import time
from playwright.async_api import async_playwright

DURATIONS_FILE = 'recordings/durations.json'
with open(DURATIONS_FILE, 'r') as f:
    durations = json.load(f)

LIVE_URL = 'https://gensync-med-ai.vercel.app/'
AWS_PROOF_URL = 'file:///' + os.path.abspath('recordings/aws_console_proof.html').replace('\\', '/')

os.makedirs('recordings/raw_videos', exist_ok=True)

async def safe_hover(page, selector, timeout=4000):
    try:
        loc = page.locator(selector).first
        await loc.wait_for(state='visible', timeout=timeout)
        await loc.hover()
    except Exception as e:
        print(f"safe_hover skip {selector}: {e}")

async def safe_click(page, selector, timeout=4000):
    try:
        loc = page.locator(selector).first
        await loc.wait_for(state='visible', timeout=timeout)
        await loc.click()
    except Exception as e:
        print(f"safe_click skip {selector}: {e}")

async def wait_until(start_time, target_seconds):
    elapsed = time.time() - start_time
    rem = target_seconds - elapsed
    if rem > 0:
        await asyncio.sleep(rem)

async def record_scene_1(p):
    target_dur = durations.get('scene_1_intro.mp3', 97.2) + 1.0
    print(f"Recording Scene 1 (Intro) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(LIVE_URL, wait_until='networkidle')
    await asyncio.sleep(3)

    # Hover hero card
    await safe_hover(page, '.home-hero-card')
    await asyncio.sleep(4)

    # Hover status pill
    await safe_hover(page, '.header-pill.connection-pill')
    await asyncio.sleep(4)

    # Toggle to Dark mode
    await safe_click(page, '.theme-toggle-btn')
    await asyncio.sleep(8)

    # Toggle back to Light mode
    await safe_click(page, '.theme-toggle-btn')
    await asyncio.sleep(4)

    # Scroll down to metrics and recent triage
    await page.evaluate("window.scrollBy({top: 400, behavior: 'smooth'})")
    await asyncio.sleep(5)
    await safe_hover(page, '.activity-card')
    await asyncio.sleep(5)
    await safe_hover(page, '.perf-chart-card')
    await asyncio.sleep(6)

    # Scroll back to top
    await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    await asyncio.sleep(4)

    # Hover sidebar brand
    await safe_hover(page, '.sidebar-brand')
    await asyncio.sleep(4)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def record_scene_2(p):
    target_dur = durations.get('scene_2_hit.mp3', 66.8) + 1.0
    print(f"Recording Scene 2 (Safe Cache Hit) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(LIVE_URL, wait_until='networkidle')
    await asyncio.sleep(2)

    # Click Clinical Query nav
    await safe_click(page, 'button:has-text("Clinical Query")')
    await asyncio.sleep(3)

    # Click Preset: Daily Hydration
    await safe_click(page, '.preset-btn-chip:has-text("Daily Hydration")')
    await asyncio.sleep(3)

    # Click Evaluate Query
    await safe_click(page, '.query-submit-btn')
    await asyncio.sleep(5)

    # Scroll to results
    await page.evaluate("window.scrollBy({top: 250, behavior: 'smooth'})")
    await asyncio.sleep(3)
    await safe_hover(page, '.query-results-area')
    await asyncio.sleep(8)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def record_scene_3(p):
    target_dur = durations.get('scene_3_miss.mp3', 57.4) + 1.0
    print(f"Recording Scene 3 (Controlled Cache Miss) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(LIVE_URL, wait_until='networkidle')
    await asyncio.sleep(2)
    await safe_click(page, 'button:has-text("Clinical Query")')
    await asyncio.sleep(3)

    # Click Preset: Solar Flare Headaches
    await safe_click(page, '.preset-btn-chip:has-text("Solar Flare")')
    await asyncio.sleep(3)

    # Click Evaluate Query
    await safe_click(page, '.query-submit-btn')
    await asyncio.sleep(5)

    # Scroll to results
    await page.evaluate("window.scrollBy({top: 250, behavior: 'smooth'})")
    await asyncio.sleep(4)
    await safe_hover(page, '.query-results-area')
    await asyncio.sleep(8)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def record_scene_4(p):
    target_dur = durations.get('scene_4_referral.mp3', 55.3) + 1.0
    print(f"Recording Scene 4 (Pediatric Safety Referral) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(LIVE_URL, wait_until='networkidle')
    await asyncio.sleep(2)
    await safe_click(page, 'button:has-text("Clinical Query")')
    await asyncio.sleep(3)

    # Click Preset: Infant Dosing
    await safe_click(page, '.preset-btn-chip:has-text("Infant Dosing")')
    await asyncio.sleep(3)

    # Click Evaluate Query
    await safe_click(page, '.query-submit-btn')
    await asyncio.sleep(5)

    # Scroll to results
    await page.evaluate("window.scrollBy({top: 250, behavior: 'smooth'})")
    await asyncio.sleep(4)
    await safe_hover(page, '.query-results-area')
    await asyncio.sleep(8)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def record_scene_5(p):
    target_dur = durations.get('scene_5_emergency.mp3', 54.4) + 1.0
    print(f"Recording Scene 5 (Critical Emergency Bypass) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(LIVE_URL, wait_until='networkidle')
    await asyncio.sleep(2)
    await safe_click(page, 'button:has-text("Clinical Query")')
    await asyncio.sleep(3)

    # Click Preset: Crushing Chest Pain
    await safe_click(page, '.preset-btn-chip:has-text("Crushing Chest Pain")')
    await asyncio.sleep(3)

    # Click Evaluate Query
    await safe_click(page, '.query-submit-btn')
    await asyncio.sleep(4)

    # Scroll to results
    await page.evaluate("window.scrollBy({top: 250, behavior: 'smooth'})")
    await asyncio.sleep(4)
    await safe_hover(page, '.query-results-area')
    await asyncio.sleep(8)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def record_scene_6(p):
    target_dur = durations.get('scene_6_architecture.mp3', 66.1) + 1.0
    print(f"Recording Scene 6 (Architecture) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(LIVE_URL, wait_until='networkidle')
    await asyncio.sleep(2)
    await safe_click(page, 'button:has-text("Architecture")')
    await asyncio.sleep(4)

    # Click pipeline stages
    stage_buttons = await page.query_selector_all('.pipeline-step-node, button.stage-pill, .arch-stage-card')
    for s in stage_buttons[:5]:
        try:
            await s.click()
            await asyncio.sleep(2.5)
        except:
            pass

    # Scroll down to No-Vector-DB and cost table
    await page.evaluate("window.scrollBy({top: 450, behavior: 'smooth'})")
    await asyncio.sleep(6)
    await page.evaluate("window.scrollBy({top: 400, behavior: 'smooth'})")
    await asyncio.sleep(8)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def record_scene_7(p):
    target_dur = durations.get('scene_7_aws_cloud.mp3', 79.0) + 1.0
    print(f"Recording Scene 7 (AWS Cloud Infrastructure) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(AWS_PROOF_URL, wait_until='load')
    await asyncio.sleep(3)

    # Hover topbar region & account
    await safe_hover(page, '.region-badge')
    await asyncio.sleep(3)
    await safe_hover(page, '.account-badge')
    await asyncio.sleep(3)

    # Click tabs
    tabs = ['tab-lambda', 'tab-apigw', 'tab-dynamo', 'tab-sns', 'tab-cloudwatch', 'tab-budget']
    for t_id in tabs:
        await safe_click(page, f'#{t_id}')
        await asyncio.sleep(3)

    # Scroll through table
    await page.evaluate("window.scrollBy({top: 350, behavior: 'smooth'})")
    await asyncio.sleep(6)

    # Scroll to terminal box
    await page.evaluate("window.scrollBy({top: 400, behavior: 'smooth'})")
    await safe_hover(page, '.terminal-box')
    await asyncio.sleep(8)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def record_scene_8(p):
    target_dur = durations.get('scene_8_benchmark.mp3', 65.1) + 1.0
    print(f"Recording Scene 8 (Benchmarks & Conclusion) for {target_dur:.1f}s...")
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir='recordings/raw_videos',
        record_video_size={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    start_t = time.time()

    await page.goto(LIVE_URL, wait_until='networkidle')
    await asyncio.sleep(2)

    # Click Benchmark Results
    await safe_click(page, 'button:has-text("Benchmark Results")')
    await asyncio.sleep(4)

    # Scroll through benchmark metrics & table
    await page.evaluate("window.scrollBy({top: 300, behavior: 'smooth'})")
    await asyncio.sleep(6)
    await page.evaluate("window.scrollBy({top: 450, behavior: 'smooth'})")
    await asyncio.sleep(6)

    # Switch to Safety Monitor
    await safe_click(page, 'button:has-text("Safety Monitor")')
    await asyncio.sleep(5)
    await page.evaluate("window.scrollBy({top: 300, behavior: 'smooth'})")
    await asyncio.sleep(6)

    # Return to Home
    await safe_click(page, 'button:has-text("Home")')
    await asyncio.sleep(4)
    await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    await asyncio.sleep(4)

    await wait_until(start_t, target_dur)
    video_path = await page.video.path()
    await context.close()
    await browser.close()
    return video_path

async def main():
    async with async_playwright() as p:
        v1 = await record_scene_1(p)
        v2 = await record_scene_2(p)
        v3 = await record_scene_3(p)
        v4 = await record_scene_4(p)
        v5 = await record_scene_5(p)
        v6 = await record_scene_6(p)
        v7 = await record_scene_7(p)
        v8 = await record_scene_8(p)

    scene_map = {
        'scene_1_intro': v1,
        'scene_2_hit': v2,
        'scene_3_miss': v3,
        'scene_4_referral': v4,
        'scene_5_emergency': v5,
        'scene_6_architecture': v6,
        'scene_7_aws_cloud': v7,
        'scene_8_benchmark': v8
    }
    with open('recordings/scene_video_map.json', 'w') as out:
        json.dump(scene_map, out, indent=2)
    print("All 8 scenes successfully recorded!")

if __name__ == '__main__':
    asyncio.run(main())
