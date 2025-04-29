// api/handler.js
const fetch = require('node-fetch'); // Vercel 支持 node-fetch 或原生 fetch (如果环境支持)
const path = require('path');
const fs = require('fs');

// 加载本地的 urls.json 文件
// __dirname 指向当前文件所在的目录 (api/)
const urlsFilePath = path.join(__dirname, '..', 'urls.json');
let apkUrls = {};
try {
    const urlsJsonString = fs.readFileSync(urlsFilePath, 'utf8');
    apkUrls = JSON.parse(urlsJsonString);
} catch (error) {
    console.error('Error loading urls.json:', error);
    // 在生产环境中，如果文件加载失败，后续查找会失败，导致404
}


module.exports = async (req, res) => {
  // 从请求参数中获取文件名 (通过 vercel.json 的重写规则传递过来)
  const { filename } = req.query;

  if (!filename) {
    // 如果没有文件名，返回 400 错误
    res.status(400).send('Bad Request: Missing filename');
    return;
  }

  console.log(`Received request for filename: ${filename}`);

  if (filename === 'leanback.json') {
    // 处理 leanback.json 请求
    const githubRawUrl = 'https://raw.githubusercontent.com/wobuhui666/1111/refs/heads/main/leanback.json';
    try {
      const response = await fetch(githubRawUrl);

      if (!response.ok) {
        // 如果 GitHub 返回非 2xx 状态码
        res.status(response.status).send(`Error fetching ${filename} from GitHub: ${response.statusText}`);
        console.error(`Failed to fetch ${githubRawUrl}: ${response.status}`);
        return;
      }

      const jsonContent = await response.text(); // 获取文本内容
      res.setHeader('Content-Type', 'application/json'); // 设置正确的 Content-Type
      res.status(200).send(jsonContent); // 返回内容
      console.log(`Successfully served ${filename}`);

    } catch (error) {
      // 捕获 fetch 过程中的错误 (网络问题等)
      console.error(`Error fetching ${githubRawUrl}:`, error);
      res.status(500).send(`Internal Server Error: Could not fetch ${filename}`);
    }

  } else if (filename.endsWith('.apk')) {
    // 处理 .apk 文件请求 (需要重定向)
    const redirectUrl = apkUrls[filename];

    if (redirectUrl) {
      // 如果 urls.json 中找到了对应的直链
      console.log(`Redirecting ${filename} to ${redirectUrl}`);
      res.setHeader('Location', redirectUrl); // 设置重定向目标 URL
      res.status(302).end(); // 返回 302 临时重定向状态码并结束响应
    } else {
      // 如果 urls.json 中没有对应的文件名
      console.warn(`APK filename not found in urls.json: ${filename}`);
      res.status(404).send('Not Found');
    }
  } else {
    // 处理其他未知的请求
    console.warn(`Unsupported filename requested: ${filename}`);
    res.status(404).send('Not Found');
  }
};
