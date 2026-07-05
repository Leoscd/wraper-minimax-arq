@echo off
cd /d "D:\WRAPER-MINIMAX-ARQ"
set NEXT_TELEMETRY_DISABLED=1
set PORT=3002
call npx next dev -p 3002 > "D:\WRAPER-MINIMAX-ARQ\.dev-stdout.log" 2> "D:\WRAPER-MINIMAX-ARQ\.dev-stderr.log"