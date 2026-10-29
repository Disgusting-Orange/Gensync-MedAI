import os
import json
import subprocess
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

SCENE_CONFIG = [
    ('scene_1_intro', 35.0),
    ('scene_2_hit', 38.0),
    ('scene_3_miss', 38.0),
    ('scene_4_referral', 38.0),
    ('scene_5_emergency', 38.0),
    ('scene_6_architecture', 40.0),
    ('scene_7_aws_cloud', 40.0),
    ('scene_8_benchmark', 33.0)
]

def assemble_5min():
    with open('recordings/scene_video_map.json', 'r') as f:
        scene_map = json.load(f)

    os.makedirs('recordings/processed_5min', exist_ok=True)
    processed_files = []

    for sc, duration in SCENE_CONFIG:
        raw_video = scene_map[sc]
        overlay = f'recordings/overlays/{sc}.png'
        out_mp4 = f'recordings/processed_5min/{sc}.mp4'

        print(f"Trimming {sc} to {duration}s without audio...")

        # Overlay banner enabled between 1s and 22s for clean visibility
        cmd = [
            FFMPEG, '-y',
            '-i', raw_video,
            '-i', overlay,
            '-filter_complex',
            f'[0:v][1:v]overlay=0:0:enable=\'between(t,1,22)\',fps=30,scale=1920:1080[v]',
            '-map', '[v]',
            '-an', # NO AUDIO
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '20',
            '-pix_fmt', 'yuv420p',
            '-t', str(duration),
            out_mp4
        ]

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"Error processing {sc}:\n{res.stderr}")
            raise RuntimeError(f"FFmpeg failed on {sc}")
        
        print(f"Completed {out_mp4} ({os.path.getsize(out_mp4) / 1024 / 1024:.2f} MB)")
        processed_files.append(out_mp4)

    # Concat list
    concat_list_path = 'recordings/concat_5min_list.txt'
    with open(concat_list_path, 'w') as f:
        for p in processed_files:
            abs_p = os.path.abspath(p).replace('\\', '/')
            f.write(f"file '{abs_p}'\n")

    onedrive_desktop = r"C:\Users\Admin\OneDrive\Desktop\GenSync-MedAI_Demo_5Min.mp4"
    local_desktop = os.path.expanduser('~') + r"\Desktop\GenSync-MedAI_Demo_5Min.mp4"

    print(f"\nConcatenating scenes into: {onedrive_desktop}...")
    concat_cmd = [
        FFMPEG, '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concat_list_path,
        '-c', 'copy',
        onedrive_desktop
    ]

    res = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Concat failed:\n{res.stderr}")
        raise RuntimeError("Concat failed")

    # Also copy to local Desktop if different
    if os.path.exists(onedrive_desktop) and onedrive_desktop.lower() != local_desktop.lower():
        try:
            import shutil
            shutil.copy2(onedrive_desktop, local_desktop)
        except Exception as e:
            print(f"Copy to local desktop warning: {e}")

    size_mb = os.path.getsize(onedrive_desktop) / 1024 / 1024
    print(f"\nSUCCESS! 5-Minute No-Audio Demo Video created:")
    print(f"{onedrive_desktop} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    assemble_5min()
