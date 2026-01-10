const nameInput = document.querySelector("#name");
const usernameInput = document.querySelector("#username");
const addBtn = document.querySelector("#add");
const excelInput = document.querySelector("#excelFile");

const showStudentContainer = document.querySelector(".studentDetailsContainer");
const showDataCont = document.querySelector(".showData");
const filterSelect = document.querySelector("#filter");

let students = [];

/* ================= EVENTS ================= */

addBtn.addEventListener("click", addManualStudent);
excelInput.addEventListener("change", handleExcelUpload);
filterSelect.addEventListener("change", applyFilter);

/* ================= MANUAL ADD ================= */

async function addManualStudent() {
  const name = nameInput.value.trim();
  const username = usernameInput.value.trim();

  if (!name || !username) {
    alert("Fill all fields");
    return;
  }

  if (students.some(s => s.username === username)) {
    alert("Username already exists");
    return;
  }

  students.push({ name, username, stats: null });

  nameInput.value = "";
  usernameInput.value = "";

  renderStudentList();
  await loadStats();
  applyFilter();
}

/* ================= EXCEL UPLOAD (FIXED) ================= */

async function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    rows.forEach(row => {
      // 🔥 Normalize keys
      const normalizedRow = {};
      for (let key in row) {
        normalizedRow[key.toLowerCase().trim()] = row[key];
      }

      const name =
        normalizedRow["student name"] ||
        normalizedRow["name"] ||
        normalizedRow["full name"];

      const username =
        normalizedRow["username"] ||
        normalizedRow["leetcode username"] ||
        normalizedRow["leetcode"];

      if (!name || !username) return;
      if (students.some(s => s.username === username)) return;

      students.push({
        name: name.toString().trim(),
        username: username.toString().trim(),
        stats: null
      });
    });

    excelInput.value = ""; // allow re-upload same file

    renderStudentList();
    await loadStats();
    applyFilter();
  };

  reader.readAsArrayBuffer(file);
}

/* ================= FETCH STATS ================= */

async function loadStats() {
  showDataCont.innerHTML = "<p>Loading leaderboard...</p>";

  await Promise.all(
    students.map(async s => {
      if (s.stats) return;

      try {
        const res = await fetch(
          `https://alfa-leetcode-api.onrender.com/${s.username}/solved`
        );
        const data = await res.json();

        const easy = data.easySolved || 0;
        const medium = data.mediumSolved || 0;
        const hard = data.hardSolved || 0;

        s.stats = {
          easy,
          medium,
          hard,
          totalSolved: easy + medium + hard
        };
      } catch {
        s.stats = { easy: 0, medium: 0, hard: 0, totalSolved: 0 };
      }
    })
  );
}

/* ================= STUDENT LIST ================= */

function renderStudentList() {
  showStudentContainer.innerHTML = "";
  students.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "student";
    div.innerHTML = `
      <p>${i + 1}. ${s.name}</p>
      <p>${s.username}</p>
    `;
    showStudentContainer.appendChild(div);
  });
}

/* ================= LEADERBOARD ================= */

function renderLeaderboard(list) {
  showDataCont.innerHTML = "";

  list.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "IndividualStudent";
    div.innerHTML = `
      <div>
        <p>#${i + 1}</p>
        <p>${s.name}</p>
        <p>${s.username}</p>
      </div>
      <div>
        <p>Total: ${s.stats.totalSolved}</p>
        <p>Easy: ${s.stats.easy}</p>
        <p>Medium: ${s.stats.medium}</p>
        <p>Hard: ${s.stats.hard}</p>
      </div>
    `;
    showDataCont.appendChild(div);
  });
}

/* ================= FILTER ================= */

function applyFilter() {
  if (students.some(s => !s.stats)) return;

  const key = filterSelect.value;

  const sorted = [...students].sort(
    (a, b) => b.stats[key] - a.stats[key]
  );

  renderLeaderboard(sorted);
}
