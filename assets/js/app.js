// 學習平台應用程序
class ChineseLearningPlatform {
    constructor() {
        this.baseUrl = window.location.origin;
        this.currentArticle = null;
        this.quizAnswers = {};
        this.initialize();
    }
    
    initialize() {
        this.bindEvents();
        this.loadProgress();
        this.updatePage();
    }
    
    bindEvents() {
        // 測驗選項點擊
        document.addEventListener('click', (e) => {
            const option = e.target.closest('.quiz-option');
            if (option) {
                this.handleQuizOptionClick(option);
            }
            
            // 查看答案按鈕
            const checkBtn = e.target.closest('.check-answer-btn');
            if (checkBtn) {
                this.handleCheckAnswer(checkBtn);
            }
            
            // 記憶卡片翻轉
            const memoryCard = e.target.closest('.memory-card');
            if (memoryCard) {
                memoryCard.classList.toggle('flipped');
            }
            
            // 導航菜單
            const navToggle = e.target.closest('.nav-toggle');
            if (navToggle) {
                this.toggleNavigation();
            }
        });
        
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // 頁面載入完成
        document.addEventListener('DOMContentLoaded', () => {
            this.highlightCurrentSection();
            this.initializeQuizzes();
        });
        
        // 保存學習進度
        window.addEventListener('beforeunload', () => {
            this.saveProgress();
        });
    }
    
    handleQuizOptionClick(option) {
        const question = option.closest('.quiz-question');
        const questionId = question.dataset.questionId || question.id;
        
        // 移除同問題的其他選項選中狀態
        const allOptions = question.querySelectorAll('.quiz-option');
        allOptions.forEach(opt => opt.classList.remove('selected'));
        
        // 選中當前選項
        option.classList.add('selected');
        
        // 記錄答案
        this.quizAnswers[questionId] = {
            selected: option.textContent.trim(),
            isCorrect: option.dataset.correct === 'true',
            timestamp: new Date().toISOString()
        };
        
        // 自動檢查答案（如果開啟自動檢查）
        if (question.dataset.autoCheck === 'true') {
            this.checkSingleAnswer(question, option);
        }
    }
    
    handleCheckAnswer(button) {
        const question = button.closest('.quiz-question');
        const selectedOption = question.querySelector('.quiz-option.selected');
        const feedback = question.querySelector('.answer-feedback');
        
        if (!selectedOption) {
            alert('請先選擇一個答案！');
            return;
        }
        
        // 顯示反饋
        if (feedback) {
            feedback.classList.add('show');
            feedback.style.display = 'block';
            
            // 更新按鈕狀態
            button.textContent = '答案已顯示';
            button.disabled = true;
            button.style.opacity = '0.7';
        }
        
        // 標記正確/錯誤
        const allOptions = question.querySelectorAll('.quiz-option');
        allOptions.forEach(option => {
            option.classList.remove('correct', 'incorrect');
            if (option.dataset.correct === 'true') {
                option.classList.add('correct');
            } else if (option === selectedOption && !option.classList.contains('correct')) {
                option.classList.add('incorrect');
            }
        });
        
        // 保存進度
        this.saveQuizProgress(question);
    }
    
