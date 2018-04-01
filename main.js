"use strict";

function e(id) {
  return document.getElementById(id);
}

function log(msg) {
  e("log").appendChild(document.createTextNode(msg));
  e("log").appendChild(document.createElement("br"));
}

function init() {
  var username = localStorage.getItem("username");
  if (username) {
    e("username").value = username;
  }
  var password = localStorage.getItem("password");
  if (password) {
    e("password").value = password;
  }
  if (username && password) {
    login();
  }
}

let tiqbiz = null;

async function login() {
  if (!tiqbiz) {
    tiqbiz = new TiqBizAPI();
  }

  let token = localStorage.getItem("apiToken");
  if (token) {
    log("Authenticating with stored API token...");
    // Try to authenticate with the token. If that fails, re-login.
    return tiqbiz.authenticate(token)
      .then(() => {
        document.body.classList.add("loggedIn");
        log("Authenticated with stored API token");
        return listCalendar().then(setupNewEventForm);
      }, () => {
         log("Failed to authenticate with stored token, re-logging...");
         localStorage.removeItem("apiToken");
         return login();
      });
  }

  let username = e("username").value;
  let password = e("password").value;
  if (username.length == 0 || password.length == 0) {
    log("Enter username and password to login");
    return Promise.reject("Enter username and password to login");
  }

  log("Logging in with username/password...");
  return tiqbiz.login(username, password).then(() => {
    log("Logged in with username/password");
    document.body.classList.add("loggedIn");
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);
    localStorage.setItem("apiToken", tiqbiz.apiToken);
    return listCalendar().then(setupNewEventForm);
  }, (error) => {
    log("Failed to log in, error=" + error);
    document.body.classList.remove("loggedIn");
  })
}

