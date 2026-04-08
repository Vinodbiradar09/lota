import { lota } from "./lota.js";

const api = lota.create({
  baseURL: "http://localhost:3000",
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  function (config: any) {
    console.log("this is req successfn");
    return config;
  },
  function (err: any) {
    console.log("this is req failfn");
    return Promise.reject(err);
  },
);

api.interceptors.response.use(
  function (response: any) {
    console.log("this is res successfn");
    return response;
  },
  function (err: any) {
    console.log("this is res failfn");
    return Promise.reject(err);
  },
);

async function main() {
  const res1 = await api.get("/user", {
    params: {
      id: 23,
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

api.post(
  "/users",
  { name: "arjun", email: "arjun@gmail.com" },
  { headers: { "Content-Type": "application/json" }, timeout: 200 },
);

api.put(
  "/users/1",
  { name: "adityad", email: "adityad@gmail.com" },
  { headers: { "Content-Type": "application/json" } },
);

api.delete("/users/6", { headers: { "Content-Type": "application/json" } });
api.patch(
  "/users/3",
  { name: "harkiratsingh", email: "harkiratsingh@gmail.com" },
  { headers: { "Content-Type": "application/json" }, timeout: 100 },
);
