# 皮肤专家 App（iOS / Android）

React Native + Expo 写的手机 App，一套代码同时支持 iPhone 和安卓。拍照或从相册选图后，App 把照片压缩到最长边 1568px，发给上一级目录里的分析服务（`../server.js`），再展示肤质、评分、问题和养护方案。AI 的 API key 只放在服务端，不会打包进 App。

## 在手机上试用（Expo Go）

1. 手机安装 **Expo Go**（App Store / 应用商店搜索）。
2. 在电脑上启动分析服务（上一级目录）：
   ```bash
   cd ..
   npm install
   npm run demo                               # 演示数据，不需要 key
   # 或 ANTHROPIC_API_KEY=sk-ant-... npm start  # 真实 AI 分析
   ```
3. 启动 App：
   ```bash
   cd mobile
   npm install
   cp .env.example .env    # 把地址改成电脑的局域网 IP，例如 http://192.168.1.10:3000
   npx expo start
   ```
4. 手机和电脑连同一个 Wi-Fi，用 Expo Go（安卓）或系统相机（iPhone）扫终端里的二维码。

## 打包成安装包

用 Expo 的 EAS 云端打包，不需要本地装 Xcode 或 Android Studio：

```bash
npx eas-cli@latest build --platform android   # 生成 APK/AAB
npx eas-cli@latest build --platform ios       # 需要苹果开发者账号
```

正式发布前，把分析服务部署到公网（HTTPS），并把 `.env` 里的 `EXPO_PUBLIC_API_URL` 改成那个地址。

## 代码结构

- `App.tsx`：主界面，拍照/选图、加载状态、错误提示
- `src/api.ts`：图片压缩和调用 `/api/analyze`
- `src/ResultView.tsx`：分析结果展示
- `src/theme.ts`：浅色/深色配色
- `app.json`：App 名称、包名、相机和相册权限说明
