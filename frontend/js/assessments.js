/* =========================================================
   KarmaSkill AI - Assessments Module
   ========================================================= */

let activeQuizSession = null;

async function renderAssessmentsPage() {
    const content = $("#appContent");
    if (!content) return;

    if (isAdmin()) {
        content.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Assessments</h1>
                    <p class="page-subtitle">Assessments are tied to employee profiles. Please select an employee account from the top right to view and take assessments.</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">Employee Account Required</div>
                    <div class="empty-state-description">Switch to an employee account to take assessments or view assessment history.</div>
                </div>
            </div>
        `;
        return;
    }

    const employee = AppState.data.employee;
    const assessments = AppState.data.assessments || [];

    content.innerHTML = `
        <section class="initial-loading">
            <div class="loading-spinner"></div>
            <p>Loading assessments and available quizzes...</p>
        </section>
    `;

    try {
        const quizzes = await API.getQuizzes();
        AppState.data.quizzes = quizzes || [];

        const employeeId = getCurrentEmployeeId();

        // Fetch attempt status for all quizzes in parallel
        let quizAttemptMap = {};
        if (employeeId && quizzes.length) {
            const attemptResults = await Promise.all(
                quizzes.map(q =>
                    API.getQuizAttempt(q.id, employeeId).catch(() => ({ attempted: false, attempt: null }))
                )
            );
            quizzes.forEach((q, i) => {
                quizAttemptMap[q.id] = attemptResults[i];
            });
        }

        const avgScore = assessments.length
            ? Math.round(assessments.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / assessments.length)
            : 0;

        const completedCount = Object.values(quizAttemptMap).filter(a => a && a.attempted).length;

        content.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title-row">
                        <span class="page-title-icon">▣</span>
                        <h1 class="page-title">Assessments & Quizzes</h1>
                    </div>
                    <p class="page-subtitle">
                        Test your competencies, take AI-generated quizzes from learning materials, and update your role qualification level.
                    </p>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="summary-grid">
                <div class="summary-card stat-primary">
                    <div class="summary-label">Available Quizzes</div>
                    <div class="summary-value">${quizzes.length}</div>
                    <div class="summary-description">Active competency tests</div>
                </div>
                <div class="summary-card stat-success">
                    <div class="summary-label">Completed</div>
                    <div class="summary-value">${completedCount}</div>
                    <div class="summary-description">Quizzes you've attempted</div>
                </div>
                <div class="summary-card stat-purple">
                    <div class="summary-label">Average Score</div>
                    <div class="summary-value">${avgScore}%</div>
                    <div class="summary-description">Overall assessment proficiency</div>
                </div>
                <div class="summary-card stat-amber">
                    <div class="summary-label">Officer Profile</div>
                    <div class="summary-value" style="font-size:18px;margin-top:4px">${escapeHTML(employee ? employee.name : "Officer")}</div>
                    <div class="summary-description">${escapeHTML(employee ? employee.role : "")}</div>
                </div>
            </div>

            <!-- Available Quizzes Section -->
            <div class="section-container mt-25">
                <div class="section-header-row">
                    <div>
                        <h2 class="section-heading">Competency Quizzes</h2>
                        <p class="text-muted">Take an interactive quiz to validate your skills. Each quiz can only be attempted once.</p>
                    </div>
                </div>

                <div class="quizzes-grid mt-15">
                    ${quizzes.length ? quizzes.map(q => renderQuizCard(q, quizAttemptMap[q.id])).join("") : `
                        <div class="card full-width">
                            <div class="card-body empty-state">
                                <div class="empty-state-icon">📝</div>
                                <div class="empty-state-title">No Quizzes Available Yet</div>
                                <div class="empty-state-description">Upload a learning PDF in the Admin section to automatically generate AI quizzes.</div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <!-- Completed Assessments Section -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Assessment History</div>
                        <div class="text-muted">Your past quiz scores and competency updates</div>
                    </div>
                </div>
                <div class="card-body">
                    ${assessments.length ? `
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Competency ID</th>
                                        <th>Questions</th>
                                        <th>Score</th>
                                        <th>Percentage</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${assessments.map(a => `
                                        <tr>
                                            <td><strong>#${a.id}</strong></td>
                                            <td><span class="competency-badge">Competency #${a.competency_id}</span></td>
                                            <td>${a.total_questions} questions</td>
                                            <td>${a.score} / ${a.total_questions}</td>
                                            <td>
                                                <div class="table-progress-cell">
                                                    <div class="progress-track sm">
                                                        <div class="progress-fill ${a.percentage >= 70 ? "success" : a.percentage >= 50 ? "amber" : "danger"}" style="width:${Math.min(a.percentage, 100)}%"></div>
                                                    </div>
                                                    <span class="table-progress-text">${formatNumber(a.percentage)}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="status-badge ${a.percentage >= 70 ? "high" : a.percentage >= 50 ? "medium" : "low"}">
                                                    ${a.percentage >= 70 ? "Proficient" : a.percentage >= 50 ? "Developing" : "Needs Work"}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <div class="empty-state-title">No Assessments Taken Yet</div>
                            <div class="empty-state-description">Click "Take Assessment" on any quiz above to test your skills!</div>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Attach event listeners to quiz start buttons
        $$(".start-quiz-btn").forEach(btn => {
            btn.onclick = () => {
                const quizId = btn.dataset.quizId;
                startQuizSession(quizId);
            };
        });

        // Attach event listeners to view-score buttons
        $$(".view-score-btn").forEach(btn => {
            btn.onclick = () => {
                const quizId = btn.dataset.quizId;
                showAttemptResult(quizId, quizAttemptMap[quizId]);
            };
        });

    } catch (error) {
        showToast("Error loading quizzes: " + error.message, "error");
    }
}

function renderQuizCard(quiz, attemptData) {
    const hasAttempted = attemptData && attemptData.attempted;
    const attempt = hasAttempted ? attemptData.attempt : null;
    const pct = attempt ? attempt.percentage : null;
    const scoreLabel = pct !== null
        ? (pct >= 70 ? "Proficient" : pct >= 50 ? "Developing" : "Needs Work")
        : null;
    const scoreBadgeClass = pct !== null
        ? (pct >= 70 ? "high" : pct >= 50 ? "medium" : "low")
        : "";

    return `
        <div class="quiz-card card ${hasAttempted ? "quiz-card-completed" : ""}">
            <div class="quiz-card-top">
                <span class="quiz-badge">AI GENERATED</span>
                <span class="quiz-questions-pill">
                    <strong>${quiz.number_of_questions}</strong> questions
                </span>
            </div>
            <h3 class="quiz-title">${escapeHTML(quiz.title)}</h3>
            <p class="quiz-material-source">
                Source: <span>${escapeHTML(quiz.material_title || "Learning Material")}</span>
            </p>
            ${quiz.competency ? `
                <div class="quiz-competency-row">
                    <span class="meta-label">Primary Skill:</span>
                    <span class="competency-pill">${escapeHTML(quiz.competency)}</span>
                </div>
            ` : ""}
            <div class="quiz-card-footer">
                ${hasAttempted ? `
                    <div class="quiz-attempted-info">
                        <span class="quiz-score-display">
                            <strong>${pct}%</strong>
                            &nbsp;&mdash;&nbsp;
                            <span class="status-badge ${scoreBadgeClass}">${scoreLabel}</span>
                        </span>
                        <button type="button" class="btn btn-secondary view-score-btn" data-quiz-id="${quiz.id}">
                            View Score & Insights
                        </button>
                    </div>
                    <div class="quiz-locked-notice">✓ Assessment completed — reattempt not available</div>
                ` : `
                    <button type="button" class="btn btn-primary start-quiz-btn" data-quiz-id="${quiz.id}">
                        Take Assessment →
                    </button>
                `}
            </div>
        </div>
    `;
}

function showAttemptResult(quizId, attemptData) {
    if (!attemptData || !attemptData.attempt) return;
    const attempt = attemptData.attempt;
    const pct = attempt.percentage;
    const isPassing = pct >= 60;
    const scoreLabel = pct >= 70 ? "Proficient" : pct >= 50 ? "Developing" : "Needs Work";
    const scoreBadgeClass = pct >= 70 ? "high" : pct >= 50 ? "medium" : "low";

    const content = $("#appContent");
    if (!content) return;

    content.innerHTML = `
        <div class="quiz-results-fullscreen">
            <div class="results-header-bar">
                <button type="button" class="btn btn-secondary" onclick="renderAssessmentsPage()">
                    ← Back to Assessments
                </button>
            </div>

            <div class="results-score-banner ${isPassing ? "passed" : "needs-work"}">
                <div class="results-badge-icon">${isPassing ? "🎉" : "📚"}</div>
                <h2 class="results-score-heading">${pct}% Score</h2>
                <p class="results-score-subheading">
                    You got <strong>${attempt.score}</strong> out of <strong>${attempt.total_questions}</strong> questions correct.
                </p>
                <div class="results-notification" style="margin-top:12px">
                    <span class="status-badge ${scoreBadgeClass}" style="font-size:15px;padding:6px 16px">${scoreLabel}</span>
                </div>
            </div>

            <div class="card mt-25">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔒</div>
                        <div class="empty-state-title">Assessment Completed</div>
                        <div class="empty-state-description">
                            You have already submitted this quiz. Reattempting is not permitted.<br>
                            Your result has been recorded and your competency profile has been updated.
                        </div>
                    </div>
                </div>
            </div>

            <div class="results-actions mt-25">
                <button type="button" class="btn btn-primary btn-lg" onclick="renderAssessmentsPage()">
                    Return to Assessments
                </button>
            </div>
        </div>
    `;
}

async function startQuizSession(quizId) {
    setApplicationLoading(true);
    try {
        const quiz = await API.getQuiz(quizId);
        setApplicationLoading(false);

        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            showToast("This quiz does not have any questions.", "warning");
            return;
        }

        activeQuizSession = {
            quiz: quiz,
            currentIndex: 0,
            answers: {} // questionId -> selectedOption ("A", "B", "C", "D")
        };

        renderQuizModal();
    } catch (err) {
        setApplicationLoading(false);
        showToast("Failed to start quiz: " + err.message, "error");
    }
}

