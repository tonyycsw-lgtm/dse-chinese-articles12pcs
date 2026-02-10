const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

class ArticleConverter {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'https://tonyycsw-lgtm.github.io/dse-chinese-articles12pcs',
            templateDir: config.templateDir || './templates',
            outputDir: config.outputDir || './docs',
            assetsDir: config.assetsDir || './assets',
            ...config
        };
        
        // 配置marked
        marked.setOptions({
            gfm: true,
            breaks: true,
            headerIds: true,
            mangle: false
        });
    }
    
    // 解析自定義標籤
    parseCustomTags(content) {
        const patterns = {
            meta: /@meta\s*(\{[\s\S]*?\})(?=\n|$)/,
            quiz: /@quiz\s*(\{[\s\S]*?\})(?=\n|$)/g,
            memoryCard: /@memory-card\s*(\{[\s\S]*?\})(?=\n|$)/g,
            exercise: /@exercise\s*(\{[\s\S]*?\})(?=\n|$)/g,
            dseImportant: /@dse-important\s*([\s\S]*?)(?=@|\n## |\n# |$)/g
        };
        
        const result = {
            meta: {},
            content: content,
            quizzes: [],
            memoryCards: [],
            exercises: [],
            dseImportant: []
        };
        
        try {
            // 解析meta
            const metaMatch = content.match(patterns.meta);
            if (metaMatch) {
                result.meta = JSON.parse(metaMatch[1]);
                result.content = result.content.replace(metaMatch[0], '');
            }
            
            // 解析測驗
            const quizMatches = [...content.matchAll(patterns.quiz)];
            quizMatches.forEach(match => {
                try {
                    const quiz = JSON.parse(match[1]);
                    result.quizzes.push(quiz);
                    result.content = result.content.replace(match[0], `<!-- QUIZ:${result.quizzes.length - 1} -->`);
                } catch (e) {
                    console.error('解析測驗錯誤:', e.message);
                }
            });
            
            // 解析記憶卡片
            const cardMatches = [...content.matchAll(patterns.memoryCard)];
            cardMatches.forEach(match => {
                try {
                    const card = JSON.parse(match[1]);
                    result.memoryCards.push(card);
                    result.content = result.content.replace(match[0], `<!-- MEMORY-CARD:${result.memoryCards.length - 1} -->`);
                } catch (e) {
                    console.error('解析記憶卡片錯誤:', e.message);
                }
            });
            
            // 解析練習
            const exerciseMatches = [...content.matchAll(patterns.exercise)];
            exerciseMatches.forEach(match => {
                try {
                    const exercise = JSON.parse(match[1]);
                    result.exercises.push(exercise);
                    result.content = result.content.replace(match[0], `<!-- EXERCISE:${result.exercises.length - 1} -->`);
                } catch (e) {
                    console.error('解析練習錯誤:', e.message);
                }
            });
            
            // 解析DSE重點
            const importantMatches = [...content.matchAll(patterns.dseImportant)];
            importantMatches.forEach((match, index) => {
                result.dseImportant.push(match[1].trim());
                result.content = result.content.replace(match[0], `<!-- DSE-IMPORTANT:${index} -->`);
            });
            
        } catch (error) {
            console.error('解析錯誤:', error);
        }
        
        return result;
    }
    
    // 渲染測驗
    renderQuiz(quiz, index) {
        const optionsHtml = quiz.options.map((option, i) => `
            <div class="quiz-option" data-correct="${option.correct}">
                ${String.fromCharCode(65 + i)}. ${option.text}
            </div>
        `).join('');
        
        return `
            <div class="quiz-question" data-question-id="q${index + 1}">
                <p><strong>問題${index + 1}：</strong>${quiz.question}</p>
                <div class="quiz-options">
                    ${optionsHtml}
                </div>
                <div class="answer-feedback">
                    <strong>${quiz.explanation.split('\n')[0]}</strong>
                    <p style="margin-top: 0.8rem;">${quiz.explanation.split('\n').slice(1).join('<br>')}</p>
                    ${quiz.points ? `<p style="margin-top: 0.5rem; color: var(--warning-color);">分值: ${quiz.points}分</p>` : ''}
                </div>
                <button class="btn check-answer-btn" style="margin-top: 1.5rem;">查看答案</button>
            </div>
        `;
    }
    
    // 渲染記憶卡片
    renderMemoryCard(card, index) {
        return `
            <div class="memory-card" onclick="this.classList.toggle('flipped')">
                <div class="memory-card-inner">
                    <div class="memory-card-front">
                        <h4>${card.front.title}</h4>
                        <p>${card.front.content}</p>
                    </div>
                    <div class="memory-card-back">
                        <h4>${card.back.title}</h4>
                        <p>${card.back.content}</p>
                        ${card.back.footer ? `<p>${card.back.footer}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // 渲染DSE重點
    renderDseImportant(content, index) {
        return `
            <div class="dse-important">
                <h5><i class="fas fa-exclamation-circle"></i> 考試重點提醒：</h5>
                ${marked.parse(content)}
            </div>
        `;
    }
    
    // 渲染練習
    renderExercise(exercise, index) {
        if (exercise.type === 'self-check') {
            const questionsHtml = exercise.questions.map((q, i) => `
                <li>
                    <label class="checkbox-label">
                        <input type="checkbox" class="exercise-checkbox" data-question="${i}">
                        <span>${q}</span>
                    </label>
                </li>
            `).join('');
            
            return `
                <div class="exercise self-check">
                    <h4><i class="fas fa-clipboard-check"></i> 學習進度檢查</h4>
                    <p>完成本文章學習後，請回答以下問題：</p>
                    <ul class="exercise-questions">
                        ${questionsHtml}
                    </ul>
                    <button class="btn save-progress-btn">保存進度</button>
                    <div class="progress-saved" style="display: none; color: var(--success-color); margin-top: 10px;">
                        <i class="fas fa-check"></i> 進度已保存
                    </div>
                </div>
            `;
        }
        
        return '';
    }
    
    // 轉換Markdown文件
    convert(markdownFile) {
        console.log(`📖 處理: ${path.basename(markdownFile)}`);
        
        try {
            // 讀取Markdown文件
            const markdown = fs.readFileSync(markdownFile, 'utf8');
            
            // 解析自定義標籤
            const parsed = this.parseCustomTags(markdown);
            
            // 讀取文章模板
            const templatePath = path.join(this.config.templateDir, 'article.html');
            let template = fs.readFileSync(templatePath, 'utf8');
            
            // 轉換Markdown內容為HTML
            let htmlContent = marked.parse(parsed.content);
            
            // 替換回自定義標籤
            htmlContent = this.replaceCustomTags(htmlContent, parsed);
            
            // 準備模板變量
            const variables = {
                TITLE: parsed.meta.title || '未命名文章',
                AUTHOR: parsed.meta.author || '佚名',
                SOURCE: parsed.meta.source || '未知',
                GENRE: parsed.meta.genre || '未知體裁',
                ARTICLE_ID: parsed.meta.id || path.basename(markdownFile, '.md'),
                CONTENT: htmlContent,
                BASE_URL: this.config.baseUrl,
                UPDATE_DATE: new Date().toISOString().split('T')[0]
            };
            
            // 填充模板
            let finalHtml = template;
            Object.keys(variables).forEach(key => {
                finalHtml = finalHtml.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
            });
            
            // 處理條件內容
            if (parsed.quizzes.length > 0) {
                const quizzesHtml = parsed.quizzes.map((quiz, i) => this.renderQuiz(quiz, i)).join('');
                finalHtml = finalHtml.replace('{{#if QUIZZES}}', quizzesHtml);
            } else {
                finalHtml = finalHtml.replace(/{{#if QUIZZES}}[\s\S]*?{{\/if}}/g, '');
            }
            
            if (parsed.memoryCards.length > 0) {
                const cardsHtml = parsed.memoryCards.map((card, i) => this.renderMemoryCard(card, i)).join('');
                finalHtml = finalHtml.replace('{{#if MEMORY_CARDS}}', cardsHtml);
            } else {
                finalHtml = finalHtml.replace(/{{#if MEMORY_CARDS}}[\s\S]*?{{\/if}}/g, '');
            }
            
            // 生成輸出文件名
            const outputFilename = `${parsed.meta.id || path.basename(markdownFile, '.md')}.html`;
            const outputPath = path.join(this.config.outputDir, outputFilename);
            
            // 確保輸出目錄存在
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            
            // 寫入文件
            fs.writeFileSync(outputPath, finalHtml);
            
            console.log(`✅ 生成: ${outputFilename}`);
            
            return {
                id: parsed.meta.id,
                title: parsed.meta.title,
                author: parsed.meta.author,
                filename: outputFilename,
                tags: parsed.meta.tags || [],
                dse_focus: parsed.meta.dse_focus || [],
                date: new Date().toISOString().split('T')[0]
            };
            
        } catch (error) {
            console.error(`❌ 處理 ${markdownFile} 時出錯:`, error.message);
            return null;
        }
    }
    
    // 替換回自定義標籤
    replaceCustomTags(html, parsed) {
        // 替換測驗
        parsed.quizzes.forEach((quiz, index) => {
            const placeholder = `<!-- QUIZ:${index} -->`;
            html = html.replace(placeholder, this.renderQuiz(quiz, index));
        });
        
        // 替換記憶卡片
        parsed.memoryCards.forEach((card, index) => {
            const placeholder = `<!-- MEMORY-CARD:${index} -->`;
            html = html.replace(placeholder, this.renderMemoryCard(card, index));
        });
        
        // 替換DSE重點
        parsed.dseImportant.forEach((content, index) => {
            const placeholder = `<!-- DSE-IMPORTANT:${index} -->`;
            html = html.replace(placeholder, this.renderDseImportant(content, index));
        });
        
        // 替換練習
        parsed.exercises.forEach((exercise, index) => {
            const placeholder = `<!-- EXERCISE:${index} -->`;
            html = html.replace(placeholder, this.renderExercise(exercise, index));
        });
        
        return html;
    }
}

module.exports = ArticleConverter;
