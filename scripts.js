const habitList = document.getElementById("habitList");
const newHabitBtn = document.getElementById("newHabitBtn");
const dateHeaders = document.getElementById("dateHeaders");
const habitTable = document.getElementById("habitTable");

/* Modal related elements */
const modal = document.getElementById("habitModal");
const habitInput = document.getElementById("habitInput");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const deleteButton = document.getElementById("deleteButton");

const mySaveKey = getOrCreateSaveKey();
document.getElementById("saveKey").value = mySaveKey;

const currentDate = new Date();
const twoWeeksBefore = new Date(currentDate);
twoWeeksBefore.setDate(currentDate.getDate() - 21);

// We only show two weeks worth of data in the UI to keep it fast
const startDate = twoWeeksBefore;
const numberOfDays = 22;

let saveTimeout; // Variable to store the save timeout reference
let habits = []; // Array to store the habits data, fetched from the server
let dataIsDirty = false; // Flag to indicate if the data has changed
let isSaving = false;

// Helper function to count the occurrences of each color in the habits array
const habitColors = [
  "blue",
  "mint",
  "yellow",
  "red",
  "purple",
  "lime",
  "coral",
  "charcoal",
  "orange",
  "turquoise",
];
const getColorUsageCount = (habits, habitColors) => {
  const colorUsage = habitColors.reduce((acc, color) => {
    acc[color] = 0;
    return acc;
  }, {});

  habits.forEach((habit) => {
    if (habit.color) {
      colorUsage[habit.color]++;
    }
  });

  return colorUsage;
};

// Function to assign a color to a new habit
const assignColorToNewHabit = (habits) => {
  const colorUsage = getColorUsageCount(habits, habitColors);

  // Sort colors by how often they're used (ascending order)
  const sortedColors = habitColors.sort(
    (a, b) => colorUsage[a] - colorUsage[b]
  );

  // Find the least used color(s)
  const leastUsedColor = sortedColors[0];
  return leastUsedColor;
};

function generateDateHeaders() {
  let headers = dateHeaders.innerHTML;
  for (let i = 0; i < numberOfDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayOfWeek = date.toLocaleString("en-US", { weekday: "short" });

    headers += `
              <td class="py-1 px-2 text-center min-w-[40px]">
                  <div class="text-xs text-gray-500">${dayOfWeek}</div>
                  <div>${date.getDate()}</div>
              </td>`;
  }
  dateHeaders.innerHTML = headers;
}

function renderHabits(doneCallback = null) {
  habitList.innerHTML = "";
  habits.forEach((habit, idx) => {
    const row = document.createElement("tr");
    row.className = "border-b border-gray-200 ";
    let cells = `
              <td data-habit-id="${idx}" class="py-3 px-6 text-left sticky left-0 bg-white max-w-[200px] overflow-hidden habit-item" >
                  <span  class="font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="${habit.name}">${habit.name}</span>
              </td>
          `;
    const color = "bg-habit-" + habit.color || "blue";
    for (let i = 0; i < numberOfDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = formatDateToYMD(date);
      const checked = habit.completed[dateKey];

      cells += `
                  <td class="text-center">
                      <div class="w-10 h-10 border-0 border-gray-400 bg-gray-50 mx-auto ${
                        checked ? color : ""
                      }"
                           onclick="toggleHabit(${habits.indexOf(
                             habit
                           )}, ${dateKey})"></div>
                  </td>
              `;
    }

    row.innerHTML = cells;
    habitList.appendChild(row);
  });

  // Add event listeners to each habit item to show the modal
  const habitItems = document.getElementsByClassName("habit-item");
  Array.from(habitItems).forEach((item) => {
    item.addEventListener("click", (event) => {
      const spanContent = event.currentTarget.querySelector("span").textContent;
      habitInput.value = spanContent;
      const selectedHabitId = event.currentTarget.getAttribute("data-habit-id");
      modal.setAttribute("data-habit-id", selectedHabitId);
      modal.classList.remove("hidden");
    });
  });

  // Call the doneCallback if it's provided
  if (doneCallback) {
    doneCallback();
  }
}

