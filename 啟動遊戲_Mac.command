#!/bin/bash
cd "$(dirname "$0")"
echo "正在啟動騎咧走（關掉這個視窗就會停止）..."
(sleep 1; open "http://localhost:8000/index.html") &
python3 -m http.server 8000
