import { describe, test, expect, beforeEach } from "bun:test";
import { jobOps, nodeOps, fileOps, userOps, jobLogOps, resetAllConnections } from "../dbOperations";
import { initializeDatabase, resetDatabase } from "../database";

// Initialize test database
beforeEach(() => {
  // Reset database connection to ensure fresh state
  resetDatabase();
  resetAllConnections();
  // Use in-memory database for isolated tests
  process.env.DATABASE_PATH = ":memory:";
  // Initialize with test setup (no sample data)
  initializeDatabase(true);
});

describe("User Operations", () => {
  test("should create and retrieve user", () => {
    const userData = {
      display_name: `testuser${Date.now()}`,
      max_concurrent_jobs: 3
    };

    const userId = userOps.create(userData);
    expect(userId).toBeGreaterThan(0);

    const retrievedUser = userOps.findById(userId);
    expect(retrievedUser).not.toBeNull();
    expect(retrievedUser?.display_name).toBe(userData.display_name);
    expect(retrievedUser?.max_concurrent_jobs).toBe(userData.max_concurrent_jobs);
    expect(retrievedUser?.is_active).toBe(true);
  });

  test("should find user by display name", () => {
    const displayName = `findtest${Date.now()}`;
    const userId = userOps.create({
      display_name: displayName,
      max_concurrent_jobs: 2
    });

    const foundUser = userOps.findByDisplayName(displayName);
    expect(foundUser).not.toBeNull();
    expect(foundUser?.id).toBe(userId);
    expect(foundUser?.display_name).toBe(displayName);
  });

  test("should validate display name length", () => {
    expect(() => {
      userOps.create({
        display_name: "x", // Too short
        max_concurrent_jobs: 1
      });
    }).toThrow("Display name must be at least 2 characters long");
  });

  test("should validate display name characters", () => {
    expect(() => {
      userOps.create({
        display_name: "invalid name!", // Contains space and special character
        max_concurrent_jobs: 1
      });
    }).toThrow("Display name can only contain alphanumeric characters, underscores, and hyphens");
  });

  test("should count current running jobs", () => {
    const timestamp = Date.now();
    const userId = userOps.create({
      display_name: `jobcount${timestamp}`,
      max_concurrent_jobs: 5
    });

    const fileId = fileOps.create({
      original_name: "count_test.inp",
      stored_name: `count_test_${timestamp}.inp`,
      file_path: `/uploads/count_test_${timestamp}.inp`,
      file_size: 1024
    });

    // Create running job
    jobOps.create({
      name: `Running Job ${timestamp}`,
      status: "running",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
    });

    // Create waiting job (should not be counted)
    jobOps.create({
      name: `Waiting Job ${timestamp}`,
      status: "waiting",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
    });

    const currentJobCount = userOps.getCurrentJobCount(userId);
    expect(currentJobCount).toBe(1);
  });

  test("should check if user can create job", () => {
    const timestamp = Date.now();
    const userId = userOps.create({
      display_name: `canjob${timestamp}`,
      max_concurrent_jobs: 1
    });

    // Should be able to create first job
    expect(userOps.canCreateJob(userId)).toBe(true);

    const fileId = fileOps.create({
      original_name: "can_test.inp",
      stored_name: `can_test_${timestamp}.inp`,
      file_path: `/uploads/can_test_${timestamp}.inp`,
      file_size: 1024
    });

    // Create running job to reach limit
    jobOps.create({
      name: `Limit Test Job ${timestamp}`,
      status: "running",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
    });

    // Should not be able to create another job
    expect(userOps.canCreateJob(userId)).toBe(false);
  });

  test("should activate and deactivate user", () => {
    const userId = userOps.create({
      display_name: `activate${Date.now()}`,
      max_concurrent_jobs: 2
    });

    userOps.deactivate(userId);
    let user = userOps.findById(userId);
    expect(user?.is_active).toBe(false);
    expect(userOps.canCreateJob(userId)).toBe(false);

    userOps.activate(userId);
    user = userOps.findById(userId);
    expect(user?.is_active).toBe(true);
    expect(userOps.canCreateJob(userId)).toBe(true);
  });
});

