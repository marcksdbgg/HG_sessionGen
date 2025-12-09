/**
 * Lightweight Test Utilities for Aula Express
 * No external dependencies - runs in browser console or Node
 */

// Simple assertion library
export const assert = {
    equal: (actual: any, expected: any, message?: string) => {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
        console.log(`✓ ${message || 'Assertion passed'}`);
    },

    ok: (value: any, message?: string) => {
        if (!value) {
            throw new Error(message || `Expected truthy value, got ${value}`);
        }
        console.log(`✓ ${message || 'Assertion passed'}`);
    },

    throws: async (fn: () => Promise<any>, message?: string) => {
        try {
            await fn();
            throw new Error(message || 'Expected function to throw');
        } catch (e) {
            console.log(`✓ ${message || 'Function threw as expected'}`);
        }
    },

    lessThan: (actual: number, expected: number, message?: string) => {
        if (actual >= expected) {
            throw new Error(message || `Expected ${actual} < ${expected}`);
        }
        console.log(`✓ ${message || `${actual} < ${expected}`}`);
    },

    greaterThan: (actual: number, expected: number, message?: string) => {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} > ${expected}`);
        }
        console.log(`✓ ${message || `${actual} > ${expected}`}`);
    },

    includes: (array: any[], item: any, message?: string) => {
        if (!array.includes(item)) {
            throw new Error(message || `Array does not include ${item}`);
        }
        console.log(`✓ ${message || 'Array includes item'}`);
    },

    type: (value: any, expectedType: string, message?: string) => {
        const actualType = typeof value;
        if (actualType !== expectedType) {
            throw new Error(message || `Expected type ${expectedType}, got ${actualType}`);
        }
        console.log(`✓ ${message || `Type is ${expectedType}`}`);
    }
};

// Test suite runner
interface TestCase {
    name: string;
    fn: () => Promise<void> | void;
}

interface TestSuite {
    name: string;
    tests: TestCase[];
    beforeAll?: () => Promise<void> | void;
    afterAll?: () => Promise<void> | void;
}

export class TestRunner {
    private suites: TestSuite[] = [];
    private passed = 0;
    private failed = 0;
    private results: { suite: string; test: string; pass: boolean; error?: string; duration: number }[] = [];

    suite(name: string, tests: TestCase[], beforeAll?: () => Promise<void> | void, afterAll?: () => Promise<void> | void) {
        this.suites.push({ name, tests, beforeAll, afterAll });
    }

    async run(): Promise<{ passed: number; failed: number; results: typeof this.results }> {
        console.log('\n🧪 Running Tests...\n');
        const startTotal = performance.now();

        for (const suite of this.suites) {
            console.log(`\n📦 Suite: ${suite.name}`);
            console.log('─'.repeat(50));

            if (suite.beforeAll) {
                await suite.beforeAll();
            }

            for (const test of suite.tests) {
                const start = performance.now();
                try {
                    await test.fn();
                    const duration = performance.now() - start;
                    console.log(`  ✅ ${test.name} (${duration.toFixed(0)}ms)`);
                    this.passed++;
                    this.results.push({ suite: suite.name, test: test.name, pass: true, duration });
                } catch (e) {
                    const duration = performance.now() - start;
                    const error = e instanceof Error ? e.message : String(e);
                    console.error(`  ❌ ${test.name}: ${error}`);
                    this.failed++;
                    this.results.push({ suite: suite.name, test: test.name, pass: false, error, duration });
                }
            }

            if (suite.afterAll) {
                await suite.afterAll();
            }
        }

        const totalTime = performance.now() - startTotal;
        console.log('\n' + '═'.repeat(50));
        console.log(`📊 Results: ${this.passed} passed, ${this.failed} failed (${totalTime.toFixed(0)}ms)`);
        console.log('═'.repeat(50));

        return { passed: this.passed, failed: this.failed, results: this.results };
    }
}

// Performance measurement utilities
export const perf = {
    measure: async <T>(name: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        console.log(`⏱️ ${name}: ${duration.toFixed(0)}ms`);
        return { result, duration };
    },

    measureSync: <T>(name: string, fn: () => T): { result: T; duration: number } => {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        console.log(`⏱️ ${name}: ${duration.toFixed(0)}ms`);
        return { result, duration };
    }
};

// Resource testing utilities
export const waitForCondition = async (
    condition: () => boolean,
    timeout: number = 30000,
    interval: number = 100
): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (condition()) return true;
        await new Promise(r => setTimeout(r, interval));
    }
    return false;
};
