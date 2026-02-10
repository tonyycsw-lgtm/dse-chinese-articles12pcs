const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

class GitHubConverter {
  constructor() {
    // 替换为你的 GitHub Pages 地址
    this.baseUrl = 'https://tonyycsw-lgtm.github.io/dse-chinese-articles12pcs';
  }
  
  // 解析自定义标签（@meta/@quiz/@memory-card）
  parseCustomTags(markdown) {
    // 提取 @meta 元信息
    const metaMatch = markdown.match(/@meta\s*(\{[\s\S]*?\})/);
    const meta = metaMatch ? JSON.parse(metaMatch[1]) : {};
    
    // 解析 @quiz 生成測驗HTML
    markdown = markdown.replace(/@quiz\s*(\{[\s\S]*?\})/g, (match, json) => {
      try {
        const quiz = JSON.parse(json);
        return this.renderQuiz(quiz);
      } catch (e) {
        return `<!-- 測驗解析錯誤: ${e.message} -->`;
      }
    });
    
    // 解析 @memory-card 生成記憶卡片HTML
    markdown = markdown.replace(/@memory-card\s*(\{[\s\S]*?\})/g, (match, json) => {
      try {
        const card = JSON.parse(json);
        return this.renderMemoryCard(card);
      } catch (e) {
        return `<!-- 記憶卡片解析錯誤: ${e.message} -->`;
      }
    });
    
    // 移除 @meta 标签（避免渲染到页面）
    markdown = markdown.replace(/@meta\s*\{[\s\S]*?\}/, '');
    
    return { meta, content: markdown };
  }
  
  // 生成測驗HTML
  renderQuiz(quiz) {
    return `
      <div class="quiz-question">
        <h3>📝 測驗題目：${quiz.question}</h3>
        <div class="quiz-options">
          ${quiz.options.map((option, index) => `
            <div class="quiz-option" style="margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              ${String.fromCharCode(65 + index)}. ${option}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // 生成記憶卡片HTML
  renderMemoryCard(card) {
    return `
      <div class="memory-card">
        <div class="memory-card-inner">
          <div class="memory-card-front">
            <h4>${card.frontTitle}</h4>
            <p>${card.frontContent}</p>
          </div>
          <div class="memory-card-back">
            <h4>${card.backTitle}</h4>
            <p>${card.backContent.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  // 转换图片路径（适配GitHub Pages）
  convertImagePaths(markdown) {
    return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
      (match, alt, src) => {
        if (src.startsWith('http')) return match;
        if (src.startsWith('/')) src = src.substring(1);
        return `![${alt}](${this.baseUrl}/assets/images/${src})`;
      }
    );
  }
  
  // 核心转换方法：Markdown → HTML（填充模板）
  convert(markdownFile, outputDir) {
    const markdown = fs.readFileSync(markdownFile, 'utf8');
    const { meta, content } = this.parseCustomTags(markdown);
    
    // 读取HTML模板
    const template = fs.readFileSync('templates/article.html', 'utf8');
    
    // Markdown转HTML
    const htmlContent = marked(this.convertImagePaths(content));
    
    // 填充模板变量
    const finalHtml = template
      .replace('{{TITLE}}', meta.title || '未命名文章')
      .replace('{{AUTHOR}}', meta.author || '未知作者')
      .replace('{{CONTENT}}', htmlContent)
      .replace('{{ARTICLE_ID}}', meta.id || '')
      .replace('{{DATE}}', meta.date || new Date().toISOString().split('T')[0])
      .replace(/{{BASE_URL}}/g, this.baseUrl);
    
    // 生成输出文件
    const filename = path.basename(markdownFile, '.md') + '.html';
    const outputPath = path.join(outputDir, filename);
    
    fs.writeFileSync(outputPath, finalHtml);
    console.log(`✅ 生成文章：${filename}`);
    
    return {
      id: meta.id,
      title: meta.title,
      author: meta.author,
      filename: filename,
      date: meta.date || new Date().toISOString().split('T')[0]
    };
  }
}

module.exports = GitHubConverter;
