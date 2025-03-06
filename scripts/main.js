const GEMINI_API_KEY = "AIzaSyAuWn7Gnjc0vfREeO2TnL368rUSaPt56cU"; // Thay bằng khóa thật

const topicInput = document.getElementById("topic-input");
const generateButton = document.getElementById("generate-quiz");
const quizSection = document.getElementById("quiz-section");
const quizForm = document.getElementById("quiz-form");
const submitButton = document.getElementById("submit-quiz");
const resultSection = document.getElementById("result-section");

generateButton.addEventListener("click", async () => {
  const topic = topicInput.value.trim();
  if (!topic) return alert("Vui lòng nhập chủ đề!");

  // Thêm loading state
  generateButton.disabled = true;
  generateButton.textContent = "Đang tạo quiz...";

  try {
    const quiz = await fetchQuizFromGemini(topic);
    if (quiz) {
      renderQuiz(quiz, quizForm);
      quizSection.classList.remove("hidden");
      resultSection.classList.add("hidden");
      localStorage.setItem("currentQuiz", JSON.stringify(quiz));
    }
  } catch (error) {
    alert("Có lỗi xảy ra khi tạo quiz. Vui lòng thử lại!");
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Tạo Quiz";
  }
});

submitButton.addEventListener("click", () => {
  const score = calculateScore(quizForm);
  resultSection.textContent = `Bạn được ${score} điểm!`;
  resultSection.classList.remove("hidden");

  localStorage.removeItem("currentQuiz");
});

async function fetchQuizFromGemini(topic) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Tạo 5 câu hỏi trắc nghiệm về chủ đề "${topic}". Bao gồm câu hỏi và 4 đáp án A, B, C, D, với đáp án đúng rõ ràng.`,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.candidates) {
      const textResult = data.candidates[0].content.parts[0].text;
      return parseQuizFromText(textResult);
    } else {
      console.error("Lỗi khi nhận dữ liệu:", data);
    }
  } catch (error) {
    console.error("Lỗi gọi API:", error);
  }
}

function parseQuizFromText(text) {
  const questions = [];
  const blocks = text.split("\n\n");

  for (const block of blocks) {
    const lines = block.split("\n");
    const questionLine = lines[0].replace(/^\d+\.\s*/, "").trim();
    const options = [];
    let correctAnswer = null;

    for (const line of lines.slice(1)) {
      const match = line.match(/^([A-D])\.\s*(.+)$/);
      if (match) {
        const [_, letter, text] = match;
        options.push(text.trim());
        // Tìm đáp án đúng (thường được đánh dấu với * hoặc (đúng))
        if (text.includes("*") || text.toLowerCase().includes("(đúng)")) {
          correctAnswer = letter;
        }
      }
    }

    if (questionLine && options.length === 4) {
      questions.push({
        question: questionLine,
        options: options.map((opt) => opt.replace(/[\*\(đúng\)]/gi, "").trim()),
        answer: correctAnswer || "A", // Fallback to A if no correct answer found
      });
    }
  }

  return questions;
}

function renderQuiz(quiz, container) {
  container.innerHTML = "";
  quiz.forEach((q, index) => {
    const qElement = document.createElement("div");
    qElement.innerHTML = `
      <p>${index + 1}. ${q.question}</p>
      ${q.options
        .map(
          (opt) => `
        <label>
          <input type="radio" name="q${index}" value="${opt}">
          ${opt}
        </label>
      `
        )
        .join("<br>")}
    `;
    container.appendChild(qElement);
  });
}

function calculateScore(form) {
  const data = new FormData(form);
  let score = 0;
  const quiz = JSON.parse(localStorage.getItem("currentQuiz"));
  quiz.forEach((q, index) => {
    if (data.get(`q${index}`) === q.answer) score++;
  });
  return score;
}
