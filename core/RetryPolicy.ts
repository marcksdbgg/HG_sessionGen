export class RetryPolicy {
  private maxAttempts: number;
  private baseDelay: number;

  constructor(maxAttempts: number = 3, baseDelay: number = 1000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxAttempts) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1) + (Math.random() * 200); // Jitter
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}