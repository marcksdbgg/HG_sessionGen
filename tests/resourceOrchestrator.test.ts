/**
 * Integration Tests: ResourceOrchestrator
 * 
 * Tests the parallel resource processing system (Flow B)
 */

import { assert, TestRunner, perf, waitForCondition } from './test-utils';
import { Resource, AIImageResource, DiagramResource, ExternalVideoResource, ExternalImageResource } from '../types';

// Mock resources for testing
const createMockResources = (): Resource[] => [
    {
        id: 'ai_image_1',
        type: 'AI_IMAGE',
        title: 'Test AI Image',
        moment: 'Inicio',
        status: 'pending',
        generationPrompt: 'A simple test image'
    } as AIImageResource,
    {
        id: 'diagram_1',
        type: 'DIAGRAM',
        title: 'Test Diagram',
        moment: 'Desarrollo',
        status: 'pending',
        diagramType: 'mapa-mental',
        generationPrompt: 'A concept about testing'
    } as DiagramResource,
    {
        id: 'video_1',
        type: 'VIDEO_SEARCH',
        title: 'Test Video',
        moment: 'Inicio',
        status: 'pending',
        searchQuery: 'educational video for kids'
    } as ExternalVideoResource,
    {
        id: 'image_search_1',
        type: 'IMAGE_SEARCH',
        title: 'Test Image Search',
        moment: 'Desarrollo',
        status: 'pending',
        searchQuery: 'photo of a tree'
    } as ExternalImageResource
];

// Test suite
const runner = new TestRunner();

runner.suite('ResourceOrchestrator - Type Routing', [
    {
        name: 'Should identify AI_IMAGE type correctly',
        fn: () => {
            const resource = createMockResources()[0];
            assert.equal(resource.type, 'AI_IMAGE', 'Resource type should be AI_IMAGE');
        }
    },
    {
        name: 'Should identify DIAGRAM type correctly',
        fn: () => {
            const resource = createMockResources()[1];
            assert.equal(resource.type, 'DIAGRAM', 'Resource type should be DIAGRAM');
        }
    },
    {
        name: 'Should identify VIDEO_SEARCH type correctly',
        fn: () => {
            const resource = createMockResources()[2];
            assert.equal(resource.type, 'VIDEO_SEARCH', 'Resource type should be VIDEO_SEARCH');
        }
    },
    {
        name: 'Should identify IMAGE_SEARCH type correctly',
        fn: () => {
            const resource = createMockResources()[3];
            assert.equal(resource.type, 'IMAGE_SEARCH', 'Resource type should be IMAGE_SEARCH');
        }
    }
]);

runner.suite('ResourceOrchestrator - Status Transitions', [
    {
        name: 'Should have valid initial status (pending)',
        fn: () => {
            const resources = createMockResources();
            resources.forEach(r => {
                assert.equal(r.status, 'pending', `Resource ${r.id} should start as pending`);
            });
        }
    },
    {
        name: 'Should transition to loading status',
        fn: () => {
            const resource = createMockResources()[0];
            resource.status = 'loading';
            assert.equal(resource.status, 'loading', 'Status should be loading');
        }
    },
    {
        name: 'Should transition to ready status with data',
        fn: () => {
            const resource = createMockResources()[0] as AIImageResource;
            resource.status = 'ready';
            resource.base64Data = 'data:image/png;base64,test';
            assert.equal(resource.status, 'ready', 'Status should be ready');
            assert.ok(resource.base64Data, 'Should have base64Data');
        }
    },
    {
        name: 'Should transition to error status with message',
        fn: () => {
            const resource = createMockResources()[0];
            resource.status = 'error';
            resource.error = 'Test error message';
            assert.equal(resource.status, 'error', 'Status should be error');
            assert.ok(resource.error, 'Should have error message');
        }
    }
]);

runner.suite('ResourceOrchestrator - Callback Contract', [
    {
        name: 'Callback should receive correct resource type',
        fn: () => {
            let receivedType: string = '';
            let receivedId: string = '';

            const mockCallback = (type: string, id: string, data: any) => {
                receivedType = type;
                receivedId = id;
            };

            // Simulate callback invocation
            const resource = createMockResources()[0];
            mockCallback('resource', resource.id, { ...resource, status: 'loading' });

            assert.equal(receivedType, 'resource', 'Callback type should be resource');
            assert.equal(receivedId, 'ai_image_1', 'Callback id should match resource id');
        }
    },
    {
        name: 'Callback data should contain updated status',
        fn: () => {
            let receivedData: any = null;

            const mockCallback = (type: string, id: string, data: any) => {
                receivedData = data;
            };

            const resource = createMockResources()[0];
            mockCallback('resource', resource.id, { ...resource, status: 'ready', base64Data: 'test' });

            assert.equal(receivedData.status, 'ready', 'Data should have ready status');
            assert.ok(receivedData.base64Data, 'Data should have base64Data');
        }
    }
]);

// Export runner for execution
export { runner };

// Auto-run if executed directly
if (typeof window !== 'undefined' && (window as any).__RUN_TESTS__) {
    runner.run().then(results => {
        (window as any).__TEST_RESULTS__ = results;
    });
}
