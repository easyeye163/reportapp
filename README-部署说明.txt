================================================================================
  福建港航船舶报告编制系统 - 部署说明
================================================================================

一、环境要求
  - Node.js >= 18
  - npm >= 9

二、快速启动（开发模式）

  1. 解压
     tar xzf reportapp-full.tar.gz
     cd reportapp-full

  2. 一键启动（前后端同时）
     bash start.sh

  3. 打开浏览器访问
     http://localhost:5173

  4. 使用测试账号登录
     管理员:   13800138001 / 123456
     工程师:   13800138002 / 123456
     主管:     13800138003 / 123456
     总工程师: 13800138004 / 123456

三、手动启动（分别启动前后端）

  后端:
    cd reportapp-api
    npm install
    node db/init.js     # 初始化数据库（首次）
    node server.js      # 启动后端，端口 4000

  前端:
    cd reportapp-frontend
    npm install
    npx vite            # 启动前端，端口 5173

四、生产部署

  1. 构建前端
     cd reportapp-frontend
     npm run build      # 输出到 dist/ 目录

  2. 部署方式 A — 使用 Node.js 托管静态文件

     在 reportapp-api/server.js 中添加:
       app.use(express.static('../reportapp-frontend/dist'))
     
     启动后访问 http://localhost:4000 即可

  3. 部署方式 B — 使用 Nginx 反向代理

     nginx.conf:
       server {
           listen 80;
           server_name your-domain.com;

           # 前端静态文件
           location / {
               root /path/to/reportapp-frontend/dist;
               try_files $uri $uri/ /index.html;
           }

           # 后端API代理
           location /api {
               proxy_pass http://127.0.0.1:4000;
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
           }

           # 上传文件
           location /uploads {
               proxy_pass http://127.0.0.1:4000;
           }
       }

     启动后端: cd reportapp-api && node server.js
     启动Nginx: nginx -s reload

  4. 部署方式 C — 使用 PM2 守护进程

     npm install -g pm2
     pm2 start reportapp-api/server.js --name reportapp-api
     pm2 save
     pm2 startup

五、项目结构

  reportapp-full/
  ├── start.sh                  ← 一键启动脚本
  ├── reportapp-api/            ← 后端 (Express + SQLite)
  │   ├── server.js             ← 服务入口，端口 4000
  │   ├── db/init.js            ← 数据库初始化+种子数据
  │   ├── db/database.js        ← SQLite连接
  │   ├── middleware/auth.js     ← JWT认证中间件
  │   ├── routes/               ← API路由
  │   │   ├── auth.js           ← 登录认证
  │   │   ├── users.js          ← 用户管理+角色
  │   │   ├── frames.js         ← 框架模板
  │   │   ├── reports.js        ← 报告管理
  │   │   ├── reviews.js        ← 审核管理
  │   │   ├── cases.js          ← 案例+标准
  │   │   ├── archives.js       ← 档案管理
  │   │   ├── guides.js         ← 操作指南
  │   │   └── backups.js        ← 数据备份
  │   └── uploads/              ← 上传文件目录
  └── reportapp-frontend/       ← 前端 (Vue 3 + Vite)
      ├── src/
      │   ├── api/              ← API接口层（11个模块）
      │   ├── views/            ← 页面组件（11个页面）
      │   ├── stores/           ← Pinia状态管理
      │   ├── router/           ← 路由配置+守卫
      │   └── App.vue           ← 根组件
      ├── vite.config.js        ← Vite配置（含API代理）
      └── package.json

六、API总览 (50个端点)

  认证:     POST /api/auth/login
  用户:     GET/POST/PUT/DELETE /api/users, PUT /:id/status
  角色:     GET /api/users/roles, PUT /api/users/roles/:id
  框架:     GET/POST/PUT/DELETE /api/frames, GET /:id, POST /:id/copy
  报告:     GET/POST /api/reports, GET/PUT /api/reports/:id
            POST /:id/submit, POST /:id/withdraw
            GET /:id/export, POST /:id/images, PUT /:id/team
  审核:     GET /api/reviews, POST /api/reviews/:reportId
            POST /:reportId/sign, POST /:reportId/stamp
            GET/PUT /api/reviews/review-levels/:reportId
  案例:     GET/POST /api/cases/cases, DELETE /api/cases/:id
  标准:     GET/POST /api/cases/standards, PUT/DELETE /:id, PUT /:id/status
  档案:     GET /api/archives, GET /api/archives/:id/download
  指南:     GET/POST /api/guides
  备份:     GET/POST /api/backups, GET/PUT /api/backups/settings
            GET /:id/download, DELETE /:id
  健康检查: GET /api/health

七、注意事项

  1. 数据库使用 SQLite，文件在 reportapp-api/db/reportapp.db
  2. 首次启动务必执行 node db/init.js 初始化数据库
  3. 生产环境建议使用 PM2 + Nginx 部署
  4. 上传文件存储在 reportapp-api/uploads/ 目录
  5. JWT Token 有效期 7 天
