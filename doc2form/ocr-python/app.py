#!/usr/bin/env python3
from fastapi import FastAPI, UploadFile, File
from PIL import Image
import io, base64, json, os
import uvicorn
import httpx
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
# Try current directory first, then parent directory
env_path = Path(__file__).parent / '.env'
if not env_path.exists():
    env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

app = FastAPI()

# Get API key from environment variable (OpenRouter API key)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "") or os.getenv("NEMOTRON_API_KEY", "")
# OpenRouter API endpoint
OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
# Model name for Nemotron Nano 12B on OpenRouter
# Format: "nvidia/nemotron-nano-12b-v2-vl:free" (free tier)
# Check https://openrouter.ai/models for the exact model ID
MODEL_NAME = os.getenv("MODEL_NAME", "nvidia/nemotron-nano-12b-v2-vl:free")

def encode_image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str

async def extract_fields_with_llm(image: Image.Image) -> dict:
    """Use Nemotron Nano 12B via OpenRouter to extract fields from image"""
    
    if not OPENROUTER_API_KEY:
        return {"error": "OPENROUTER_API_KEY or NEMOTRON_API_KEY environment variable not set"}
    
    # Encode image to base64
    base64_image = encode_image_to_base64(image)
    
    # Create a simple, direct prompt for extracting information
    prompt = """Extract all information from this document image and return it as JSON.

Read all text, numbers, dates, names, and any other data visible in the image.
Organize everything into a JSON object with clear field names.

Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.

Example:
{"name": "John Doe", "roll_number": "12345", "subjects": {"math": "95", "science": "88"}}"""

    # Prepare the API request for OpenRouter (OpenAI-compatible format)
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.1
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/your-repo",  # Optional: for OpenRouter analytics
        "X-Title": "OCR Field Extraction"  # Optional: for OpenRouter analytics
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()
            
            # Extract the text response from OpenRouter API (OpenAI-compatible format)
            content = ""
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
            elif "text" in result:
                content = result["text"]
            elif "output" in result:
                content = result["output"]
            else:
                # Debug: print the full result to see what we got
                print(f"Unexpected API response structure: {json.dumps(result, indent=2)}")
                return {"error": "Unexpected API response format", "raw_response": result}
            
            if not content:
                return {"error": "Empty response from API", "raw_response": result}
            
            # Clean up the content - remove markdown code blocks if present
            content = content.strip()
            
            # Remove markdown code blocks
            if content.startswith("```json"):
                content = content[7:].strip()
            elif content.startswith("```"):
                # Find the first newline after ```
                idx = content.find("\n")
                if idx > 0:
                    content = content[idx+1:].strip()
                else:
                    content = content[3:].strip()
            
            if content.endswith("```"):
                content = content[:-3].strip()
            
            # Try to find JSON object in the content
            # Look for first { and last }
            start_idx = content.find("{")
            end_idx = content.rfind("}")
            
            if start_idx >= 0 and end_idx > start_idx:
                content = content[start_idx:end_idx+1]
            
            # Parse JSON
            try:
                fields = json.loads(content)
                # Ensure it's a dictionary
                if isinstance(fields, dict):
                    return fields
                else:
                    # If it's not a dict, wrap it
                    return {"extracted_data": fields}
            except json.JSONDecodeError as e:
                # If JSON parsing fails, return the raw content with error info
                print(f"JSON parsing error: {e}")
                print(f"Attempted to parse: {content[:200]}...")
                # Try to return at least the raw text as a fallback
                return {
                    "error": "Failed to parse JSON response",
                    "raw_content": content,
                    "message": "The model returned text that couldn't be parsed as JSON. Raw content included in response."
                }
                
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP error calling OpenRouter API: {e.response.status_code} - {e.response.text}"
        print(error_msg)
        print(f"Attempted model: {MODEL_NAME}")
        print("Please check https://openrouter.ai/models for the correct model ID and set MODEL_NAME in .env")
        return {"error": f"API error: {e.response.status_code}", "attempted_model": MODEL_NAME}
    except Exception as e:
        print(f"Error calling OpenRouter API: {e}")
        # Fallback to basic extraction if API fails
        return {"error": str(e)}


@app.post("/ocr")   
async def ocr(file: UploadFile = File(...)):
    img_bytes = await file.read()
    image = Image.open(io.BytesIO(img_bytes))
    
    # Use LLM to extract fields
    fields = await extract_fields_with_llm(image)
    
    # Return the extracted data directly (whatever structure the model returned)
    if "error" in fields:
        return fields
    else:
        # Return the fields directly - they're already in the right format
        return fields

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