function renderQuizModal() {
    if (!activeQuizSession) return;

    const { quiz, currentIndex, answers } = activeQuizSession;
    const questions = quiz.questions;
    const currentQ = questions[currentIndex];
    const total = questions.length;
    const answeredCount = Object.keys(answers).length;

    // Build visited tracking
    if (!activeQuizSession.visited) {
        activeQuizSession.visited = {};
    }
    activeQuizSession.visited[currentIndex] = true;

    // Create full-screen quiz interface
    const content = $("#appContent");
    if (!content) return;

    content.innerHTML = `
        <div class="fullscreen-quiz-container">
            <!-- Quiz Header -->
            <div class="fullscreen-quiz-header">
                <div class="quiz-header-left">
                    <button type="button" class="btn btn-secondary btn-sm" id="exit-quiz-btn">
                        ← Exit Quiz
                    </button>
                    <div class="quiz-header-title">
                        <h2>${escapeHTML(quiz.title)}</h2>
                        <p>Question ${currentIndex + 1} of ${total}</p>
                    </div>
                </div>
                <div class="quiz-header-right">
                    <div class="quiz-header-stat">
                        <span class="stat-label">Answered</span>
                        <span class="stat-value">${answeredCount}/${total}</span>
                    </div>
                </div>
            </div>

            <!-- Main Quiz Area -->
            <div class="fullscreen-quiz-body">
                <!-- Left: Question Area -->
                <div class="quiz-main-area">
                    <!-- Progress Bar -->
                    <div class="quiz-progress-indicator">
                        <div class="progress-track">
                            <div class="progress-fill" style="width:${((currentIndex + 1) / total) * 100}%"></div>
                        </div>
                    </div>

                    <!-- Question Card -->
                    <div class="quiz-question-card-fullscreen">
                        <div class="question-number-badge">Question ${currentIndex + 1}</div>
                        ${currentQ.difficulty ? `<span class="difficulty-chip ${currentQ.difficulty.toLowerCase()}">${escapeHTML(currentQ.difficulty)}</span>` : ""}
                        
                        <h3 class="question-text-fullscreen">
                            ${escapeHTML(currentQ.question)}
                        </h3>

                        <!-- Options -->
                        <div class="quiz-options-fullscreen">
                            ${["A", "B", "C", "D"].map(optKey => {
                                const optText = currentQ.options[optKey];
                                if (!optText) return "";
                                const isSelected = answers[currentQ.id] === optKey;
                                return `
                                    <button type="button" class="quiz-option-fullscreen ${isSelected ? "selected" : ""}" data-key="${optKey}">
                                        <span class="option-letter-circle">${optKey}</span>
                                        <span class="option-text-fullscreen">${escapeHTML(optText)}</span>
                                        ${isSelected ? '<span class="option-check">✓</span>' : ''}
                                    </button>
                                `;
                            }).join("")}
                        </div>

                        <!-- Navigation -->
                        <div class="quiz-navigation-buttons">
                            <button type="button" class="btn btn-secondary" id="quiz-prev-btn" ${currentIndex === 0 ? "disabled" : ""}>
                                ← Previous
                            </button>

                            ${currentIndex < total - 1 ? `
                                <button type="button" class="btn btn-primary" id="quiz-next-btn">
                                    Next Question →
                                </button>
                            ` : `
                                <button type="button" class="btn btn-success btn-lg" id="quiz-submit-btn">
                                    Submit Assessment ✓
                                </button>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Right: Question Navigator -->
                <div class="quiz-navigator-sidebar">
                    <div class="navigator-header">
                        <h4>Question Navigator</h4>
                        <p>${answeredCount} of ${total} answered</p>
                    </div>

                    <div class="navigator-legend">
                        <div class="legend-item">
                            <span class="legend-box saved"></span>
                            <span>Answered</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-box visited"></span>
                            <span>Visited</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-box not-visited"></span>
                            <span>Not Visited</span>
                        </div>
                    </div>

                    <div class="navigator-grid">
                        ${questions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isVisited = activeQuizSession.visited[idx];
                            const isCurrent = idx === currentIndex;
                            
                            let statusClass = 'not-visited';
                            if (isAnswered) statusClass = 'saved';
                            else if (isVisited) statusClass = 'visited';
                            
                            return `
                                <button type="button" 
                                    class="navigator-question-btn ${statusClass} ${isCurrent ? 'current' : ''}" 
                                    data-question-index="${idx}">
                                    ${idx + 1}
                                </button>
                            `;
                        }).join("")}
                    </div>

                    <button type="button" class="btn btn-success full-width mt-20" id="quiz-submit-btn-sidebar">
                        Submit Assessment
                    </button>
                </div>
            </div>
        </div>
    `;

    // Bind option selection
    $$(".quiz-option-fullscreen").forEach(btn => {
        btn.onclick = () => {
            const key = btn.dataset.key;
            activeQuizSession.answers[currentQ.id] = key;
            renderQuizModal();
        };
    });

    // Navigator buttons
    $$(".navigator-question-btn").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.questionIndex);
            activeQuizSession.currentIndex = idx;
            renderQuizModal();
        };
    });

    // Navigation
    const prevBtn = $("#quiz-prev-btn");
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (activeQuizSession.currentIndex > 0) {
                activeQuizSession.currentIndex--;
                renderQuizModal();
            }
        };
    }

    const nextBtn = $("#quiz-next-btn");
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (activeQuizSession.currentIndex < total - 1) {
                activeQuizSession.currentIndex++;
                renderQuizModal();
            }
        };
    }

    const submitBtn = $("#quiz-submit-btn");
    if (submitBtn) {
        submitBtn.onclick = () => submitActiveQuiz();
    }

    const submitBtnSidebar = $("#quiz-submit-btn-sidebar");
    if (submitBtnSidebar) {
        submitBtnSidebar.onclick = () => submitActiveQuiz();
    }

    const exitBtn = $("#exit-quiz-btn");
    if (exitBtn) {
        exitBtn.onclick = () => {
            if (confirm("Are you sure you want to exit this assessment? Your progress will be lost.")) {
                activeQuizSession = null;
                renderAssessmentsPage();
            }
        };
    }
}

async function submitActiveQuiz() {
    if (!activeQuizSession) return;

    const { quiz, answers } = activeQuizSession;
    const questions = quiz.questions;
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < questions.length) {
        const confirmed = confirm(`You have answered ${answeredCount} of ${questions.length} questions. Submit anyway?`);
        if (!confirmed) return;
    }

    const employeeId = getCurrentEmployeeId();
    if (!employeeId) {
        showToast("No employee selected.", "error");
        return;
    }

    // Format answers array for backend
    const formattedAnswers = questions.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || "X"
    }));

    setApplicationLoading(true);

    try {
        const result = await API.submitQuiz(quiz.id, employeeId, formattedAnswers);
        setApplicationLoading(false);

        // Render Results Modal
        renderQuizResultsModal(result);

        // Reload employee profile & gap analysis in background
        await loadEmployeeData();

    } catch (err) {
        setApplicationLoading(false);
        showToast("Error submitting quiz: " + err.message, "error");
    }
}

function renderQuizResultsModal(result) {
    const res = result.result;
    const pct = res.percentage;
    const isPassing = pct >= 60;

    const content = $("#appContent");
    if (!content) return;

    content.innerHTML = `
        <div class="quiz-results-fullscreen">
            <div class="results-header-bar">
                <button type="button" class="btn btn-secondary" onclick="renderAssessmentsPage()">
                    ← Back to Assessments
                </button>
            </div>

            <div class="results-score-banner ${isPassing ? "passed" : "needs-work"}">
                <div class="results-badge-icon">${isPassing ? "🎉" : "📚"}</div>
                <h2 class="results-score-heading">${pct}% Score</h2>
                <p class="results-score-subheading">
                    You got <strong>${res.score}</strong> out of <strong>${res.total_questions}</strong> questions correct.
                </p>
                ${result.assessment_created ? `
                    <div class="results-notification">
                        ✓ Competency score automatically updated and synced with your role requirement!
                    </div>
                ` : ""}
            </div>

            <div class="card mt-25">
                <div class="card-header">
                    <div class="card-title">Question Review</div>
                </div>
                <div class="card-body">
                    <div class="results-questions-review">
                        ${result.question_results.map((qr, idx) => `
                            <div class="result-question-card ${qr.correct ? "correct" : "incorrect"}">
                                <div class="result-question-header">
                                    <span class="result-number">#${idx + 1}</span>
                                    <span class="result-status-tag ${qr.correct ? "correct" : "incorrect"}">
                                        ${qr.correct ? "✓ Correct" : "✗ Incorrect"}
                                    </span>
                                </div>
                                <div class="result-answers-row mt-5">
                                    <span>Your Answer: <strong>${escapeHTML(qr.your_answer || "Not answered")}</strong></span>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>

            <div class="results-actions mt-25">
                <button type="button" class="btn btn-primary btn-lg" onclick="renderAssessmentsPage()">
                    Done & Return to Dashboard
                </button>
            </div>
        </div>
    `;
}