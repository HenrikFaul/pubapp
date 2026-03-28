#!/bin/bash
# ================================================================
# Kapakka PubApp - GitHub feltöltő script
# ================================================================
# Használat: bash push-to-github.sh
# 
# Előfeltételek:
#   - git telepítve van
#   - GitHub Personal Access Token vagy SSH kulcs beállítva
# ================================================================

REPO="https://github.com/HenrikFaul/pubapp.git"
BRANCH="main"

echo "🍺 Kapakka PubApp - GitHub feltöltés"
echo "======================================="

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ A git nincs telepítve. Telepítsd: https://git-scm.com"
    exit 1
fi

# Init if needed
if [ ! -d ".git" ]; then
    echo "📁 Git repo inicializálása..."
    git init
    git remote add origin $REPO
fi

# Make sure we're on main
git checkout -b $BRANCH 2>/dev/null || git checkout $BRANCH

# Stage everything
echo "📦 Fájlok hozzáadása..."
git add .

# Commit
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
git commit -m "feat: Kapakka PubApp - teljes alkalmazás ($TIMESTAMP)"

# Push
echo "🚀 Feltöltés GitHub-ra..."
git push -u origin $BRANCH --force

echo ""
echo "✅ Kész! Az alkalmazás elérhető:"
echo "   GitHub: https://github.com/HenrikFaul/pubapp"
echo "   Vercel: https://pubapp-delta.vercel.app"
echo ""
echo "📋 Következő lépések:"
echo "   1. Supabase SQL-t futtasd: supabase/migrations/001_initial_schema.sql"
echo "   2. Vercel-ben add hozzá az env változókat (.env.local.example alapján)"
echo "   3. Vercel auto-deploy elindul a GitHub push után"
