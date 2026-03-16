/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { test, POST, DELETE } = cds.test(app);

describe('Integration tests for multiple process events on DELETE', () => {
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
    await test.data.reset();
    foundMessages = [];
  });

  const createTestCar = (id?: string, mileage: number = 100) => ({
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

  // ================================================
  // Start + Cancel on DELETE
  // ================================================
  describe('Start + Cancel on DELETE', () => {
    it('should trigger both start and cancel on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/DeleteStartCancel', car);
      foundMessages = [];

      const deleteResponse = await DELETE(`/odata/v4/annotation/DeleteStartCancel('${car.ID}')`);

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(2);
      expect(findStartMessages().length).toBe(1);
      expect(findStartMessages()[0].data.definitionId).toBe('deleteStartCancelProcess');
      expect(findCancelMessages().length).toBe(1);
      expect(findCancelMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });
  });

  // ================================================
  // Start + Resume on DELETE
  // ================================================
  describe('Start + Resume on DELETE', () => {
    it('should trigger both start and resume on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/DeleteStartResume', car);
      foundMessages = [];

      const deleteResponse = await DELETE(`/odata/v4/annotation/DeleteStartResume('${car.ID}')`);

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(2);
      expect(findStartMessages().length).toBe(1);
      expect(findStartMessages()[0].data.definitionId).toBe('deleteStartResumeProcess');
      expect(findResumeMessages().length).toBe(1);
      expect(findResumeMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });
  });

  // ================================================
  // Cancel + Resume on DELETE
  // ================================================
  describe('Cancel + Resume on DELETE', () => {
    it('should trigger both cancel and resume on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/DeleteCancelResume', car);
      foundMessages = [];

      const deleteResponse = await DELETE(`/odata/v4/annotation/DeleteCancelResume('${car.ID}')`);

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(2);
      expect(findCancelMessages().length).toBe(1);
      expect(findCancelMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
      expect(findResumeMessages().length).toBe(1);
      expect(findResumeMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });
  });

  // ================================================
  // Cancel + Suspend on DELETE
  // ================================================
  describe('Cancel + Suspend on DELETE', () => {
    it('should trigger both cancel and suspend on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/DeleteCancelSuspend', car);
      foundMessages = [];

      const deleteResponse = await DELETE(`/odata/v4/annotation/DeleteCancelSuspend('${car.ID}')`);

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(2);
      expect(findCancelMessages().length).toBe(1);
      expect(findCancelMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
      expect(findSuspendMessages().length).toBe(1);
      expect(findSuspendMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });
  });

  // ================================================
  // Cancel + Suspend on DELETE with if condition
  // ================================================
  describe('Cancel + Suspend on DELETE with if condition', () => {
    it('should trigger only suspend', async () => {
      const car = createTestCar(undefined, 50);

      await POST('/odata/v4/annotation/DeleteCancelSuspendIfExpr', car);
      foundMessages = [];

      const deleteResponse = await DELETE(
        `/odata/v4/annotation/DeleteCancelSuspendIfExpr('${car.ID}')`,
      );

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(findCancelMessages().length).toBe(0);
      expect(findSuspendMessages().length).toBe(1);
      expect(findSuspendMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });
  });

  // ================================================
  // Start + Cancel + Resume on DELETE
  // ================================================
  describe('Start + Cancel + Resume on DELETE', () => {
    it('should trigger start, cancel, and resume on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/DeleteStartCancelResume', car);
      foundMessages = [];

      const deleteResponse = await DELETE(
        `/odata/v4/annotation/DeleteStartCancelResume('${car.ID}')`,
      );

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(3);
      expect(findStartMessages().length).toBe(1);
      expect(findStartMessages()[0].data.definitionId).toBe('deleteStartCancelResumeProcess');
      expect(findCancelMessages().length).toBe(1);
      expect(findCancelMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
      expect(findResumeMessages().length).toBe(1);
      expect(findResumeMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });
  });

  // ================================================
  // All four events on DELETE
  // ================================================
  describe('Start + Cancel + Suspend + Resume on DELETE', () => {
    it('should trigger all four process events on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/DeleteAllEvents', car);
      foundMessages = [];

      const deleteResponse = await DELETE(`/odata/v4/annotation/DeleteAllEvents('${car.ID}')`);

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(4);
      expect(findStartMessages().length).toBe(1);
      expect(findStartMessages()[0].data.definitionId).toBe('deleteAllEventsProcess');
      expect(findCancelMessages().length).toBe(1);
      expect(findCancelMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
      expect(findSuspendMessages().length).toBe(1);
      expect(findSuspendMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
      expect(findResumeMessages().length).toBe(1);
      expect(findResumeMessages()[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });
  });

  // ================================================
  // Start with inputs + Cancel on DELETE
  // ================================================
  describe('Start with inputs + Cancel on DELETE', () => {
    it('should trigger start with mapped inputs and cancel on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/DeleteStartInputsCancel', car);
      foundMessages = [];

      const deleteResponse = await DELETE(
        `/odata/v4/annotation/DeleteStartInputsCancel('${car.ID}')`,
      );

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(2);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(1);
      expect(startMsgs[0].data.definitionId).toBe('deleteStartInputsCancelProcess');
      expect(startMsgs[0].data.context.CarModel).toBe('Test Model');
      expect(startMsgs[0].data.context.CarMaker).toBe('Test Manufacturer');

      const cancelMsgs = findCancelMessages();
      expect(cancelMsgs.length).toBe(1);
      expect(cancelMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });
  });
});
