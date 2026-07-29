from PIL import Image, ImageOps

input_path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED.png"
out_clean = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED_clean.png"
out_white = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED_white.png"

img = Image.open(input_path).convert("RGBA")
print("Processing logo eGED, size:", img.size)

# Create transparent version (if white background exists)
datas = img.getdata()
new_clean = []
new_white = []

for item in datas:
    r, g, b, a = item
    if a < 10 or (r > 240 and g > 240 and b > 240):
        # White or transparent background -> transparent
        new_clean.append((255, 255, 255, 0))
        new_white.append((255, 255, 255, 0))
    else:
        # Logo pixel
        new_clean.append((r, g, b, a))
        # Pure white version for dark mode
        new_white.append((255, 255, 255, a))

img_clean = Image.new("RGBA", img.size)
img_clean.putdata(new_clean)
img_clean.save(out_clean, "PNG")

img_white = Image.new("RGBA", img.size)
img_white.putdata(new_white)
img_white.save(out_white, "PNG")

print("Created logoeGED_clean.png and logoeGED_white.png successfully!")
