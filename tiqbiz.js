"use strict";

const API_URL = "https://api.tiqbiz.com/v6/";

class TiqBizAPI {

  login(username, password) {
    this.username = username;
    this.password = password;
    return new Promise(async (reject, resolve) => {
      this.postData("users/login", {
        email: this.username,
        password: this.password,
      })
      .then((json) => {
        this.apiToken = json.token;
      })
      .then(() =>
      this.getData("users/auth", {})
      )
      .then((response) => {
        log("Response=" + JSON.stringify(response));
        this.businessId = response.admin_of[0];
        log("businessId = " + businessId);
      })
      .then(resolve, reject);
    });
  }

  calendar() {
    if (!this.apiToken || !this.businessId) {
      return Promise.reject("Not logged in");
    }

    let self = this;
    return new Promise(async function(resolve, reject) {
      let extractBoxes = (boxes) => {
        let b = [];
        for (var box of boxes) {
          b.push(box.name);
        }
        return b;
      };

      let response = await self.getData("businesses/" + self.businessId.id + "/posts", {
        post_type: "calendar", orderBy: "start_date|desc", page: 1, limit: 15,
      });

      let responses = [response];
      for (var page = 2; page <= response.meta.pagination.total_pages; page++) {
        responses.push(await self.getData("businesses/" + self.businessId.id + "/posts", {
          post_type: "calendar", orderBy: "start_date|desc", page: page, limit: 15,
        }));
      }

      var posts = [];
      for (var r of responses) {
        for (var post of r.data) {
          posts.push({
            title: post.title,
            startDate: post.start_date,
            endDate: post.end_date,
            allDay: post.all_day,
            boxes: extractBoxes(post.boxes),
          });
        }
      }

      resolve(posts);
    });
  }

  boxes() {
    if (!this.apiToken || !this.businessId) {
      return Promise.reject("Not logged in");
    }
    return this.getData("businesses/" + this.businessId.id + "/boxes", {limit: 999})
    .then((response) => {
      var boxes = [];
      for (var box of response.data) {
        boxes.push({
          id: box.id,
          name: box.box_name,
          description: box.box_description,
          group: box.box_group,
        });
      }
      return boxes;
    });
  }

  postData(action, data) {
    data._method = "POST";
    var payload = this.buildPayload(data);
    // log("POST url=" + API_URL + action + " data=" + payload);
    var headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (this.apiToken) {
      headers['Authorization'] = 'Bearer ' + this.apiToken;
    }
    return fetch(API_URL + action, {
      body: payload, // must match 'Content-Type' header
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: 'same-origin', // include, same-origin, *omit
      headers: new Headers(headers),
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      // mode: 'cors', // no-cors, cors, *same-origin
      // redirect: 'follow', // *manual, follow, error
      // referrer: 'no-referrer', // *client, no-referrer
    })
    .then(response => response.json()) // parses response to JSON
  }

  getData(action, data) {
    data._method = "GET";
    var payload = this.buildPayload(data);
    // log("GET url=" + API_URL + action + " data=" + payload);
    var headers = {};
    if (this.apiToken.length > 0) {
      headers['Authorization'] = 'Bearer ' + this.apiToken;
    }
    return fetch(API_URL + action + "?" + payload, {
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: 'same-origin', // include, same-origin, *omit
      headers: new Headers(headers),
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      // mode: 'cors', // no-cors, cors, *same-origin
      // redirect: 'follow', // *manual, follow, error
      // referrer: 'no-referrer', // *client, no-referrer
    })
    .then(response => response.json()) // parses response to JSON
  }

  buildPayload(data) {
    var query = "";
    for (var name in data) {
      if (query.length > 0) {
        query += "&";
      }
      query += encodeURI(name) + "=" + encodeURI(data[name]);
    }
    return query;
  }
}