    checkSingleAnswer(question, selectedOption) {
        const allOptions = question.querySelectorAll('.quiz-option');
        
        allOptions.forEach(option => {
            option.classList.remove('correct', 'incorrect');
            if (option.dataset.correct === 'true') {
                option.classList.add('correct');
            } else if (option === selectedOption && !option.classList.contains('correct')) {
                option.classList.add('incorrect');
            }
        });
        
        // 顯示簡短反饋
        const isCorrect = selectedOption.dataset.correct === 'true';
        const feedback = document.createElement('div');
        feedback.className = `quick-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.textContent = isCorrect ? '✓ 正確！' : '✗ 錯誤，請再試一次';
        feedback.style.cssText = `
            margin-top: 10px;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            animation: fadeIn 0.5s ease;
        `;
        
        const existingFeedback = question.querySelector('.quick-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        question.appendChild(feedback);
        
        // 3秒後移除反饋
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.style.opacity = '0';
                feedback.style.transition = 'opacity 0.5s ease';
                setTimeout(() => feedback.remove(), 500);
            }
        }, 3000);
    }
    
    initializeQuizzes() {
        // 為所有測驗問題添加ID
        document.querySelectorAll('.quiz-question').forEach((question, index) => {
            if (!question.id) {
                question.id = `quiz-question-${index + 1}`;
                question.dataset.questionId = `q${index + 1}`;
            }
        });
    }
    
    saveQuizProgress(question) {
        const progress = {
            articleId: this.currentArticle?.id || document.body.dataset.articleId,
            questionId: question.dataset.questionId,
            timestamp: new Date().toISOString(),
            answers: this.quizAnswers
        };
        
        // 保存到localStorage
        const allProgress = JSON.parse(localStorage.getItem('learningProgress') || '{}');
        allProgress[progress.articleId] = allProgress[progress.articleId] || {};
        allProgress[progress.articleId][progress.questionId] = progress;
        
        localStorage.setItem('learningProgress', JSON.stringify(allProgress));
        
        // 更新進度顯示
        this.updateProgressDisplay();
    }
    
    loadProgress() {
        const progress = JSON.parse(localStorage.getItem('learningProgress') || '{}');
        const articleId = this.currentArticle?.id || document.body.dataset.articleId;
        
        if (progress[articleId]) {
            this.quizAnswers = progress[articleId];
            this.restoreQuizStates(progress[articleId]);
        }
    }
    
    restoreQuizStates(progress) {
        Object.keys(progress).forEach(questionId => {
            const question = document.querySelector(`[data-question-id="${questionId}"]`);
            if (question && progress[questionId].selected) {
                // 恢復選中狀態
                const options = question.querySelectorAll('.quiz-option');
                options.forEach(option => {
                    if (option.textContent.trim() === progress[questionId].selected) {
                        option.classList.add('selected');
                        
                        // 如果已經檢查過答案，顯示結果
                        if (progress[questionId].checked) {
                            this.checkSingleAnswer(question, option);
                        }
                    }
                });
            }
        });
    }
    
    updateProgressDisplay() {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            const totalQuestions = document.querySelectorAll('.quiz-question').length;
            const answeredQuestions = Object.keys(this.quizAnswers).length;
            const percentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
            
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${answeredQuestions}/${totalQuestions}`;
        }
    }
    
    saveProgress() {
        const progress = {
            articleId: this.currentArticle?.id || document.body.dataset.articleId,
            lastAccessed: new Date().toISOString(),
            timeSpent: this.calculateTimeSpent(),
            quizAnswers: this.quizAnswers
        };
        
        localStorage.setItem('lastLearningSession', JSON.stringify(progress));
    }
    
    calculateTimeSpent() {
        // 簡單的時間計算（實際應用中需要更精確的計時）
        return Date.now() - this.sessionStartTime;
    }
    
    highlightCurrentSection() {
        // 根據滾動位置高亮當前章節
        const sections = document.querySelectorAll('h2, h3');
        const navLinks = document.querySelectorAll('nav a[href^="#"]');
        
        window.addEventListener('scroll', () => {
            let currentSection = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (pageYOffset >= (sectionTop - 100)) {
                    currentSection = section.id;
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.classList.add('active');
                }
            });
        });
    }
    
    handleSearch(query) {
        if (query.length < 2) return;
        
        // 簡單的本地搜索
        const searchResults = [];
        const content = document.body.textContent.toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (content.includes(queryLower)) {
            // 找到匹配，高亮顯示
            this.highlightText(query);
        }
        
        // 實際應用中應該調用搜索API或搜索索引
        console.log('搜索:', query, searchResults);
    }
    
    highlightText(text) {
        // 移除之前的高亮
        document.querySelectorAll('.search-highlight').forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });
        
        // 高亮新文本
        const regex = new RegExp(`(${text})`, 'gi');
        document.body.innerHTML = document.body.innerHTML.replace(
            regex,
            '<span class="search-highlight" style="background-color: yellow; padding: 2px;">$1</span>'
        );
    }
    
    toggleNavigation() {
        const navMenu = document.querySelector('nav ul');
        if (navMenu) {
            navMenu.classList.toggle('show');
        }
    }
    
    updatePage() {
        // 更新頁面狀態
        this.updateLastUpdated();
        this.updateStudyStats();
    }
    
    updateLastUpdated() {
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            const now = new Date();
            lastUpdated.textContent = now.toLocaleDateString('zh-Hant', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
    
    updateStudyStats() {
        const stats = JSON.parse(localStorage.getItem('studyStats') || '{}');
        const articleId = this.currentArticle?.id || document.body.dataset.articleId;
        
        // 更新訪問次數
        stats[articleId] = stats[articleId] || { views: 0, timeSpent: 0 };
        stats[articleId].views++;
        
        localStorage.setItem('studyStats', JSON.stringify(stats));
        
        // 顯示統計
        const statsDisplay = document.getElementById('studyStats');
        if (statsDisplay) {
            const totalViews = Object.values(stats).reduce((sum, s) => sum + s.views, 0);
            statsDisplay.textContent = `總學習次數: ${totalViews}`;
        }
    }
}

// 文章初始化函數
function initializeArticle(config) {
    const platform = new ChineseLearningPlatform();
    platform.currentArticle = config;
    
    // 添加文章特定功能
    if (config.id === 'xunzi-qinxue') {
        initializeXunziFeatures();
    }
    
    return platform;
}

// 荀子《勤學》特定功能
function initializeXunziFeatures() {
    // 添加朗讀功能
    addReadingFeature();
    
    // 添加詞語高亮
    addVocabularyHighlight();
    
    // 添加段落記憶功能
    addParagraphMemory();
}

function addReadingFeature() {
    const readingBtn = document.createElement('button');
    readingBtn.className = 'btn btn-accent reading-btn';
    readingBtn.innerHTML = '<i class="fas fa-volume-up"></i> 朗讀全文';
    
    readingBtn.addEventListener('click', () => {
        const content = document.querySelector('.original-text').textContent;
        speakText(content);
    });
    
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.appendChild(readingBtn);
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-HK';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    } else {
        alert('您的瀏覽器不支持語音朗讀功能');
    }
}

