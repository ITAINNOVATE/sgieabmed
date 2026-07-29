from PIL import Image

path = r"c:\Users\HP\Desktop\ITA\AbMed\sgie\public\logoeGED.png"
img = Image.open(path)
print("Dimensions:", img.size)
print("Mode:", img.mode)
