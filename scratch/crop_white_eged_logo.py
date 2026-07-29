from PIL import Image, ImageOps

input_path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED.png"
output_path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED_white.png"

img = Image.open(input_path).convert("RGBA")

# Convert to grayscale and invert mask
gray = img.convert("L")
inverted = ImageOps.invert(gray)

def smooth_threshold(val):
    if val < 25:
        return 0
    elif val > 160:
        return 255
    else:
        return int((val - 25) * (255.0 / 135.0))

inverted = inverted.point(smooth_threshold)

# Create solid white image with inverted alpha mask
white_img = Image.new("RGBA", img.size, (255, 255, 255, 255))
white_img.putalpha(inverted)

# Crop tight bounding box
bbox = inverted.getbbox()
if bbox:
    pad = 6
    min_x = max(0, bbox[0] - pad)
    min_y = max(0, bbox[1] - pad)
    max_x = min(img.width, bbox[2] + pad)
    max_y = min(img.height, bbox[3] + pad)
    white_img = white_img.crop((min_x, min_y, max_x, max_y))

white_img.save(output_path, "PNG")
print("Successfully generated tightly-cropped transparent white eGED logo at:", output_path)
