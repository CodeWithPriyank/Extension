from fastapi import FastAPI, UploadFile, File
import pytesseract
from PIL import Image
import io, re
import platform
import os

# Configure Tesseract path based on OS
system = platform.system()

def find_tessdata_dir(tesseract_path):
    """Find the tessdata directory for a given Tesseract installation."""
    base_dir = os.path.dirname(tesseract_path)
    
    # Try common locations
    possible_tessdata = [
        os.path.join(base_dir, "tessdata"),
        os.path.join(base_dir, "..", "share", "tessdata"),
        os.path.join(base_dir, "..", "share", "tesseract-ocr", "4.00", "tessdata"),
        os.path.join(base_dir, "..", "share", "tesseract-ocr", "5", "tessdata"),
    ]
    
    for tess_dir in possible_tessdata:
        tess_dir = os.path.normpath(tess_dir)
        if os.path.exists(tess_dir):
            # Check if eng.traineddata exists
            eng_file = os.path.join(tess_dir, "eng.traineddata")
            if os.path.exists(eng_file):
                return tess_dir
    return None

if system == "Windows":
    # Check common Windows installation paths
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
    ]
    
    configured = False
    for path in possible_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            print(f"✓ Tesseract executable found at: {path}")
            
            # Find tessdata directory
            tessdata_dir = find_tessdata_dir(path)
            
            if tessdata_dir:
                # Set TESSDATA_PREFIX - try without trailing separator first
                os.environ['TESSDATA_PREFIX'] = tessdata_dir
                print(f"✓ TESSDATA_PREFIX set to: {tessdata_dir}")
                
                # Verify eng.traineddata exists
                eng_file = os.path.join(tessdata_dir, "eng.traineddata")
                if os.path.exists(eng_file):
                    print(f"✓ English language data found: {eng_file}")
                    configured = True
                else:
                    print(f"✗ Warning: eng.traineddata not found at {eng_file}")
            else:
                print(f"✗ Warning: tessdata directory not found")
                print(f"  Tesseract may not work properly. Please ensure tessdata is installed.")
            break
    
    if not configured:
        print("⚠ Tesseract not found or not properly configured!")
        print("Please install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki")
        
elif system == "Darwin":  # macOS
    # Check common macOS installation paths
    possible_paths = [
        "/usr/local/bin/tesseract",
        "/opt/homebrew/bin/tesseract"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            print(f"✓ Tesseract executable found at: {path}")
            
            # Find tessdata directory
            tessdata_dir = find_tessdata_dir(path)
            
            if tessdata_dir:
                os.environ['TESSDATA_PREFIX'] = tessdata_dir
                print(f"✓ TESSDATA_PREFIX set to: {tessdata_dir}")
            break

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
