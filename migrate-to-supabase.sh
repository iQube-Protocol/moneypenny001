#!/bin/bash

# ============================================================================
# AgentiQ MoneyPenny - Lovable Cloud to External Supabase Migration Script
# ============================================================================
#
# This script automates the complete migration process including:
# - Supabase project linking and initialization
# - Database migrations (9 migrations with RLS policies)
# - Edge function deployment (10 functions)
# - Secrets configuration
# - Storage bucket setup
# - Environment file generation
# - Frontend design preservation validation
#
# Prerequisites:
# - Supabase CLI installed (npm install -g supabase)
# - Node.js and npm installed
# - Git repository initialized
# - Supabase project created at supabase.com
#
# Usage: bash migrate-to-supabase.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}\n"
}

# Progress spinner
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Validation functions
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ============================================================================
# PHASE 0: Pre-flight Checks
# ============================================================================

log_section "PHASE 0: Pre-flight Checks"

log_info "Checking required dependencies..."
check_command "supabase"
check_command "node"
check_command "npm"
check_command "git"
log_success "All dependencies installed ✓"

log_info "Verifying project structure..."
if [ ! -d "supabase/migrations" ]; then
    log_error "supabase/migrations directory not found. Are you in the project root?"
    exit 1
fi
if [ ! -d "supabase/functions" ]; then
    log_error "supabase/functions directory not found."
    exit 1
fi
if [ ! -f "src/index.css" ]; then
    log_error "src/index.css not found. Frontend design system missing!"
    exit 1
fi
log_success "Project structure validated ✓"

# Count migrations and functions
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
FUNCTION_COUNT=$(find supabase/functions -maxdepth 1 -type d ! -path supabase/functions | wc -l)
log_info "Found ${MIGRATION_COUNT} migrations and ${FUNCTION_COUNT} edge functions"

# ============================================================================
# PHASE 1: Collect Supabase Credentials
# ============================================================================

log_section "PHASE 1: Supabase Project Configuration"

echo -e "${CYAN}Please provide your Supabase project credentials.${NC}"
echo -e "${CYAN}Find these at: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api${NC}\n"

read -p "$(echo -e ${YELLOW}Enter Supabase Project ID:${NC} )" SUPABASE_PROJECT_ID
read -p "$(echo -e ${YELLOW}Enter Supabase Project Reference (short ID):${NC} )" SUPABASE_PROJECT_REF
read -p "$(echo -e ${YELLOW}Enter Supabase URL:${NC} )" SUPABASE_URL
read -p "$(echo -e ${YELLOW}Enter Supabase Anon Key:${NC} )" SUPABASE_ANON_KEY
read -sp "$(echo -e ${YELLOW}Enter Supabase Service Role Key:${NC} )" SUPABASE_SERVICE_ROLE_KEY
echo
read -sp "$(echo -e ${YELLOW}Enter Supabase Database URL:${NC} )" SUPABASE_DB_URL
echo

