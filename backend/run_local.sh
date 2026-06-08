#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Vihara AI — Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Warn if keys are still placeholders
if grep -q "gsk_YOUR_GROQ_KEY_HERE" .env 2>/dev/null; then
  echo ""
  echo "⚠️  GROQ_API_KEY is a placeholder!"
  echo "   → Get free key: https://console.groq.com"
  echo "   → Edit backend/.env and replace gsk_YOUR_GROQ_KEY_HERE"
  echo ""
fi
if grep -q "hf_YOUR_HF_TOKEN_HERE" .env 2>/dev/null; then
  echo ""
  echo "⚠️  HUGGINGFACE_API_TOKEN is a placeholder!"
  echo "   → Get free token: https://huggingface.co/settings/tokens"
  echo "   → Accept vision license: https://huggingface.co/meta-llama/Llama-3.2-11B-Vision-Instruct"
  echo "   → Edit backend/.env and replace hf_YOUR_HF_TOKEN_HERE"
  echo ""
fi

if [ ! -d ".venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv .venv
fi
source .venv/bin/activate
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "🚀 Backend running at http://localhost:8000"
echo "📖 API docs:  http://localhost:8000/api/docs"
echo "🔍 Status:    http://localhost:8000/api/v1/status"
echo ""
uvicorn main:app --reload --host 0.0.0.0 --port 8000
