#!/usr/bin/env python3
import os
import requests
import zipfile
import shutil
from pathlib import Path


class ComfyUIUpdater:
    def __init__(self):
        self.version_file = "version.txt"
        self.target_dir = Path("public/comfyui")
        self.github_api_url = (
            "https://api.github.com/repos/Comfy-Org/ComfyUI_frontend/releases/latest"
        )

    def get_current_version(self):
        """Read the current version from version file."""
        try:
            with open(self.version_file, "r") as f:
                return f.read().strip()
        except FileNotFoundError:
            return None

    def get_latest_release_info(self):
        """Get the latest release information from GitHub."""
        headers = {}
        # Add GitHub token if available in environment
        if "GITHUB_TOKEN" in os.environ:
            headers["Authorization"] = f"token {os.environ['GITHUB_TOKEN']}"

        response = requests.get(self.github_api_url, headers=headers)
        response.raise_for_status()
        release_data = response.json()

        # Find the dist.zip asset
        dist_asset = next(
            (asset for asset in release_data["assets"] if asset["name"] == "dist.zip"),
            None,
        )

        if not dist_asset:
            raise ValueError("dist.zip not found in release assets")

        return {
            "tag": release_data["tag_name"],
            "download_url": dist_asset["browser_download_url"],
        }

    def download_and_extract(self, download_url):
        """Download and extract the release archive."""
        # Create temporary directory for download
        temp_dir = Path("temp_download")
        temp_dir.mkdir(exist_ok=True)
        zip_path = temp_dir / "dist.zip"

        try:
            # Download the file
            print(f"Downloading from {download_url}")
            response = requests.get(download_url, stream=True)
            response.raise_for_status()

            with open(zip_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            # Create target directory if it doesn't exist
            self.target_dir.mkdir(parents=True, exist_ok=True)

            # Clean target directory
            if self.target_dir.exists():
                shutil.rmtree(self.target_dir)
            self.target_dir.mkdir(parents=True)

            # Extract files
            print(f"Extracting to {self.target_dir}")
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(self.target_dir)

            if os.path.exists("public/scripts"):
                # Delete the destination path
                shutil.rmtree("public/scripts")
            shutil.copytree("public/comfyui/scripts", "public/scripts")

        finally:
            # Cleanup
            shutil.rmtree(temp_dir)

    def update_version_file(self, new_version):
        """Update the version file with new version."""
        with open(self.version_file, "w") as f:
            f.write(new_version)

    def update(self):
        """Main update process."""
        try:
            print("Checking for updates...")
            current_version = self.get_current_version()
            print(f"Current version: {current_version}")

            release_info = self.get_latest_release_info()
            latest_version = release_info["tag"]
            print(f"Latest version: {latest_version}")

            self.download_and_extract(release_info["download_url"])

            if current_version != latest_version:
                self.update_version_file(latest_version)
                print(f"Successfully updated to version {latest_version}")

        except requests.exceptions.RequestException as e:
            print(f"Error during HTTP request: {e}")
            raise
        except Exception as e:
            print(f"Error during update process: {e}")
            raise


if __name__ == "__main__":
    updater = ComfyUIUpdater()
    updater.update()
