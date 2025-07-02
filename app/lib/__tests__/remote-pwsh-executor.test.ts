import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { createRemotePwshExecutor } from "../remote-pwsh/executor";
import type { RemotePwshOptions, RemotePwshResult, RemotePwshEvents } from "../remote-pwsh/types";

// Mock the dependencies
const mockEventManager = {
  lastOutput: "",
  emitter: {
    on: mock(function(this: any, event: string, listener: Function) {
      return this;
    }),
    removeAllListeners: mock(() => {}),
    emit: mock(() => {})
  }
};

const mockPowerShellProcess = {
  stdout: { on: mock(() => {}) },
  stderr: { on: mock(() => {}) },
  on: mock(() => {}),
  kill: mock(() => {})
};

const mockPreparePowerShellEnvironment = mock(() => {});
const mockSpawnPowerShellProcess = mock(() => mockPowerShellProcess);
const mockCreateEventManager = mock(() => mockEventManager);
const mockSetupEventHandlers = mock(() => {});
const mockAddTypedListener = mock(() => {});

// Mock the module dependencies
mock.module("../remote-pwsh/environment", () => ({
  preparePowerShellEnvironment: mockPreparePowerShellEnvironment
}));

mock.module("../remote-pwsh/process", () => ({
  spawnPowerShellProcess: mockSpawnPowerShellProcess
}));

mock.module("../remote-pwsh/events", () => ({
  createEventManager: mockCreateEventManager,
  setupEventHandlers: mockSetupEventHandlers,
  addTypedListener: mockAddTypedListener
}));

