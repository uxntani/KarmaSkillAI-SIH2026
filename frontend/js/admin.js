/* =========================================================
   KarmaSkill AI - Administration Module
   ========================================================= */

let selectedUploadFile = null;

async function renderAdminPage() {
    const content = $("#appContent");
    if (!content) return;

    content.innerHTML = `
        <section class="initial-loading">
            <div class="loading-spinner"></div>
            <p>Loading administration portal...</p>
        </section>
    `;

    try {
        const [employees, materials, quizzes] = await Promise.all([
            API.getEmployees(),
            API.getMaterials(),
            API.getQuizzes()
        ]);

        AppState.data.employees = employees || [];
        AppState.data.materials = materials || [];
        AppState.data.quizzes = quizzes || [];

        content.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title-row">
                        <span class="page-title-icon">⚙</span>
                        <h1 class="page-title">Administration Portal</h1>
                    </div>
                    <p class="page-subtitle">
                        Manage civil servant records, upload training materials, and generate AI-driven competency quizzes using Google Gemini.
                    </p>
                </div>
            </div>

            <!-- Admin Stats -->
            <div class="summary-grid">
                <div class="summary-card stat-primary">
                    <div class="summary-label">Officers Registered</div>
                    <div class="summary-value">${employees.length}</div>
                    <div class="summary-description">Active employee profiles</div>
                </div>
                <div class="summary-card stat-amber">
                    <div class="summary-label">Ingested Materials</div>
                    <div class="summary-value">${materials.length}</div>
                    <div class="summary-description">PDF training resources</div>
                </div>
                <div class="summary-card stat-success">
                    <div class="summary-label">AI Quizzes Active</div>
                    <div class="summary-value">${quizzes.length}</div>
                    <div class="summary-description">Generated assessments</div>
                </div>
                <div class="summary-card stat-purple">
                    <div class="summary-label">Gemini AI Engine</div>
                    <div class="summary-value" style="font-size:17px;color:#10b981;margin-top:4px">● Active</div>
                    <div class="summary-description">Automated MCQ extraction</div>
                </div>
            </div>

            <!-- PDF Upload & AI Processing Card -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Upload Learning Material (PDF) & Generate Quiz</div>
                        <div class="text-muted">Gemini extracts relevant competencies and automatically creates MCQs with explanations</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="upload-zone" id="pdf-drop-zone">
                        <div class="upload-icon">📄</div>
                        <h3 class="upload-title">Drag & Drop PDF Training Document</h3>
                        <p class="text-muted">or click to browse your computer (.pdf only)</p>
                        <input type="file" id="pdfFileInput" accept=".pdf" style="display:none">
                        <button type="button" class="btn btn-secondary mt-12" onclick="$('#pdfFileInput').click()">
                            Select PDF File
                        </button>
                    </div>

                    <div id="selected-file-info" class="selected-file-info mt-15 hidden">
                        <div class="file-name-row">
                            <span class="file-icon">📎</span>
                            <span id="selected-file-name" class="file-name">filename.pdf</span>
                            <span id="selected-file-size" class="file-size">(0 KB)</span>
                            <button type="button" class="btn-clear" id="clear-file-btn">×</button>
                        </div>

                        <div class="upload-options-row mt-15">
                            <label for="question-count-select" class="form-label">Number of AI Questions:</label>
                            <select id="question-count-select" class="form-select sm" style="width:120px">
                                <option value="3">3 Questions</option>
                                <option value="5" selected>5 Questions</option>
                                <option value="8">8 Questions</option>
                                <option value="10">10 Questions</option>
                            </select>

                            <button type="button" class="btn btn-primary" id="process-pdf-btn">
                                ✦ Analyze & Generate Quiz with AI
                            </button>
                        </div>
                    </div>

                    <div id="ai-processing-state" class="ai-processing-state mt-20 hidden">
                        <div class="loading-spinner"></div>
                        <h4 id="ai-processing-text" class="mt-10">Analyzing PDF and generating questions with Gemini...</h4>
                        <p class="text-muted">Extracting text, detecting competencies, and generating multiple choice questions...</p>
                    </div>

                    <div id="ai-results-container" class="mt-20 hidden"></div>
                </div>
            </div>

            <!-- Ingested Materials Table -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Ingested Learning Materials & Linked Quizzes</div>
                        <div class="text-muted">All uploaded training documents in the KarmaSkill repository</div>
                    </div>
                </div>
                <div class="card-body">
                    ${materials.length ? `
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title / Filename</th>
                                        <th>Pages</th>
                                        <th>Detected Skills</th>
                                        <th>Associated Quiz</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${materials.map(m => `
                                        <tr>
                                            <td><strong>#${m.id}</strong></td>
                                            <td>
                                                <div class="table-title-cell">
                                                    <strong>${escapeHTML(m.title)}</strong>
                                                    <span class="text-muted" style="font-size:11px">${escapeHTML(m.filename)}</span>
                                                </div>
                                            </td>
                                            <td>${m.pages} pgs</td>
                                            <td>
                                                <div class="tags-cluster">
                                                    ${(m.competencies || []).map(c => `
                                                        <span class="competency-pill">${escapeHTML(c.competency_name)}</span>
                                                    `).join("")}
                                                </div>
                                            </td>
                                            <td>
                                                ${(m.quizzes || []).length ? `
                                                    <span class="badge-success">Quiz #${m.quizzes[0].id} (${m.quizzes[0].number_of_questions} Qs)</span>
                                                ` : `<span class="text-muted">None</span>`}
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-title">No Materials Ingested</div>
                        </div>
                    `}
                </div>
            </div>

            <!-- Registered Officers Table -->
            <div class="card mt-25">
                <div class="card-header">
                    <div>
                        <div class="card-title">Registered Civil Servants</div>
                        <div class="text-muted">Officers enrolled in the competency framework</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Department</th>
                                    <th>Role</th>
                                    <th>Experience</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${employees.map(e => `
                                    <tr>
                                        <td><strong>#${e.id}</strong></td>
                                        <td><strong>${escapeHTML(e.name)}</strong></td>
                                        <td>${escapeHTML(e.email)}</td>
                                        <td>${escapeHTML(e.department)}</td>
                                        <td><span class="role-pill">${escapeHTML(e.role)}</span></td>
                                        <td>${e.experience} yrs</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        setupUploadEvents();

    } catch (err) {
        showToast("Error loading admin: " + err.message, "error");
    }
}

function setupUploadEvents() {
    const fileInput = $("#pdfFileInput");
    const dropZone = $("#pdf-drop-zone");
    const infoBox = $("#selected-file-info");
    const nameEl = $("#selected-file-name");
    const sizeEl = $("#selected-file-size");
    const clearBtn = $("#clear-file-btn");
    const processBtn = $("#process-pdf-btn");

    if (!fileInput || !dropZone) return;

    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            showToast("Please upload a PDF file.", "warning");
            return;
        }

        selectedUploadFile = file;
        nameEl.textContent = file.name;
        sizeEl.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        infoBox.classList.remove("hidden");
        dropZone.classList.add("has-file");
    }

    fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    };

    dropZone.ondragleave = () => {
        dropZone.classList.remove("drag-over");
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    if (clearBtn) {
        clearBtn.onclick = () => {
            selectedUploadFile = null;
            fileInput.value = "";
            infoBox.classList.add("hidden");
            dropZone.classList.remove("has-file");
        };
    }

    if (processBtn) {
        processBtn.onclick = async () => {
            if (!selectedUploadFile) {
                showToast("Please select a PDF file first.", "warning");
                return;
            }

            const countSelect = $("#question-count-select");
            const qCount = countSelect ? Number(countSelect.value) : 5;

            const processingState = $("#ai-processing-state");
            const resultsContainer = $("#ai-results-container");

            processingState.classList.remove("hidden");
            resultsContainer.classList.add("hidden");
            processBtn.disabled = true;

            try {
                // Generate quiz but don't save yet - allow human editing first
                const analysisResponse = await API.analyzeAndSaveMaterial(selectedUploadFile, qCount);
                processingState.classList.add("hidden");
                processBtn.disabled = false;
                if (!analysisResponse || !analysisResponse.quiz) {
                    throw new Error("Quiz was generated but no quiz record was returned.");
                }

                // Store the temporary data for editing
                window.tempQuizData = analysisResponse;

                // Render editable preview
                renderEditableQuizPreview(analysisResponse);

            } catch (error) {
                processingState.classList.add("hidden");
                processBtn.disabled = false;
                showToast("AI Processing Failed: " + error.message, "error");
            }
        };
    }
}


