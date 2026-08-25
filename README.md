# Anne小富婆CRM

Anne Wealth CRM 是面向外贸包装业务的客户、产品、供应商、项目、订单与利润管理系统。

## 已落地能力

- Supabase Auth 登录、SSR 会话保护与管理员种子账号创建。
- 香槟金、米白和深墨绿色品牌后台；响应式主布局和完整导航。
- 客户与产品真实查询、新增、筛选、软删除。
- 项目、任务、供应商、订单与财务数据库列表。
- 产品多供应商、报价版本、阶梯价格、文件、收藏、最近查看和项目推荐数据模型。
- 订单产品及价格快照、应收、应付、成本和数据库自动利润字段。
- 报价到期状态刷新与系统通知 RPC，可由 Vercel Cron 每日上午 9 点调用。
- XLSX/CSV 浏览器端解析和数据预览入口。
- RLS、对象存储私有桶、索引、报价后 3 天自动任务触发器。
- 虚构演示种子：20 客户、30 联系人、15 项目、30 跟进、20 任务、10 供应商、50 产品、每产品 1–3 个供应商与多档报价。

## Windows 本地启动

### 推荐：本地数据库模式（个人使用）

项目默认支持嵌入式 SQLite，不需要注册 Supabase。首次启动会在 `data/anne-crm.db` 创建本地数据库和演示数据。管理员邮箱、密码及会话密钥配置在不会提交到 Git 的 `.env.local`：

```env
APP_MODE=local
LOCAL_ADMIN_EMAIL=anne@example.com
LOCAL_ADMIN_PASSWORD=设置你自己的强密码
LOCAL_SESSION_SECRET=设置一个长随机字符串
```

运行 `pnpm dev` 后直接登录即可。`data/` 已被 Git 忽略，请自行定期备份数据库文件。

### Supabase 模式（团队协作或云端部署）

1. 安装 Node.js 20+ 与 pnpm。
2. 在 Supabase 创建项目，在 SQL Editor 按文件名顺序执行 `supabase/migrations` 中的 SQL，或用 Supabase CLI 执行 `supabase db push`。
3. 复制环境变量：`Copy-Item .env.example .env.local`，填写 Supabase URL、anon key、service role key、管理员邮箱与强密码。
4. 安装依赖并创建演示数据：

```powershell
pnpm install
pnpm db:seed
pnpm dev
```

5. 打开 `http://localhost:3000`，使用 `.env.local` 中的 `SEED_ADMIN_EMAIL` 和 `SEED_ADMIN_PASSWORD` 登录。密码不会写入数据库迁移、种子文件或 Git。

## Supabase 配置

- Authentication > URL Configuration：本地 Site URL 设为 `http://localhost:3000`，生产环境改为 Vercel 域名。
- 执行两份迁移后将创建业务表、RLS、触发器及私有 `product-files` Storage bucket。
- `SUPABASE_SERVICE_ROLE_KEY` 只能配置在服务端环境，绝不能加 `NEXT_PUBLIC_` 前缀。
- 首个管理员由 `pnpm db:seed` 通过 Admin API 创建；后续用户应由管理员邀请，并设置 `profiles.role`。

## Vercel 部署

1. 将仓库连接 Vercel，框架选择 Next.js。
2. 配置 `.env.example` 中除本地 URL 外的全部生产变量，`NEXT_PUBLIC_APP_URL` 设为生产域名。
3. Build Command 使用 `pnpm build`。
4. 部署前先向生产 Supabase 应用迁移并运行一次种子（也可以只创建管理员、不保留演示业务数据）。
5. 在 Vercel Cron 每日北京时间 09:00 调用 `/api/cron/reminders`，Header 使用 `Authorization: Bearer <CRON_SECRET>`。Vercel Cron 默认按 UTC，需设为 `0 1 * * *`。

## 质量命令

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 目录

- `src/app/(crm)`：受保护的 CRM 页面。
- `src/app/login`：登录与退出。
- `src/app/api/cron`：提醒任务入口。
- `src/components`：品牌布局和复用组件。
- `src/lib`：Supabase、金额计算与工具函数。
- `supabase/migrations`：数据库迁移、权限与提醒函数。
- `scripts/seed.mjs`：管理员与演示数据创建。
- `CRM阶段1-产品资料库与供应商报价管理设计.md`：确认的阶段 1 设计基线。

## 当前开发边界

当前版本是一条可运行的 CRM 纵向基础版本。客户和产品具备真实 CRUD；其余核心实体已完成数据库和查询页。专用的供应商报价录入器、项目转订单事务、完整导入写入/重复裁决、文件上传 UI、全量编辑表单与 Playwright 流程仍需后续迭代完成，不能将现有基础页等同于全部需求已经交付。