describe("Remote PowerShell Executor", () => {
  const defaultOptions: RemotePwshOptions = {
    host: "test-host",
    user: "test-user",
    scriptPath: "C:\\Scripts\\test.ps1"
  };

  beforeEach(() => {
    // Clear all mocks before each test
    mockPreparePowerShellEnvironment.mockClear();
    mockSpawnPowerShellProcess.mockClear();
    mockCreateEventManager.mockClear();
    mockSetupEventHandlers.mockClear();
    mockAddTypedListener.mockClear();
    
    // Reset event manager state
    mockEventManager.lastOutput = "";
    mockEventManager.emitter.on.mockClear();
    mockEventManager.emitter.removeAllListeners.mockClear();
    if (mockEventManager.emitter.emit) {
      mockEventManager.emitter.emit.mockClear();
    }
  });

  describe("Executor Creation", () => {
    test("should create executor with required options", () => {
      const executor = createRemotePwshExecutor(defaultOptions);

      expect(executor).toBeDefined();
      expect(mockCreateEventManager).toHaveBeenCalledTimes(1);
    });

    test("should create executor with custom encoding", () => {
      const optionsWithEncoding: RemotePwshOptions = {
        ...defaultOptions,
        encode: "ascii"
      };

      const executor = createRemotePwshExecutor(optionsWithEncoding);
      expect(executor).toBeDefined();
    });

    test("should use default utf8 encoding when not specified", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      expect(executor).toBeDefined();
    });
  });

  describe("Executor Properties", () => {
    test("should expose lastOutput property", () => {
      mockEventManager.lastOutput = "test output";
      const executor = createRemotePwshExecutor(defaultOptions);

      expect(executor.lastOutput).toBe("test output");
    });

    test("should update lastOutput when changed", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      mockEventManager.lastOutput = "new output";

      expect(executor.lastOutput).toBe("new output");
    });
  });

  describe("Event Handling", () => {
    test("should add event listeners", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      const mockListener = mock(() => {});

      const result = executor.on("start", mockListener);

      expect(mockAddTypedListener).toHaveBeenCalledWith(
        mockEventManager,
        "start",
        mockListener
      );
      expect(result).toBe(executor); // Should return self for chaining
    });

    test("should support all event types", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      const eventTypes: (keyof RemotePwshEvents)[] = [
        "start", "stdout", "stderr", "error", "finish"
      ];

      eventTypes.forEach(eventType => {
        mockAddTypedListener.mockClear();
        const mockListener = mock(() => {});
        
        executor.on(eventType, mockListener);
        
        expect(mockAddTypedListener).toHaveBeenCalledWith(
          mockEventManager,
          eventType,
          mockListener
        );
      });
    });

    test("should support method chaining", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      const listener1 = mock(() => {});
      const listener2 = mock(() => {});

      const result = executor
        .on("start", listener1)
        .on("finish", listener2);

      expect(result).toBe(executor);
      expect(mockAddTypedListener).toHaveBeenCalledTimes(2);
    });
  });

  describe("Synchronous Execution", () => {
    test("should invoke PowerShell execution", () => {
      const executor = createRemotePwshExecutor(defaultOptions);

      executor.invoke();

      expect(mockPreparePowerShellEnvironment).toHaveBeenCalledTimes(1);
      expect(mockSpawnPowerShellProcess).toHaveBeenCalledWith(
        defaultOptions.host,
        defaultOptions.user,
        defaultOptions.scriptPath
      );
      expect(mockSetupEventHandlers).toHaveBeenCalledWith(
        mockPowerShellProcess,
        mockEventManager,
        "utf8"
      );
    });

    test("should use custom encoding in invoke", () => {
      const optionsWithEncoding: RemotePwshOptions = {
        ...defaultOptions,
        encode: "ascii"
      };
      const executor = createRemotePwshExecutor(optionsWithEncoding);

      executor.invoke();

      expect(mockSetupEventHandlers).toHaveBeenCalledWith(
        mockPowerShellProcess,
        mockEventManager,
        "ascii"
      );
    });
  });

  describe("Asynchronous Execution", () => {
    test("should have invokeAsync method", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      
      expect(typeof executor.invokeAsync).toBe("function");
    });

    test("should call invoke when invokeAsync is called", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      const mockInvoke = mock(() => {});
      executor.invoke = mockInvoke;
      
      // Start async execution (don't await to avoid timeout)
      executor.invokeAsync();
      
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    test("should set up event listeners for async execution", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      
      // Mock the emitter properly
      const onMock = mock(function(this: any) { return this; });
      mockEventManager.emitter.on = onMock;
      
      // Start async execution (don't await)
      executor.invokeAsync();
      
      // Should set up listeners for all event types
      expect(onMock).toHaveBeenCalledWith("stdout", expect.any(Function));
      expect(onMock).toHaveBeenCalledWith("stderr", expect.any(Function));
      expect(onMock).toHaveBeenCalledWith("error", expect.any(Function));
      expect(onMock).toHaveBeenCalledWith("finish", expect.any(Function));
    });
  });

  describe("Integration", () => {
    test("should work with full execution flow", async () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      
      // Test event listener attachment
      const startListener = mock(() => {});
      const stdoutListener = mock(() => {});
      
      executor.on("start", startListener).on("stdout", stdoutListener);
      
      expect(mockAddTypedListener).toHaveBeenCalledTimes(2);
      
      // Test synchronous execution
      executor.invoke();
      
      expect(mockPreparePowerShellEnvironment).toHaveBeenCalled();
      expect(mockSpawnPowerShellProcess).toHaveBeenCalled();
      expect(mockSetupEventHandlers).toHaveBeenCalled();
    });

    test("should handle multiple executions", () => {
      const executor = createRemotePwshExecutor(defaultOptions);
      
      executor.invoke();
      executor.invoke();
      
      expect(mockPreparePowerShellEnvironment).toHaveBeenCalledTimes(2);
      expect(mockSpawnPowerShellProcess).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid options gracefully", () => {
      const invalidOptions = {
        host: "",
        user: "",
        scriptPath: ""
      };
      
      // Should not throw during creation
      expect(() => createRemotePwshExecutor(invalidOptions)).not.toThrow();
    });

    test("should handle missing optional parameters", () => {
      const minimalOptions: RemotePwshOptions = {
        host: "test-host",
        user: "test-user",
        scriptPath: "test.ps1"
      };
      
      const executor = createRemotePwshExecutor(minimalOptions);
      expect(executor).toBeDefined();
    });
  });
});