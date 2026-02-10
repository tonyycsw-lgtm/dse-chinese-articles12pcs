// scripts/search.js
const fs = require('fs');
const path = require('path');
const Utils = require('./utils');

class SearchEngine {
  constructor(config = {}) {
    this.config = {
      dataDir: './docs',
      indexFile: 'search-index.json',
      ...config
    };
  }

  // 構建搜索索引
  async buildSearchIndex(articles) {
    console.log('🔍 構建搜索索引...');
    
    const searchIndex = [];
    
    for (const article of articles) {
      try {
        // 讀取文章內容
        const articlePath = path.join(this.config.dataDir, article.filename);
        const content = fs.readFileSync(articlePath, 'utf8');
        
        // 提取純文本（移除HTML標籤）
        const plainText = this.extractPlainText(content);
        
        // 創建索引條目
        const indexEntry = {
          id: article.id,
          title: article.title,
          author: article.author,
          genre: article.genre || '未知',
          tags: article.tags || [],
          dse_focus: article.dse_focus || [],
          content: plainText.substring(0, 500), // 只索引前500字符
          excerpt: Utils.extractExcerpt(plainText, 150),
          url: article.filename,
          date: article.date || Utils.formatDate(),
          importance: article.importance || 3,
          wordCount: plainText.split(/\s+/).length
        };
        
        searchIndex.push(indexEntry);
        
      } catch (error) {
        console.error(`處理文章 ${article.title} 失敗:`, error.message);
      }
    }
    
    // 保存搜索索引
    const indexPath = path.join(this.config.dataDir, this.config.indexFile);
    Utils.writeJSON(indexPath, {
      version: '1.0',
      created: new Date().toISOString(),
      count: searchIndex.length,
      data: searchIndex
    });
    
    console.log(`✅ 搜索索引構建完成，共索引 ${searchIndex.length} 篇文章`);
    
    return searchIndex;
  }

  // 提取純文本
  extractPlainText(html) {
    // 移除HTML標籤
    let text = html.replace(/<[^>]*>/g, ' ');
    
    // 移除多餘空格
    text = text.replace(/\s+/g, ' ').trim();
    
    // 解碼HTML實體
    text = this.decodeHTMLEntities(text);
    
    return text;
  }

  // 解碼HTML實體
  decodeHTMLEntities(text) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    return text.replace(/&[a-z]+;|&#\d+;/g, match => entities[match] || match);
  }

  // 搜索文章
  search(query, options = {}) {
    const { limit = 10, offset = 0, fields = ['title', 'content', 'tags'] } = options;
    
    try {
      // 讀取搜索索引
      const indexPath = path.join(this.config.dataDir, this.config.indexFile);
      const indexData = Utils.readJSON(indexPath);
      
      if (!indexData || !indexData.data) {
        console.error('搜索索引不存在或格式錯誤');
        return [];
      }
      
      const searchIndex = indexData.data;
      const queryLower = query.toLowerCase();
      
      // 執行搜索
      const results = searchIndex
        .map(item => {
          let score = 0;
          
          // 在各個字段中搜索
          fields.forEach(field => {
            if (item[field]) {
              const fieldValue = Array.isArray(item[field]) 
                ? item[field].join(' ')
                : String(item[field]);
              
              if (fieldValue.toLowerCase().includes(queryLower)) {
                // 根據字段重要性加分
                const fieldWeights = {
                  title: 10,
                  tags: 5,
                  dse_focus: 3,
                  content: 1,
                  author: 2,
                  genre: 1
                };
                
                score += fieldWeights[field] || 1;
              }
            }
          });
          
          // 重要性加分
          score += (item.importance || 0) * 2;
          
          return { ...item, score };
        })
        .filter(item => item.score > 0) // 只保留有匹配的結果
        .sort((a, b) => b.score - a.score) // 按分數降序排序
        .slice(offset, offset + limit); // 分頁
      
      return results;
      
    } catch (error) {
      console.error('搜索失敗:', error);
      return [];
    }
  }

  // 生成搜索建議
  generateSuggestions(query, limit = 5) {
    const results = this.search(query, { limit: 20 });
    
    // 提取獨特的標籤和分類
    const suggestions = new Set();
    
    results.forEach(item => {
      // 添加標題相關建議
      if (item.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(item.title);
      }
      
      // 添加標籤建議
      item.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(tag);
        }
      });
      
      // 添加DSE重點建議
      item.dse_focus.forEach(focus => {
        if (focus.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(focus);
        }
      });
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  // 生成熱門搜索詞
  generatePopularSearches(limit = 10) {
    try {
      const indexPath = path.join(this.config.dataDir, 'search-stats.json');
      
      if (fs.existsSync(indexPath)) {
        const stats = Utils.readJSON(indexPath);
        
        // 按搜索次數排序
        return Object.entries(stats.searches || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([term, count]) => ({ term, count }));
      }
      
      // 默認熱門搜索詞
      return [
        { term: '荀子', count: 100 },
        { term: '孟子', count: 85 },
        { term: '莊子', count: 75 },
        { term: '學習', count: 65 },
        { term: 'DSE', count: 60 },
        { term: '比喻', count: 55 },
        { term: '論證', count: 50 },
        { term: '文言文', count: 45 },
        { term: '作文', count: 40 },
        { term: '考試', count: 35 }
      ];
      
    } catch (error) {
      console.error('生成熱門搜索詞失敗:', error);
      return [];
    }
  }

  // 記錄搜索統計
  recordSearch(query) {
    try {
      const statsPath = path.join(this.config.dataDir, 'search-stats.json');
      let stats = { searches: {} };
      
      if (fs.existsSync(statsPath)) {
        stats = Utils.readJSON(statsPath);
      }
      
      // 更新搜索次數
      if (!stats.searches[query]) {
        stats.searches[query] = 0;
      }
      stats.searches[query]++;
      
      // 保存
      Utils.writeJSON(statsPath, stats);
      
    } catch (error) {
      console.error('記錄搜索統計失敗:', error);
    }
  }

  // 生成相關文章推薦
  generateRelatedArticles(articleId, limit = 5) {
    try {
      const indexPath = path.join(this.config.dataDir, this.config.indexFile);
      const indexData = Utils.readJSON(indexPath);
      
      if (!indexData || !indexData.data) {
        return [];
      }
      
      const currentArticle = indexData.data.find(item => item.id === articleId);
      if (!currentArticle) {
        return [];
      }
      
      // 計算相似度
      const related = indexData.data
        .filter(item => item.id !== articleId)
        .map(item => {
          let similarity = 0;
          
          // 標籤相似度
          const commonTags = currentArticle.tags.filter(tag => 
            item.tags.includes(tag)
          ).length;
          similarity += commonTags * 5;
          
          // DSE重點相似度
          const commonFocus = currentArticle.dse_focus.filter(focus => 
            item.dse_focus.includes(focus)
          ).length;
          similarity += commonFocus * 3;
          
          // 體裁相同加分
          if (currentArticle.genre === item.genre) {
            similarity += 2;
          }
          
          // 作者相同加分
          if (currentArticle.author === item.author) {
            similarity += 4;
          }
          
          return { ...item, similarity };
        })
        .filter(item => item.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      return related;
      
    } catch (error) {
      console.error('生成相關文章失敗:', error);
      return [];
    }
  }
}

module.exports = SearchEngine;
