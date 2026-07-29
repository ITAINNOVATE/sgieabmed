from PIL import Image
import glob
import os

folder = r"C:\Users\HP\.gemini\antigravity\brain\17e3efc2-c7d9-4500-93a4-9f48735b310c"
# Find latest image file
image_files = glob.glob(os.path.join(folder, "media__*.png")) + glob.glob(os.path.join(folder, "media__*.jpg"))
image_files.sort(key=os.path.getmtime, reverse=True)

if image_files:
    latest_img_path = image_files[0]
    print("Sampling color from latest image:", latest_img_path)
    img = Image.open(latest_img_path).convert("RGB")
    width, height = img.size
    # Sample center pixel
    r, g, b = img.getpixel((width // 2, height // 2))
    hex_color = f"#{r:02X}{g:02X}{b:02X}"
    print(f"Sampled RGB: ({r}, {g}, {b}) -> HEX: {hex_color}")
else:
    print("No media image found")
