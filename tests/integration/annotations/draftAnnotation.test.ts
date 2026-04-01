/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { POST, DELETE, PATCH } = cds.test(app);

describe('Integration tests for Process Annotations on Draft-Enabled Entities', () => {
  let foundMessages: any[] = [];

  beforeAll(async () => {
    const db = await cds.connect.to('db');
    db.before('*', (req) => {
      if (req.event === 'CREATE' && req.target?.name === 'cds.outbox.Messages') {
        const msg = JSON.parse(req.query?.INSERT?.entries[0].msg);
        foundMessages.push(msg);
      }
    });
  });

  beforeEach(async () => {
    foundMessages = [];
  });

  afterAll(async () => {
    await (cds as any).flush();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  const createTestCar = ({ id, mileage = 100 }: { id?: string; mileage?: number } = {}) => ({
    ID: id || cds.utils.uuid(),
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    mileage,
    year: 2020,
  });

  const findMessagesByEvent = (eventName: string) =>
    foundMessages.filter((msg) => msg.event === eventName);

  const findStartMessages = () => findMessagesByEvent('start');
  const findCancelMessages = () => findMessagesByEvent('cancel');
  const findSuspendMessages = () => findMessagesByEvent('suspend');
  const findResumeMessages = () => findMessagesByEvent('resume');

  const createViaDraft = async (entityName: string, data: Record<string, any>) => {
    const draftResponse = await POST(
      `/odata/v4/draft-annotation/${entityName}`,
      {},
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
    const draftId = draftResponse.data.ID;

    await PATCH(`/odata/v4/draft-annotation/${entityName}(ID=${draftId},IsActiveEntity=false)`, {
      ...data,
      ID: draftId,
    });

    const activateResponse = await POST(
      `/odata/v4/draft-annotation/${entityName}(ID=${draftId},IsActiveEntity=false)/DraftAnnotationService.draftActivate`,
      {},
    );

    return { draftId, activateResponse };
  };

  const updateViaDraft = async (entityName: string, id: string, data: Record<string, any>) => {
    await POST(
      `/odata/v4/draft-annotation/${entityName}(ID=${id},IsActiveEntity=true)/DraftAnnotationService.draftEdit`,
      { PreserveChanges: true },
    );

    await PATCH(`/odata/v4/draft-annotation/${entityName}(ID=${id},IsActiveEntity=false)`, data);

    const activateResponse = await POST(
      `/odata/v4/draft-annotation/${entityName}(ID=${id},IsActiveEntity=false)/DraftAnnotationService.draftActivate`,
      {},
    );

    return activateResponse;
  };

  const deleteActive = async (entityName: string, id: string) => {
    return DELETE(`/odata/v4/draft-annotation/${entityName}(ID=${id},IsActiveEntity=true)`);
  };

  // ================================================
  // START ANNOTATION TESTS (Draft)
  // ================================================
  describe('Process START annotations on draft entities', () => {
    it('should start process when draft is activated (CREATE) without condition', async () => {
      const car = createTestCar();

      const { activateResponse } = await createViaDraft('DraftStartOnCreate', car);

      expect(activateResponse.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('draftStartOnCreateProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });

    it('should start process on DELETE of active entity without condition', async () => {
      const car = createTestCar();

      const { draftId } = await createViaDraft('DraftStartOnDelete', car);
      foundMessages = [];

      const deleteResponse = await deleteActive('DraftStartOnDelete', draftId);

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('draftStartOnDeleteProcess');
    });
  });

  // ================================================
  // CANCEL ANNOTATION TESTS (Draft)
  // ================================================
  describe('Process CANCEL annotations on draft entities', () => {
    it('should cancel process when draft is activated (CREATE) and condition is met', async () => {
      const car = createTestCar({ mileage: 600 }); // mileage > 500

      const { activateResponse, draftId } = await createViaDraft('DraftCancelOnCreateWhen', car);

      expect(activateResponse.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: draftId,
        cascade: true,
      });
    });

    it('should cancel process when draft is activated (UPDATE) without condition', async () => {
      const car = createTestCar();

      const { draftId } = await createViaDraft('DraftCancelOnUpdate', car);
      foundMessages = [];

      const activateResponse = await updateViaDraft('DraftCancelOnUpdate', draftId, {
        mileage: 200,
      });

      expect(activateResponse.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: draftId,
        cascade: false,
      });
    });

    it('should cancel process on DELETE of active entity without condition', async () => {
      const car = createTestCar();

      const { draftId } = await createViaDraft('DraftCancelOnDelete', car);
      foundMessages = [];

      const deleteResponse = await deleteActive('DraftCancelOnDelete', draftId);

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: draftId,
        cascade: false,
      });
    });
  });

  // ================================================
  // SUSPEND ANNOTATION TESTS (Draft)
  // ================================================
  describe('Process SUSPEND annotations on draft entities', () => {
    it('should suspend process when draft is activated (CREATE) without condition', async () => {
      const car = createTestCar();

      const { activateResponse, draftId } = await createViaDraft('DraftSuspendOnCreate', car);

      expect(activateResponse.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: draftId,
        cascade: false,
      });
    });
  });

  // ================================================
  // RESUME ANNOTATION TESTS (Draft)
  // ================================================
  describe('Process RESUME annotations on draft entities', () => {
    it('should resume process when draft is activated (CREATE) without condition', async () => {
      const car = createTestCar();

      const { activateResponse, draftId } = await createViaDraft('DraftResumeOnCreate', car);

      expect(activateResponse.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: draftId,
        cascade: false,
      });
    });
  });

  // ================================================
  // DRAFT FULL LIFECYCLE TESTS
  // ================================================
  describe('Draft Full Lifecycle (Start on CREATE, Suspend/Resume on UPDATE, Cancel on DELETE)', () => {
    it('should suspend process on UPDATE via draft when mileage > 800', async () => {
      const car = createTestCar();

      const { draftId } = await createViaDraft('DraftFullLifecycle', car);
      foundMessages = [];

      await updateViaDraft('DraftFullLifecycle', draftId, { mileage: 900 });

      expect(findSuspendMessages().length).toBe(1);
      expect(findResumeMessages().length).toBe(0);
    });

    it('should resume process on UPDATE via draft when mileage <= 800', async () => {
      const car = createTestCar({ mileage: 900 });

      const { draftId } = await createViaDraft('DraftFullLifecycle', car);
      foundMessages = [];

      await updateViaDraft('DraftFullLifecycle', draftId, { mileage: 700 });

      expect(findResumeMessages().length).toBe(1);
      expect(findSuspendMessages().length).toBe(0);
    });

    it('should cancel process on DELETE of active entity', async () => {
      const car = createTestCar();

      const { draftId } = await createViaDraft('DraftFullLifecycle', car);
      foundMessages = [];

      await deleteActive('DraftFullLifecycle', draftId);

      expect(findCancelMessages().length).toBe(1);
      expect(findCancelMessages()[0].data.cascade).toBe(true);
    });

    it('should handle complete draft lifecycle: CREATE -> SUSPEND -> RESUME -> DELETE', async () => {
      const car = createTestCar();

      // CREATE via draft activate
      const { draftId } = await createViaDraft('DraftFullLifecycle', car);
      expect(findStartMessages().length).toBe(1);
      foundMessages = [];

      // SUSPEND via draft edit + activate
      await updateViaDraft('DraftFullLifecycle', draftId, { mileage: 900 });
      expect(findSuspendMessages().length).toBe(1);
      foundMessages = [];

      // RESUME via draft edit + activate
      await updateViaDraft('DraftFullLifecycle', draftId, { mileage: 500 });
      expect(findResumeMessages().length).toBe(1);
      foundMessages = [];

      // DELETE active entity (CANCEL)
      await deleteActive('DraftFullLifecycle', draftId);
      expect(findCancelMessages().length).toBe(1);
    });

    it('should NOT trigger process events when only editing a draft without activating', async () => {
      const car = createTestCar();

      // Create and activate first
      const { draftId } = await createViaDraft('DraftFullLifecycle', car);
      foundMessages = [];

      // Put into edit mode
      await POST(
        `/odata/v4/draft-annotation/DraftFullLifecycle(ID=${draftId},IsActiveEntity=true)/DraftAnnotationService.draftEdit`,
        { PreserveChanges: true },
      );

      await PATCH(
        `/odata/v4/draft-annotation/DraftFullLifecycle(ID=${draftId},IsActiveEntity=false)`,
        { mileage: 999 },
      );

      expect(foundMessages.length).toBe(0);
    });
  });
});