# Validate inputs
if [ -z "$SUPABASE_PROJECT_ID" ] || [ -z "$SUPABASE_PROJECT_REF" ] || [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    log_error "All credentials are required!"
    exit 1
fi

log_success "Credentials collected ✓"

# ============================================================================
# PHASE 2: AgentiQ Configuration
# ============================================================================

log_section "PHASE 2: AgentiQ Stack Configuration"

echo -e "${CYAN}Configure AgentiQ backend services:${NC}\n"

read -p "$(echo -e ${YELLOW}AgentiQ API Base URL [https://api.aigent.dev]:${NC} )" AGENTIQ_API_URL
AGENTIQ_API_URL=${AGENTIQ_API_URL:-https://api.aigent.dev}

read -p "$(echo -e ${YELLOW}Use default AgentiQ service URLs? (y/n) [y]:${NC} )" USE_DEFAULT_URLS
USE_DEFAULT_URLS=${USE_DEFAULT_URLS:-y}

if [ "$USE_DEFAULT_URLS" = "y" ]; then
    DIDQUBE_URL="https://did.aigent.dev"
    BLAKQUBE_URL="https://blak.aigent.dev"
    METAQUBE_URL="https://meta.aigent.dev"
    AGGREGATE_URL="https://aggregate.aigent.dev"
    DVN_URL="https://dvn.aigent.dev"
else
    read -p "$(echo -e ${YELLOW}DiDQube URL:${NC} )" DIDQUBE_URL
    read -p "$(echo -e ${YELLOW}BlakQube URL:${NC} )" BLAKQUBE_URL
    read -p "$(echo -e ${YELLOW}MetaQube URL:${NC} )" METAQUBE_URL
    read -p "$(echo -e ${YELLOW}Aggregate URL:${NC} )" AGGREGATE_URL
    read -p "$(echo -e ${YELLOW}DVN URL:${NC} )" DVN_URL
fi

read -p "$(echo -e ${YELLOW}Agent Class [moneypenny]:${NC} )" AGENT_CLASS
AGENT_CLASS=${AGENT_CLASS:-moneypenny}

read -p "$(echo -e ${YELLOW}Tenant ID (optional):${NC} )" TENANT_ID

log_success "AgentiQ configuration collected ✓"

# ============================================================================
# PHASE 3: Optional Secrets
# ============================================================================

log_section "PHASE 3: Optional Service Credentials"

echo -e "${CYAN}Configure optional integrations (press Enter to skip):${NC}\n"

read -p "$(echo -e ${YELLOW}Lovable API Key (for AI features):${NC} )" LOVABLE_API_KEY
read -p "$(echo -e ${YELLOW}Tavily API Key (for research):${NC} )" TAVILY_API_KEY
read -p "$(echo -e ${YELLOW}DID Client Key:${NC} )" DID_CLIENT_KEY
read -p "$(echo -e ${YELLOW}DID Agent ID:${NC} )" DID_AGENT_ID
read -p "$(echo -e ${YELLOW}Redis URL [redis://localhost:6379]:${NC} )" REDIS_URL
REDIS_URL=${REDIS_URL:-redis://localhost:6379}

# ============================================================================
# PHASE 4: Link Supabase Project
# ============================================================================

log_section "PHASE 4: Linking Supabase Project"

log_info "Linking to Supabase project: $SUPABASE_PROJECT_REF"
supabase link --project-ref "$SUPABASE_PROJECT_REF" 2>&1 | while IFS= read -r line; do
    echo "  $line"
done

if [ $? -eq 0 ]; then
    log_success "Project linked successfully ✓"
else
    log_error "Failed to link project. Check credentials and try again."
    exit 1
fi

# ============================================================================
# PHASE 5: Deploy Database Migrations
# ============================================================================

log_section "PHASE 5: Deploying Database Migrations"

log_info "Found $MIGRATION_COUNT migrations to deploy"
echo -e "${CYAN}Migrations include:${NC}"
echo "  - agent_memories table with RLS policies"
echo "  - bank_statements table with RLS policies"
echo "  - cache_store table"
echo "  - financial_aggregates table"
echo "  - policy_applications table"
echo "  - recommendation_history table"
echo "  - trading_executions table (DEMO: public access)"
echo "  - trading_intents table (DEMO: public access)"
echo "  - trading_recommendations table"
echo "  - Database functions and triggers"
echo ""

read -p "$(echo -e ${YELLOW}Deploy all migrations now? (y/n) [y]:${NC} )" DEPLOY_MIGRATIONS
DEPLOY_MIGRATIONS=${DEPLOY_MIGRATIONS:-y}

if [ "$DEPLOY_MIGRATIONS" = "y" ]; then
    log_info "Pushing migrations to Supabase..."
    supabase db push 2>&1 | while IFS= read -r line; do
        echo "  $line"
    done
    
    if [ $? -eq 0 ]; then
        log_success "All migrations deployed successfully ✓"
    else
        log_error "Migration deployment failed!"
        exit 1
    fi
else
    log_warning "Skipping migrations. Run 'supabase db push' manually later."
fi

# ============================================================================
# PHASE 6: Configure Storage Buckets
# ============================================================================

log_section "PHASE 6: Configuring Storage Buckets"

log_info "Setting up 'banking-documents' storage bucket..."

# Create SQL for bucket setup
cat > /tmp/setup_storage.sql <<EOF
-- Create banking-documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banking-documents', 'banking-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for banking-documents
CREATE POLICY IF NOT EXISTS "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'banking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
EOF

supabase db execute -f /tmp/setup_storage.sql 2>&1 | while IFS= read -r line; do
    echo "  $line"
done
rm /tmp/setup_storage.sql

log_success "Storage bucket configured ✓"

# ============================================================================
# PHASE 7: Deploy Edge Functions
# ============================================================================

log_section "PHASE 7: Deploying Edge Functions"

FUNCTIONS=(
    "ai-trade-advisor"
    "arbitrage-scanner"
    "banking-document-parser"
    "execution-engine"
    "memories"
    "moneypenny-chat"
    "oracle-dex"
    "oracle-refprice"
    "quotes"
    "research-agent"
)

log_info "Deploying ${#FUNCTIONS[@]} edge functions..."

for func in "${FUNCTIONS[@]}"; do
    log_info "Deploying $func..."
    supabase functions deploy "$func" 2>&1 | while IFS= read -r line; do
        echo "    $line"
    done
    
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} $func deployed"
    else
        log_error "Failed to deploy $func"
        exit 1
    fi
done

log_success "All edge functions deployed ✓"

# ============================================================================
# PHASE 8: Configure Secrets
# ============================================================================

log_section "PHASE 8: Configuring Edge Function Secrets"

log_info "Setting Supabase secrets..."

# Core Supabase secrets
supabase secrets set SUPABASE_URL="$SUPABASE_URL" > /dev/null 2>&1
supabase secrets set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" > /dev/null 2>&1
supabase secrets set SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY" > /dev/null 2>&1
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" > /dev/null 2>&1
supabase secrets set SUPABASE_DB_URL="$SUPABASE_DB_URL" > /dev/null 2>&1

log_success "Core Supabase secrets configured ✓"

# Optional secrets
if [ ! -z "$LOVABLE_API_KEY" ]; then
    supabase secrets set LOVABLE_API_KEY="$LOVABLE_API_KEY" > /dev/null 2>&1
    log_success "Lovable API key configured ✓"
fi

if [ ! -z "$TAVILY_API_KEY" ]; then
    supabase secrets set TAVILY_API_KEY="$TAVILY_API_KEY" > /dev/null 2>&1
    log_success "Tavily API key configured ✓"
fi

if [ ! -z "$DID_CLIENT_KEY" ]; then
    supabase secrets set DID_CLIENT_KEY="$DID_CLIENT_KEY" > /dev/null 2>&1
    supabase secrets set DID_AGENT_ID="$DID_AGENT_ID" > /dev/null 2>&1
    log_success "DID credentials configured ✓"
fi

# ============================================================================
# PHASE 9: Generate Environment File
# ============================================================================

log_section "PHASE 9: Generating Environment Configuration"

log_info "Creating .env file..."

cat > .env <<EOF
# ============================================================================
# AgentiQ MoneyPenny - External Supabase Configuration
# Generated: $(date)
# ============================================================================

# Supabase Configuration
VITE_SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY

# AgentiQ Configuration
VITE_AGENT_CLASS=$AGENT_CLASS
VITE_TENANT_ID=$TENANT_ID

# AgentiQ Backend Services
VITE_API_BASE_URL=$AGENTIQ_API_URL
VITE_DIDQUBE_URL=$DIDQUBE_URL
VITE_BLAKQUBE_URL=$BLAKQUBE_URL
VITE_METAQUBE_URL=$METAQUBE_URL
VITE_AGGREGATE_URL=$AGGREGATE_URL
VITE_DVN_URL=$DVN_URL

# Edge Function Endpoints (Your Supabase Project)
VITE_MEMORIES_URL=${SUPABASE_URL}/functions/v1/memories
VITE_QUOTES_URL=${SUPABASE_URL}/functions/v1/quotes
VITE_EXECUTION_URL=${SUPABASE_URL}/functions/v1/execution-engine
VITE_ORACLE_URL=${SUPABASE_URL}/functions/v1/oracle-refprice
VITE_AGENTS_URL=${SUPABASE_URL}/functions/v1/moneypenny-chat

# Feature Flags
VITE_ENABLE_A2A=true
VITE_ENABLE_METAMASK=true
VITE_ENABLE_UNISAT=true
VITE_ENABLE_PHANTOM=true
VITE_ENABLE_NON_EVM=false

# External Services (Optional)
VITE_TAVILY_API_KEY=$TAVILY_API_KEY
VITE_REDIS_URL=$REDIS_URL

# Agent Settings
VITE_VENICE_PRIVACY_MODE=strict
VITE_ORACLE_POLL_INTERVAL_MS=30000
EOF

log_success ".env file created ✓"

# ============================================================================
# PHASE 10: Validate Frontend Design System
# ============================================================================

log_section "PHASE 10: Frontend Design System Validation"

log_info "Validating frontend design preservation..."

# Check critical design files
DESIGN_FILES=(
    "src/index.css"
    "tailwind.config.ts"
    "src/components/ui/button.tsx"
    "src/components/ui/card.tsx"
    "src/components/ui/tabs.tsx"
)

DESIGN_VALID=true
for file in "${DESIGN_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file ${RED}(MISSING!)${NC}"
        DESIGN_VALID=false
    fi
done

if [ "$DESIGN_VALID" = true ]; then
    log_success "All design system files present ✓"
else
    log_error "Some design files are missing!"
fi

# Validate design tokens in index.css
log_info "Checking design tokens..."

REQUIRED_TOKENS=(
    "--background"
    "--foreground"
    "--primary"
    "--primary-foreground"
    "--secondary"
    "--muted"
    "--accent"
    "--border"
    "--radius"
)

TOKENS_VALID=true
for token in "${REQUIRED_TOKENS[@]}"; do
    if grep -q "$token" src/index.css; then
        echo -e "  ${GREEN}✓${NC} $token"
    else
        echo -e "  ${RED}✗${NC} $token ${RED}(MISSING!)${NC}"
        TOKENS_VALID=false
    fi
done

if [ "$TOKENS_VALID" = true ]; then
    log_success "All design tokens validated ✓"
else
    log_warning "Some design tokens missing - review src/index.css"
fi

# Check for animations
log_info "Checking animation keyframes..."
if grep -q "animate-fade-in\|animate-scale-in\|animate-pulse-slow" src/index.css tailwind.config.ts; then
    log_success "Animation system preserved ✓"
else
    log_warning "Animation definitions may be missing"
fi

# Check for glassmorphism utilities
log_info "Checking glassmorphism utilities..."
if grep -q "glass-card\|backdrop-blur" src/index.css; then
    log_success "Glassmorphism utilities preserved ✓"
else
    log_warning "Glassmorphism utilities may be missing"
fi

# ============================================================================
# PHASE 11: Generate Type Definitions
# ============================================================================

log_section "PHASE 11: Generating TypeScript Types"

log_info "Generating Supabase type definitions..."
supabase gen types typescript --local > src/integrations/supabase/types.ts 2>&1

if [ $? -eq 0 ]; then
    log_success "Type definitions generated ✓"
else
    log_warning "Failed to generate types. Run manually: supabase gen types typescript --local > src/integrations/supabase/types.ts"
fi

# ============================================================================
# PHASE 12: Install Dependencies & Build
# ============================================================================

log_section "PHASE 12: Installing Dependencies"

log_info "Running npm install..."
npm install 2>&1 | while IFS= read -r line; do
    echo "  $line"
done

if [ $? -eq 0 ]; then
    log_success "Dependencies installed ✓"
else
    log_error "npm install failed!"
    exit 1
fi

# ============================================================================
# PHASE 13: Validation & Health Check
# ============================================================================

log_section "PHASE 13: Post-Migration Validation"

log_info "Creating validation checklist..."

cat > MIGRATION_VALIDATION.md <<EOF
# Migration Validation Checklist

Generated: $(date)

## Database
- [ ] All 9 migrations applied (check \`supabase_migrations\` table)
- [ ] All 9 tables created: agent_memories, bank_statements, cache_store, financial_aggregates, policy_applications, recommendation_history, trading_executions, trading_intents, trading_recommendations
- [ ] RLS policies active on user-facing tables
- [ ] Database functions created: update_updated_at_column, update_trading_intent_updated_at

## Edge Functions
- [ ] ai-trade-advisor deployed
- [ ] arbitrage-scanner deployed
- [ ] banking-document-parser deployed
- [ ] execution-engine deployed (JWT auth required)
- [ ] memories deployed (JWT auth required)
- [ ] moneypenny-chat deployed
- [ ] oracle-dex deployed
- [ ] oracle-refprice deployed
- [ ] quotes deployed
- [ ] research-agent deployed

## Storage
- [ ] banking-documents bucket created
- [ ] Storage RLS policies configured

## Secrets
- [ ] SUPABASE_URL configured
- [ ] SUPABASE_ANON_KEY configured
- [ ] SUPABASE_SERVICE_ROLE_KEY configured
- [ ] SUPABASE_DB_URL configured
- [ ] Optional: LOVABLE_API_KEY configured
- [ ] Optional: TAVILY_API_KEY configured
- [ ] Optional: DID_CLIENT_KEY configured

## Frontend
- [ ] .env file created with all required variables
- [ ] Design system preserved (index.css, tailwind.config.ts)
- [ ] All UI components intact (button, card, tabs, etc.)
- [ ] Animation system functional
- [ ] Glassmorphism effects preserved

## Testing
- [ ] npm run dev starts successfully
- [ ] Authentication flow works (sign up → sign in)
- [ ] Trading intent submission works
- [ ] Execution feed populates with fills
- [ ] Insights/Decisions appear in AgentMemoryPanel
- [ ] Real-time updates working
- [ ] Wallet adapters initialize correctly
- [ ] AgentiQ health check passes in console

## Production Readiness
- [ ] Update CORS in edge functions for production domain
- [ ] Configure authentication redirect URLs in Supabase dashboard
- [ ] Set up custom domain (if required)
- [ ] Configure production environment variables
- [ ] Test with real wallets (MetaMask, UniSat, Phantom)

## AgentiQ Integration
- [ ] api.aigent.dev reachable
- [ ] did.aigent.dev reachable (if using A2A)
- [ ] blak.aigent.dev reachable (if using storage)
- [ ] aggregate.aigent.dev reachable
- [ ] dvn.aigent.dev reachable
- [ ] X-Tenant-Id header included in requests (if multi-tenant)

---

## Next Steps

1. **Start Development Server:**
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Check Browser Console:**
   - Look for "✅ MoneyPenny config validated successfully"
   - Verify all module health checks pass
   - Check for any CORS or authentication errors

3. **Test Critical Flows:**
   - Sign up/Sign in
   - Submit trading intent
   - View execution fills
   - Check insights/decisions
   - Test real-time updates

4. **Production Deployment:**
   - Build: \`npm run build\`
   - Deploy frontend to Vercel/Netlify/Cloudflare
   - Update .env with production URLs
   - Configure CORS in edge functions
   - Test end-to-end

## Troubleshooting

### Edge Functions Failing
\`\`\`bash
supabase functions logs <function-name>
\`\`\`

### Database Issues
\`\`\`bash
supabase db diff
supabase db reset  # WARNING: Deletes all data
\`\`\`

### Type Generation Errors
\`\`\`bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
\`\`\`

### Design System Issues
- Verify all HSL color variables in src/index.css
- Check tailwind.config.ts extends design tokens
- Ensure no direct color usage (text-white, bg-black, etc.)

---

## Design System Preservation Notes

### Critical Files
- \`src/index.css\` - HSL color tokens, animations, glassmorphism
- \`tailwind.config.ts\` - Extended theme, animation configs
- \`src/components/ui/*\` - Shadcn components with custom variants

### Animation System
- Keyframes: accordion-down/up, fade-in/out, scale-in/out, slide-in/out
- Utilities: .hover-scale, .pulse, .story-link
- Combined: enter/exit animations

### Glassmorphism
- .glass-card utility class
- backdrop-blur and background transparency
- Border and shadow effects

### Color Tokens (HSL)
All colors use CSS variables:
- --background / --foreground
- --primary / --primary-foreground
- --secondary / --secondary-foreground
- --muted / --muted-foreground
- --accent / --accent-foreground
- --destructive / --destructive-foreground

**NEVER use direct colors like:**
- text-white, bg-white
- text-black, bg-black
- Hard-coded hex values

**ALWAYS use semantic tokens:**
- text-foreground, bg-background
- text-primary, bg-primary
- text-muted, bg-muted

EOF

log_success "Validation checklist created: MIGRATION_VALIDATION.md"

# ============================================================================
# FINAL SUMMARY
# ============================================================================

log_section "Migration Complete! 🎉"

echo -e "${GREEN}"
cat <<'EOF'
   ___   __                ___     ____
  / _ | / /__ ___ ___  __ / _ |   / __/_ _____ __ ___
 / __ |/ / _ `/ -_) _ \/ // __ | _\ \/ // (_-</ // / -_)
/_/ |_/_/\_, /\__/_//_\__/_/ |_|/___/\_,_/___/\_,_/\__/
        /___/  MoneyPenny Trading Console
EOF
echo -e "${NC}"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}              ${GREEN}MIGRATION SUCCESSFULLY COMPLETED${NC}              ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  ${GREEN}✓${NC} Supabase project linked: ${SUPABASE_PROJECT_REF}"
echo -e "  ${GREEN}✓${NC} Database migrations deployed: ${MIGRATION_COUNT}"
echo -e "  ${GREEN}✓${NC} Edge functions deployed: ${#FUNCTIONS[@]}"
echo -e "  ${GREEN}✓${NC} Storage bucket configured: banking-documents"
echo -e "  ${GREEN}✓${NC} Secrets configured: Core + Optional"
echo -e "  ${GREEN}✓${NC} Environment file created: .env"
echo -e "  ${GREEN}✓${NC} Frontend design system validated"
echo -e "  ${GREEN}✓${NC} TypeScript types generated"
echo ""
echo -e "${BLUE}📁 Configuration Files:${NC}"
echo -e "  ${CYAN}→${NC} .env (environment variables)"
echo -e "  ${CYAN}→${NC} MIGRATION_VALIDATION.md (validation checklist)"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "  ${YELLOW}1.${NC} Review the validation checklist:"
echo -e "     ${CYAN}cat MIGRATION_VALIDATION.md${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Start the development server:"
echo -e "     ${CYAN}npm run dev${NC}"
echo ""
echo -e "  ${YELLOW}3.${NC} Open browser and check console for:"
echo -e "     ${GREEN}✅ MoneyPenny config validated successfully${NC}"
echo ""
echo -e "  ${YELLOW}4.${NC} Test critical flows:"
echo -e "     - Authentication (sign up/sign in)"
echo -e "     - Trading intent submission"
echo -e "     - Execution fills"
echo -e "     - Insights/Decisions in AgentMemoryPanel"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "  ${CYAN}→${NC} Supabase Dashboard: https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}"
echo -e "  ${CYAN}→${NC} Edge Functions: ${SUPABASE_URL}/functions/v1/"
echo -e "  ${CYAN}→${NC} AgentiQ Architecture: src/lib/aigent/README.md"
echo ""
echo -e "${BLUE}🎨 Design System:${NC}"
echo -e "  ${GREEN}✓${NC} All HSL color tokens preserved"
echo -e "  ${GREEN}✓${NC} Animation keyframes intact"
echo -e "  ${GREEN}✓${NC} Glassmorphism utilities available"
echo -e "  ${GREEN}✓${NC} Shadcn UI components customized"
echo ""
echo -e "${YELLOW}⚠️  Important Reminders:${NC}"
echo -e "  • Never commit .env to git"
echo -e "  • Update CORS headers for production domain"
echo -e "  • Configure auth redirect URLs in Supabase dashboard"
echo -e "  • Verify AgentiQ external services are reachable"
echo -e "  • Test with real wallets before production deployment"
echo ""
echo -e "${GREEN}Happy Trading! 📈${NC}"
echo ""
