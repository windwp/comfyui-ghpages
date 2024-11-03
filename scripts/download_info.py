import requests
import shutil
import json
import sys
import pathlib
import os

COMFY_URL = "http://127.0.0.1:8188"


def download_json(url):
    response = requests.get(url)
    response.raise_for_status()
    json_data = response.json()
    return json_data


def safe_get(dict_obj, *keys):
    for key in keys:
        if not isinstance(dict_obj, dict):
            return None
        dict_obj = dict_obj.get(key)
    return dict_obj


if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "public"

    output_folder = pathlib.Path(__file__).resolve().parent.parent / target_dir
    if not output_folder.exists():
        output_folder.mkdir(exist_ok=True)

    extensions = download_json(f"{COMFY_URL}/api/extensions")
    object_info = download_json(f"{COMFY_URL}/api/object_info")

    default_ckpt_name = [
        [
            "Flux1-Schnell.safetensors",
            "Flux1-Dev.safetensors",
            "Juggernaut-XL.safetensors",
            "Realistic-Vision-V6.0-B1.safetensors",
            "Stable-Diffusion-1.5-Base.safetensors",
            "Stable-Diffusion-XL-Base.safetensors",
        ],
    ]
    default_image = [[], {"image_upload": True}]
    default_lora_name = [
        [
            "flux_realism_lora.safetensors",
        ],
    ]

    # set specific information
    for node_name in object_info:
        node = object_info[node_name]
        image = safe_get(node, "input", "required", "image")
        if image is not None:
            node["input"]["required"]["image"] = default_image

        ckpt = safe_get(node, "input", "required", "ckpt_name")
        if ckpt is not None:
            node["input"]["required"]["ckpt_name"] = default_ckpt_name

        ckpt = safe_get(node, "input", "optional", "ckpt_name")
        if ckpt is not None:
            node["input"]["required"]["ckpt_name"] = default_ckpt_name

        lora_name = safe_get(node, "input", "required", "lora_name")
        if lora_name is not None:
            node["input"]["required"]["lora_name"] = default_lora_name

    api_folder = output_folder / "api"
    api_folder.mkdir(exist_ok=True)
    with open(output_folder / "api/object_info.json", "w") as f:
        f.write(json.dumps(object_info, indent=4))

    with open(output_folder / "api/extensions.json", "w") as f:
        f.write(json.dumps(extensions))

    extensions_folder = output_folder / "extensions"
    if not extensions_folder.exists():
        extensions_folder.mkdir()

    for extension in extensions:
        path = output_folder / extension[1:]
        if not path.exists():
            path.parent.mkdir(exist_ok=True, parents=True)

        with open(path, "w") as f:
            response = requests.get(f"{COMFY_URL}/{extension}")
            if response.status_code != 200:
                print(f"Failed to download {extension}")
                continue
            f.write(response.text)

    if os.path.exists(output_folder / "extensions" / "rgthree-comfy"):
        shutil.copytree(
            output_folder / "extensions" / "rgthree-comfy",
            "public/rgthree",
        )
    if os.path.exists(output_folder / "extensions" / "kjweb_async"):
        shutil.copytree(
            output_folder / "extensions" / "kjweb_async",
            "public/kjweb_async",
        )
    pass
