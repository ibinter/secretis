#!/bin/bash
# Exécute tous les scénarios k6 et génère un rapport consolidé

BASE_URL="${BASE_URL:-http://localhost:8000}"
RESULTS_DIR="results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "Tests de charge SECRETIS — $(date)"
echo "Cible : $BASE_URL"
echo "Resultats : $RESULTS_DIR"

declare -A SCENARIOS=(
  ["01-login"]="Authentification"
  ["02-dashboard"]="Tableau de bord"
  ["03-agenda"]="Module Agenda"
  ["04-ged-upload"]="Upload GED"
  ["05-search"]="Recherche globale"
  ["06-websocket"]="WebSocket Reverb"
  ["07-payment-checkout"]="Paiement"
  ["08-visitors"]="Visiteurs"
  ["09-sara-ai"]="IA SARA"
  ["10-reports"]="Rapports"
  ["11-concurrent-users"]="Utilisateurs mixtes"
  ["12-audit-log"]="Journal d'audit"
  ["13-multitenancy-isolation"]="Isolation multi-tenant"
  ["14-subscription-expiry"]="Expiration licence"
  ["15-spike-test"]="Spike test"
)

PASSED=0
FAILED=0

for scenario in $(echo "${!SCENARIOS[@]}" | tr ' ' '\n' | sort); do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Scenario $scenario : ${SCENARIOS[$scenario]}"

  k6 run \
    --env BASE_URL="$BASE_URL" \
    --out json="$RESULTS_DIR/${scenario}.json" \
    --summary-export="$RESULTS_DIR/${scenario}_summary.json" \
    "scenarios/${scenario}.js"

  if [ $? -eq 0 ]; then
    echo "PASSED — ${SCENARIOS[$scenario]}"
    ((PASSED++))
  else
    echo "FAILED — ${SCENARIOS[$scenario]}"
    ((FAILED++))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESULTAT GLOBAL : $PASSED passes / $((PASSED + FAILED)) total"
echo "Resultats complets : $RESULTS_DIR"

[ $FAILED -eq 0 ] && exit 0 || exit 1