function formatDateToYMD(date) {
  const year = date.getFullYear();
  let month = date.getMonth() + 1; // getMonth() returns a zero-based month index, so we add 1
  let day = date.getDate();

  // Zero-pad month and day if necessary
  month = month < 10 ? "0" + month : month;
  day = day < 10 ? "0" + day : day;

  return `${year}${month}${day}`;
}

function toggleHabit(habitIndex, dateKey) {
  if (habits[habitIndex].completed[dateKey]) {
    delete habits[habitIndex].completed[dateKey];
  } else {
    habits[habitIndex].completed[dateKey] = 1;
  }
  dataIsDirty = true;
  renderHabits();

  // Save the data after a short delay to avoid saving too often
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveHabits();
  }, 2000);
}

newHabitBtn.addEventListener("click", () => {
  if (habits.length >= 10) {
    alert("You can only have up to 10 habits.");
    return;
  }
  const habitName = prompt("New habit name:");
  if (habitName) {
    const newHabitColor = assignColorToNewHabit(habits);

    habits.push({ name: habitName, color: newHabitColor, completed: {} });
    renderHabits();
    dataIsDirty = true;
    saveHabits();
  }
});

async function saveHabits() {
  isSaving = true;
  try {
    const response = await fetch("/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: mySaveKey,
        content: habits,
      }),
    });

    if (!response.ok) {
      console.error("Failed to save habits:", response.statusText);
    } else {
      dataIsDirty = false;
    }
  } catch (error) {
    console.error("Error saving habits:", error);
  }
  saveTimeout = null;
  isSaving = false;
}

async function fetchHabits() {
  if (isSaving || dataIsDirty) {
    // Don't fetch habits if we're in the middle of saving or the data has changed locally
    return;
  }
  const saveKey = getOrCreateSaveKey();
  try {
    const response = await fetch("/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key: saveKey }),
    });

    if (response.ok) {
      habits = await response.json();
      renderHabits(scrollAllTheWayRight);
    } else {
      console.error("Failed to fetch habits:", response.statusText);
    }
  } catch (error) {
    console.error("Error fetching habits:", error);
  }
}

window.addEventListener("load", () => {
  generateDateHeaders();
  fetchHabits();
});

window.addEventListener("focus", () => {
  fetchHabits();
});

window.addEventListener("blur", () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveHabits();
  }
});

// Handle Cancel button (hide the modal)
cancelButton.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Handle Save button
saveButton.addEventListener("click", () => {
  const habitId = modal.getAttribute("data-habit-id");
  habits[habitId].name = habitInput.value;
  modal.classList.add("hidden");
  renderHabits();
  dataIsDirty = true;
  saveHabits();
});

// Handle Delete button
deleteButton.addEventListener("click", () => {
  const habitId = modal.getAttribute("data-habit-id");
  habits.splice(habitId, 1);
  renderHabits();
  dataIsDirty = true;
  saveHabits();
  modal.classList.add("hidden");
});

document.getElementById("saveKey").addEventListener("input", (event) => {
  const newKey = event.target.value;
  localStorage.setItem("saveKey", newKey);
  if (newKey && newKey.length == 36) {
    fetchHabits();
  }
});

function scrollAllTheWayRight() {
  setTimeout(() => {
    const lastColumn = document.querySelector("#habitTable td:last-child");
    lastColumn.scrollIntoView({
      behavior: "instant",
      block: "end",
      inline: "end",
    });
  }, 100);
}

function getOrCreateSaveKey() {
  let saveKey = localStorage.getItem("saveKey");
  if (!saveKey) {
    saveKey = self.crypto.randomUUID();
    localStorage.setItem("saveKey", saveKey);
  }
  return saveKey;
}
