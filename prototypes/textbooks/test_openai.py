#\!/usr/bin/env python3
import os
import openai

# Read API key location
def get_openai_key():
    key_location_file = "ai_key_location.txt"
    with open(key_location_file, 'r') as f:
        for line in f:
            if line.startswith("OPEN_AI_API_KEY="):
                key_path = line.strip().split('=', 1)[1].strip()
                with open(os.path.expanduser(key_path), 'r') as key_file:
                    return key_file.read().strip()
    raise ValueError("OpenAI API key location not found in ai_key_location.txt")

# Check available models (simplest API call)
def test_api():
    try:
        api_key = get_openai_key()
        openai.api_key = api_key
        print(f"API key loaded successfully: {api_key[:5]}...")
        
        # Try to get models list to test API connection
        try:
            # Try new API format
            client = openai.OpenAI(api_key=api_key)
            models = client.models.list()
            print(f"Success with new API format. Available models: {[m.id for m in models.data][:5]}")
        except (AttributeError, ImportError):
            # Try old API format
            models = openai.Model.list()
            print(f"Success with old API format. Available models: {[m.id for m in models.data][:5]}")
        
        return True
    except Exception as e:
        print(f"API test failed: {e}")
        return False

if __name__ == "__main__":
    print(f"OpenAI version: {openai.__version__}")
    test_api()
