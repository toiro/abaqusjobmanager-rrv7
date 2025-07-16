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
  "/test/sse": {};
  "/test/api": {};
  "/test/ui": {};
  "/admin": {};
  "/admin/settings": {};
  "/admin/nodes": {};
  "/admin/files": {};
  "/admin/login": {};
  "/admin/users": {};
  "/*": {
    "*": string;
  };
};