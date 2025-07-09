import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import * as jobOps from "../job-operations";
import * as nodeOps from "../node-operations";
import * as fileOps from "../file-operations";
import * as userOps from "../user-operations";
import * as jobLogOps from "../job-log-operations";
import { getDatabase } from "../connection";
import { initializeTestDatabase, cleanupTestDatabase } from "../test-setup";

// Mock the logger to avoid LogTape initialization issues in tests
mock.module("../../logger/logger", () => ({
  logger: {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {})
  }
}));

// Store original environment
const originalEnv = process.env.DATABASE_PATH;

// Helper to generate unique test names
const uniqueId = () => Date.now() + Math.random().toString(36).substr(2, 9);

// Initialize test database
beforeEach(() => {
  // Ensure unique in-memory database for each test
  process.env.DATABASE_PATH = ":memory:";
  
  // Initialize fresh database tables
  initializeTestDatabase();
});

afterEach(() => {
  // Clean up after each test
});

describe("User Operations", () => {
  test("should create and retrieve user", () => {
    const userData = {
      display_name: `testuser_${Date.now()}`,
      max_concurrent_jobs: 3,
      is_active: true
    };

    const userId = userOps.createUser(userData);
    expect(userId).toBeGreaterThan(0);

    const retrievedUser = userOps.findUserById(userId);
    expect(retrievedUser).not.toBeNull();
    expect(retrievedUser?.display_name).toBe(userData.display_name);
    expect(retrievedUser?.max_concurrent_jobs).toBe(userData.max_concurrent_jobs);
    expect(retrievedUser?.is_active).toBe(true);
  });

  test("should find user by display name", () => {
    const userData = {
      display_name: `finduser_${Date.now()}`,
      max_concurrent_jobs: 2,
      is_active: true
    };

    const userId = userOps.createUser(userData);
    const foundUser = userOps.findUserByDisplayName(userData.display_name);
    
    expect(foundUser).not.toBeNull();
    expect(foundUser?.id).toBe(userId);
    expect(foundUser?.display_name).toBe(userData.display_name);
  });

  test("should count current running jobs", () => {
    const user = {
      display_name: "User_with_0_jobs",
      max_concurrent_jobs: 5,
      is_active: true
    };
    const userId = userOps.createUser(user);

    const runningJobsCount = userOps.getCurrentJobCount(userId);
    expect(runningJobsCount).toBe(0);
  });

  test("should check if user can create job", () => {
    const user = {
      display_name: "User_with_max_jobs",
      max_concurrent_jobs: 1,
      is_active: true
    };
    const userId = userOps.createUser(user);

    const canCreate = userOps.canCreateJob(userId);
    expect(canCreate).toBe(true);
  });

  test("should activate and deactivate user", () => {
    const userData = {
      display_name: `activateuser_${Date.now()}`,
      max_concurrent_jobs: 3,
      is_active: true
    };

    const userId = userOps.createUser(userData);
    
    const deactivated = userOps.deactivateUser(userId);
    expect(deactivated).toBe(true);
    
    const activated = userOps.activateUser(userId);
    expect(activated).toBe(true);
  });
});

describe("Node Operations", () => {
  test("should create and retrieve node", () => {
    const nodeData = {
      name: "test-node",
      hostname: "test.example.com",
      max_cpu_cores: 8,
      is_active: true,
      ssh_port: 22
    };

    const nodeId = nodeOps.createNode(nodeData);
    expect(nodeId).toBeGreaterThan(0);

    const retrievedNode = nodeOps.findNodeById(nodeId);
    expect(retrievedNode).not.toBeNull();
    expect(retrievedNode?.name).toBe(nodeData.name);
    expect(retrievedNode?.hostname).toBe(nodeData.hostname);
    expect(retrievedNode?.max_cpu_cores).toBe(nodeData.max_cpu_cores);
  });

  test("should find available nodes", () => {
    const node1 = nodeOps.createNode({
      name: "available-node-1",
      hostname: "node1.example.com",
      max_cpu_cores: 4,
      is_active: true,
      ssh_port: 22
    });
    
    const node2 = nodeOps.createNode({
      name: "available-node-2", 
      hostname: "node2.example.com",
      max_cpu_cores: 8,
      is_active: true,
      ssh_port: 22
    });

    const availableNodes = nodeOps.findActiveNodes();
    expect(availableNodes.length).toBeGreaterThanOrEqual(2);
  });

  test("should update node status", () => {
    const nodeData = {
      name: "status-test-node",
      hostname: "status.example.com",
      max_cpu_cores: 4,
      is_active: true,
      ssh_port: 22
    };

    const nodeId = nodeOps.createNode(nodeData);
    const updated = nodeOps.updateNodeStatus(nodeId, "busy");
    
    expect(updated).toBe(true);
    
    const updatedNode = nodeOps.findNodeById(nodeId);
    expect(updatedNode?.status).toBe("busy");
  });
});

describe("File Operations", () => {
  test("should create and retrieve file record", () => {
    const fileData = {
      original_name: "test.inp",
      stored_name: "test_stored.inp",
      file_path: "/uploads/test_stored.inp",
      file_size: 1024,
      mime_type: "text/plain",
      uploaded_by: "testuser"
    };

    const fileId = fileOps.createFileRecord(fileData);
    expect(fileId).toBeGreaterThan(0);

    const retrievedFile = fileOps.findFileById(fileId);
    expect(retrievedFile).not.toBeNull();
    expect(retrievedFile?.original_name).toBe(fileData.original_name);
    expect(retrievedFile?.file_size).toBe(fileData.file_size);
  });
});

