@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在啟動騎咧走（關掉這個視窗就會停止）...
start "" http://localhost:8000/index.html
python -m http.server 8000 2>nul || py -m http.server 8000 2>nul || (echo 找不到 Python，請改用 VS Code 的 Live Server 開啟 index.html & pause)
