import "react-router";

declare module "react-router" {
  interface Register {
    params: Params;
  }
}

type Params = {
  "/": {};
  "/api/events": {};
  "/test-ui": {};
  "/admin": {};
  "/admin/settings": {};
  "/admin/files": {};
  "/admin/login": {};
  "/admin/nodes": {};
  "/admin/users": {};
  "/*": {
    "*": string;
  };
};