async function setupNewEventForm() {
  log("Loading box list...");
  let boxes = await tiqbiz.boxes();
  log("Loaded box list.");
  let boxList = e('box-list');
  clearChildren(boxList);
  for (var box of boxes) {
    var id = "box-list-" + box.id;
    var div = document.createElement("div");
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.value = id;
    checkbox.boxId = box.id;
    div.appendChild(checkbox);
    var label = document.createElement("label");
    label.appendChild(document.createTextNode(box.name));
    label.for = id;
    div.appendChild(label);
    boxList.appendChild(div);
  }
  // Ensure the start/end times are enabled/disabled as expected.
  allDayChanged();
  updateRecurrence();
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

async function listCalendar() {
  log("Loading calendar...");
  let calendarPosts = await tiqbiz.calendar();
  log("Loaded calendar");
  let calendarDiv = e("calendar");
  clearChildren(calendarDiv);

  let addTd = (tr, text) => {
    let td = document.createElement("td");
    td.appendChild(document.createTextNode(text));
    tr.appendChild(td);
  };

  let extractDate = (entry) => {
    return entry.startDate +
      (entry.allDay ? " (all day)" : "") +
      (entry.endDate ? (" - " + entry.endDate) : "");
  };

  for (var entry of calendarPosts) {
    let tr = document.createElement("tr");
    [entry.title, extractDate(entry), entry.boxes.join(", ")]
      .map(text => addTd(tr, text));
    calendarDiv.appendChild(tr);
  }
}

function makeDate(date, time, allDay) {
  return date + " " + (allDay ? "00:00:00" : time);
}

function makeShortDateTime(d) {
  return makeShortDate(d) + " " + makeShortTime(d);
}

function makeShortTime(d) {
  return fw(d.getHours()) + ":" + fw(d.getMinutes()) + ":" + fw(d.getSeconds());
}

function fw(n) {
  if (n < 10) {
    return "0" + n;
  }
  return "" + n;
}

function makeShortDate(d) {
  return d.getFullYear() + "-" + fw(d.getMonth() + 1) + "-" + fw(d.getDate());
}

async function createCalendarEvent() {
  if (e("title").value.length == 0) {
    alert("Please enter a title");
    return;
  }

  // Figure out which boxes are checked.
  let boxes = [];
  var checkboxes = document.querySelectorAll('#box-list > div > input[type="checkbox"]');
  for (var checkbox of checkboxes) {
    if (checkbox.checked) {
      boxes.push(checkbox.boxId);
    }
  }
  if (boxes.length == 0) {
    alert("Please check at least one box as a target for event notification.");
    return;
  }

  // Figure our recurrent instances.
  let repetitions = [];
  for (var span of document.querySelectorAll(".recurrent-event-repetition")) {
    repetitions.push(span.textContent);
  }
  if (repetitions.length == 0) {
    alert("Failed to calculate dates for event notification. Check you've set a date and selected recurrence frequency.");
    return;
  }

  boxes = boxes.join(",");
  let allDay = e("allDay").checked;
  if (!allDay && !/\d\d:\d\d/.test(e("startTime").value)) {
    alert("Please enter a start time.");
    return;
  }
  let startTime = e("startTime").value + ":00";
  let endTime = undefined;
  if (e("endTime").value.length > 0) {
    if (!/\d\d:\d\d/.test(e("endTime").value)) {
      alert("End time looks invalid");
      return;
    }
    endTime = e("endTime").value + ":00";
  }
  for (var date of repetitions) {
    // Figure out what notifications are selected.
    let notifications = [];
    if (e("notify-day-before").checked) {
      let d = makeShortDate(addDays(new Date(date), -1));
      notifications.push(makeDate(d, "10:00:00", false));
    }
    if (!allDay &&
        !e("notify-24-hours-before").disabled &&
        e("notify-24-hours-before").checked) {
      let d = makeShortDate(addDays(new Date(date), -1));
      notifications.push(makeDate(d, startTime, false));
    }
    if (!allDay &&
        !e("notify-1-hour-before").disabled &&
        e("notify-1-hour-before").checked) {
      let timeStr = date + " " + startTime;
      let d = makeShortDateTime(addHours(new Date(timeStr), -1));
      notifications.push(d);
    }
    if (notifications.length == 0) {
      alert("Failed to calculate notification times.");
      return;
    }

    let event = {
      boxes: boxes,
      post_type: "calendar",
      title: e("title").value,
      body_markdown: e("description").value,
      start_date: makeDate(date, startTime, allDay),
      all_day: allDay,
      published_at: makeShortDateTime(new Date()),
    };
    if (endTime) {
      event.end_date = makeDate(date, endTime, allDay);
    }
    if (e("location").value.length > 0) {
      event["location"] = e("location").value;
    }
    if (e("address").value.length > 0) {
      event["address"] = e("address").value;
    }
    event["notifications[]"] = notifications;
    log("Adding event " + JSON.stringify(event));
    await tiqbiz.addEvent(event);
    log("Added.");
  }
  log("Updating calendar...");
  await listCalendar();
}

function allDayChanged(event) {
  let allDayCheckbox = e("allDay");
  if (allDayCheckbox.checked) {
    e("startTime").disabled = true;
    e("endTime").disabled = true;
    e("notify-1-hour-before").disabled = true;
    e("notify-24-hours-before").disabled = true;
  } else {
    e("startTime").disabled = false;
    e("endTime").disabled = false;
    e("notify-1-hour-before").disabled = false;
    e("notify-24-hours-before").disabled = false;
  }
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date, hours) {
  var result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function updateRecurrence() {
  if (e("startDate").value.length == 0) {
    return;
  }
  e("recurrence-ending-date").value;
  if (e("recurrence-ending-date").value.length == 0) {
    e("recurrence-ending-date").value = e("startDate").value;
  }
  let from = new Date(e("startDate").value);
  e("recurrence-starting-date").innerHTML = e("startDate").value;
  let select = e("recurrence-select");
  let interval = 7 * parseInt(select.options[select.selectedIndex].value);
  let to = new Date(e("recurrence-ending-date").value);
  let list = e("recurrence-event-repetitions");
  clearChildren(list);
  let d = new Date(from);
  do {
    var div = document.createElement("div");
    var span = document.createElement("span");
    span.appendChild(document.createTextNode(makeShortDate(d)));
    span.classList.add("recurrent-event-repetition");
    div.appendChild(span);
    var removeButton = document.createElement("button");
    removeButton.appendChild(document.createTextNode("Remove"));
    removeButton.addEventListener("click", (event) => {
      div.parentNode.removeChild(div);
    }, false);
    div.appendChild(removeButton);
    list.appendChild(div);
    d = addDays(d, interval);
  } while (d <= to && interval > 0);
}
