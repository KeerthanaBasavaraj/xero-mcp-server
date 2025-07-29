/**
 * Rate limiting utility for Xero API calls
 * Handles batching and delays to respect rate limits
 */

// Delay utility
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Batch API calls to respect rate limits
 * @param calls Array of functions that return promises
 * @param batchSize Maximum concurrent calls (default: 5 for Xero)
 * @param delayBetweenBatches Delay in milliseconds between batches (default: 1000ms)
 * @returns Promise<T[]> Array of results in the same order as calls
 */
export async function batchApiCalls<T>(
  calls: (() => Promise<T>)[],
  batchSize: number = 5,
  delayBetweenBatches: number = 1000
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(call => call()));
    results.push(...batchResults);
    
    // Add delay between batches (except for the last batch)
    if (i + batchSize < calls.length) {
      await delay(delayBetweenBatches);
    }
  }
  
  return results;
}

/**
 * Execute API calls with retry logic for rate limit errors
 * @param call Function that returns a promise
 * @param maxRetries Maximum number of retries (default: 3)
 * @param retryDelay Delay between retries in milliseconds (default: 2000ms)
 * @returns Promise<T> Result of the API call
 */
export async function executeWithRetry<T>(
  call: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 2000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await call();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a rate limit error (429 status)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 429) {
          if (attempt < maxRetries) {
            // Wait longer for rate limit errors
            await delay(retryDelay * attempt);
            continue;
          }
        }
      }
      
      // For non-rate-limit errors, don't retry
      throw error;
    }
  }
  
  throw lastError!;
}

/**
 * Rate limited API call executor with built-in error handling
 * @param calls Array of functions that return promises
 * @param options Configuration options
 * @returns Promise<T[]> Array of results
 */
export async function executeRateLimitedCalls<T>(
  calls: (() => Promise<T>)[],
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<T[]> {
  const {
    batchSize = 5,
    delayBetweenBatches = 1000,
    maxRetries = 3,
    retryDelay = 2000
  } = options;

  // Wrap each call with retry logic
  const retryCalls = calls.map(call => 
    () => executeWithRetry(call, maxRetries, retryDelay)
  );

  return batchApiCalls(retryCalls, batchSize, delayBetweenBatches);
} 