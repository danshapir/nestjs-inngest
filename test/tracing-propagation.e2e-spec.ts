import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './e2e/app/app.module';
import * as otelApi from '@opentelemetry/api';

// Import tracing setup before starting tests
import './e2e/tracing';

describe('TraceId Propagation Integration (e2e)', () => {
  let app: INestApplication;
  let consoleSpy: jest.SpyInstance;

  beforeAll(async () => {
    // Spy on console.log to capture trace output
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    consoleSpy.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    consoleSpy.mockClear();
  });

  describe('Client → Function TraceId Propagation', () => {
    it('should propagate custom traceId from client HTTP headers', async () => {
      // Generate a custom trace ID following OpenTelemetry format (32 chars hex)
      const customTraceId = '12345678901234567890123456789012';
      const customSpanId = '1234567890123456';
      
      // Send event with custom trace context in headers
      const response = await request(app.getHttpServer())
        .post('/api/test/simple')
        .set('traceparent', `00-${customTraceId}-${customSpanId}-01`)
        .send({ 
          message: 'test trace propagation',
          userId: 'user-trace-123',
          traceTest: true
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Wait for spans to be exported
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if our custom trace ID appears in the spans
      const traceExports = consoleSpy.mock.calls
        .map(call => call[0])
        .join(' ')
        .toLowerCase();

      expect(traceExports).toContain(customTraceId);
    });

    it('should propagate traceId from event data', async () => {
      // Generate custom trace context
      const customTraceId = '98765432109876543210987654321098';
      
      // Send event with trace context in event data
      const response = await request(app.getHttpServer())
        .post('/api/test/simple')
        .send({ 
          message: 'test data trace propagation',
          userId: 'user-data-trace-456',
          traceContext: {
            traceId: customTraceId,
            spanId: '9876543210987654',
            traceFlags: 1
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Wait for spans to be exported
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if our custom trace ID appears in the spans
      const traceExports = consoleSpy.mock.calls
        .map(call => call[0])
        .join(' ')
        .toLowerCase();

      expect(traceExports).toContain(customTraceId);
    });
  });

  describe('Function → Function TraceId Propagation via sendEvent', () => {
    it('should propagate traceId when function uses step.sendEvent', async () => {
      // Start a workflow that will send events to other functions
      const response = await request(app.getHttpServer())
        .post('/api/test/user-onboarding')
        .send({ 
          userId: 'user-workflow-789',
          email: 'test@example.com',
          enableEmailNotification: true
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Wait longer for the workflow chain to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract all trace IDs from the console output
      const allLogs = consoleSpy.mock.calls.map(call => call[0]).join(' ');
      const traceIdMatches = allLogs.match(/TraceId: ([a-f0-9]{32})/gi) || [];
      const traceIds = traceIdMatches.map(match => match.split(': ')[1]);

      // Should have multiple spans but ideally they should share trace IDs
      expect(traceIds.length).toBeGreaterThan(1);

      // Count unique trace IDs
      const uniqueTraceIds = [...new Set(traceIds)];
      
      // If propagation works correctly, we should have fewer unique trace IDs than total spans
      // (indicating that some spans share the same trace)
      console.log('🔍 TraceId Analysis:', {
        totalSpans: traceIds.length,
        uniqueTraces: uniqueTraceIds.length,
        propagationRate: ((traceIds.length - uniqueTraceIds.length) / traceIds.length * 100).toFixed(1) + '%'
      });

      // We should have at least some trace propagation
      expect(uniqueTraceIds.length).toBeLessThan(traceIds.length);
    });

    it('should maintain traceId across complex workflow chains', async () => {
      // Generate a specific trace context for this test
      const testTraceId = 'aaaabbbbccccddddeeeeffffgggghhhhh';
      
      // Trigger a complex workflow with custom trace
      const response = await request(app.getHttpServer())
        .post('/api/test/workflow')
        .set('traceparent', `00-${testTraceId}-1234567890123456-01`)
        .send({ 
          workflowId: 'complex-chain-test',
          data: { 
            enableChain: true, 
            steps: 3,
            userId: 'user-complex-chain'
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Wait for the entire workflow chain to complete
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Check that our test trace ID appears in multiple spans
      const allLogs = consoleSpy.mock.calls.map(call => call[0]).join(' ');
      const testTraceMatches = (allLogs.match(new RegExp(testTraceId, 'g')) || []).length;

      console.log('🔗 Complex Chain Analysis:', {
        testTraceId,
        occurrences: testTraceMatches,
        totalLogs: consoleSpy.mock.calls.length
      });

      // Our test trace ID should appear in multiple spans across the chain
      expect(testTraceMatches).toBeGreaterThan(1);
    });
  });

  describe('Error Scenarios with TraceId Propagation', () => {
    it('should preserve traceId in error spans', async () => {
      const errorTraceId = '1111222233334444555566667777888899';
      
      // Trigger a function that will throw an error
      const response = await request(app.getHttpServer())
        .post('/api/test/error')
        .set('traceparent', `00-${errorTraceId}-9999888877776666-01`)
        .send({ 
          shouldFail: true,
          userId: 'user-error-test'
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Wait for error spans to be exported
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check that error trace ID appears in spans
      const allLogs = consoleSpy.mock.calls.map(call => call[0]).join(' ');
      
      console.log('❌ Error Trace Analysis:', {
        errorTraceId,
        foundInLogs: allLogs.includes(errorTraceId),
        errorSpans: (allLogs.match(/Status: ERROR/g) || []).length
      });

      // Error trace should be preserved
      expect(allLogs).toContain(errorTraceId);
    });
  });

  describe('Performance and Context Validation', () => {
    it('should include business context in trace attributes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/test/simple')
        .send({ 
          message: 'business context test',
          userId: 'business-user-123',
          tenantId: 'tenant-456',
          metadata: {
            source: 'test-suite',
            version: '1.0.0'
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Wait for spans to be exported
      await new Promise(resolve => setTimeout(resolve, 1000));

      const allLogs = consoleSpy.mock.calls.map(call => call[0]).join(' ');
      
      // Check for business context attributes
      expect(allLogs).toContain('business-user-123');
      
      console.log('💼 Business Context Check:', {
        hasUserId: allLogs.includes('business-user-123'),
        hasTenantId: allLogs.includes('tenant-456'),
        hasAttributes: allLogs.includes('Key Attributes')
      });
    });

    it('should measure trace propagation performance', async () => {
      const startTime = Date.now();
      
      // Send multiple concurrent requests to test performance
      const promises = Array.from({ length: 5 }, (_, i) => 
        request(app.getHttpServer())
          .post('/api/test/simple')
          .send({ 
            message: `concurrent test ${i}`,
            userId: `perf-user-${i}`,
            requestId: i
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Wait for all spans to be exported
      await new Promise(resolve => setTimeout(resolve, 2000));

      const executionTime = endTime - startTime;
      const totalSpans = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes?.('Span:') || call[0]?.includes?.('execution')
      ).length;

      console.log('⚡ Performance Metrics:', {
        concurrentRequests: 5,
        executionTime: `${executionTime}ms`,
        totalSpans,
        avgTimePerSpan: `${(executionTime / Math.max(totalSpans, 1)).toFixed(2)}ms`
      });

      // Basic performance validation
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(totalSpans).toBeGreaterThan(0);
    });
  });

  describe('Trace Context Extraction and Injection', () => {
    it('should extract and inject trace context correctly', async () => {
      // Test that we can create a manual trace context
      const tracer = otelApi.trace.getTracer('test-tracer');
      
      await tracer.startActiveSpan('manual-test-span', async (span) => {
        const spanContext = span.spanContext();
        const testTraceId = spanContext.traceId;
        
        // Make a request within this span context
        const response = await request(app.getHttpServer())
          .post('/api/test/simple')
          .send({ 
            message: 'manual trace context test',
            userId: 'manual-trace-user'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        
        span.end();
        
        // Wait for spans to be exported
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const allLogs = consoleSpy.mock.calls.map(call => call[0]).join(' ');
        
        console.log('🔧 Manual Context Test:', {
          testTraceId,
          foundInLogs: allLogs.includes(testTraceId)
        });
        
        // The manual trace ID should appear in the exported spans
        expect(allLogs).toContain(testTraceId);
      });
    });
  });
});