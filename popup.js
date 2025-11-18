// //Import the API key from local file (for now)
// //make sure this file is linted in the .gitignore


// //Save the reflections
// window.onload = () => {
//   document.getElementById("saveBtn").addEventListener("click", () => {
//     const answers = {
//       q1: document.getElementById("q1").value,
//       q2: document.getElementById("q2").value,
//       q3: document.getElementById("q3").value,
//       q4: document.getElementById("q4").value
//     };

//     chrome.storage.local.set(answers, () => {
//       alert("Reflection Saved!");
//     });
//   });


//     //Load the reflections
//         chrome.storage.local.get(["q1", "q2", "q3", "q4"], (data) => {
//             if (data.q1) document.getElementById("q1").value = data.q1;
//             if (data.q2) document.getElementById("q2").value = data.q2;
//             if (data.q3) document.getElementById("q3").value = data.q3;
//             if (data.q4) document.getElementById("q4").value = data.q4;
//         });

//     //AI feedback
//     document.getElementById("aiFeedbackBtn").addEventListener("click", async () => {
//         const q1 = document.getElementById("q1").value;
//         const q2 = document.getElementById("q2").value;
//         const q3 = document.getElementById("q3").value;
//         const q4 = document.getElementById("q4").value;

//         const combinedInput = `
//         Student Reflection:
//         1. ${q1}
//         2. ${q2}
//         3. ${q3}
//         4. ${q4}
        
//         Give concise, constructive feedback to help the student reflect better.
//         `;

//         const feedbackDiv = document.getElementById("feedback");
//         feedbackDiv.textContent = "Thinking...";

//         try{
//             const response = await fetch("https://api.openai.com/v1/chat/completions", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${OPENAI_API_KEY}`
//                 },
//                 body: JSON.stringify({
//                     model: "gpt-3.5-turbo",
//                     messages: [
//                         { role: "system", content: "You are a helpful reflection coach."},
//                         { role: "user", content: combinedInput}
//                     ]
//                 })
//             });

//             const data = await response.json();
//             console.log("OpenAI Response: ", JSON.stringify(data, null, 2));
//             feedbackDiv.textContent = data.choices[0].message.content;
//         }
//         catch (err) {
//             feedbackDiv.textContent = "Something went wrong. Please try again.";
//             console.error(err);
//         }
//     });
// };

// popup.js

const questions = [
  "What is the purpose of this task?",
  "How did you arrive at your solution?",
  "What would you do differently?",
  "What did you learn from this process?"
];

let currentStep = 0;
let isSummaryView = false;
const HISTORY_KEY = "reflectionHistory";

window.onload = () => {
  // Ensure we only load once
  if (!window.extensionLoaded) {
    window.extensionLoaded = true;
    loadStep();

    document.getElementById("backBtn").addEventListener("click", handleBack);
    document.getElementById("saveBtn").addEventListener("click", handleSave);
    document.getElementById("nextBtn").addEventListener("click", handleNext);
    document.getElementById("aiFeedbackBtn").addEventListener("click", handleAI);
    document
      .getElementById("clearAllBtn")
      .addEventListener("click", () => handleClearAll());
    document
      .getElementById("editResponsesBtn")
      .addEventListener("click", () => {
        isSummaryView = false;
        currentStep = questions.length - 1;
        loadStep();
      });
    document
      .getElementById("clearAllSummaryBtn")
      .addEventListener("click", () => handleClearAll());
    const historyToggleBtn = document.getElementById("historyToggleBtn");
    historyToggleBtn.addEventListener("click", () => {
      const section = document.getElementById("historySection");
      toggleHistory(section.classList.contains("hidden"));
    });
    document
      .getElementById("closeHistoryBtn")
      .addEventListener("click", () => toggleHistory(false));
    renderHistoryList();
  }
};


