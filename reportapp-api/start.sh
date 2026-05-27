#!/bin/bash
echo "======================================="
echo "  福建港航船舶报告编制系统"
echo "======================================="
echo ""

# 检查 node
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd "$(dirname "$0")"
npm install --silent 2>/dev/null
if [ ! -f db/reportapp.db ]; then
    echo "🗄️  初始化数据库..."
    node db/init.js
fi

# 安装前端依赖
FRONTEND_DIR="../reportapp-frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
    FRONTEND_DIR="$(dirname "$0")/../reportapp-frontend"
fi
if [ -d "$FRONTEND_DIR" ]; then
    echo "📦 安装前端依赖..."
    cd "$FRONTEND_DIR" && npm install --silent 2>/dev/null && cd -
fi

echo ""
echo "🚀 启动后端 API (端口 4000)..."
node server.js &
API_PID=$!

echo "🚀 启动前端 (端口 3000)..."
cd "$FRONTEND_DIR" 2>/dev/null && npx vite --port 3000 &
FRONTEND_PID=$!
cd - > /dev/null

echo ""
echo "======================================="
echo "  ✅ 系统已启动！"
echo "  📱 前端地址: http://localhost:3000"
echo "  🔌 API 地址: http://localhost:4000"
echo "======================================="
echo ""
echo "  测试账号:"
echo "  管理员: 13800138001 / 123456"
echo "  工程师: 13800138002 / 123456"
echo "  主  管: 13800138003 / 123456"
echo "  总工师: 13800138004 / 123456"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "======================================="

trap "kill $API_PID $FRONTEND_PID 2>/dev/null; echo '已停止'; exit" INT TERM
wait
