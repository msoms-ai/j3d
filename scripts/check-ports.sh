#!/usr/bin/env bash
# ==============================================================================
# J3D Platform — Remote Server Port & Container Inspection Utility
# Target Server: 135.181.209.123 (retrorize_ssh_user)
# ==============================================================================

set -euo pipefail

SERVER_USER="retrorize_ssh_user"
SERVER_HOST="135.181.209.123"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}   J3D Platform :: Server Port & Container Inspector                ${NC}"
echo -e "${CYAN}   Target: ${SERVER_USER}@${SERVER_HOST}                             ${NC}"
echo -e "${CYAN}====================================================================${NC}\n"

echo -e "${YELLOW}[1/3] Checking Running Docker Containers...${NC}"
ssh -o BatchMode=yes "${SERVER_USER}@${SERVER_HOST}" "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" || {
    echo -e "${RED}Error: Failed to connect or query docker. Check your SSH key.${NC}"
    exit 1
}

echo -e "\n${YELLOW}[2/3] Checking Specific J3D Target Ports on Server...${NC}"
ssh -o BatchMode=yes "${SERVER_USER}@${SERVER_HOST}" "python3 -c \"
import socket

ports = {
    'Web (J3D Recommended)': [3050, 3100, 3000],
    'API (J3D Recommended)': [4000, 4040, 4100],
    'Postgres (Host bind)': [5433, 5434, 5432],
    'Redis (Host bind)': [6381, 6382, 6379, 6380],
    'MinIO S3 API': [9000, 9100, 9080],
    'MinIO Console': [9001, 9101, 9090],
    'Mailpit SMTP': [1025, 1026],
    'Mailpit Web UI': [8025, 8026]
}

def is_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(('127.0.0.1', port)) == 0

print(f'{\\\"Service\\\":24} | {\\\"Port\\\":5} | {\\\"Status\\\"}')
print('-' * 45)
for svc, plist in ports.items():
    for p in plist:
        used = is_open(p)
        status = '\033[0;31mOCCUPIED (Conflict)\033[0m' if used else '\033[0;32mFREE (Available)\033[0m'
        print(f'{svc:24} | {p:<5} | {status}')
\""

echo -e "\n${YELLOW}[3/3] Summary of Recommended Ports for J3D Platform on this Server:${NC}"
echo -e "  - ${GREEN}Web Frontend:${NC}    Port 3050 (or 3100) -> mapped to container 3000"
echo -e "  - ${GREEN}NestJS API:${NC}      Port 4000 -> mapped to container 4000"
echo -e "  - ${GREEN}PostgreSQL:${NC}      Port 5433 -> mapped to container 5432 (5432 is in use by host/retrorize)"
echo -e "  - ${GREEN}Redis:${NC}           Port 6381 -> mapped to container 6379 (6379 & 6380 are in use)"
echo -e "  - ${GREEN}MinIO S3:${NC}        Port 9000 -> mapped to container 9000 (FREE)"
echo -e "  - ${GREEN}MinIO Console:${NC}   Port 9001 -> mapped to container 9001 (FREE)"
echo -e "  - ${GREEN}Mailpit Web UI:${NC}  Port 8025 -> mapped to container 8025 (FREE)"
echo -e "\n${CYAN}Done! To run this anytime in the future, just run:${NC} ./scripts/check-ports.sh\n"