function loadStep() {
  isSummaryView = false;
  document.getElementById("questionView").classList.remove("hidden");
  document.getElementById("summaryView").classList.add("hidden");

  const label = document.getElementById("question-label");
  const textarea = document.getElementById("reflection");
  const progressText = document.getElementById("progressText");
  const progressBarFill = document.getElementById("progressBarFill");
  const progressPct = document.getElementById("progressPct");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");

  label.textContent = `Question ${currentStep + 1}: ${questions[currentStep]}`;
  textarea.value = "";

  // Load saved answer if it exists
  chrome.storage.local.get([`q${currentStep + 1}`], (result) => {
    if (result[`q${currentStep + 1}`]) {
      textarea.value = result[`q${currentStep + 1}`];
    }
  });

  // Handle button visibility
  backBtn.classList.toggle("hidden", currentStep === 0);
  nextBtn.textContent =
    currentStep === questions.length - 1 ? "Summary" : "Next";
  const pct = Math.round(((currentStep + 1) / questions.length) * 100);
  progressText.textContent = `Step ${currentStep + 1} of ${questions.length}`;
  progressBarFill.style.width = `${pct}%`;
  progressPct.textContent = `${pct}%`;
  setSaveStatus("", { hide: true }); // hide status
}


function handleSave() {
  const textarea = document.getElementById("reflection");
  const answer = textarea.value.trim();

  if (!answer) {
    setSaveStatus("Please add text before saving.", { isError: true });
    return;
  }

  chrome.storage.local.set({ [`q${currentStep + 1}`]: answer }, () => {
    setSaveStatus("Saved ✅");
  });
}

function handleNext() {
  const textarea = document.getElementById("reflection");
  const answer = textarea.value.trim();
  chrome.storage.local.set({ [`q${currentStep + 1}`]: answer }, () => {
    setSaveStatus("Saved ✅");
    if (currentStep < questions.length - 1) {
      currentStep++;
      loadStep();
    } else {
      showSummary();
    }
  });
}

function handleBack() {
  if (currentStep > 0) {
    currentStep--;
    loadStep();
  }
}


