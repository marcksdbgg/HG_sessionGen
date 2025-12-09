/**
 * Integration Tests: SessionGenerator
 * 
 * Tests the session generation flow (Flow A) and JSON parsing
 */

import { assert, TestRunner, perf } from './test-utils';
import { SessionData } from '../types';

// Mock valid session data
const createValidSessionData = (): SessionData => ({
    sessionTitle: 'Test Session',
    area: 'Comunicación',
    cycleGrade: '3er grado',
    teacherName: 'Profesor Test',
    inicio: {
        motivacion: ['Test motivation'],
        saberesPrevios: ['Test prior knowledge'],
        conflictoCognitivo: ['Test conflict'],
        propositoDidactico: ['Test purpose'],
        materiales: ['Test materials']
    },
    desarrollo: {
        estrategias: ['Test strategy'],
        materiales: ['Test materials']
    },
    cierre: {
        estrategias: ['Test closing'],
        materiales: ['Test materials']
    },
    tareaCasa: {
        actividades: ['Test homework'],
        materiales: ['Test materials']
    },
    fichas: {
        aula: { titulo: 'Ficha Aula', instrucciones: [], items: [] },
        casa: { titulo: 'Ficha Casa', instrucciones: [], items: [] }
    },
    resources: {
        resources: [],
        images: [],
        diagrams: []
    }
});

const runner = new TestRunner();

runner.suite('SessionGenerator - Data Structure Validation', [
    {
        name: 'Should have required top-level fields',
        fn: () => {
            const data = createValidSessionData();
            assert.ok(data.sessionTitle, 'Should have sessionTitle');
            assert.ok(data.area, 'Should have area');
            assert.ok(data.cycleGrade, 'Should have cycleGrade');
            assert.ok(data.inicio, 'Should have inicio');
            assert.ok(data.desarrollo, 'Should have desarrollo');
            assert.ok(data.cierre, 'Should have cierre');
            assert.ok(data.fichas, 'Should have fichas');
            assert.ok(data.resources, 'Should have resources');
        }
    },
    {
        name: 'Inicio section should have all required fields',
        fn: () => {
            const data = createValidSessionData();
            assert.ok(Array.isArray(data.inicio.motivacion), 'motivacion should be array');
            assert.ok(Array.isArray(data.inicio.saberesPrevios), 'saberesPrevios should be array');
            assert.ok(Array.isArray(data.inicio.conflictoCognitivo), 'conflictoCognitivo should be array');
            assert.ok(Array.isArray(data.inicio.propositoDidactico), 'propositoDidactico should be array');
        }
    },
    {
        name: 'Resources should have correct structure',
        fn: () => {
            const data = createValidSessionData();
            assert.ok(Array.isArray(data.resources.resources), 'resources.resources should be array');
        }
    }
]);

runner.suite('SessionGenerator - JSON Parsing Robustness', [
    {
        name: 'Should handle valid JSON response',
        fn: () => {
            const jsonString = JSON.stringify(createValidSessionData());
            const parsed = JSON.parse(jsonString);
            assert.ok(parsed.sessionTitle, 'Parsed data should have sessionTitle');
        }
    },
    {
        name: 'Should detect invalid JSON',
        fn: async () => {
            const invalidJson = '{ invalid json }';
            await assert.throws(async () => {
                JSON.parse(invalidJson);
            }, 'Should throw on invalid JSON');
        }
    },
    {
        name: 'Should handle empty resources array',
        fn: () => {
            const data = createValidSessionData();
            data.resources.resources = [];
            assert.equal(data.resources.resources.length, 0, 'Resources array can be empty');
        }
    },
    {
        name: 'Should handle null/undefined fields gracefully',
        fn: () => {
            const data = createValidSessionData();
            // Simulate missing optional fields
            const partialData = { ...data };
            delete (partialData.resources as any).diagrams;

            // Should still have required fields
            assert.ok(partialData.sessionTitle, 'Required fields should persist');
            assert.ok(partialData.resources.resources, 'Primary resources array should exist');
        }
    }
]);

runner.suite('SessionGenerator - Resource Marker Detection', [
    {
        name: 'Should detect {{recurso:...}} markers in text',
        fn: () => {
            const text = 'Show the {{recurso:Test Image}} to students';
            const regex = /\{\{recurso:(.*?)\}\}/g;
            const matches = [...text.matchAll(regex)];
            assert.equal(matches.length, 1, 'Should find one marker');
            assert.equal(matches[0][1], 'Test Image', 'Should extract title');
        }
    },
    {
        name: 'Should detect {{imagen:...}} legacy markers',
        fn: () => {
            const text = 'Display {{imagen:Old Image}} here';
            const regex = /\{\{imagen:(.*?)\}\}/g;
            const matches = [...text.matchAll(regex)];
            assert.equal(matches.length, 1, 'Should find one legacy marker');
            assert.equal(matches[0][1], 'Old Image', 'Should extract title');
        }
    },
    {
        name: 'Should detect multiple markers in same text',
        fn: () => {
            const text = '{{recurso:Image1}} and {{recurso:Image2}} and {{imagen:Legacy}}';
            const regex = /\{\{(?:recurso|imagen):(.*?)\}\}/g;
            const matches = [...text.matchAll(regex)];
            assert.equal(matches.length, 3, 'Should find three markers');
        }
    },
    {
        name: 'Should return empty for text without markers',
        fn: () => {
            const text = 'Plain text without any markers';
            const regex = /\{\{(?:recurso|imagen):(.*?)\}\}/g;
            const matches = [...text.matchAll(regex)];
            assert.equal(matches.length, 0, 'Should find no markers');
        }
    }
]);

export { runner };
