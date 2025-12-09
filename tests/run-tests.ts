/**
 * Main Test Runner
 * 
 * Runs all test suites and outputs results
 * 
 * Usage:
 * - In browser console: import('./tests/run-tests.ts')
 * - With tsx: npx tsx tests/run-tests.ts
 */

import { runner as resourceOrchestratorTests } from './resourceOrchestrator.test';
import { runner as sessionGeneratorTests } from './sessionGenerator.test';
import { TestRunner } from './test-utils';

const runAllTests = async () => {
    console.log('═'.repeat(60));
    console.log('🚀 AULA EXPRESS - Test Suite');
    console.log('═'.repeat(60));

    const allResults: { suite: string; passed: number; failed: number }[] = [];

    // Run ResourceOrchestrator tests
    console.log('\n📦 ResourceOrchestrator Tests');
    const roResults = await resourceOrchestratorTests.run();
    allResults.push({ suite: 'ResourceOrchestrator', passed: roResults.passed, failed: roResults.failed });

    // Run SessionGenerator tests
    console.log('\n📦 SessionGenerator Tests');
    const sgResults = await sessionGeneratorTests.run();
    allResults.push({ suite: 'SessionGenerator', passed: sgResults.passed, failed: sgResults.failed });

    // Summary
    const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(60));
    allResults.forEach(r => {
        const status = r.failed === 0 ? '✅' : '❌';
        console.log(`${status} ${r.suite}: ${r.passed} passed, ${r.failed} failed`);
    });
    console.log('─'.repeat(60));
    console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
    console.log('═'.repeat(60));

    return { totalPassed, totalFailed, allResults };
};

// Export for module usage
export { runAllTests };

// Auto-run if executed directly
// Note: For browser, expose globally
if (typeof window !== 'undefined') {
    (window as any).runAllTests = runAllTests;
    console.log('🧪 Test runner available at window.runAllTests()');
}
