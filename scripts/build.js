const fs = require('fs');
const path = require('path');
const GitHubConverter = require('./converter');

// 递归复制文件夹（静态资源）
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 生成首页
function generateHomePage(articles, outputDir) {
  const homepageTemplate = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DSE中文指定篇章學習平台</title>
    <link rel="stylesheet" href="assets/css/main.css">
    <style>
        body { font-family: 'Noto Sans TC', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; text-align: center; margin: 30px 0; }
        .article-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .article-card { border: 1px solid #eee; border-radius: 8px; padding: 20px; transition: box-shadow 0.3s; }
        .article-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .article-card h3 { color: #3498db; margin-bottom: 10px; }
        .article-card a { text-decoration: none; color: inherit; }
        .article-card .meta { color: #666; font-size: 0.9em; margin: 10px 0; }
        .btn { display: inline-block; padding: 8px 16px; background: #3498db; color: white; border-radius: 4px; text-decoration: none; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>DSE中文指定篇章學習平台</h1>
    <div class="article-list">
        {{ARTICLES}}
    </div>
    <footer style="text-align: center; margin-top: 50px; color: #666;">
        <p>© 2026 DSE中文學習平台 | 基於GitHub Pages構建</p>
    </footer>
</body>
</html>
  `;
  
  // 生成文章卡片HTML
  const articlesHtml = articles.map(article => `
    <div class="article-card">
      <h3><a href="${article.filename}">${article.title}</a></h3>
      <div class="meta">
        <p>作者：${article.author}</p>
        <p>更新：${article.date}</p>
      </div>
      <a href="${article.filename}" class="btn">查看詳細</a>
    </div>
  `).join('\n');
  
  // 填充模板
  const homepage = homepageTemplate.replace('{{ARTICLES}}', articlesHtml);
  fs.writeFileSync(path.join(outputDir, 'index.html'), homepage);
  console.log('✅ 生成首頁');
}

// 生成文章索引（用于搜索）
function generateArticleIndex(articles, outputDir) {
  const index = {
    total: articles.length,
    articles: articles,
    updated: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'article-index.json'),
    JSON.stringify(index, null, 2)
  );
  console.log('✅ 生成文章索引');
}

// 主构建函数
async function buildAll() {
  console.log('🚀 開始構建DSE中文學習平台...');
  
  const converter = new GitHubConverter();
  const articlesDir = './articles';
  const outputDir = './docs';
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 复制静态资源（CSS/JS/图片）
  copyAssets();
  
  // 获取所有Markdown文章
  const mdFiles = fs.readdirSync(articlesDir)
    .filter(file => file.endsWith('.md') && !file.startsWith('.'));
  
  const articles = [];
  
  // 转换每篇文章
  for (const file of mdFiles) {
    const inputPath = path.join(articlesDir, file);
    const articleInfo = converter.convert(inputPath, outputDir);
    articles.push(articleInfo);
  }
  
  // 生成首页和索引
  generateHomePage(articles, outputDir);
  generateArticleIndex(articles, outputDir);
  
  console.log(`🎉 構建完成！共生成 ${articles.length} 篇文章`);
}

// 复制静态资源
function copyAssets() {
  const assetsDir = './assets';
  const outputAssetsDir = './docs/assets';
  
  if (fs.existsSync(assetsDir)) {
    // 删除旧资源
    if (fs.existsSync(outputAssetsDir)) {
      fs.rmSync(outputAssetsDir, { recursive: true, force: true });
    }
    // 复制新资源
    copyDir(assetsDir, outputAssetsDir);
    console.log('✅ 複製靜態資源完成');
  } else {
    console.log('ℹ️ 未找到assets文件夾，跳過資源複製');
  }
}

// 执行构建
buildAll().catch(err => {
  console.error('❌ 構建失敗：', err.message);
  process.exit(1);
});
