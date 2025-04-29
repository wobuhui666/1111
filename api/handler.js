// api/handler.js
// 移除: const fetch = require('node-fetch'); // 如果之前移除了就不用管这行
// 直接使用全局的 fetch API

// 定义远程 urls.json 文件的 URL
const githubUrlsJsonUrl = 'https://raw.githubusercontent.com/wobuhui666/1111/refs/heads/main/urls.json';

// 定义缓存时间和缓存变量 (单位：毫秒)
const CACHE_DURATION = 5 * 60 * 1000; // 例如：缓存 5 分钟
let cachedApkUrls = null;
let lastFetchTimestamp = 0;

// 移除外部的 apkUrlsPromise = fetchApkUrls();


module.exports = async (req, res) => {
  const { filename } = req.query;

  if (!filename) {
    res.status(400).send('Bad Request: Missing filename');
    return;
  }

  console.log(`收到对文件名的请求: ${filename}`);

  if (filename === 'leanback.json') {
    // 处理 leanback.json 请求 (仍然直接从其自己的 GitHub URL 获取)
    const githubRawUrl = 'https://raw.githubusercontent.com/wobuhui666/1111/refs/heads/main/leanback.json';
    try {
      const response = await fetch(githubRawUrl);

      if (!response.ok) {
        res.status(response.status).send(`从 GitHub 获取 ${filename} 失败: ${response.statusText}`);
        console.error(`无法获取 ${githubRawUrl}: ${response.status}`);
        return;
      }

      const jsonContent = await response.text();
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(jsonContent);
      console.log(`成功返回 ${filename} 内容`);

    } catch (error) {
      console.error(`获取 ${githubRawUrl} 时发生错误:`, error);
      res.status(500).send(`Internal Server Error: 无法获取 ${filename}`);
    }

  } else if (filename.endsWith('.apk')) {
    // 处理 .apk 文件请求 (需要重定向)

    const now = Date.now();
    let currentApkUrls = cachedApkUrls; // 先使用缓存的数据

    // 检查缓存是否过期或者是否从未加载过
    if (currentApkUrls === null || (now - lastFetchTimestamp > CACHE_DURATION)) {
      console.log(`缓存过期或未加载，尝试从 ${githubUrlsJsonUrl} 获取最新的 APK URL 列表...`);
      try {
        const response = await fetch(githubUrlsJsonUrl);

        if (!response.ok) {
          console.error(`获取 APK URL 列表失败: HTTP 状态码 ${response.status} ${response.statusText}`);
          // 如果获取失败，继续使用旧缓存 (如果存在的话)，或者返回错误
          if (cachedApkUrls === null) {
             // 如果没有旧缓存，则返回错误
             res.status(500).send("Internal Server Error: Could not load or parse APK URL data from source.");
             return;
          } else {
             // 如果有旧缓存，则日志警告，继续使用旧缓存
             console.warn("获取最新 APK URL 列表失败，继续使用旧缓存数据。");
             currentApkUrls = cachedApkUrls; // 确保使用旧缓存
          }
        } else {
            // 获取成功，更新缓存
            currentApkUrls = await response.json();
            cachedApkUrls = currentApkUrls; // 更新全局缓存变量
            lastFetchTimestamp = now; // 更新上次获取时间
            console.log('成功获取并更新 APK URL 列表缓存。');
        }

      } catch (error) {
        console.error('获取或解析 APK URL 列表时发生错误:', error);
         // 如果获取失败，继续使用旧缓存 (如果存在的话)，或者返回错误
        if (cachedApkUrls === null) {
           // 如果没有旧缓存，则返回错误
           res.status(500).send("Internal Server Error: Could not load or parse APK URL data.");
           return;
        } else {
           // 如果有旧缓存，则日志警告，继续使用旧缓存
           console.warn("获取最新 APK URL 列表失败，继续使用旧缓存数据。");
           currentApkUrls = cachedApkUrls; // 确保使用旧缓存
        }
      }
    } else {
        console.log('使用缓存的 APK URL 列表。');
        // 使用缓存数据，无需进行任何操作
    }


    // 检查获取到的 (或缓存的) apkUrls 数据是否包含请求的文件名
    if (currentApkUrls && typeof currentApkUrls === 'object' && currentApkUrls[filename]) {
      const redirectUrl = currentApkUrls[filename];
      console.log(`重定向 ${filename} 到 ${redirectUrl}`);
      res.setHeader('Location', redirectUrl);
      res.status(302).end();
    } else {
      console.warn(`获取的 URL 数据中未找到 APK 文件名: ${filename}`);
      res.status(404).send('Not Found');
    }
  } else {
    // 处理 /apk/release/ 下的其他未知请求
    console.warn(`/apk/release/ 下请求了不受支持的文件名: ${filename}`);
    res.status(404).send('Not Found');
  }
};
