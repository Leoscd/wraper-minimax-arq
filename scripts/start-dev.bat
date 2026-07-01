@echo off
cd /d "D:\WRAPER-MINIMAX-ARQ"
set NEXT_TELEMETRY_DISABLED=1
call npm run dev > "D:\WRAPER-MINIMAX-ARQ\.dev-stdout.log" 2> "D:\WRAPER-MINIMAX-ARQ\.dev-stderr.log"