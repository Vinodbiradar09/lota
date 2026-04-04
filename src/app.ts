import { lota } from "./lota.js";

const api = lota.create({
  baseURL: "http://localhost:3000",
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
  },
});

// api.requestInterceptors(
//   function (config: any) {
//     console.log("intercepting the request....", config.url);
//     return config;
//   },
//   function (err: any) {
//     return Promise.reject(err);
//   },
// );

// api.responseInterceptors(
//   function (response: any) {
//     console.log("response received...", response.status);
//     return response;
//   },
//   function (err: any) {
//     return Promise.reject(err);
//   },
// );

async function main() {
  const res1 = await api.get("/user", {
    params: {
      id: 1,
    },
    headers: {
      "X-Custom-Header": "application/xml",
    },
    timeout: 200,
  });
  const data = await res1.json();
  console.log("data", data);

  // get all user
  const res2 = await api.get("/users", {
    headers: {
      "X-Custom-Header": "application/xml",
    },
  });
  const data2 = await res2?.json();
  console.log("data2", data2);
}
main();

// api.post(
//   "/users",
//   { name: "virat", email: "virat@gmail.com" },
//   { headers: { "Content-Type": "application/json" }, timeout: 200 },
// );

// api.put(
//   "/users/1",
//   { name: "aditya", email: "aditya@gmail.com" },
//   { headers: { "Content-Type": "application/json" } },
// );

api.delete("/users/12", { headers: { "Content-Type": "application/json" } });
api.patch(
  "/users/5",
  { name: "aditya_dhar", email: "adityadhar@gmail.com" },
  { headers: { "Content-Type": "application/json" }, timeout: 100 },
);