function renderEditableQuizPreview(analysisResponse) {
    const resultsContainer = $("#ai-results-container");
    if (!resultsContainer) return;

    const material = analysisResponse.material || {};
    const competencies = analysisResponse.competencies || [];
    const primaryCompetency =
        analysisResponse.primary_competency || "";

    const quiz = analysisResponse.quiz || {};

    const questions =
        quiz.questions ||
        analysisResponse.questions ||
        [];

    const quizId = quiz.id || analysisResponse.quiz_id;

    if (!quizId) {
        showToast(
            "Quiz was generated, but no quiz ID was returned by the server.",
            "error"
        );
        console.error("Missing quiz ID:", analysisResponse);
        return;
    }

    /*
     * Store everything needed for editing.
     */
    window.editableQuizData = {
        quiz_id: quizId,

        material: material,

        title:
            quiz.title ||
            analysisResponse.title ||
            `${material.title || "Training Material"} - AI Assessment`,

        tags: quiz.tags || (
            primaryCompetency
                ? [primaryCompetency]
                : []
        ),

        competencies: competencies,

        primary_competency: primaryCompetency,

        questions: JSON.parse(
            JSON.stringify(questions)
        )
    };

    resultsContainer.classList.remove("hidden");

    resultsContainer.innerHTML = `
        <div class="ai-success-banner mt-15">
            <div class="success-icon">✓</div>

            <div>
                <h4>
                    AI Quiz Generated - Review Before Finalizing
                </h4>

                <p>
                    Extracted
                    ${material.pages || 0}
                    pages.

                    ${primaryCompetency
                        ? `Primary Competency:
                           <strong>
                               ${escapeHTML(primaryCompetency)}
                           </strong>.`
                        : ""
                    }

                    Quiz ID:
                    <strong>#${quizId}</strong>
                </p>
            </div>
        </div>


        <!-- QUIZ DETAILS -->

        <div class="card mt-15">

            <div class="card-header">
                <div>

                    <div class="card-title">
                        Step 1: Quiz Details
                    </div>

                    <div class="text-muted">
                        Edit the quiz title and assign its competency.
                    </div>

                </div>
            </div>


            <div class="card-body">

                <!-- TITLE -->

                <div class="form-group">

                    <label
                        for="quiz-title-input"
                        class="form-label"
                    >
                        Quiz Title
                    </label>

                    <input
                        type="text"
                        id="quiz-title-input"
                        class="form-input"
                        value="${escapeHTML(
                            window.editableQuizData.title
                        )}"
                        placeholder="Enter quiz title"
                    />

                </div>


                <!-- COMPETENCY -->

                <div class="form-group mt-15">

                    <label
                        for="quiz-competency-select"
                        class="form-label"
                    >
                        Tag / Competency
                    </label>

                    <select
                        id="quiz-competency-select"
                        class="form-select"
                    >

                        <option value="">
                            Select competency
                        </option>

                        ${competencies.map(c => {

                            const competencyName =
                                typeof c === "string"
                                    ? c
                                    : (
                                        c.competency_name ||
                                        c.name ||
                                        ""
                                    );

                            const selected =
                                window.editableQuizData.tags.includes(
                                    competencyName
                                );

                            return `
                                <option
                                    value="${escapeHTML(
                                        competencyName
                                    )}"
                                    ${selected ? "selected" : ""}
                                >
                                    ${escapeHTML(
                                        competencyName
                                    )}
                                </option>
                            `;

                        }).join("")}

                    </select>

                </div>

            </div>

        </div>


        <!-- QUESTIONS -->

        <div class="card mt-15">

            <div class="card-header">

                <div>

                    <div class="card-title">
                        Step 2: Review & Edit Questions
                    </div>

                    <div class="text-muted">
                        Edit the generated questions,
                        options, answers and difficulty.
                    </div>

                </div>

            </div>


            <div class="card-body">

                <div
                    id="editable-questions-container"
                ></div>

            </div>

        </div>


        <!-- ACTIONS -->

        <div class="admin-quiz-actions mt-20">

            <button
                type="button"
                id="save-quiz-btn"
                class="btn btn-success btn-lg"
            >
                ✓ Confirm & Save Quiz
            </button>

            <button
                type="button"
                id="discard-quiz-btn"
                class="btn btn-secondary btn-lg"
            >
                Discard
            </button>

        </div>
    `;

    renderEditableQuestions();

    setupQuizEditingListeners();
}