describe("Node Operations", () => {
  test("should create and retrieve node", () => {
    const nodeData = {
      name: `test-node-${Date.now()}`,
      hostname: "test.local",
      max_cpu_cores: 8,
      status: "available" as const
    };

    const nodeId = nodeOps.create(nodeData);
    expect(nodeId).toBeGreaterThan(0);

    const retrievedNode = nodeOps.findById(nodeId);
    expect(retrievedNode).not.toBeNull();
    expect(retrievedNode?.name).toBe(nodeData.name);
    expect(retrievedNode?.hostname).toBe(nodeData.hostname);
    expect(retrievedNode?.max_cpu_cores).toBe(nodeData.max_cpu_cores);
    expect(retrievedNode?.status).toBe(nodeData.status);
  });

  test("should find available nodes", () => {
    nodeOps.create({
      name: `available-node-${Date.now()}`,
      hostname: "available.local",
      max_cpu_cores: 4,
      status: "available"
    });

    nodeOps.create({
      name: `maintenance-node-${Date.now()}-2`,
      hostname: "maintenance.local",
      max_cpu_cores: 4,
      status: "maintenance"
    });

    const availableNodes = nodeOps.findAvailable();
    expect(availableNodes.length).toBeGreaterThanOrEqual(1);
    expect(availableNodes.every(node => node.status === "available")).toBe(true);
  });

  test("should update node status", () => {
    const nodeId = nodeOps.create({
      name: `status-test-node-${Date.now()}`,
      hostname: "status.local",
      max_cpu_cores: 8,
      status: "available"
    });

    nodeOps.updateStatus(nodeId, "maintenance");
    
    const updatedNode = nodeOps.findById(nodeId);
    expect(updatedNode?.status).toBe("maintenance");
  });
});

describe("File Operations", () => {
  test("should create and retrieve file record", () => {
    const fileData = {
      original_name: "test.inp",
      stored_name: `test_${Date.now()}.inp`,
      file_path: `/uploads/test_${Date.now()}.inp`,
      file_size: 1024,
      mime_type: "application/octet-stream"
    };

    const fileId = fileOps.create(fileData);
    expect(fileId).toBeGreaterThan(0);

    const retrievedFile = fileOps.findById(fileId);
    expect(retrievedFile).not.toBeNull();
    expect(retrievedFile?.original_name).toBe(fileData.original_name);
    expect(retrievedFile?.stored_name).toBe(fileData.stored_name);
    expect(retrievedFile?.file_size).toBe(fileData.file_size);
  });
});

