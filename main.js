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

function login() {
  log("logging in");
  if (!tiqbiz) {
    tiqbiz = new TiqBizAPI();
  }
  let username = e("username").value;
  if (username.length > 0) {
    localStorage.setItem("username", username);
  }
  let password = e("password").value;
  if (password.length > 0) {
    localStorage.setItem("password", password);
  }
  tiqbiz.login(username, password).then(() => {
    log("Logged in");
    e("loginBox").classList.add("loggedIn");
  }, (error) => {
    log("Failed to log in, error=" + error);
    e("loginBox").classList.remove("loggedIn");
  })
}

async function listBoxes() {
  let boxes = await tiqbiz.boxes();
  log("Boxes:");
  for (var box of boxes) {
    var details = "";
    for (var property in box) {
      if (details.length > 0) {
        details += ",";
      }
      details += property + " = " + box[property];
    }
    log(details);
  }
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

async function listCalendar() {
  let calendarPosts = await tiqbiz.calendar();
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
