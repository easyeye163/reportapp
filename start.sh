#!/bin/bash
# =============================================
#   福建港航船舶报告编制系统 - 一键启动脚本
# =============================================

set -e
cd "$(dirname "$0")"

echo "========================================"
echo "  福建港航船舶报告编制系统"
echo "  启动中..."
echo "========================================"

# ---- 1. 后端 ----
echo ""
echo "[1/4] 安装后端依赖..."
cd reportapp-api && npm install --production 2>&1 | tail -1

echo "[2/4] 初始化数据库..."
node db/init.js 2>&1 | grep -E "Seeding|created|completed"

echo "[3/4] 启动后端服务 (端口 4000)..."
node server.js &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"
cd ..

# ---- 2. 前端 ----
echo "[4/4] 启动前端开发服务 (端口 5173)..."
cd reportapp-frontend
if [ ! -d "node_modules" ]; then
  npm install 2>&1 | tail -1
fi
npx vite --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"
cd ..

# ---- 3. 等待启动 ----
sleep 3

echo ""
echo "========================================"
echo "  启动完成!"
echo "========================================"
echo ""
echo "  前端地址: http://localhost:5173"
echo "  后端地址: http://localhost:4000"
echo "  API文档:  http://localhost:4000/api"
echo ""
echo "  测试账号:"
echo "    管理员:   13800138001 / 123456"
echo "    工程师:   13800138002 / 123456"
echo "    主管:     13800138003 / 123456"
echo "    总工程师: 13800138004 / 123456"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "========================================"

# 捕获退出信号
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
