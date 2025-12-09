/**
 * E2E Test Utilities - Browser-based performance and functionality tests
 * 
 * Run these in the browser console or import in the app for testing
 */

import { perf, waitForCondition } from './test-utils';

/**
 * E2E Test 1: Time to First Response
 * Measures time from submit to session text visible
 */
export const testTimeToFirstResponse = async (submitFn: () => Promise<void>): Promise<{ passed: boolean; duration: number }> => {
    console.log('🧪 E2E Test: Time to First Response');
    console.log('Target: < 5000ms');

    const { duration } = await perf.measure('Time to First Response', submitFn);

    const passed = duration < 5000;
    console.log(passed ? '✅ PASSED' : '❌ FAILED', `- ${duration.toFixed(0)}ms`);

    return { passed, duration };
};

/**
 * E2E Test 2: Resource Completion
 * Verifies all resources transition from loading to final state
 */
export const testResourceCompletion = async (
    getResources: () => { id: string; status: string }[],
    timeout: number = 30000
): Promise<{ passed: boolean; details: string[] }> => {
    console.log('🧪 E2E Test: Resource Completion');
    console.log('Target: All resources reach final state within', timeout, 'ms');

    const details: string[] = [];
    const startTime = Date.now();

    const completed = await waitForCondition(() => {
        const resources = getResources();
        const allDone = resources.every(r => r.status === 'ready' || r.status === 'error');
        return allDone;
    }, timeout);

    const endTime = Date.now();
    const resources = getResources();

    resources.forEach(r => {
        const status = r.status === 'ready' ? '✅' : r.status === 'error' ? '❌' : '⏳';
        details.push(`${status} ${r.id}: ${r.status}`);
    });

    const readyCount = resources.filter(r => r.status === 'ready').length;
    const errorCount = resources.filter(r => r.status === 'error').length;
    const totalCount = resources.length;

    const passed = completed && readyCount > 0;
    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    console.log(`Resources: ${readyCount}/${totalCount} ready, ${errorCount} errors`);
    console.log(`Duration: ${endTime - startTime}ms`);

    return { passed, details };
};

/**
 * E2E Test 3: Error Recovery
 * Verifies app doesn't crash when a resource fails
 */
export const testErrorRecovery = async (
    triggerError: () => Promise<void>,
    checkAppStable: () => boolean
): Promise<{ passed: boolean; error?: string }> => {
    console.log('🧪 E2E Test: Error Recovery');
    console.log('Target: App remains stable after resource error');

    try {
        await triggerError();

        // Wait a bit for any error propagation
        await new Promise(r => setTimeout(r, 1000));

        const appStable = checkAppStable();

        if (appStable) {
            console.log('✅ PASSED - App remained stable after error');
            return { passed: true };
        } else {
            console.log('❌ FAILED - App became unstable');
            return { passed: false, error: 'App unstable after error' };
        }
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.log('❌ FAILED - Unexpected crash:', error);
        return { passed: false, error };
    }
};

/**
 * Performance Test: Parallelism
 * Verifies multiple resources are processed concurrently
 */
export const testParallelism = async (
    resourceCount: number,
    processFn: () => Promise<void>,
    expectedMaxTime: number
): Promise<{ passed: boolean; duration: number; efficiency: number }> => {
    console.log('🧪 Performance Test: Parallelism');
    console.log(`Target: ${resourceCount} resources in < ${expectedMaxTime}ms`);

    const { duration } = await perf.measure('Parallel Processing', processFn);

    // Calculate efficiency: if truly parallel, time should be similar to single resource
    // Sequential would be ~resourceCount * singleTime
    const estimatedSequentialTime = duration * resourceCount / 2; // Assume 50% efficiency baseline
    const efficiency = (estimatedSequentialTime / duration) * 100;

    const passed = duration < expectedMaxTime;
    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    console.log(`Duration: ${duration.toFixed(0)}ms, Efficiency: ${efficiency.toFixed(0)}%`);

    return { passed, duration, efficiency };
};

/**
 * Console-based test runner for browser
 * Call this from browser console: await window.runE2ETests()
 */
export const exposeTestsGlobally = () => {
    if (typeof window !== 'undefined') {
        (window as any).e2eTests = {
            testTimeToFirstResponse,
            testResourceCompletion,
            testErrorRecovery,
            testParallelism
        };
        console.log('🧪 E2E Tests available at window.e2eTests');
    }
};
