from fastapi import FastAPI, UploadFile, File
import pytesseract
from PIL import Image
import io, re

app = FastAPI()

def extract_fields(text):
    fields = {}
    # Aadhar number pattern
    m = re.search(r'\b\d{4}\s?\d{4}\s?\d{4}\b', text)
    if m:
        fields['aadhar'] = m.group(0)
    # Date of Birth
    m = re.search(r'\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|1[012])[-/.](19|20)\d\d\b', text)
    if m:
        fields['dob'] = m.group(0)
    # Percentage
    m = re.search(r'(\d{1,3}\.?\d*)\s?%', text)
    if m:
        fields['percentage'] = m.group(0)
    return fields

@app.post("/ocr")   
async def ocr(file: UploadFile = File(...)):
    img_bytes = await file.read()
    image = Image.open(io.BytesIO(img_bytes))
    text = pytesseract.image_to_string(image, lang="eng")
    fields = extract_fields(text)
    return {"text": text, "fields": fields}
