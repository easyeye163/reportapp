# OnlyOffice 在线文档编辑器集成说明

## 概述

本系统集成了 OnlyOffice Document Server，为报告编制提供专业的在线文档编辑能力。

**核心能力：**
- 📝 完整的 Word 文档在线编辑（格式、字体、表格、图片混排）
- 📋 自动根据报告类型生成初始文档结构（已填入已有内容）
- 💾 编辑内容自动保存回服务端
- 📥 支持导入已有 .docx 模板
- 👥 多人协同编辑
- 🔄 与原有表单编辑模式可自由切换

## 快速部署

### 方式一：Docker 一键部署（推荐）

```bash
# 启动 OnlyOffice Document Server
docker compose -f docker-compose.onlyoffice.yml up -d

# 等待服务就绪（首次启动约需1-2分钟）
docker compose -f docker-compose.onlyoffice.yml logs -f
```

启动后访问 `http://your-server:8080` 验证是否正常。

### 方式二：手动安装 OnlyOffice

参考官方文档：https://helpcenter.onlyoffice.com/installation/docs-community-install-docker.aspx

## 系统配置

### 环境变量

在后端服务启动前设置以下环境变量：

```bash
# OnlyOffice Document Server 地址
export ONLYOFFICE_URL=http://localhost:8080

# 当前系统对外可访问地址（OnlyOffice 回调用，必须为外网可访问地址）
export CALLBACK_BASE_URL=http://your-api-server:4000
```

或创建 `.env` 文件（参考 `.env.example`）。

### 生产环境 Nginx 配置

如果 OnlyOffice 和系统部署在同一台服务器，建议通过 Nginx 反向代理：

```nginx
# OnlyOffice Document Server
server {
    listen 8081;
    server_name your-domain.com;

    # 注意：必须支持 WebSocket
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }
}
```

## 使用说明

### 进入文档编辑

1. 在"报告编制"页面编辑报告时，点击顶部 **「文档编辑」** 按钮
2. 或在侧边栏直接点击 **「文档编辑」** 菜单

### 文档自动生成

首次进入文档编辑时，系统会根据报告类型自动生成 .docx 文件，包含：
- 报告标题和编号
- 根据报告类型预设的章节结构
- 已在表单中填写的内容会自动填入对应章节

### 切换编辑模式

- **文档编辑**：完整的 Word 编辑体验，支持复杂排版
- **表单编辑**：结构化表单填写，适合标准化内容录入

两种模式的数据独立存储，可按需切换。

### 导入 Word 模板

如果已有标准的 .docx 报告模板，可直接导入：
1. 将模板文件复制到 `reportapp-api/uploads/onlyoffice/report_{报告ID}.docx`
2. 刷新文档编辑页面即可加载

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/onlyoffice/config/:reportId` | GET | 获取编辑器配置 |
| `/api/onlyoffice/document/:reportId` | GET | 获取文档文件（OnlyOffice 下载用） |
| `/api/onlyoffice/callback` | POST | OnlyOffice 保存回调 |
| `/api/onlyoffice/status` | GET | 检查 OnlyOffice 服务状态 |
| `/api/onlyoffice/forcesave/:reportId` | POST | 手动触发强制保存 |

## 常见问题

### Q: OnlyOffice 启动后页面一直显示"加载中"？
A: 首次启动需要初始化，等待1-2分钟。可通过 `docker logs reportapp-onlyoffice` 查看进度。

### Q: 编辑器显示"文档无法打开"？
A: 检查 `CALLBACK_BASE_URL` 是否配置正确，OnlyOffice 需要能访问到该地址。

### Q: 如何自定义文档模板？
A: 替换 `reportapp-api/uploads/onlyoffice/report_{ID}.docx` 文件即可。系统不会覆盖已存在的文档文件。

### Q: 社区版有什么限制？
A: 社区版支持最多 20 个并发连接，对于中小团队完全够用。如需更大规模，可考虑企业版。
