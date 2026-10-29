import os
import json
import subprocess
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def assemble():
    with open('recordings/scene_video_map.json', 'r') as f:
        scene_map = json.load(f)

    with open('recordings/durations.json', 'r') as f:
        durations = json.load(f)

    processed_files = []
    scenes = [
        'scene_1_intro',
        'scene_2_hit',
        'scene_3_miss',
        'scene_4_referral',
        'scene_5_emergency',
        'scene_6_architecture',
        'scene_7_aws_cloud',
        'scene_8_benchmark'
    ]

    os.makedirs('recordings/processed', exist_ok=True)

    for sc in scenes:
        raw_video = scene_map[sc]
        audio = f'recordings/audio/{sc}.mp3'
        overlay = f'recordings/overlays/{sc}.png'
        out_mp4 = f'recordings/processed/{sc}.mp4'
        aud_dur = durations.get(f'{sc}.mp3', 60.0)

        print(f"Processing {sc}: raw={raw_video}, audio={audio}, dur={aud_dur}s...")

        # Overlay lower-third banner for first 16 seconds
        # Synchronize video with audio track
        cmd = [
            FFMPEG, '-y',
            '-i', raw_video,
            '-i', overlay,
            '-i', audio,
            '-filter_complex',
            '[0:v][1:v]overlay=0:0:enable=\'between(t,1,16)\',fps=30,scale=1920:1080[v]',
            '-map', '[v]',
            '-map', '2:a',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '20',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-t', str(round(aud_dur + 0.8, 2)),
            out_mp4
        ]

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"Error processing {sc}:\n{res.stderr}")
            raise RuntimeError(f"FFmpeg failed on {sc}")
        
        print(f"Completed {out_mp4} ({os.path.getsize(out_mp4) / 1024 / 1024:.2f} MB)")
        processed_files.append(out_mp4)

    # Concat list
    concat_list_path = 'recordings/concat_list.txt'
    with open(concat_list_path, 'w') as f:
        for p in processed_files:
            abs_p = os.path.abspath(p).replace('\\', '/')
            f.write(f"file '{abs_p}'\n")

    desktop_dir = os.path.expanduser('~') + '/Desktop'
    final_output = os.path.join(desktop_dir, 'GenSync-MedAI_Demo.mp4').replace('\\', '/')

    print(f"\nConcatenating scenes into final deliverable: {final_output}...")
    concat_cmd = [
        FFMPEG, '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concat_list_path,
        '-c', 'copy',
        final_output
    ]

    res = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Concat failed:\n{res.stderr}")
        raise RuntimeError("Concat failed")

    size_mb = os.path.getsize(final_output) / 1024 / 1024
    print(f"\nSUCCESS! GenSync-MedAI Demo Video successfully saved to:")
    print(f"{final_output}")
    print(f"Total File Size: {size_mb:.2f} MB")

if __name__ == '__main__':
    assemble()