describe("Job Operations", () => {
  test("should create and retrieve job", () => {
    // Create user and file first
    const userId = userOps.createUser({
      display_name: `jobuser_${Date.now()}`,
      max_concurrent_jobs: 5,
      is_active: true
    });
    
    const fileId = fileOps.createFileRecord({
      original_name: "job.inp",
      stored_name: "job_stored.inp",
      file_path: "/uploads/job_stored.inp", 
      file_size: 2048,
      mime_type: "text/plain",
      uploaded_by: "jobuser"
    });

    const jobData = {
      name: "test-job",
      status: "waiting" as const,
      file_id: fileId,
      user_id: userId,
      cpu_cores: 4,
      priority: "normal" as const
    };

    const jobId = jobOps.createJob(jobData);
    expect(jobId).toBeGreaterThan(0);

    const retrievedJob = jobOps.findJobById(jobId);
    expect(retrievedJob).not.toBeNull();
    expect(retrievedJob?.name).toBe(jobData.name);
    expect(retrievedJob?.status).toBe(jobData.status);
  });

  test("should find jobs by status", () => {
    // Create user and file first
    const userId = userOps.createUser({
      display_name: `statususer_${Date.now()}`,
      max_concurrent_jobs: 5,
      is_active: true
    });
    
    const fileId = fileOps.createFileRecord({
      original_name: "status.inp",
      stored_name: "status_stored.inp",
      file_path: "/uploads/status_stored.inp",
      file_size: 1024,
      mime_type: "text/plain", 
      uploaded_by: "statususer"
    });

    const waitingJob = jobOps.createJob({
      name: "waiting-job",
      status: "waiting" as const,
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
      priority: "normal" as const
    });

    const runningJob = jobOps.createJob({
      name: "running-job", 
      status: "running" as const,
      file_id: fileId,
      user_id: userId,
      cpu_cores: 4,
      priority: "high" as const
    });

    const waitingJobs = jobOps.findJobsByStatus("waiting");
    const runningJobs = jobOps.findJobsByStatus("running");

    expect(waitingJobs.length).toBeGreaterThanOrEqual(1);
    expect(runningJobs.length).toBeGreaterThanOrEqual(1);
  });

  test("should update job status", () => {
    // Create user and file first
    const userId = userOps.createUser({
      display_name: `updateuser_${Date.now()}`,
      max_concurrent_jobs: 5,
      is_active: true
    });
    
    const fileId = fileOps.createFileRecord({
      original_name: "update.inp",
      stored_name: "update_stored.inp",
      file_path: "/uploads/update_stored.inp",
      file_size: 1024,
      mime_type: "text/plain",
      uploaded_by: "updateuser"
    });

    const jobId = jobOps.createJob({
      name: "update-job",
      status: "waiting" as const,
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
      priority: "normal" as const
    });

    const updated = jobOps.updateJobStatus(jobId, "running");
    expect(updated).toBe(true);

    const updatedJob = jobOps.findJobById(jobId);
    expect(updatedJob?.status).toBe("running");
  });

  test("should assign job to node", () => {
    // Create user, file, and node first
    const userId = userOps.createUser({
      display_name: `assignuser_${Date.now()}`,
      max_concurrent_jobs: 5,
      is_active: true
    });
    
    const fileId = fileOps.createFileRecord({
      original_name: "assign.inp",
      stored_name: "assign_stored.inp",
      file_path: "/uploads/assign_stored.inp",
      file_size: 1024,
      mime_type: "text/plain",
      uploaded_by: "assignuser"
    });

    const nodeId = nodeOps.createNode({
      name: "assign-node",
      hostname: "assign.example.com",
      max_cpu_cores: 8,
      is_active: true,
      ssh_port: 22
    });

    const jobId = jobOps.createJob({
      name: "assign-job",
      status: "waiting" as const,
      file_id: fileId,
      user_id: userId,
      cpu_cores: 4,
      priority: "normal" as const
    });

    const assigned = jobOps.assignJobToNode(jobId, nodeId);
    expect(assigned).toBe(true);

    const assignedJob = jobOps.findJobById(jobId);
    expect(assignedJob?.node_id).toBe(nodeId);
  });
});

describe("Job Log Operations", () => {
  test("should create and retrieve job logs", () => {
    // Create user and file first
    const userId = userOps.createUser({
      display_name: `loguser_${Date.now()}`,
      max_concurrent_jobs: 5,
      is_active: true
    });
    
    const fileId = fileOps.createFileRecord({
      original_name: "log.inp",
      stored_name: "log_stored.inp",
      file_path: "/uploads/log_stored.inp",
      file_size: 1024,
      mime_type: "text/plain",
      uploaded_by: "loguser"
    });

    const jobId = jobOps.createJob({
      name: "log-job",
      status: "waiting" as const,
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
      priority: "normal" as const
    });

    const logData = {
      job_id: jobId,
      log_level: "info" as const,
      message: "Test log message"
    };

    const logId = jobLogOps.createJobLog(logData);
    expect(logId).toBeGreaterThan(0);

    const retrievedLog = jobLogOps.findJobLogById(logId);
    expect(retrievedLog).not.toBeNull();
    expect(retrievedLog?.message).toBe(logData.message);
    expect(retrievedLog?.log_level).toBe(logData.log_level);
  });
});