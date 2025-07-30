export class SerialJobQueue {
	private queue: (() => Promise<unknown>)[] = [];
	private running = false;

	async push<T>(job: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await job();
					resolve(result);
				} catch (err) {
					reject(err);
				}
			});

			// トリガー
			if (!this.running) {
				this.runNext();
			}
		});
	}

	private async runNext() {
		const next = this.queue.shift();
		if (!next) {
			this.running = false;
			return;
		}

		this.running = true;
		try {
			await next(); // 中で resolve/reject が呼ばれる
		} finally {
			this.runNext(); // 次のジョブへ
		}
	}
}
