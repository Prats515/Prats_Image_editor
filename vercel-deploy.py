#!/usr/bin/env python3
"""
Vercel Deployment Script - Sets environment variables and deploys
Usage: python vercel-deploy.py <VERCEL_TOKEN>
"""

import sys
import os
import json
import subprocess
from pathlib import Path

def load_env_local():
    """Load environment variables from .env.local"""
    env_vars = {}
    env_file = Path(".env.local")
    
    if not env_file.exists():
        print("❌ Error: .env.local not found")
        sys.exit(1)
    
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    
    return env_vars

def main():
    print("🚀 Prats Image Editor - Vercel Deployment")
    print("")
    
    # Check if token is provided
    if len(sys.argv) < 2:
        print("❌ Error: Vercel token required")
        print("Usage: python vercel-deploy.py <VERCEL_TOKEN>")
        print("")
        print("Get your token from: https://vercel.com/account/tokens")
        sys.exit(1)
    
    vercel_token = sys.argv[1]
    
    # Load environment variables
    print("📦 Loading environment variables from .env.local...")
    env_vars = load_env_local()
    
    required_vars = [
        "GROQ_API_KEY",
        "COMETAPI_KEY",
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME"
    ]
    
    missing = [v for v in required_vars if v not in env_vars]
    if missing:
        print(f"❌ Missing variables: {', '.join(missing)}")
        sys.exit(1)
    
    print(f"✅ Found {len(required_vars)} required environment variables")
    print("")
    
    # Get project info
    print("📋 Getting project information...")
    result = subprocess.run(
        ["vercel", "projects", "ls", "--json", "--token", vercel_token],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ Error getting projects: {result.stderr}")
        print("Make sure you're authenticated with Vercel")
        sys.exit(1)
    
    projects = json.loads(result.stdout)
    prats_project = None
    
    for project in projects.get("projects", []):
        if "prats" in project["name"].lower() and "image" in project["name"].lower():
            prats_project = project
            break
    
    if not prats_project:
        print("❌ Could not find 'prats-image-editor' project")
        sys.exit(1)
    
    project_id = prats_project["id"]
    print(f"✅ Found project: {prats_project['name']}")
    print("")
    
    # Add environment variables
    print("🔧 Adding environment variables...")
    for var_name in required_vars:
        var_value = env_vars[var_name]
        print(f"  Adding {var_name}...")
        
        result = subprocess.run(
            [
                "vercel", "env", "add", var_name,
                "--token", vercel_token,
                "--project", project_id
            ],
            input=var_value + "\ny\n",
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"    ✅ {var_name} added")
        else:
            print(f"    ⚠️ {var_name}: {result.stderr}")
    
    print("")
    print("🚀 Deploying to Vercel...")
    
    # Deploy
    result = subprocess.run(
        ["vercel", "deploy", "--prod", "--token", vercel_token],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print("✅ Deployment successful!")
        print("")
        # Extract URL from output
        for line in result.stdout.split('\n'):
            if 'vercel.app' in line or 'vercel.com' in line:
                print(f"🌐 Live at: {line.strip()}")
    else:
        print(f"❌ Deployment failed: {result.stderr}")
        sys.exit(1)
    
    print("")
    print("✅ Done! Your Prats Image Editor is now deployed with all environment variables!")

if __name__ == "__main__":
    main()
