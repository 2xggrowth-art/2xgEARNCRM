#!/bin/bash

# Pre-push check script for Lead CRM
# Run this before pushing: ./scripts/pre-push-check.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running pre-push checks..."
echo ""

# Check 1: No Supabase SDK imports
echo "Checking for Supabase SDK imports..."
if grep -r "from '@supabase/supabase-js'" app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo -e "${RED}❌ ERROR: Found @supabase/supabase-js imports!${NC}"
    echo "   Use 'import { supabaseAdmin } from \"@/lib/supabase\"' instead"
    exit 1
fi
if grep -r 'from "@supabase/supabase-js"' app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo -e "${RED}❌ ERROR: Found @supabase/supabase-js imports!${NC}"
    echo "   Use 'import { supabaseAdmin } from \"@/lib/supabase\"' instead"
    exit 1
fi
echo -e "${GREEN}✓ No Supabase SDK imports found${NC}"

# Check 2: Critical files exist
echo ""
echo "Checking critical files exist..."
CRITICAL_FILES=(
    "lib/db.ts"
    "lib/supabase.ts"
    "lib/env-validation.ts"
    "Dockerfile"
    "postcss.config.mjs"
    "middleware.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ ERROR: Critical file missing: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All critical files exist${NC}"

# Check 3: package.json doesn't have Supabase
echo ""
echo "Checking package.json..."
if grep -q "@supabase/supabase-js" package.json; then
    echo -e "${RED}❌ ERROR: package.json contains @supabase/supabase-js${NC}"
    echo "   Remove it and use the existing pg driver"
    exit 1
fi
if ! grep -q '"pg":' package.json; then
    echo -e "${RED}❌ ERROR: package.json missing pg driver${NC}"
    exit 1
fi
echo -e "${GREEN}✓ package.json is correct${NC}"

# Check 4: No hardcoded paths
echo ""
echo "Checking for hardcoded paths..."
if grep -rE "(C:\\\\|/Users/[a-zA-Z]+/|/home/[a-zA-Z]+/)" next.config.ts tsconfig.json 2>/dev/null; then
    echo -e "${YELLOW}⚠ WARNING: Possible hardcoded path found in config${NC}"
fi
echo -e "${GREEN}✓ No obvious hardcoded paths${NC}"

# Check 5: Build passes
echo ""
echo "Running build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Build passed${NC}"
else
    echo -e "${RED}❌ ERROR: Build failed${NC}"
    echo "   Run 'npm run build' to see errors"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All checks passed! Safe to push.${NC}"
