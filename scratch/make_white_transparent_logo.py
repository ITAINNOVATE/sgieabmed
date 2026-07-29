from PIL import Image, ImageOps

input_path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoABMeD.png"
output_path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoABMeD_white.png"

img = Image.open(input_path).convert("RGBA")

# Convert to grayscale
gray = img.convert("L")

# Invert grayscale: white background (255) becomes 0 (transparent), dark logo lines become high opacity
inverted = ImageOps.invert(gray)

# Enhance contrast so line work is crisp white
def smooth_threshold(val):
    if val < 30:
        return 0
    elif val > 150:
        return 255
    else:
        return int((val - 30) * (255.0 / 120.0))

inverted = inverted.point(smooth_threshold)

# Create solid white image with the inverted mask as alpha channel
white_img = Image.new("RGBA", img.size, (255, 255, 255, 255))
white_img.putalpha(inverted)

white_img.save(output_path, "PNG")
print("High-quality smooth white transparent logo generated at:", output_path)
