import "react-router";

declare module "react-router" {
  interface Register {
    params: Params;
  }
}

type Params = {
  "/": {};
  "/api/scheduler-status": {};
  "/api/test-events": {};
  "/test": {};
  "/api/events": {};
  "/test/api": {};
  "/test/sse": {};
  "/test/ui": {};
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