function renderEditableQuestions() {

    const container =
        $("#editable-questions-container");

    if (
        !container ||
        !window.editableQuizData
    ) {
        return;
    }

    const questions =
        window.editableQuizData.questions || [];

    if (!questions.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-title">
                    No questions available
                </div>

                <p class="text-muted">
                    The AI did not generate any questions.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        questions.map((q, idx) => {

            const options =
                q.options || {};

            return `

                <div
                    class="editable-question-card mt-15"
                    data-question-index="${idx}"
                >

                    <div class="question-card-header">

                        <strong>
                            Question ${idx + 1}
                        </strong>

                    </div>


                    <!-- QUESTION -->

                    <div class="form-group mt-10">

                        <label class="form-label">
                            Question Text
                        </label>

                        <textarea
                            class="form-textarea question-text-input"
                            data-question-index="${idx}"
                            rows="3"
                        >${escapeHTML(
                            q.question || ""
                        )}</textarea>

                    </div>


                    <!-- OPTIONS -->

                    <div class="options-grid mt-10">

                        ${["A", "B", "C", "D"]
                            .map(key => `
                                <div class="form-group">

                                    <label class="form-label">
                                        Option ${key}
                                    </label>

                                    <input
                                        type="text"
                                        class="form-input option-input"
                                        data-question-index="${idx}"
                                        data-option="${key}"
                                        value="${escapeHTML(
                                            options[key] || ""
                                        )}"
                                    />

                                </div>
                            `)
                            .join("")
                        }

                    </div>


                    <!-- CORRECT ANSWER -->

                    <div class="form-group mt-10">

                        <label class="form-label">
                            Correct Answer
                        </label>

                        <select
                            class="form-select correct-answer-select"
                            data-question-index="${idx}"
                        >

                            ${["A", "B", "C", "D"]
                                .map(key => `
                                    <option
                                        value="${key}"
                                        ${
                                            q.correct_answer === key
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${key}
                                    </option>
                                `)
                                .join("")
                            }

                        </select>

                    </div>


                    <!-- DIFFICULTY -->

                    <div class="form-group mt-10">

                        <label class="form-label">
                            Difficulty
                        </label>

                        <select
                            class="form-select difficulty-select"
                            data-question-index="${idx}"
                        >

                            <option
                                value="Easy"
                                ${
                                    q.difficulty === "Easy"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Easy
                            </option>

                            <option
                                value="Medium"
                                ${
                                    q.difficulty === "Medium"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Medium
                            </option>

                            <option
                                value="Hard"
                                ${
                                    q.difficulty === "Hard"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Hard
                            </option>

                        </select>

                    </div>


                    <!-- EXPLANATION -->

                    <div class="form-group mt-10">

                        <label class="form-label">
                            Explanation
                        </label>

                        <textarea
                            class="form-textarea explanation-input"
                            data-question-index="${idx}"
                            rows="2"
                        >${escapeHTML(
                            q.explanation || ""
                        )}</textarea>

                    </div>

                </div>

            `;

        }).join("");


    /*
     * Question text
     */

    $$(".question-text-input")
        .forEach(input => {

            input.addEventListener(
                "input",
                e => {

                    const idx =
                        Number(
                            e.target.dataset.questionIndex
                        );

                    window.editableQuizData
                        .questions[idx]
                        .question =
                            e.target.value;
                }
            );

        });


    /*
     * Options A-D
     */

    $$(".option-input")
        .forEach(input => {

            input.addEventListener(
                "input",
                e => {

                    const idx =
                        Number(
                            e.target.dataset.questionIndex
                        );

                    const option =
                        e.target.dataset.option;

                    window.editableQuizData
                        .questions[idx]
                        .options[option] =
                            e.target.value;
                }
            );

        });


    /*
     * Correct answer
     */

    $$(".correct-answer-select")
        .forEach(select => {

            select.addEventListener(
                "change",
                e => {

                    const idx =
                        Number(
                            e.target.dataset.questionIndex
                        );

                    window.editableQuizData
                        .questions[idx]
                        .correct_answer =
                            e.target.value;
                }
            );

        });


    /*
     * Difficulty
     */

    $$(".difficulty-select")
        .forEach(select => {

            select.addEventListener(
                "change",
                e => {

                    const idx =
                        Number(
                            e.target.dataset.questionIndex
                        );

                    window.editableQuizData
                        .questions[idx]
                        .difficulty =
                            e.target.value;
                }
            );

        });


    /*
     * Explanation
     */

    $$(".explanation-input")
        .forEach(input => {

            input.addEventListener(
                "input",
                e => {

                    const idx =
                        Number(
                            e.target.dataset.questionIndex
                        );

                    window.editableQuizData
                        .questions[idx]
                        .explanation =
                            e.target.value;
                }
            );

        });
}