describe("Job Operations", () => {
  test("should create and retrieve job", () => {
    // First create a user
    const timestamp = Date.now();
    const userId = userOps.create({
      display_name: `jobuser${timestamp}`,
      max_concurrent_jobs: 5
    });

    // Create a file record
    const fileId = fileOps.create({
      original_name: "job_test.inp",
      stored_name: `job_test_${timestamp}.inp`,
      file_path: `/uploads/job_test_${timestamp}.inp`,
      file_size: 2048
    });

    // Create a node
    nodeOps.create({
      name: `job-test-node-${timestamp}`,
      hostname: "jobtest.local",
      max_cpu_cores: 8,
      status: "available"
    });

    const jobData = {
      name: "Test Job",
      status: "waiting" as const,
      file_id: fileId,
      user_id: userId,
      cpu_cores: 4,
      priority: "normal" as const
    };

    const jobId = jobOps.create(jobData);
    expect(jobId).toBeGreaterThan(0);

    const retrievedJob = jobOps.findById(jobId);
    expect(retrievedJob).not.toBeNull();
    expect(retrievedJob?.name).toBe(jobData.name);
    expect(retrievedJob?.status).toBe(jobData.status);
    expect(retrievedJob?.cpu_cores).toBe(jobData.cpu_cores);
    expect(retrievedJob?.user_id).toBe(userId);
  });

  test("should find jobs by status", () => {
    const timestamp = Date.now();
    const userId = userOps.create({
      display_name: `statususer${timestamp}`,
      max_concurrent_jobs: 10
    });

    const fileId = fileOps.create({
      original_name: "status_test.inp",
      stored_name: `status_test_${timestamp}.inp`,
      file_path: `/uploads/status_test_${timestamp}.inp`,
      file_size: 1024
    });

    // Create waiting job
    jobOps.create({
      name: `Waiting Job ${timestamp}`,
      status: "waiting",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2
    });

    // Create running job
    jobOps.create({
      name: `Running Job ${timestamp}`,
      status: "running",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 4,
    });

    const waitingJobs = jobOps.findByStatus("waiting");
    const runningJobs = jobOps.findByStatus("running");

    expect(waitingJobs.length).toBeGreaterThanOrEqual(1);
    expect(runningJobs.length).toBeGreaterThanOrEqual(1);
    expect(waitingJobs.every(job => job.status === "waiting")).toBe(true);
    expect(runningJobs.every(job => job.status === "running")).toBe(true);
  });

  test("should update job status", () => {
    const timestamp = Date.now();
    const userId = userOps.create({
      display_name: `updateuser${timestamp}`,
      max_concurrent_jobs: 5
    });

    const fileId = fileOps.create({
      original_name: "update_test.inp",
      stored_name: `update_test_${timestamp}.inp`,
      file_path: `/uploads/update_test_${timestamp}.inp`,
      file_size: 1024
    });

    const jobId = jobOps.create({
      name: `Update Test Job ${timestamp}`,
      status: "waiting",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
    });

    jobOps.updateStatus(jobId, "running");
    
    const updatedJob = jobOps.findById(jobId);
    expect(updatedJob?.status).toBe("running");
  });

  test("should assign job to node", () => {
    const timestamp = Date.now();
    const userId = userOps.create({
      display_name: `assignuser${timestamp}`,
      max_concurrent_jobs: 5
    });

    const fileId = fileOps.create({
      original_name: "assign_test.inp",
      stored_name: `assign_test_${timestamp}.inp`,
      file_path: `/uploads/assign_test_${timestamp}.inp`,
      file_size: 1024
    });

    const nodeId = nodeOps.create({
      name: `assign-test-node-${timestamp}`,
      hostname: "assign.local",
      max_cpu_cores: 8,
      status: "available"
    });

    const jobId = jobOps.create({
      name: `Assign Test Job ${timestamp}`,
      status: "waiting",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 4,
    });

    jobOps.assignToNode(jobId, nodeId);
    
    const assignedJob = jobOps.findById(jobId);
    expect(assignedJob?.node_id).toBe(nodeId);
    expect(assignedJob?.status).toBe("starting");
  });
});

describe("Job Log Operations", () => {
  test("should create and retrieve job logs", () => {
    const timestamp = Date.now();
    const userId = userOps.create({
      display_name: `loguser${timestamp}`,
      max_concurrent_jobs: 5
    });

    const fileId = fileOps.create({
      original_name: "log_test.inp",
      stored_name: `log_test_${timestamp}.inp`,
      file_path: `/uploads/log_test_${timestamp}.inp`,
      file_size: 1024
    });

    const jobId = jobOps.create({
      name: `Log Test Job ${timestamp}`,
      status: "waiting",
      file_id: fileId,
      user_id: userId,
      cpu_cores: 2,
    });

    const logData = {
      job_id: jobId,
      log_level: "info" as const,
      message: "Job started successfully",
      details: "Additional log details"
    };

    const logId = jobLogOps.create(logData);
    expect(logId).toBeGreaterThan(0);

    const jobLogs = jobLogOps.findByJobId(jobId);
    expect(jobLogs.length).toBe(1);
    expect(jobLogs[0].message).toBe(logData.message);
    expect(jobLogs[0].log_level).toBe(logData.log_level);
  });
});