async function handleAI() {
  const feedbackDiv = document.getElementById("feedback");

  chrome.storage.local.get(["q1", "q2", "q3", "q4"], async (savedResponses) => {
    const reflections = questions
      .map((question, index) => ({
        question,
        response: (savedResponses[`q${index + 1}`] || "").trim()
      }))
      .filter((entry) => entry.response.length > 0);

    if (reflections.length === 0) {
      feedbackDiv.className = "feedback";
      feedbackDiv.textContent = "Please answer the reflection prompts before requesting feedback.";
      return;
    }

    feedbackDiv.className = "feedback loading";
    feedbackDiv.textContent = "Getting AI feedback...";

    try {
      const response = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${EXTENSION_CLIENT_TOKEN}`
        },
        body: JSON.stringify({
          reflections,
          metadata: {
            questionSetId: "wise-default-stepper",
            requestedAt: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Server error");
      }

      feedbackDiv.className = "feedback";
      feedbackDiv.textContent = data.feedback || "No feedback received.";
      persistLatestSession(reflections, data.feedback);
      renderHistoryList();
    } catch (error) {
      feedbackDiv.className = "feedback";
      feedbackDiv.textContent =
        "We couldn't get AI feedback right now, but your reflection was saved.";
      console.error(error);
    }
  });
}

function showSummary() {
  isSummaryView = true;
  const progressText = document.getElementById("progressText");
  const progressBarFill = document.getElementById("progressBarFill");
  const progressPct = document.getElementById("progressPct");
  const questionView = document.getElementById("questionView");
  const summaryView = document.getElementById("summaryView");
  questionView.classList.add("hidden");
  summaryView.classList.remove("hidden");
  progressText.textContent = "Summary";
  progressBarFill.style.width = "100%";
  progressPct.textContent = "100%";
  populateSummary();
}

function populateSummary() {
  chrome.storage.local.get(
    ["q1", "q2", "q3", "q4", "lastFeedback", "lastFeedbackAt"],
    (data) => {
      const summaryAnswers = document.getElementById("summaryAnswers");
      summaryAnswers.innerHTML = "";
      questions.forEach((question, index) => {
        const response = data[`q${index + 1}`] || "(No response yet)";
        const block = document.createElement("div");
        block.className = "summary-card";
        block.innerHTML = `<h3>${question}</h3><p>${response}</p>`;
        summaryAnswers.appendChild(block);
      });

      const feedbackDiv = document.getElementById("feedback");
      if (data.lastFeedback) {
        const timestamp = data.lastFeedbackAt
          ? new Date(data.lastFeedbackAt).toLocaleString()
          : "";
        feedbackDiv.className = "feedback";
        feedbackDiv.textContent = `${data.lastFeedback}${
          timestamp ? `\n\nLast updated: ${timestamp}` : ""
        }`;
      } else {
        feedbackDiv.textContent = "No AI feedback yet. Request it below.";
      }
    }
  );
}

function setSaveStatus(message, options = {}) {
  const statusEl = document.getElementById("saveStatus");
  const isBoolean = typeof options === "boolean";
  const hide = isBoolean ? options : options.hide;
  const isError = isBoolean ? false : Boolean(options.isError);
  if (hide || !message) {
    statusEl.classList.add("hidden");
    statusEl.classList.remove("success", "error");
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.toggle("success", !isError);
  statusEl.classList.toggle("error", isError);
  statusEl.classList.remove("hidden");
}

function toggleHistory(show) {
  const section = document.getElementById("historySection");
  const toggleBtn = document.getElementById("historyToggleBtn");
  section.classList.toggle("hidden", !show);
  toggleBtn.textContent = show ? "Hide" : "View";
  if (show) renderHistoryList();
}

function renderHistoryList() {
  chrome.storage.local.get([HISTORY_KEY], (data) => {
    const history = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
    const listEl = document.getElementById("historyList");
    if (!history.length) {
      listEl.textContent = "No reflections saved yet.";
      return;
    }

    listEl.innerHTML = "";
    history.forEach((entry) => {
      const container = document.createElement("div");
      container.className = "history-item";
      const dateLabel = new Date(entry.timestamp).toLocaleString();
      const answersHtml = Array.isArray(entry.answers)
        ? entry.answers
            .map(
              (ans, index) =>
                `<p><strong>${index + 1}.</strong> ${ans.response || ""}</p>`
            )
            .join("")
        : "<p>No answers saved.</p>";
      container.innerHTML = `
        <h4>${entry.label || "Reflection"}</h4>
        <p>${dateLabel}</p>
        <div class="history-answers">${answersHtml}</div>
        <p><strong>Feedback:</strong> ${entry.feedback || "N/A"}</p>
      `;
      listEl.appendChild(container);
    });
  });
}

function persistLatestSession(reflections, feedback) {
  const answers = reflections.map((entry, index) => ({
    question: entry.question || questions[index],
    response: entry.response
  }));

  const timestamp = new Date().toISOString();
  const label = `Session on ${new Date(timestamp).toLocaleDateString()}`;

  chrome.storage.local.set(
    {
      lastFeedback: feedback,
      lastFeedbackAt: timestamp
    },
    () => populateSummary()
  );

  chrome.storage.local.get([HISTORY_KEY], (data) => {
    const history = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
    history.unshift({
      id: Date.now(),
      timestamp,
      answers,
      feedback,
      label
    });
    chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, 20) });
  });
}

function handleClearAll() {
  const confirmed = confirm(
    "Clear all saved reflections, feedback, and history?"
  );
  if (!confirmed) return;

  const keysToRemove = [
    "q1",
    "q2",
    "q3",
    "q4",
    "lastFeedback",
    "lastFeedbackAt",
    HISTORY_KEY
  ];

  chrome.storage.local.remove(keysToRemove, () => {
    currentStep = 0;
    isSummaryView = false;
    loadStep();
    document.getElementById("feedback").textContent =
      "AI feedback will appear here...";
    renderHistoryList();
    toggleHistory(false);
    setSaveStatus("Cleared. Start fresh ✅");
  });
}
