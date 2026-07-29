from PIL import Image

input_path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED.png"
output_path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED.png"

img = Image.open(input_path).convert("RGBA")
width, height = img.size

min_x, min_y = width, height
max_x, max_y = 0, 0

# Find bounding box of non-white / non-transparent pixels
for x in range(width):
    for y in range(height):
        r, g, b, a = img.getpixel((x, y))
        # If pixel is not white and not fully transparent
        if a > 20 and (r < 240 or g < 240 or b < 240):
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

if max_x > min_x and max_y > min_y:
    pad = 6
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(width, max_x + pad)
    max_y = min(height, max_y + pad)
    
    cropped = img.crop((min_x, min_y, max_x, max_y))
    cropped.save(output_path, "PNG")
    print(f"Successfully cropped logo from {img.size} to {cropped.size}")
else:
    print("Failed to detect logo boundaries.")
