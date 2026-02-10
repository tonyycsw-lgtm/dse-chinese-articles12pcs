const fs = require('fs');
const path = require('path');
const ArticleConverter = require('./converter');

class SiteBuilder {
    constructor(config = {}) {
        this.config = {
            articlesDir: './articles',
            templatesDir: './templates',
            assetsDir: './assets',
            outputDir: './docs',
            baseUrl: 'https://tonyycsw-lgtm.github.io/dse-chinese-articles12pcs',
            ...config
        };
        
        this.converter = new ArticleConverter({
            baseUrl: this.config.baseUrl,
            templateDir: this.config.templatesDir,
            outputDir: this.config.outputDir,
            assetsDir: this.config.assetsDir
        });
        
        this.articles = [];
    }
    
    async build() {
        console.log('🚀 開始構建DSE中文學習平台...');
        
        try {
            // 清理輸出目錄
            this.cleanOutputDirectory();
            
            // 複製靜態資源
            this.copyAssets();
            
            // 構建文章
            await this.buildArticles();
            
            // 生成首頁
            this.generateHomePage();
            
            // 生成文章索引
            this.generateArticleIndex();
            
            // 生成搜索索引
            this.generateSearchIndex();
            
            // 生成Sitemap
            this.generateSitemap();
            
            console.log(`🎉 構建完成！共生成 ${this.articles.length} 篇文章`);
            console.log(`🌐 訪問地址: ${this.config.baseUrl}`);
            
        } catch (error) {
            console.error('❌ 構建失敗:', error);
            process.exit(1);
        }
    }
    
