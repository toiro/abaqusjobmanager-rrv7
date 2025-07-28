import { describe, it, expect, beforeEach } from "bun:test";
import { SerialJobQueue } from "../serial-job-queue";

// テストユーティリティ
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("SerialJobQueue", () => {
	let queue: SerialJobQueue;
	let executionOrder: string[];

	beforeEach(() => {
		queue = new SerialJobQueue();
		executionOrder = [];
	});

	describe("Basic functionality", () => {
		it("executes single job and returns result", async () => {
			const result = await queue.push(async () => {
				executionOrder.push("job1");
				return "result1";
			});

			expect(result).toBe("result1");
			expect(executionOrder).toEqual(["job1"]);
		});

		it("executes multiple jobs in serial order", async () => {
			const promises = [
				queue.push(async () => {
					await delay(20);
					executionOrder.push("job1");
					return "result1";
				}),
				queue.push(async () => {
					await delay(10);
					executionOrder.push("job2");
					return "result2";
				}),
				queue.push(async () => {
					executionOrder.push("job3");
					return "result3";
				}),
			];

			const results = await Promise.all(promises);

			expect(results).toEqual(["result1", "result2", "result3"]);
			expect(executionOrder).toEqual(["job1", "job2", "job3"]);
		});

		it("returns correct results for each job", async () => {
			const job1 = queue.push(async () => ({ id: 1, data: "test1" }));
			const job2 = queue.push(async () => 42);
			const job3 = queue.push(async () => [1, 2, 3]);

			const [result1, result2, result3] = await Promise.all([job1, job2, job3]);

			expect(result1).toEqual({ id: 1, data: "test1" });
			expect(result2).toBe(42);
			expect(result3).toEqual([1, 2, 3]);
		});
	});

	describe("Error handling", () => {
		it("rejects when job throws error", async () => {
			const error = new Error("Job failed");

			await expect(
				queue.push(async () => {
					executionOrder.push("failing-job");
					throw error;
				}),
			).rejects.toThrow("Job failed");

			expect(executionOrder).toEqual(["failing-job"]);
		});

		it("continues execution after error", async () => {
			const promises = [
				queue
					.push(async () => {
						executionOrder.push("job1");
						throw new Error("Job1 failed");
					})
					.catch((err) => `error: ${err.message}`),
				queue.push(async () => {
					executionOrder.push("job2");
					return "result2";
				}),
				queue.push(async () => {
					executionOrder.push("job3");
					return "result3";
				}),
			];

			const results = await Promise.all(promises);

			expect(results).toEqual(["error: Job1 failed", "result2", "result3"]);
			expect(executionOrder).toEqual(["job1", "job2", "job3"]);
		});

		it("handles multiple errors independently", async () => {
			const promises = [
				queue
					.push(async () => {
						executionOrder.push("job1");
						throw new Error("Error1");
					})
					.catch(() => "caught1"),
				queue.push(async () => {
					executionOrder.push("job2");
					return "success2";
				}),
				queue
					.push(async () => {
						executionOrder.push("job3");
						throw new Error("Error3");
					})
					.catch(() => "caught3"),
				queue.push(async () => {
					executionOrder.push("job4");
					return "success4";
				}),
			];

			const results = await Promise.all(promises);

			expect(results).toEqual(["caught1", "success2", "caught3", "success4"]);
			expect(executionOrder).toEqual(["job1", "job2", "job3", "job4"]);
		});
	});

	describe("Concurrency and ordering", () => {
		it("maintains order when jobs pushed simultaneously", async () => {
			// 同時にpushして順序が保たれるかテスト
			const promises = Array.from({ length: 5 }, (_, i) =>
				queue.push(async () => {
					await delay(Math.random() * 10); // ランダム遅延で順序をテスト
					executionOrder.push(`job${i + 1}`);
					return `result${i + 1}`;
				}),
			);

			const results = await Promise.all(promises);

			expect(results).toEqual([
				"result1",
				"result2",
				"result3",
				"result4",
				"result5",
			]);
			expect(executionOrder).toEqual(["job1", "job2", "job3", "job4", "job5"]);
		});

		it("handles jobs added during execution", async () => {
			const promises: Promise<string>[] = [];

			// 最初のジョブ
			promises.push(
				queue.push(async () => {
					executionOrder.push("job1");
					await delay(20);
					return "result1";
				}),
			);

			// job1実行中にjob2を追加（同期的に追加）
			promises.push(
				queue.push(async () => {
					executionOrder.push("job2");
					return "result2";
				}),
			);

			// job1実行中にjob3を追加（同期的に追加）
			promises.push(
				queue.push(async () => {
					executionOrder.push("job3");
					return "result3";
				}),
			);

			// 全てのジョブが完了するまで待機
			await Promise.all(promises);

			// キューに追加された順序で実行されることを確認
			expect(executionOrder).toEqual(["job1", "job2", "job3"]);
		});
	});

	describe("State management", () => {
		it("starts with correct initial state", () => {
			const queueInstance = queue as any;
			expect(queueInstance.running).toBe(false);
			expect(queueInstance.queue).toEqual([]);
		});

		it("manages running state correctly during execution", async () => {
			const queueInstance = queue as any;

			expect(queueInstance.running).toBe(false);

			const promise = queue.push(async () => {
				expect(queueInstance.running).toBe(true);
				await delay(20);
				return "result";
			});

			// 実行開始直後は running = true になる
			await delay(5);
			expect(queueInstance.running).toBe(true);

			await promise;
			expect(queueInstance.running).toBe(false);
		});

		it("resets state after all jobs complete", async () => {
			const queueInstance = queue as any;

			const promises = [
				queue.push(async () => {
					await delay(10);
					return "result1";
				}),
				queue.push(async () => {
					await delay(5);
					return "result2";
				}),
			];

			await Promise.all(promises);

			expect(queueInstance.running).toBe(false);
			expect(queueInstance.queue).toEqual([]);
		});
	});

	describe("Edge cases", () => {
		it("handles empty queue correctly", async () => {
			const queueInstance = queue as any;
			expect(queueInstance.queue.length).toBe(0);
			expect(queueInstance.running).toBe(false);
		});

		it("handles rapid successive pushes", async () => {
			const promises: Promise<string>[] = [];

			// 短時間で大量のジョブをpush
			for (let i = 0; i < 10; i++) {
				promises.push(
					queue.push(async () => {
						executionOrder.push(`rapid-job${i + 1}`);
						return `rapid-result${i + 1}`;
					}),
				);
			}

			const results = await Promise.all(promises);

			expect(results).toEqual(
				Array.from({ length: 10 }, (_, i) => `rapid-result${i + 1}`),
			);
			expect(executionOrder).toEqual(
				Array.from({ length: 10 }, (_, i) => `rapid-job${i + 1}`),
			);
		});

		it("handles jobs that return undefined", async () => {
			const result = await queue.push(async () => {
				executionOrder.push("undefined-job");
				return undefined;
			});

			expect(result).toBeUndefined();
			expect(executionOrder).toEqual(["undefined-job"]);
		});

		it("handles jobs that return null", async () => {
			const result = await queue.push(async () => {
				executionOrder.push("null-job");
				return null;
			});

			expect(result).toBeNull();
			expect(executionOrder).toEqual(["null-job"]);
		});
	});
});
