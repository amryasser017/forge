#!/usr/bin/env bash
# Starts a throw-away "mini Supabase" for integration tests: Postgres 16 + PostgREST, with the same /rest/v1 prefix
# supabase-js expects. Linux only. Usage:  POSTGREST=/path/to/postgrest ./e2e/setup-local-stack.sh
# Prints the env vars to export before `npm run build && npm start`.
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/var/tmp/trio-pg}
PGPORT=${PGPORT:-54329}
POSTGREST=${POSTGREST:?Set POSTGREST to the path of the postgrest binary (https://github.com/PostgREST/postgrest/releases)}
JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"
HERE="$(cd "$(dirname "$0")" && pwd)"
RUN_AS=""; [ "$(id -u)" = "0" ] && RUN_AS="su postgres -c"
run() { if [ -n "$RUN_AS" ]; then $RUN_AS "$*"; else bash -c "$*"; fi; }

mkdir -p "$PGDATA"; [ -n "$RUN_AS" ] && chown postgres:postgres "$PGDATA"
[ -f "$PGDATA/data/PG_VERSION" ] || run "$PGBIN/initdb -D $PGDATA/data -A trust -U postgres >/dev/null"
run "$PGBIN/pg_ctl -D $PGDATA/data -o '-p $PGPORT -k $PGDATA' -l $PGDATA/log start" || true
sleep 2
P="psql -h $PGDATA -p $PGPORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists trio" -c "create database trio"
$P -d trio -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator login noinherit; grant anon, authenticated, service_role to authenticator;" || true
for f in "$HERE"/../supabase/migrations/0001_schema.sql "$HERE"/../supabase/migrations/0003_seed.sql; do $P -d trio -f "$f"; done
$P -d trio -c "grant usage on schema public to service_role, anon, authenticated; grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role; grant execute on all functions in schema public to service_role;"

sed "s#/var/tmp/trio-pg#$PGDATA#; s#54329#$PGPORT#" "$HERE/pgrst.conf" > "$PGDATA/pgrst.conf"
nohup "$POSTGREST" "$PGDATA/pgrst.conf" > "$PGDATA/postgrest.log" 2>&1 &
nohup node "$HERE/proxy.mjs" > "$PGDATA/proxy.log" 2>&1 &
sleep 2
JWT=$(cd "$HERE/.." && node -e "import('jose').then(async({SignJWT})=>{console.log(await new SignJWT({role:'service_role'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('30d').sign(new TextEncoder().encode('$JWT_SECRET')))})")
cat <<ENV
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=$JWT
export GATE_PASSWORD=e2e-test-password
export SESSION_SECRET=local-test-session-secret-0123456789abcdef
export APP_TIMEZONE=Africa/Cairo
# optional, to exercise the AI paths against the mock:  node e2e/mock-ai.mjs &
# export ANTHROPIC_API_KEY=test-key ANTHROPIC_BASE_URL=http://localhost:54400
ENV