    cleanOutputDirectory() {
        const outputDir = this.config.outputDir;
        
        if (fs.existsSync(outputDir)) {
            console.log('🧹 清理輸出目錄...');
            fs.rmSync(outputDir, { recursive: true });
        }
        
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    copyAssets() {
        const assetsDir = this.config.assetsDir;
        const outputAssetsDir = path.join(this.config.outputDir, 'assets');
        
        if (fs.existsSync(assetsDir)) {
            console.log('📁 複製靜態資源...');
            this.copyDirectory(assetsDir, outputAssetsDir);
        }
        
        // 複製模板中的組件（如果有）
        const componentsDir = path.join(this.config.templatesDir, 'components');
        if (fs.existsSync(componentsDir)) {
            this.copyDirectory(componentsDir, path.join(outputAssetsDir, 'components'));
        }
    }
    
    copyDirectory(src, dest) {
        fs.mkdirSync(dest, { recursive: true });
        
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    
    async buildArticles() {
        const articlesDir = this.config.articlesDir;
        
        if (!fs.existsSync(articlesDir)) {
            console.log('📁 創建文章目錄...');
            fs.mkdirSync(articlesDir, { recursive: true });
            this.createSampleArticles();
        }
        
        // 獲取所有Markdown文件
        const files = fs.readdirSync(articlesDir)
            .filter(file => file.endsWith('.md') && !file.startsWith('_'))
            .sort();
        
        console.log(`📚 發現 ${files.length} 篇文章`);
        
        for (const file of files) {
            const filePath = path.join(articlesDir, file);
            const articleInfo = this.converter.convert(filePath);
            
            if (articleInfo) {
                this.articles.push(articleInfo);
            }
        }
        
        // 按標題排序
        this.articles.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'));
    }
    
    createSampleArticles() {
        console.log('📝 創建示例文章...');
        
        // 荀子《勤學》
        const xunziContent = `@meta
{
  "id": "xunzi-qinxue",
  "title": "荀子《勤學》",
  "author": "荀子（約公元前313-238年）",
  "source": "《荀子·勸學篇》節選",
  "genre": "議論文",
  "tags": ["儒家", "性惡論", "學習", "修身"],
  "dse_focus": ["比喻論證", "對比手法", "中心論點"]
}

# 荀子《勤學》

> 戰國末期儒家代表人物荀子的核心教育思想

## 核心思想

**「學不可以已」**——學習不能停止。這是全文的中心論點...

@quiz
{
  "question": "荀子為什麼用『青出於藍』和『冰寒於水』作為比喻？",
  "options": [
    {"text": "說明學習能使人超越原本的狀態", "correct": true},
    {"text": "說明藍草和水是學習的基本材料", "correct": false}
  ],
  "explanation": "這兩個比喻說明後天學習能使人改變和提高..."
}

@memory-card
{
  "front": {"title": "學不可以已", "content": "核心論點"},
  "back": {"title": "學習不能停止", "content": "強調終身學習的重要性..."}
}`;
        
        fs.writeFileSync(
            path.join(this.config.articlesDir, 'xunzi-qinxue.md'),
            xunziContent
        );
        
        // 孟子《仁義》
        const mengziContent = `@meta
{
  "id": "mengzi-renyi",
  "title": "孟子《論仁義》",
  "author": "孟子（約公元前372-289年）",
  "source": "《孟子》節選",
  "genre": "議論文",
  "tags": ["儒家", "性善論", "仁政", "民本"],
  "dse_focus": ["性善論", "仁政思想", "論證技巧"]
}

# 孟子《論仁義》

> 孟子性善論與仁政思想的經典論述

## 核心思想

**「性善論」**——孟子認為人性本善...`;
        
        fs.writeFileSync(
            path.join(this.config.articlesDir, 'mengzi-renyi.md'),
            mengziContent
        );
    }
    
    generateHomePage() {
        console.log('🏠 生成首頁...');
        
        const templatePath = path.join(this.config.templatesDir, 'home.html');
        let template = fs.readFileSync(templatePath, 'utf8');
        
        // 生成文章卡片
        const articlesHtml = this.articles.map(article => `
            <div class="article-card">
                <div class="article-card-header">
                    <span class="article-tag">${article.genre || '議論文'}</span>
                    <span class="dse-tag">DSE指定</span>
                </div>
                <h3><a href="${article.filename}">${article.title}</a></h3>
                <p class="article-author">作者：${article.author}</p>
                <p class="article-excerpt">${this.getExcerpt(article)}</p>
                <div class="article-footer">
                    <div class="article-tags">
                        ${article.tags ? article.tags.map(tag => 
                            `<span class="tag">${tag}</span>`
                        ).join('') : ''}
                    </div>
                    <a href="${article.filename}" class="btn">開始學習 <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `).join('\n');
        
        // 準備首頁變量
        const variables = {
            SITE_TITLE: 'DSE中文指定篇章學習平台',
            SITE_DESCRIPTION: '專為香港中學文憑考試（DSE）中文科設計的學習平台，涵蓋12篇指定篇章',
            ARTICLE_COUNT: this.articles.length,
            ARTICLES_HTML: articlesHtml,
            BASE_URL: this.config.baseUrl,
            BUILD_DATE: new Date().toLocaleDateString('zh-Hant')
        };
        
        // 填充模板
        let homepage = template;
        Object.keys(variables).forEach(key => {
            homepage = homepage.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
        });
        
        // 寫入首頁
        const outputPath = path.join(this.config.outputDir, 'index.html');
        fs.writeFileSync(outputPath, homepage);
        
        console.log('✅ 首頁生成完成');
    }
    
    getExcerpt(article, length = 100) {
        // 這裡可以從文章內容提取摘要
        // 暫時返回默認描述
        const descriptions = {
            'xunzi-qinxue': '荀子強調後天學習的重要性，提出「學不可以已」的核心觀點...',
            'mengzi-renyi': '孟子闡述性善論與仁政思想，強調「仁者愛人」的理念...'
        };
        
        return descriptions[article.id] || 
               `《${article.title}》是DSE中文科指定篇章，深入分析${article.author}的核心思想...`;
    }
    
    generateArticleIndex() {
        console.log('📋 生成文章索引...');
        
        const index = {
            site: {
                title: 'DSE中文指定篇章學習平台',
                description: '香港中學文憑考試中文科指定篇章學習資源',
                baseUrl: this.config.baseUrl,
                buildDate: new Date().toISOString(),
                articleCount: this.articles.length
            },
            articles: this.articles.map(article => ({
                id: article.id,
                title: article.title,
                author: article.author,
                filename: article.filename,
                genre: article.genre,
                tags: article.tags || [],
                dse_focus: article.dse_focus || [],
                date: article.date,
                url: `${this.config.baseUrl}/${article.filename}`
            }))
        };
        
        const indexPath = path.join(this.config.outputDir, 'articles.json');
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        
        console.log('✅ 文章索引生成完成');
    }
    
    generateSearchIndex() {
        console.log('🔍 生成搜索索引...');
        
        const searchIndex = this.articles.map(article => ({
            id: article.id,
            title: article.title,
            author: article.author,
            tags: article.tags || [],
            dse_focus: article.dse_focus || [],
            url: article.filename
        }));
        
        const searchPath = path.join(this.config.outputDir, 'search-index.json');
        fs.writeFileSync(searchPath, JSON.stringify(searchIndex, null, 2));
        
        console.log('✅ 搜索索引生成完成');
    }
    
    generateSitemap() {
        console.log('🗺️ 生成網站地圖...');
        
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${this.config.baseUrl}/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    
    ${this.articles.map(article => `
    <url>
        <loc>${this.config.baseUrl}/${article.filename}</loc>
        <lastmod>${article.date}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    `).join('\n')}
</urlset>`;
        
        const sitemapPath = path.join(this.config.outputDir, 'sitemap.xml');
        fs.writeFileSync(sitemapPath, sitemap);
        
        console.log('✅ 網站地圖生成完成');
    }
}

// 執行構建
async function main() {
    const builder = new SiteBuilder();
    await builder.build();
}

// 如果直接運行此腳本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = SiteBuilder;
