# Anne CRM 免费本机通信桥接

桥接器只读取邮箱，不发送、删除、移动或归档邮件。每个邮箱文件夹使用 IMAP UID 游标，只处理首次启用前 24 小时及之后的新邮件；CRM 还会使用稳定来源标识再次去重。

## 已创建的本机私密文件

- `data/communication-bridge.json`：六个邮箱、IMAP 地址和文件夹配置。
- `data/communication-bridge-secrets.ps1`：云端同步密钥及六个邮箱的应用专用密码。该目录已被 Git 忽略。

## 需要 Anne 填写

在 `data/communication-bridge-secrets.ps1` 中填写六个邮箱的应用专用密码：

- Google Workspace：为两个 `skincarepkg.com` 账号开启两步验证并创建应用专用密码。
- Lark Mail：为三个 Lark 邮箱开启 IMAP，并使用邮箱客户端专用密码。
- 阿里企业邮箱：为 `anne@oceanpackagings.com` 开启 IMAP，并创建客户端专用密码。

不要填写网页登录密码；优先使用可单独撤销的应用专用密码。

## 验证与安装

先运行一次：

```powershell
& "scripts\start-communication-bridge.ps1"
```

确认六个邮箱均连接成功后，按 `Ctrl+C` 停止，再安装开机任务：

```powershell
& "scripts\install-communication-bridge.ps1"
```

默认每 5 分钟读取一次。首次同步只回看 24 小时，可在 `data/communication-bridge.json` 修改 `initialLookbackHours`。

## 尚未自动化的来源

- 来发信“小富婆”：需要其官方 API，或另行安装只读浏览器扩展。
- 两个 WhatsApp Business：CRM webhook 已具备，但仍需在 Meta Business 中填写 Phone Number ID、App Secret 和 Verify Token。