function addVocabularyHighlight() {
    // 為文言文詞語添加解釋懸停
    const vocabTerms = document.querySelectorAll('.vocab-term');
    vocabTerms.forEach(term => {
        term.addEventListener('mouseenter', (e) => {
            const definition = e.target.dataset.definition;
            if (definition) {
                showTooltip(e.target, definition);
            }
        });
        
        term.addEventListener('mouseleave', () => {
            hideTooltip();
        });
    });
}

function showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'vocab-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.9rem;
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
}

function hideTooltip() {
    const tooltip = document.querySelector('.vocab-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

function addParagraphMemory() {
    // 段落記憶功能
    const paragraphs = document.querySelectorAll('.original-text p');
    paragraphs.forEach((para, index) => {
        const memoryBtn = document.createElement('button');
        memoryBtn.className = 'btn memory-btn';
        memoryBtn.innerHTML = `<i class="fas fa-bookmark"></i> 記憶段落 ${index + 1}`;
        memoryBtn.dataset.paragraph = index + 1;
        
        memoryBtn.addEventListener('click', () => {
            toggleParagraphMemory(index + 1, para.textContent);
            memoryBtn.classList.toggle('active');
            memoryBtn.innerHTML = memoryBtn.classList.contains('active') 
                ? `<i class="fas fa-check"></i> 已記憶` 
                : `<i class="fas fa-bookmark"></i> 記憶段落 ${index + 1}`;
        });
        
        para.parentNode.insertBefore(memoryBtn, para.nextSibling);
    });
}

function toggleParagraphMemory(index, text) {
    const memory = JSON.parse(localStorage.getItem('paragraphMemory') || '{}');
    const articleId = document.body.dataset.articleId;
    
    memory[articleId] = memory[articleId] || {};
    
    if (memory[articleId][index]) {
        delete memory[articleId][index];
    } else {
        memory[articleId][index] = {
            text: text,
            memorizedAt: new Date().toISOString()
        };
    }
    
    localStorage.setItem('paragraphMemory', JSON.stringify(memory));
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', () => {
    const articleConfig = window.articleConfig || {
        id: document.body.dataset.articleId,
        title: document.title,
        baseUrl: window.location.origin
    };
    
    initializeArticle(articleConfig);
});

// 導出給其他模塊使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChineseLearningPlatform, initializeArticle };
}
