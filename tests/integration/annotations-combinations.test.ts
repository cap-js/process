import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, "../bookshop");
const { test, POST, DELETE, PATCH } = cds.test(app);

describe("Integration tests for Process Annotation Combinations", () => {
    let foundMessages: any[] = [];
    
    beforeAll(async () => {
        const db = await cds.connect.to('db');
        db.before('*', req => {
            if (req.event === 'CREATE' && req.target?.name === 'cds.outbox.Messages') {
                const msg = JSON.parse(req.query?.INSERT?.entries[0].msg);
                foundMessages.push(msg);
            }
        });
    });

    beforeEach(async () => {
        await test.data.reset();
        foundMessages = [];
    });

    // Helper function to create a test car entity
    const createTestCar = (id?: string, mileage: number = 100) => ({
        ID: id || "550e8400-e29b-41d4-a716-446655440000",
        model: "Test Model",
        manufacturer: "Test Manufacturer",
        mileage,
        year: 2020
    });

    // Helper to find messages by event type
    const findMessagesByEvent = (eventName: string) => 
        foundMessages.filter(msg => msg.event === eventName);

    const findStartMessages = () => findMessagesByEvent('start');
    const findCancelMessages = () => findMessagesByEvent('cancel');
    const findSuspendMessages = () => findMessagesByEvent('suspend');
    const findResumeMessages = () => findMessagesByEvent('resume');

    // ================================================
    // Scenario 1: Basic Workflow Lifecycle
    // Start on CREATE + Cancel on DELETE
    // ================================================
    describe("Scenario 1: Basic Workflow Lifecycle (Start on CREATE, Cancel on DELETE)", () => {
        
        it("should start process on CREATE", async () => {
            const car = createTestCar();

            const response = await POST("/odata/v4/annotation/BasicLifecycle", car);

            expect(response.status).toBe(201);
            expect(foundMessages.length).toBe(1);

            const startMessages = findStartMessages();
            expect(startMessages.length).toBe(1);
            expect(startMessages[0].data.definitionId).toBe("basicLifecycleProcess");
            expect(startMessages[0].data.context.businesskey).toBe(car.ID);
        });

        it("should cancel process on DELETE", async () => {
            const car = createTestCar();

            // Create entity
            await POST("/odata/v4/annotation/BasicLifecycle", car);
            foundMessages = [];

            // Delete entity
            const deleteResponse = await DELETE(`/odata/v4/annotation/BasicLifecycle('${car.ID}')`);

            expect(deleteResponse.status).toBe(204);
            expect(foundMessages.length).toBe(1);

            const cancelMessages = findCancelMessages();
            expect(cancelMessages.length).toBe(1);
            expect(cancelMessages[0].data).toEqual({
                businessKey: car.ID,
                cascade: true
            });
        });

        it("should not trigger any process action on UPDATE", async () => {
            const car = createTestCar();

            // Create entity
            await POST("/odata/v4/annotation/BasicLifecycle", car);
            foundMessages = [];

            // Update entity
            const updateResponse = await PATCH(`/odata/v4/annotation/BasicLifecycle('${car.ID}')`, {
                mileage: 500
            });

            expect(updateResponse.status).toBe(200);
            expect(foundMessages.length).toBe(0);
        });

        it("should handle full lifecycle: CREATE -> UPDATE -> DELETE", async () => {
            const car = createTestCar();

            // CREATE - should start
            const createResponse = await POST("/odata/v4/annotation/BasicLifecycle", car);
            expect(createResponse.status).toBe(201);
            expect(findStartMessages().length).toBe(1);
            foundMessages = [];

            // UPDATE - should do nothing
            await PATCH(`/odata/v4/annotation/BasicLifecycle('${car.ID}')`, { mileage: 500 });
            expect(foundMessages.length).toBe(0);

            // DELETE - should cancel
            await DELETE(`/odata/v4/annotation/BasicLifecycle('${car.ID}')`);
            expect(findCancelMessages().length).toBe(1);
        });
    });

    // ================================================
    // Scenario 2: Status-based Cancellation
    // Start on CREATE + Cancel on UPDATE (when condition)
    // ================================================
    describe("Scenario 2: Status-based Cancellation (Start on CREATE, Cancel on UPDATE when mileage > 1000)", () => {
        
        it("should start process on CREATE", async () => {
            const car = createTestCar(undefined, 100);

            const response = await POST("/odata/v4/annotation/StatusBasedCancel", car);

            expect(response.status).toBe(201);
            expect(findStartMessages().length).toBe(1);
            expect(findStartMessages()[0].data.definitionId).toBe("statusCancelProcess");
        });

        it("should NOT cancel process on UPDATE when condition NOT met", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/StatusBasedCancel", car);
            foundMessages = [];

            // Update but keep mileage <= 1000
            const updateResponse = await PATCH(`/odata/v4/annotation/StatusBasedCancel('${car.ID}')`, {
                mileage: 500
            });

            expect(updateResponse.status).toBe(200);
            expect(foundMessages.length).toBe(0);
        });

        it("should cancel process on UPDATE when condition IS met", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/StatusBasedCancel", car);
            foundMessages = [];

            // Update to mileage > 1000
            const updateResponse = await PATCH(`/odata/v4/annotation/StatusBasedCancel('${car.ID}')`, {
                mileage: 1500
            });

            expect(updateResponse.status).toBe(200);
            expect(findCancelMessages().length).toBe(1);
            expect(findCancelMessages()[0].data.cascade).toBe(false);
        });

        it("should handle workflow: CREATE -> UPDATE (no cancel) -> UPDATE (cancel)", async () => {
            const car = createTestCar(undefined, 100);

            // CREATE
            await POST("/odata/v4/annotation/StatusBasedCancel", car);
            expect(findStartMessages().length).toBe(1);
            foundMessages = [];

            // UPDATE below threshold - no cancel
            await PATCH(`/odata/v4/annotation/StatusBasedCancel('${car.ID}')`, { mileage: 800 });
            expect(foundMessages.length).toBe(0);

            // UPDATE above threshold - cancel
            await PATCH(`/odata/v4/annotation/StatusBasedCancel('${car.ID}')`, { mileage: 1200 });
            expect(findCancelMessages().length).toBe(1);
        });
    });

    // ================================================
    // Scenario 3: Suspend/Resume Workflow
    // Start on CREATE + Suspend/Resume on UPDATE
    // ================================================
    describe("Scenario 3: Suspend/Resume Workflow (Start on CREATE, Suspend when mileage > 500, Resume when mileage <= 500)", () => {
        
        it("should start process on CREATE", async () => {
            const car = createTestCar(undefined, 100);

            const response = await POST("/odata/v4/annotation/SuspendResumeWorkflow", car);

            expect(response.status).toBe(201);
            expect(findStartMessages().length).toBe(1);
            expect(findStartMessages()[0].data.definitionId).toBe("suspendResumeProcess");
        });

        it("should suspend process on UPDATE when mileage > 500", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/SuspendResumeWorkflow", car);
            foundMessages = [];

            const updateResponse = await PATCH(`/odata/v4/annotation/SuspendResumeWorkflow('${car.ID}')`, {
                mileage: 600
            });

            expect(updateResponse.status).toBe(200);
            expect(findSuspendMessages().length).toBe(1);
            expect(findResumeMessages().length).toBe(0);
        });

        it("should resume process on UPDATE when mileage <= 500", async () => {
            const car = createTestCar(undefined, 600);

            await POST("/odata/v4/annotation/SuspendResumeWorkflow", car);
            foundMessages = [];

            const updateResponse = await PATCH(`/odata/v4/annotation/SuspendResumeWorkflow('${car.ID}')`, {
                mileage: 400
            });

            expect(updateResponse.status).toBe(200);
            expect(findResumeMessages().length).toBe(1);
            expect(findSuspendMessages().length).toBe(0);
        });

        it("should handle suspend/resume cycle", async () => {
            const car = createTestCar(undefined, 100);

            // CREATE - start
            await POST("/odata/v4/annotation/SuspendResumeWorkflow", car);
            expect(findStartMessages().length).toBe(1);
            foundMessages = [];

            // UPDATE to high mileage - suspend
            await PATCH(`/odata/v4/annotation/SuspendResumeWorkflow('${car.ID}')`, { mileage: 700 });
            expect(findSuspendMessages().length).toBe(1);
            foundMessages = [];

            // UPDATE to low mileage - resume
            await PATCH(`/odata/v4/annotation/SuspendResumeWorkflow('${car.ID}')`, { mileage: 300 });
            expect(findResumeMessages().length).toBe(1);
            foundMessages = [];

            // UPDATE to high mileage again - suspend
            await PATCH(`/odata/v4/annotation/SuspendResumeWorkflow('${car.ID}')`, { mileage: 900 });
            expect(findSuspendMessages().length).toBe(1);
        });
    });

    // ================================================
    // Scenario 4: Full Lifecycle Management
    // Start, Suspend, Resume, Cancel
    // ================================================
    describe("Scenario 4: Full Lifecycle (Start on CREATE, Suspend/Resume on UPDATE, Cancel on DELETE)", () => {
        
        it("should start process on CREATE", async () => {
            const car = createTestCar(undefined, 100);

            const response = await POST("/odata/v4/annotation/FullLifecycle", car);

            expect(response.status).toBe(201);
            expect(findStartMessages().length).toBe(1);
            expect(findStartMessages()[0].data.definitionId).toBe("fullLifecycleProcess");
        });

        it("should suspend on UPDATE when mileage > 800", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/FullLifecycle", car);
            foundMessages = [];

            await PATCH(`/odata/v4/annotation/FullLifecycle('${car.ID}')`, { mileage: 900 });
            
            expect(findSuspendMessages().length).toBe(1);
            expect(findResumeMessages().length).toBe(0);
        });

        it("should resume on UPDATE when mileage <= 800", async () => {
            const car = createTestCar(undefined, 900);

            await POST("/odata/v4/annotation/FullLifecycle", car);
            foundMessages = [];

            await PATCH(`/odata/v4/annotation/FullLifecycle('${car.ID}')`, { mileage: 700 });
            
            expect(findResumeMessages().length).toBe(1);
            expect(findSuspendMessages().length).toBe(0);
        });

        it("should cancel on DELETE", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/FullLifecycle", car);
            foundMessages = [];

            await DELETE(`/odata/v4/annotation/FullLifecycle('${car.ID}')`);
            
            expect(findCancelMessages().length).toBe(1);
            expect(findCancelMessages()[0].data.cascade).toBe(true);
        });

        it("should handle complete workflow: CREATE -> SUSPEND -> RESUME -> DELETE", async () => {
            const car = createTestCar(undefined, 100);

            // CREATE
            await POST("/odata/v4/annotation/FullLifecycle", car);
            expect(findStartMessages().length).toBe(1);
            foundMessages = [];

            // SUSPEND
            await PATCH(`/odata/v4/annotation/FullLifecycle('${car.ID}')`, { mileage: 900 });
            expect(findSuspendMessages().length).toBe(1);
            foundMessages = [];

            // RESUME
            await PATCH(`/odata/v4/annotation/FullLifecycle('${car.ID}')`, { mileage: 500 });
            expect(findResumeMessages().length).toBe(1);
            foundMessages = [];

            // DELETE (CANCEL)
            await DELETE(`/odata/v4/annotation/FullLifecycle('${car.ID}')`);
            expect(findCancelMessages().length).toBe(1);
        });
    });

    // ================================================
    // Scenario 5: Conditional Start and Cancel
    // Start on UPDATE (when), Cancel on UPDATE (when)
    // ================================================
    describe("Scenario 5: Conditional Start and Cancel (Start when mileage > 500, Cancel when mileage > 1500)", () => {
        
        it("should NOT start process on CREATE", async () => {
            const car = createTestCar(undefined, 100);

            const response = await POST("/odata/v4/annotation/ConditionalStartCancel", car);

            expect(response.status).toBe(201);
            expect(foundMessages.length).toBe(0);
        });

        it("should NOT start process on UPDATE when condition NOT met", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/ConditionalStartCancel", car);
            foundMessages = [];

            await PATCH(`/odata/v4/annotation/ConditionalStartCancel('${car.ID}')`, { mileage: 400 });
            
            expect(foundMessages.length).toBe(0);
        });

        it("should start process on UPDATE when start condition IS met", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/ConditionalStartCancel", car);
            foundMessages = [];

            await PATCH(`/odata/v4/annotation/ConditionalStartCancel('${car.ID}')`, { mileage: 600 });
            
            expect(findStartMessages().length).toBe(1);
            expect(findStartMessages()[0].data.definitionId).toBe("conditionalStartCancelProcess");
        });

        it("should cancel process on UPDATE when cancel condition IS met", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/ConditionalStartCancel", car);
            foundMessages = [];

            // Start the process first
            await PATCH(`/odata/v4/annotation/ConditionalStartCancel('${car.ID}')`, { mileage: 600 });
            foundMessages = [];

            // Cancel
            await PATCH(`/odata/v4/annotation/ConditionalStartCancel('${car.ID}')`, { mileage: 1600 });
            
            expect(findCancelMessages().length).toBe(1);
        });

        it("should trigger BOTH start and cancel when both conditions met in one update", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/ConditionalStartCancel", car);
            foundMessages = [];

            // Update to value that meets both conditions (> 500 for start, > 1500 for cancel)
            await PATCH(`/odata/v4/annotation/ConditionalStartCancel('${car.ID}')`, { mileage: 2000 });
            
            // Both should be triggered
            expect(findStartMessages().length).toBe(1);
            expect(findCancelMessages().length).toBe(1);
        });
    });

    // ================================================
    // Scenario 6: External Workflow Management
    // No start - Suspend/Resume on UPDATE, Cancel on DELETE
    // ================================================
    describe("Scenario 6: External Workflow Management (No Start, Suspend/Resume on UPDATE, Cancel on DELETE)", () => {
        
        it("should NOT start any process on CREATE", async () => {
            const car = createTestCar(undefined, 100);

            const response = await POST("/odata/v4/annotation/ExternalWorkflowManagement", car);

            expect(response.status).toBe(201);
            expect(foundMessages.length).toBe(0);
        });

        it("should suspend on UPDATE when mileage > 500", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/ExternalWorkflowManagement", car);
            foundMessages = [];

            await PATCH(`/odata/v4/annotation/ExternalWorkflowManagement('${car.ID}')`, { mileage: 600 });
            
            expect(findSuspendMessages().length).toBe(1);
        });

        it("should resume on UPDATE when mileage <= 500", async () => {
            const car = createTestCar(undefined, 600);

            await POST("/odata/v4/annotation/ExternalWorkflowManagement", car);
            foundMessages = [];

            await PATCH(`/odata/v4/annotation/ExternalWorkflowManagement('${car.ID}')`, { mileage: 400 });
            
            expect(findResumeMessages().length).toBe(1);
        });

        it("should cancel on DELETE", async () => {
            const car = createTestCar(undefined, 100);

            await POST("/odata/v4/annotation/ExternalWorkflowManagement", car);
            foundMessages = [];

            await DELETE(`/odata/v4/annotation/ExternalWorkflowManagement('${car.ID}')`);
            
            expect(findCancelMessages().length).toBe(1);
        });
    });
});
