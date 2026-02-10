// scripts/utils.js
const fs = require('fs');
const path = require('path');

class Utils {
  // 確保目錄存在
  static ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // 複製目錄
  static copyDirectory(src, dest) {
    this.ensureDirectory(dest);
    
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

  // 清理目錄
  static cleanDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true });
    }
    this.ensureDirectory(dirPath);
  }

  // 讀取JSON文件
  static readJSON(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`讀取JSON失敗: ${filePath}`, error);
      return null;
    }
  }

  // 寫入JSON文件
  static writeJSON(filePath, data) {
    try {
      const dirPath = path.dirname(filePath);
      this.ensureDirectory(dirPath);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`寫入JSON失敗: ${filePath}`, error);
      return false;
    }
  }

  // 提取文章摘要
  static extractExcerpt(text, maxLength = 150) {
    // 移除Markdown標記
    let plainText = text
      .replace(/[#*`\[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    // 截取指定長度
    if (plainText.length > maxLength) {
      plainText = plainText.substring(0, maxLength) + '...';
    }
    
    return plainText;
  }

  // 生成隨機ID
  static generateId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  // 格式化日期
  static formatDate(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  // 計算閱讀時間
  static calculateReadingTime(wordCount) {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes;
  }

  // 驗證文章元數據
  static validateArticleMeta(meta) {
    const required = ['id', 'title', 'author', 'source'];
    const missing = required.filter(field => !meta[field]);
    
    if (missing.length > 0) {
      throw new Error(`缺少必要元數據字段: ${missing.join(', ')}`);
    }
    
    // 默認值
    return {
      genre: '未知',
      tags: [],
      dse_focus: [],
      importance: 3,
      ...meta
    };
  }

  // 生成SEO標籤
  static generateSEOTags(article) {
    return {
      title: `${article.title} | DSE中文指定篇章`,
      description: `學習${article.title}，掌握DSE考核重點。`,
      keywords: [...article.tags, 'DSE中文', '指定篇章', '學習平台'].join(', '),
      ogImage: `https://example.com/assets/images/${article.id}.jpg`,
      canonical: `https://example.com/${article.id}.html`
    };
  }

  // 壓縮HTML
  static minifyHTML(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  // 生成文章統計
  static generateArticleStats(content) {
    const words = content.split(/\s+/).length;
    const paragraphs = (content.match(/\n\s*\n/g) || []).length + 1;
    const headings = (content.match(/^#{1,6}\s/gm) || []).length;
    
    return {
      words,
      paragraphs,
      headings,
      readingTime: this.calculateReadingTime(words)
    };
  }
}

module.exports = Utils;
