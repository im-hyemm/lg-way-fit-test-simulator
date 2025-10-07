document.addEventListener("DOMContentLoaded", () => {
  const EXAM_SUBJECTS = ["언어 이해", "언어 추리", "자료 해석", "창의 수리"];
  const PRACTICE_SUBJECTS = ["연습 모드"];
  const QUESTIONS_PER_SUBJECT = 20;
  const SUBJECT_DURATION = 20 * 60;
  const BREAK_DURATION = 60;

  const state = {
    mode: null,
    subjects: [],
    currentSubjectIndex: 0,
    currentQuestionIndex: 0,
    remainingTime: 0,
    timerInterval: null,
    practiceTimerInterval: null,
    questionStartTime: null,
    isBreak: false,
    isPaused: false,
    userAnswers: {},
    timePerQuestion: {},
    correctAnswers: {},
    maxReachedQuestion: {},
    questionsPerSubject: {},
  };

  const dom = {
    pages: document.querySelectorAll(".page"),
    startScreen: document.getElementById("start-screen"),
    examModeBtn: document.getElementById("exam-mode-btn"),
    practiceModeBtn: document.getElementById("practice-mode-btn"),
    appContainer: document.getElementById("app-container"),
    breakScreen: document.getElementById("break-screen"),
    answerInputPage: document.getElementById("answer-input-page"),
    resultPage: document.getElementById("result-page"),
    subjectTitle: document.getElementById("subject-title"),
    timer: document.getElementById("timer"),
    practiceHeaderTime: document.getElementById("practice-header-time"),
    practiceHeaderValue: document.getElementById("practice-header-value"),
    practiceExitBtn: document.getElementById("practice-exit-btn"),
    pauseBtn: document.getElementById("pause-btn"),
    pauseBreakBtn: document.getElementById("pause-break-btn"),
    skipBreakBtn: document.getElementById("skip-break-btn"),
    breakTimer: document.getElementById("break-timer"),
    nextSubjectInfo: document.getElementById("next-subject-info"),
    questionNumber: document.getElementById("question-number"),
    options: document.querySelectorAll('input[name="answer"]'),
    answerOptionsContainer: document.getElementById("answer-options"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),
    questionJump: document.getElementById("question-jump"),
    answerChoice: document.getElementById("answer-choice"),
    answerChoiceTitle: document.querySelector("#answer-choice h2"),
    answerChoiceDesc: document.querySelector(".answer-choice-desc"),
    showTimeOnlyBtn: document.getElementById("show-time-only-btn"),
    startScoringBtn: document.getElementById("start-scoring-btn"),
    answerFormContainer: document.getElementById("answer-form-container"),
    answerForm: document.getElementById("answer-form"),
    submitAnswersBtn: document.getElementById("submit-answers-btn"),
    resultPageContent: document.getElementById("result-page-content"),
    resultPageTitle: document.querySelector(".result-page h2"),
    tabButtons: document.querySelectorAll(".tab-btn"),
    tabPanes: document.querySelectorAll(".tab-pane"),
    memoText: document.querySelector("#memo textarea"),
    canvas: document.getElementById("paint-canvas"),
    calcDisplay: document.getElementById("calc-display"),
    calcButtons: document.querySelector(".calc-buttons"),
    penBtn: document.getElementById("pen-btn"),
    eraserBtn: document.getElementById("eraser-btn"),
    clearCanvasBtn: document.getElementById("clear-canvas-btn"),
  };

  const ctx = dom.canvas.getContext("2d");
  let isDrawing = false;
  let lastPointer = { x: 0, y: 0 };
  let lastCheckedOption = null;

  attachEventHandlers();
  setupTabs();
  setupCanvas();
  setupCalculator();
  setupOptionToggle();

  function attachEventHandlers() {
    dom.examModeBtn.addEventListener("click", () => initSession("exam"));
    dom.practiceModeBtn.addEventListener("click", () => initSession("practice"));
    dom.nextBtn.addEventListener("click", nextQuestion);
    dom.prevBtn.addEventListener("click", prevQuestion);
    dom.questionJump.addEventListener("change", handleQuestionJump);
    dom.pauseBtn.addEventListener("click", toggleExamPause);
    dom.pauseBreakBtn.addEventListener("click", toggleBreakPause);
    dom.skipBreakBtn.addEventListener("click", skipBreak);
    dom.practiceExitBtn.addEventListener("click", () => {
      if (confirm("연습을 종료하시겠습니까?")) {
        saveActiveQuestion();
        finishPractice();
      }
    });
    dom.showTimeOnlyBtn.addEventListener("click", () => showResults(false));
    dom.startScoringBtn.addEventListener("click", showScoringForm);
    dom.submitAnswersBtn.addEventListener("click", submitAnswers);
  }

  function initSession(mode) {
    resetState(mode);
    state.subjects.forEach((subject) => {
      state.questionsPerSubject[subject] = QUESTIONS_PER_SUBJECT;
      state.maxReachedQuestion[subject] = 1;
      ensureSubjectData(subject);
    });
    applyModeUI();
    switchPage(dom.appContainer);
    startSubject();
  }

  function resetState(mode) {
    clearInterval(state.timerInterval);
    clearInterval(state.practiceTimerInterval);
    state.mode = mode;
    state.subjects = mode === "exam" ? [...EXAM_SUBJECTS] : [...PRACTICE_SUBJECTS];
    state.currentSubjectIndex = 0;
    state.currentQuestionIndex = 0;
    state.remainingTime = 0;
    state.timerInterval = null;
    state.practiceTimerInterval = null;
    state.questionStartTime = null;
    state.isBreak = false;
    state.isPaused = false;
    state.userAnswers = {};
    state.timePerQuestion = {};
    state.correctAnswers = {};
    state.maxReachedQuestion = {};
    state.questionsPerSubject = {};
    dom.questionJump.innerHTML = "";
    dom.questionJump.disabled = true;
    dom.practiceHeaderValue.textContent = "00:00";
    dom.practiceHeaderTime.classList.remove("active");
    dom.pauseBtn.textContent = "⏸";
    dom.pauseBreakBtn.textContent = "⏸";
  }

  function applyModeUI() {
    const isPractice = state.mode === "practice";
    dom.subjectTitle.style.display = isPractice ? "none" : "inline-block";
    dom.timer.style.display = isPractice ? "none" : "inline-block";
    dom.pauseBtn.style.display = isPractice ? "none" : "inline-flex";
    dom.practiceHeaderTime.style.display = isPractice ? "inline-flex" : "none";
    dom.practiceExitBtn.style.display = isPractice ? "inline-flex" : "none";
  }

  function startSubject() {
    state.isBreak = false;
    state.isPaused = false;
    dom.pauseBtn.textContent = "⏸";
    applyModeUI();
    const subject = getCurrentSubject();
    ensureSubjectData(subject);
    state.currentQuestionIndex = 0;
    state.maxReachedQuestion[subject] = Math.max(
      state.maxReachedQuestion[subject] || 0,
      state.currentQuestionIndex + 1,
    );
    dom.questionJump.disabled = false;
    dom.practiceHeaderValue.textContent = "00:00";
    populateQuestionJump();
    updateQuestionDisplay();
    setTimeout(resizeCanvas, 0);
    resetTools();
    if (state.mode === "exam") {
      dom.subjectTitle.textContent = subject;
      state.remainingTime = SUBJECT_DURATION;
      updateTimerDisplay();
      startTimer();
    } else {
      dom.subjectTitle.textContent = "";
    }
  }

  function ensureSubjectData(subject) {
    if (!state.userAnswers[subject]) {
      state.userAnswers[subject] = {};
    }
    if (!state.timePerQuestion[subject]) {
      state.timePerQuestion[subject] = {};
    }
    if (!state.maxReachedQuestion[subject]) {
      state.maxReachedQuestion[subject] = 1;
    }
    if (!state.questionsPerSubject[subject]) {
      state.questionsPerSubject[subject] = QUESTIONS_PER_SUBJECT;
    }
  }

  function getCurrentSubject() {
    return state.subjects[state.currentSubjectIndex];
  }

  function populateQuestionJump() {
    const subject = getCurrentSubject();
    const options = [];
    const maxQuestion = Math.max(
      getMaxReachedQuestion(subject),
      state.currentQuestionIndex + 1,
    );
    for (let i = 1; i <= maxQuestion; i += 1) {
      const answered = getAnswerForQuestion(subject, i) !== "-";
      const label = answered ? `${i}번 ✔️` : `${i}번`;
      options.push(`<option value="${i}">${label}</option>`);
    }
    dom.questionJump.innerHTML = options.join("");
    dom.questionJump.value = String(state.currentQuestionIndex + 1);
  }

  function updateQuestionDisplay() {
    const subject = getCurrentSubject();
    const questionNumber = state.currentQuestionIndex + 1;
    dom.questionNumber.textContent = `문제 ${questionNumber}`;
    const savedAnswer = getAnswerForQuestion(subject, questionNumber);
    let matchedOption = null;
    dom.options.forEach((option) => {
      const checked =
        savedAnswer !== "-" && Number(option.value) === savedAnswer;
      option.checked = checked;
      if (checked) {
        matchedOption = option;
      }
    });
    lastCheckedOption = matchedOption;
    populateQuestionJump();
    updateNavigationState();
    startQuestionTimer();
  }

  function updateNavigationState() {
    dom.prevBtn.disabled = state.currentQuestionIndex === 0;
    dom.questionJump.value = String(state.currentQuestionIndex + 1);
  }

  function startQuestionTimer() {
    state.questionStartTime = Date.now();
    if (state.mode === "practice") {
      updatePracticeHeaderTime();
      startPracticeTimer();
    }
  }

  function startPracticeTimer() {
    clearInterval(state.practiceTimerInterval);
    updatePracticeHeaderTime();
    state.practiceTimerInterval = setInterval(updatePracticeHeaderTime, 1000);
  }

  function stopPracticeTimer() {
    clearInterval(state.practiceTimerInterval);
    state.practiceTimerInterval = null;
  }

  function updatePracticeHeaderTime() {
    if (state.mode !== "practice") return;
    const subject = getCurrentSubject();
    const questionNumber = state.currentQuestionIndex + 1;
    const base = state.timePerQuestion[subject][questionNumber] || 0;
    const running = state.questionStartTime
      ? Math.max(0, Math.round((Date.now() - state.questionStartTime) / 1000))
      : 0;
    dom.practiceHeaderValue.textContent = formatSeconds(base + running);
  }

  function startTimer() {
    clearInterval(state.timerInterval);
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
      if (!state.isPaused) {
        state.remainingTime -= 1;
        if (state.remainingTime < 0) state.remainingTime = 0;
        updateTimerDisplay();
        if (state.remainingTime === 0) {
          clearInterval(state.timerInterval);
          handleTimerComplete();
        }
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  function updateTimerDisplay() {
    const display = formatSeconds(state.remainingTime);
    if (state.isBreak) {
      dom.breakTimer.textContent = display;
    } else {
      dom.timer.textContent = display;
    }
  }

  function handleTimerComplete() {
    if (state.isBreak) {
      state.isBreak = false;
      dom.pauseBreakBtn.textContent = "⏸";
      state.currentSubjectIndex += 1;
      if (state.currentSubjectIndex >= state.subjects.length) {
        finishExam();
      } else {
        switchPage(dom.appContainer);
        applyModeUI();
        startSubject();
      }
    } else {
      saveActiveQuestion();
      const subject = getCurrentSubject();
      const questionLimit = getSubjectQuestionLimit(subject);
      if (state.currentQuestionIndex >= questionLimit - 1) {
        if (state.currentSubjectIndex >= state.subjects.length - 1) {
          finishExam();
        } else {
          startBreak();
        }
      } else {
        changeQuestion(state.currentQuestionIndex + 1);
      }
    }
  }

  function toggleExamPause() {
    if (state.mode !== "exam" || state.isBreak) return;
    state.isPaused = !state.isPaused;
    dom.pauseBtn.textContent = state.isPaused ? "▶" : "⏸";
  }

  function toggleBreakPause() {
    if (!state.isBreak) return;
    state.isPaused = !state.isPaused;
    dom.pauseBreakBtn.textContent = state.isPaused ? "▶" : "⏸";
  }

  function startBreak() {
    state.isBreak = true;
    state.isPaused = false;
    stopPracticeTimer();
    stopTimer();
    state.remainingTime = BREAK_DURATION;
    dom.pauseBtn.style.display = "none";
    dom.pauseBreakBtn.textContent = "⏸";
    dom.nextSubjectInfo.textContent = `다음 과목: ${state.subjects[state.currentSubjectIndex + 1]}`;
    switchPage(dom.breakScreen);
    updateTimerDisplay();
    startTimer();
  }

  function skipBreak() {
    if (!state.isBreak) return;
    stopTimer();
    state.isBreak = false;
    state.currentSubjectIndex += 1;
    if (state.currentSubjectIndex >= state.subjects.length) {
      finishExam();
    } else {
      switchPage(dom.appContainer);
      applyModeUI();
      startSubject();
    }
  }

  function nextQuestion() {
    if (!state.mode || state.isBreak) return;
    if (state.mode === "exam" && !validateAnswerBeforeMove()) {
      return;
    }
    const subject = getCurrentSubject();
    const questionLimit = getSubjectQuestionLimit(subject);
    if (state.currentQuestionIndex >= questionLimit - 1) {
      saveActiveQuestion();
      if (state.mode === "practice") {
        if (confirm("마지막 문항입니다. 연습을 종료할까요?")) {
          finishPractice();
        } else {
          startQuestionTimer();
        }
      } else {
        if (state.currentSubjectIndex >= state.subjects.length - 1) {
          finishExam();
        } else {
          startBreak();
        }
      }
    } else {
      changeQuestion(state.currentQuestionIndex + 1);
    }
  }

  function prevQuestion() {
    if (state.currentQuestionIndex === 0 || state.isBreak) return;
    changeQuestion(state.currentQuestionIndex - 1);
  }

  function handleQuestionJump(event) {
    const target = Number(event.target.value);
    if (Number.isNaN(target)) return;
    const targetIndex = target - 1;
    if (targetIndex === state.currentQuestionIndex) return;
    changeQuestion(targetIndex);
  }

  function changeQuestion(targetIndex) {
    const subject = getCurrentSubject();
    const questionLimit = getSubjectQuestionLimit(subject);
    if (
      targetIndex < 0 ||
      targetIndex >= questionLimit ||
      targetIndex === state.currentQuestionIndex
    ) {
      return;
    }
    saveActiveQuestion();
    state.currentQuestionIndex = targetIndex;
    state.maxReachedQuestion[subject] = Math.max(
      state.maxReachedQuestion[subject] || 0,
      targetIndex + 1,
    );
    resetTools();
    updateQuestionDisplay();
  }

  function validateAnswerBeforeMove() {
    const selected = getSelectedOption();
    if (!selected) {
      return confirm("답안을 선택하지 않았습니다.\n다음 문항으로 이동할까요?");
    }
    return true;
  }

  function saveActiveQuestion() {
    const subject = getCurrentSubject();
    ensureSubjectData(subject);
    const questionNumber = state.currentQuestionIndex + 1;
    if (!state.timePerQuestion[subject][questionNumber]) {
      state.timePerQuestion[subject][questionNumber] = 0;
    }
    if (state.questionStartTime) {
      const elapsed = Math.max(
        0,
        Math.round((Date.now() - state.questionStartTime) / 1000),
      );
      state.timePerQuestion[subject][questionNumber] += elapsed;
      state.questionStartTime = null;
    }
    const selected = getSelectedOption();
    state.userAnswers[subject][questionNumber] = selected
      ? Number(selected.value)
      : "-";
    state.maxReachedQuestion[subject] = Math.max(
      state.maxReachedQuestion[subject] || 0,
      questionNumber,
    );
    if (state.mode === "practice") {
      stopPracticeTimer();
      updatePracticeHeaderTime();
    }
    populateQuestionJump();
  }

  function getSelectedOption() {
    return Array.from(dom.options).find((option) => option.checked) || null;
  }

  function finishPractice() {
    stopPracticeTimer();
    stopTimer();
    state.isBreak = false;
    prepareAnswerChoiceText("practice");
    switchPage(dom.answerInputPage);
  }

  function finishExam() {
    stopPracticeTimer();
    stopTimer();
    state.isBreak = false;
    prepareAnswerChoiceText("exam");
    switchPage(dom.answerInputPage);
  }

  function prepareAnswerChoiceText(mode) {
    if (mode === "practice") {
      dom.answerChoiceTitle.textContent = "연습이 종료되었습니다.";
      dom.answerChoiceDesc.textContent = "정답을 입력하여 채점을 진행하시겠어요?";
    } else {
      dom.answerChoiceTitle.textContent = "시험이 종료되었습니다.";
      dom.answerChoiceDesc.textContent = "정답을 입력하여 채점을 진행하시겠어요?";
    }
    dom.answerChoice.style.display = "flex";
    dom.answerChoice.style.flexDirection = "column";
    dom.answerChoice.style.alignItems = "center";
    dom.answerChoice.style.gap = "16px";
    dom.answerFormContainer.style.display = "none";
  }

  function showScoringForm() {
    dom.answerChoice.style.display = "none";
    dom.answerFormContainer.style.display = "flex";
    const parts = [];
    state.subjects.forEach((subject) => {
      const subjectId = subject.replace(/\s+/g, "-").toLowerCase();
      const questionCount = getScoringQuestionCount(subject);
      parts.push(`<h3>${subject}</h3>`);
      parts.push('<div class="answer-grid">');
      for (let i = 1; i <= questionCount; i += 1) {
        parts.push(
          `<div class="answer-item"><label for="${subjectId}-${i}">${i}번</label><input type="number" id="${subjectId}-${i}" min="1" max="5" inputmode="numeric"></div>`,
        );
      }
      parts.push("</div>");
    });
    dom.answerForm.innerHTML = parts.join("");
  }

  function getSubjectQuestionLimit(subject) {
    return state.questionsPerSubject[subject] || QUESTIONS_PER_SUBJECT;
  }

  function getAnswerForQuestion(subject, questionNumber) {
    const answers = state.userAnswers[subject] || {};
    const value = answers[questionNumber];
    return value === undefined ? "-" : value;
  }

  function getTimeForQuestion(subject, questionNumber) {
    const times = state.timePerQuestion[subject] || {};
    const value = times[questionNumber];
    return typeof value === "number" ? value : 0;
  }

  function getMaxReachedQuestion(subject) {
    const explicit = state.maxReachedQuestion[subject] || 0;
    const answerKeys = state.userAnswers[subject]
      ? Object.keys(state.userAnswers[subject]).map((key) => Number(key))
      : [];
    const timeKeys = state.timePerQuestion[subject]
      ? Object.keys(state.timePerQuestion[subject]).map((key) => Number(key))
      : [];
    const highestRecorded = Math.max(0, ...answerKeys, ...timeKeys);
    return Math.max(explicit, highestRecorded, 1);
  }

  function getScoringQuestionCount(subject) {
    if (state.mode === "practice") {
      return getMaxReachedQuestion(subject);
    }
    return Math.max(getSubjectQuestionLimit(subject), 1);
  }

  function submitAnswers() {
    const inputs = dom.answerForm.querySelectorAll('input[type="number"]');
    const allFilled = Array.from(inputs).every(
      (input) => input.value.trim() !== "",
    );
    if (!allFilled) {
      alert("모든 정답을 입력해 주세요.");
      return;
    }
    state.correctAnswers = {};
    state.subjects.forEach((subject) => {
      const subjectId = subject.replace(/\s+/g, "-").toLowerCase();
      state.correctAnswers[subject] = {};
      const questionCount = getScoringQuestionCount(subject);
      for (let i = 1; i <= questionCount; i += 1) {
        const input = document.getElementById(`${subjectId}-${i}`);
        state.correctAnswers[subject][i] = input ? Number(input.value) : undefined;
      }
    });
    showResults(true);
  }

  function showResults(shouldScore) {
    stopTimer();
    stopPracticeTimer();
    switchPage(dom.resultPage);
    dom.resultPageTitle.textContent =
      state.mode === "practice" ? "연습 결과" : "시험 결과";

    let summaryHTML = "";
    if (shouldScore) {
      let totalCorrect = 0;
      let totalQuestions = 0;
      const subjectSummaries = [];
      state.subjects.forEach((subject) => {
        const questionCount = getMaxReachedQuestion(subject);
        const correctMap = state.correctAnswers[subject] || {};
        let correctCount = 0;
        for (let i = 1; i <= questionCount; i += 1) {
          const answer = getAnswerForQuestion(subject, i);
          const correct = correctMap[i];
          if (
            answer !== "-" &&
            typeof correct === "number" &&
            Number(answer) === correct
          ) {
            correctCount += 1;
          }
        }
        totalCorrect += correctCount;
        totalQuestions += questionCount;
        subjectSummaries.push(
          `<p><strong>${subject}</strong> ${correctCount} / ${questionCount}</p>`,
        );
      });
      summaryHTML = `<h3>총점 ${totalCorrect} / ${totalQuestions}</h3>${subjectSummaries.join("")}`;
    } else if (state.mode === "practice") {
      summaryHTML =
        "<p>연습 모드에서는 정답 비교 없이 문제별 풀이 시간과 답안을 확인할 수 있습니다.</p>";
    } else {
      summaryHTML = "<p>정답 비교 없이 응시 기록을 확인합니다.</p>";
    }

    const detailParts = ['<h3>문항별 상세 결과</h3>'];
    state.subjects.forEach((subject) => {
      const questionCount = getMaxReachedQuestion(subject);
      const correctMap = state.correctAnswers[subject] || {};
      detailParts.push(`<h4>${subject}</h4>`);
      detailParts.push('<table class="result-table"><thead><tr>');
      detailParts.push("<th>문항</th><th>선택 답안</th>");
      if (shouldScore) {
        detailParts.push("<th>정답</th><th>정오</th>");
      }
      detailParts.push("<th>소요 시간</th></tr></thead><tbody>");
      for (let i = 1; i <= questionCount; i += 1) {
        const answer = getAnswerForQuestion(subject, i);
        const elapsedSeconds = getTimeForQuestion(subject, i);
        detailParts.push("<tr>");
        detailParts.push(`<td>${i}</td>`);
        detailParts.push(`<td>${answer === "-" ? "-" : answer}</td>`);
        if (shouldScore) {
          const correct = correctMap[i];
          const isCorrect =
            answer !== "-" &&
            typeof correct === "number" &&
            Number(answer) === correct;
          detailParts.push(`<td>${correct ?? "-"}</td>`);
          detailParts.push(`<td>${isCorrect ? "O" : "X"}</td>`);
        }
        detailParts.push(`<td>${formatSeconds(elapsedSeconds)}</td>`);
        detailParts.push("</tr>");
      }
      detailParts.push("</tbody></table>");
    });

    dom.resultPageContent.innerHTML = `
      ${summaryHTML ? `<div class="result-summary">${summaryHTML}</div>` : ""}
      <div class="result-details">${detailParts.join("")}</div>
    `;
  }

  function formatSeconds(totalSeconds) {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
    const seconds = String(safeSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function switchPage(page) {
    dom.pages.forEach((p) => {
      p.classList.remove("active");
      if (typeof p.scrollTop === "number") {
        p.scrollTop = 0;
      }
    });
    page.classList.add("active");
    if (typeof page.scrollTop === "number") {
      page.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }

  function resetTools() {
    dom.memoText.value = "";
    dom.calcDisplay.value = "";
    dom.penBtn.classList.add("active");
    dom.eraserBtn.classList.remove("active");
    clearCanvas();
  }

  function setupOptionToggle() {
    dom.options.forEach((option) => {
      option.addEventListener("click", () => {
        if (lastCheckedOption === option) {
          option.checked = false;
          lastCheckedOption = null;
          return;
        }
        lastCheckedOption = option;
      });
    });
  }

  function setupTabs() {
    dom.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        dom.tabButtons.forEach((btn) => btn.classList.remove("active"));
        dom.tabPanes.forEach((pane) => pane.classList.remove("active"));
        button.classList.add("active");
        const target = button.dataset.tab;
        const pane = document.getElementById(target);
        if (pane) {
          pane.classList.add("active");
        }
        if (target === "paint") {
          setTimeout(resizeCanvas, 0);
        }
      });
    });
  }

  function setupCanvas() {
    resizeCanvas();
    dom.canvas.addEventListener("mousedown", startDrawing);
    dom.canvas.addEventListener("mousemove", draw);
    dom.canvas.addEventListener("mouseup", stopDrawing);
    dom.canvas.addEventListener("mouseleave", stopDrawing);
    dom.canvas.addEventListener("touchstart", startDrawing, { passive: false });
    dom.canvas.addEventListener("touchmove", draw, { passive: false });
    dom.canvas.addEventListener("touchend", stopDrawing);
    dom.penBtn.addEventListener("click", () => {
      dom.penBtn.classList.add("active");
      dom.eraserBtn.classList.remove("active");
    });
    dom.eraserBtn.addEventListener("click", () => {
      dom.eraserBtn.classList.add("active");
      dom.penBtn.classList.remove("active");
    });
    dom.clearCanvasBtn.addEventListener("click", clearCanvas);
    window.addEventListener("resize", resizeCanvas);
  }

  function resizeCanvas() {
    const parentRect = dom.canvas.parentElement.getBoundingClientRect();
    const toolbarHeight = dom.penBtn.parentElement.offsetHeight;
    dom.canvas.width = parentRect.width;
    dom.canvas.height = parentRect.height - toolbarHeight;
    clearCanvas();
  }

  function startDrawing(event) {
    if (state.mode === "exam" && state.isPaused) return;
    isDrawing = true;
    lastPointer = getCanvasCoordinates(event);
  }

  function draw(event) {
    if (!isDrawing) return;
    event.preventDefault();
    const point = getCanvasCoordinates(event);
    ctx.beginPath();
    ctx.moveTo(lastPointer.x, lastPointer.y);
    ctx.lineTo(point.x, point.y);
    if (dom.penBtn.classList.contains("active")) {
      ctx.strokeStyle = "#1b1b1b";
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 18;
    }
    ctx.lineCap = "round";
    ctx.stroke();
    lastPointer = point;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function clearCanvas() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
  }

  function getCanvasCoordinates(event) {
    const rect = dom.canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function setupCalculator() {
    dom.calcButtons.addEventListener("click", (event) => {
      const button = event.target.closest(".calc-btn");
      if (!button) return;
      if (button.classList.contains("clear")) {
        clearCalculatorDisplay();
        return;
      }
      if (button.id === "backspace-btn") {
        removeLastCalculatorChar();
        return;
      }
      if (button.classList.contains("equal")) {
        evaluateCalculator();
        return;
      }
      appendCalculatorValue(button.textContent.trim());
    });
    window.addEventListener("keydown", handleCalculatorKeyDown);
  }

  function appendCalculatorValue(value) {
    if (!value) return;
    if (dom.calcDisplay.value === "Error") {
      dom.calcDisplay.value = "";
    }
    dom.calcDisplay.value += value;
    dom.calcDisplay.scrollTop = dom.calcDisplay.scrollHeight;
  }

  function clearCalculatorDisplay() {
    dom.calcDisplay.value = "";
  }

  function removeLastCalculatorChar() {
    dom.calcDisplay.value = dom.calcDisplay.value.slice(0, -1);
  }

  function shouldHandleCalculatorKey(event) {
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      if (target === dom.calcDisplay) {
        return true;
      }
      return false;
    }
    return true;
  }

  function handleCalculatorKeyDown(event) {
    if (!shouldHandleCalculatorKey(event)) {
      return;
    }
    const key = event.key;
    if (key === "Enter" || key === "=") {
      event.preventDefault();
      evaluateCalculator();
      return;
    }
    if (key === "Backspace") {
      event.preventDefault();
      removeLastCalculatorChar();
      return;
    }
    if (key === "Delete") {
      event.preventDefault();
      clearCalculatorDisplay();
      return;
    }
    if (
      key.toLowerCase() === "c" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      clearCalculatorDisplay();
      return;
    }
    const allowedChars = "0123456789+-*/().";
    if (allowedChars.includes(key)) {
      event.preventDefault();
      appendCalculatorValue(key);
    }
  }

  function evaluateCalculator() {
    const expression = dom.calcDisplay.value.trim();
    if (!expression) return;
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
      const result = Function(`"use strict";return (${sanitized})`)();
      if (Number.isFinite(result)) {
        dom.calcDisplay.value = String(Math.round(result * 1_000_000) / 1_000_000);
      } else {
        dom.calcDisplay.value = "Error";
      }
    } catch (error) {
      dom.calcDisplay.value = "Error";
    }
  }

});
