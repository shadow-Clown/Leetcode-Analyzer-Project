/* ================= ELEMENTS ================= */

const nameInput = document.querySelector("#name");
const usernameInput = document.querySelector("#username");
const addBtn = document.querySelector("#add");
const excelInput = document.querySelector("#excelFile");

const showStudentContainer = document.querySelector(".studentDetailsContainer");
const showDataCont = document.querySelector(".showData");
const filterSelect = document.querySelector("#filter");

/* ================= STATE ================= */

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
    alert("Enter name and username");
    return;
  }

  if (students.some(s => s.username === username)) {
    alert("Username already exists");
    return;
  }

  students.push({
    name,
    username,
    stats: null
  });

  nameInput.value = "";
  usernameInput.value = "";

  renderStudentList();
  await loadStats();       // ✅ always load
}

/* ================= EXCEL UPLOAD ================= */

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
      // normalize headers
      const normalized = {};
      Object.keys(row).forEach(k => {
        normalized[k.toLowerCase().trim()] = row[k];
      });

      const name =
        normalized["student name"] ||
        normalized["name"] ||
        normalized["full name"];

      const username =
        normalized["username"] ||
        normalized["leetcode username"] ||
        normalized["leetcode"];

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
    await loadStats();     // ✅ always load
  };

  reader.readAsArrayBuffer(file);
}

/* ================= FETCH STATS ================= */

async function loadStats() {
  showDataCont.innerHTML = "<p>Loading leaderboard...</p>";

  await Promise.all(
    students.map(async student => {
      if (student.stats) return;

      try {
        const res = await fetch(
          `https://alfa-leetcode-api.onrender.com/${student.username}/solved`
        );
        const data = await res.json();

        const easy = data.easySolved || 0;
        const medium = data.mediumSolved || 0;
        const hard = data.hardSolved || 0;

        student.stats = {
          easy,
          medium,
          hard,
          totalSolved: easy + medium + hard
        };
      } catch {
        student.stats = {
          easy: 0,
          medium: 0,
          hard: 0,
          totalSolved: 0
        };
      }
    })
  );

  // 🔥 ALWAYS render after stats load
  renderLeaderboard(students);
}

/* ================= RENDER STUDENT LIST (LEFT) ================= */

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

/* ================= RENDER LEADERBOARD ================= */

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
        <p>Total: ${s.stats?.totalSolved ?? 0}</p>
        <p>Easy: ${s.stats?.easy ?? 0}</p>
        <p>Medium: ${s.stats?.medium ?? 0}</p>
        <p>Hard: ${s.stats?.hard ?? 0}</p>
      </div>
    `;

    showDataCont.appendChild(div);
  });
}

/* ================= FILTER ================= */

function applyFilter() {
  if (students.length === 0) return;

  const key = filterSelect.value;

  const sorted = [...students].sort(
    (a, b) => (b.stats?.[key] || 0) - (a.stats?.[key] || 0)
  );

  renderLeaderboard(sorted);
}
