// api/handler.js
// 移除: const fetch = require('node-fetch'); // Vercel 支持 node-fetch 或原生 fetch (如果环境支持)
// 直接使用全局的 fetch API

// 定义远程 urls.json 文件的 URL
const githubUrlsJsonUrl = 'https://raw.githubusercontent.com/wobuhui666/1111/refs/heads/main/urls.json';

// 一个异步函数，用于从远程 URL 获取并解析 urls.json
async function fetchApkUrls() {
  console.log(`尝试从 ${githubUrlsJsonUrl} 获取 APK URL 列表...`);
  try {
    // 直接使用全局的 fetch
    const response = await fetch(githubUrlsJsonUrl);

    if (!response.ok) {
      // 如果 HTTP 状态码不是 2xx
      console.error(`获取 APK URL 列表失败: HTTP 状态码 ${response.status} ${response.statusText}`);
      // 抛出错误，让调用者（handler）处理
      throw new Error(`Failed to fetch APK URLs: HTTP status ${response.status}`);
    }

    const data = await response.json();
    console.log('成功获取并解析 APK URL 列表。');
    return data;

  } catch (error) {
    // 捕获网络错误或 JSON 解析错误
    console.error('获取或解析 APK URL 列表时发生错误:', error);
    // 重新抛出错误，让 handler 处理
    throw error;
  }
}

// 在函数实例启动时（或保持活跃时）异步加载 APK URL 列表
let apkUrlsPromise = fetchApkUrls();


module.exports = async (req, res) => {
  // 从请求参数中获取文件名 (通过 vercel.json 的重写规则传递过来)
  const { filename } = req.query;

  if (!filename) {
    // 如果没有文件名，返回 400 错误
    res.status(400).send('Bad Request: Missing filename');
    return;
  }

  console.log(`收到对文件名的请求: ${filename}`);

  if (filename === 'leanback.json') {
    // 处理 leanback.json 请求 (仍然直接从其自己的 GitHub URL 获取)
    const githubRawUrl = 'https://raw.githubusercontent.com/wobuhui666/1111/refs/heads/main/leanback.json';
    try {
      // 直接使用全局的 fetch
      const response = await fetch(githubRawUrl);

      if (!response.ok) {
        // 如果 GitHub 返回非 2xx 状态码
        res.status(response.status).send(`从 GitHub 获取 ${filename} 失败: ${response.statusText}`);
        console.error(`无法获取 ${githubRawUrl}: ${response.status}`);
        return;
      }

      const jsonContent = await response.text(); // 获取文本内容
      res.setHeader('Content-Type', 'application/json'); // 设置正确的 Content-Type
      res.status(200).send(jsonContent); // 返回内容
      console.log(`成功返回 ${filename} 内容`);

    } catch (error) {
      // 捕获 fetch 过程中的错误 (网络问题等)
      console.error(`获取 ${githubRawUrl} 时发生错误:`, error);
      res.status(500).send(`Internal Server Error: 无法获取 ${filename}`);
    }

  } else if (filename.endsWith('.apk')) {
    // 处理 .apk 文件请求 (需要重定向)
    let apkUrls;
    try {
      // 等待获取 apkUrlsPromise 的结果
      apkUrls = await apkUrlsPromise;
    } catch (error) {
      // 如果获取 urls.json 失败
      console.error("无法获取 APK URL 列表，可能由于远程文件加载失败。", error);
      res.status(500).send("Internal Server Error: Could not load APK URL data.");
      return;
    }

    // 检查是否成功获取了 apkUrls 数据并且其中包含请求的文件名
    if (apkUrls && typeof apkUrls === 'object' && apkUrls[filename]) {
      const redirectUrl = apkUrls[filename];
      console.log(`重定向 ${filename} 到 ${redirectUrl}`);
      res.setHeader('Location', redirectUrl); // 设置重定向目标 URL
      res.status(302).end(); // 返回 302 临时重定向状态码并结束响应
    } else {
      // 如果获取到的数据中没有对应的文件名，或者获取数据本身有问题
      console.warn(`获取的 URL 数据中未找到 APK 文件名: ${filename}`);
      res.status(404).send('Not Found');
    }
  } else {
    // 处理 /apk/release/ 下的其他未知请求
    console.warn(`/apk/release/ 下请求了不受支持的文件名: ${filename}`);
    res.status(404).send('Not Found');
  }
};