function setupQuizEditingListeners() {

    /*
     * Quiz title
     */

    const titleInput =
        $("#quiz-title-input");

    if (titleInput) {

        titleInput.addEventListener(
            "input",
            e => {

                window.editableQuizData.title =
                    e.target.value.trim();

            }
        );

    }


    /*
     * Competency selector
     */

    const competencySelect =
        $("#quiz-competency-select");

    if (competencySelect) {

        competencySelect.addEventListener(
            "change",
            e => {

                const value =
                    e.target.value.trim();

                window.editableQuizData.tags =
                    value ? [value] : [];

                window.editableQuizData.primary_competency =
                    value || null;

            }
        );

    }


    /*
     * CONFIRM & SAVE
     */

    const saveBtn =
        $("#save-quiz-btn");

    if (saveBtn) {

        saveBtn.addEventListener(
            "click",
            async () => {

                const data =
                    window.editableQuizData;

                if (!data) {
                    showToast(
                        "No quiz is available to save.",
                        "error"
                    );
                    return;
                }


                /*
                 * Validate quiz ID
                 */

                if (!data.quiz_id) {

                    showToast(
                        "Quiz ID is missing. The generated quiz cannot be updated.",
                        "error"
                    );

                    console.error(
                        "Missing quiz ID:",
                        data
                    );

                    return;
                }


                /*
                 * Validate title
                 */

                if (!data.title.trim()) {

                    showToast(
                        "Please enter a quiz title.",
                        "error"
                    );

                    titleInput?.focus();

                    return;
                }


                /*
                 * Validate competency
                 */

                if (!data.tags.length) {

                    showToast(
                        "Please select a competency.",
                        "error"
                    );

                    competencySelect?.focus();

                    return;
                }


                /*
                 * Validate questions
                 */

                if (
                    !data.questions ||
                    data.questions.length === 0
                ) {

                    showToast(
                        "Quiz must contain at least one question.",
                        "error"
                    );

                    return;
                }


                /*
                 * Validate each question
                 */

                for (
                    let i = 0;
                    i < data.questions.length;
                    i++
                ) {

                    const q =
                        data.questions[i];

                    if (!q.question?.trim()) {

                        showToast(
                            `Question ${i + 1} cannot be empty.`,
                            "error"
                        );

                        return;
                    }


                    for (
                        const option
                        of ["A", "B", "C", "D"]
                    ) {

                        if (
                            !q.options ||
                            !q.options[option]?.trim()
                        ) {

                            showToast(
                                `Question ${i + 1}: Option ${option} cannot be empty.`,
                                "error"
                            );

                            return;
                        }

                    }


                    if (
                        !["A", "B", "C", "D"]
                            .includes(q.correct_answer)
                    ) {

                        showToast(
                            `Question ${i + 1}: Please select a valid correct answer.`,
                            "error"
                        );

                        return;
                    }


                    if (
                        !["Easy", "Medium", "Hard"]
                            .includes(q.difficulty)
                    ) {

                        showToast(
                            `Question ${i + 1}: Please select a difficulty.`,
                            "error"
                        );

                        return;
                    }

                }


                /*
                 * Disable button while saving
                 */

                saveBtn.disabled = true;

                saveBtn.textContent =
                    "Saving...";


                try {

                    /*
                     * PUT /quizzes/{quiz_id}
                     */

                    await API.updateQuiz(
                        data.quiz_id,
                        {
                            title: data.title,
                            tags: data.tags,
                            competency:
                                data.primary_competency,
                            questions:
                                data.questions
                        }
                    );


                    showToast(
                        "Quiz confirmed and saved successfully!",
                        "success"
                    );


                    /*
                     * Clear temporary state
                     */

                    window.editableQuizData =
                        null;

                    window.tempQuizData =
                        null;


                    /*
                     * Hide editor
                     */

                    const resultsContainer =
                        $("#ai-results-container");

                    if (resultsContainer) {
                        resultsContainer.classList.add(
                            "hidden"
                        );
                    }


                    /*
                     * Reload admin data
                     */

                    setTimeout(
                        () => renderAdminPage(),
                        800
                    );

                } catch (error) {

                    console.error(
                        "Quiz update failed:",
                        error
                    );

                    showToast(
                        "Failed to save quiz: " +
                        error.message,
                        "error"
                    );

                    saveBtn.disabled =
                        false;

                    saveBtn.textContent =
                        "✓ Confirm & Save Quiz";
                }

            }
        );

    }


    /*
     * DISCARD
     */

    const discardBtn =
        $("#discard-quiz-btn");

    if (discardBtn) {

        discardBtn.addEventListener(
            "click",
            async () => {

                const data =
                    window.editableQuizData;

                if (!data?.quiz_id) {

                    /*
                     * Nothing exists in DB.
                     * Just close the editor.
                     */

                    window.editableQuizData =
                        null;

                    window.tempQuizData =
                        null;

                    $("#ai-results-container")
                        ?.classList.add("hidden");

                    return;
                }


                const confirmed =
                    confirm(
                        "Discard this generated quiz? It will be removed from the database."
                    );

                if (!confirmed) {
                    return;
                }


                discardBtn.disabled =
                    true;

                discardBtn.textContent =
                    "Discarding...";


                try {

                    await API.deleteQuiz(
                        data.quiz_id
                    );


                    window.editableQuizData =
                        null;

                    window.tempQuizData =
                        null;


                    $("#ai-results-container")
                        ?.classList.add("hidden");


                    showToast(
                        "Generated quiz discarded.",
                        "info"
                    );

                } catch (error) {

                    console.error(
                        "Quiz deletion failed:",
                        error
                    );

                    showToast(
                        "Failed to discard quiz: " +
                        error.message,
                        "error"
                    );

                    discardBtn.disabled =
                        false;

                    discardBtn.textContent =
                        "Discard";
                }

            }
        );

    }

}