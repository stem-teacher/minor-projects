import platform
import os
import subprocess

print(f"Python platform: {platform.platform()}")
print(f"Machine: {platform.machine()}")
print(f"Processor: {platform.processor()}")
print(f"System: {platform.system()}")

try:
    import openai
    print(f"OpenAI package version: {openai.__version__}")
    print("OpenAI import successful")
except ImportError as e:
    print(f"OpenAI import error: {e}")

# Check if running under Rosetta
if platform.system() == "Darwin":
    try:
        result = subprocess.run(["sysctl", "-n", "sysctl.proc_translated"], 
                               capture_output=True, text=True, check=False)
        if result.returncode == 0 and result.stdout.strip() == "1":
            print("Running under Rosetta 2 translation")
        else:
            print("Running natively")
    except:
        print("Could not determine Rosetta status")
