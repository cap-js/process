/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { POST, DELETE, PATCH } = cds.test(app);

describe('Integration tests for multiple lifecycle annotations (cancel/suspend/resume)', () => {
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

  const findCancelMessages = () => findMessagesByEvent('cancel');
  const findSuspendMessages = () => findMessagesByEvent('suspend');
  const findResumeMessages = () => findMessagesByEvent('resume');

  // ================================================
  // Two cancels on DELETE
  // ================================================
  describe('Two cancels on DELETE', () => {
    it('should trigger both cancel annotations on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiCancelOnDelete', car);
      foundMessages = [];

      const response = await DELETE(`/odata/v4/annotation/MultiCancelOnDelete('${car.ID}')`);

      expect(response.status).toBe(204);

      const cancelMsgs = findCancelMessages();
      expect(cancelMsgs.length).toBe(2);

      const cascadeValues = cancelMsgs.map((m: any) => m.data.cascade).sort();
      expect(cascadeValues).toEqual([false, true]);

      // Both should have the same businessKey (ID)
      cancelMsgs.forEach((m: any) => {
        expect(m.data.businessKey).toBe(car.ID);
      });
    });
  });

  // ================================================
  // Two cancels on different events (DELETE + UPDATE)
  // ================================================
  describe('Two cancels on different events (DELETE + UPDATE)', () => {
    it('should trigger only the UPDATE cancel on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiCancelDiffEvents', car);
      foundMessages = [];

      const response = await PATCH(`/odata/v4/annotation/MultiCancelDiffEvents('${car.ID}')`, {
        mileage: 200,
      });

      expect(response.status).toBe(200);

      const cancelMsgs = findCancelMessages();
      expect(cancelMsgs.length).toBe(1);
      expect(cancelMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should trigger only the DELETE cancel on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiCancelDiffEvents', car);
      foundMessages = [];

      const response = await DELETE(`/odata/v4/annotation/MultiCancelDiffEvents('${car.ID}')`);

      expect(response.status).toBe(204);

      const cancelMsgs = findCancelMessages();
      expect(cancelMsgs.length).toBe(1);
      expect(cancelMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });
  });

  // ================================================
  // Two suspends on UPDATE
  // ================================================
  describe('Two suspends on UPDATE', () => {
    it('should trigger both suspend annotations on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiSuspendOnUpdate', car);
      foundMessages = [];

      const response = await PATCH(`/odata/v4/annotation/MultiSuspendOnUpdate('${car.ID}')`, {
        mileage: 200,
      });

      expect(response.status).toBe(200);

      const suspendMsgs = findSuspendMessages();
      expect(suspendMsgs.length).toBe(2);

      const cascadeValues = suspendMsgs.map((m: any) => m.data.cascade).sort();
      expect(cascadeValues).toEqual([false, true]);

      // Both should have the same businessKey (ID)
      suspendMsgs.forEach((m: any) => {
        expect(m.data.businessKey).toBe(car.ID);
      });
    });
  });

  // ================================================
  // Two resumes on UPDATE
  // ================================================
  describe('Two resumes on UPDATE', () => {
    it('should trigger both resume annotations on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiResumeOnUpdate', car);
      foundMessages = [];

      const response = await PATCH(`/odata/v4/annotation/MultiResumeOnUpdate('${car.ID}')`, {
        mileage: 200,
      });

      expect(response.status).toBe(200);

      const resumeMsgs = findResumeMessages();
      expect(resumeMsgs.length).toBe(2);

      const cascadeValues = resumeMsgs.map((m: any) => m.data.cascade).sort();
      expect(cascadeValues).toEqual([false, true]);

      // Both should have the same businessKey (ID)
      resumeMsgs.forEach((m: any) => {
        expect(m.data.businessKey).toBe(car.ID);
      });
    });
  });

  // ================================================
  // Two cancels on DELETE with different business keys
  // ================================================
  describe('Two cancels on DELETE with different business keys', () => {
    it('should trigger both cancels with their respective business keys', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiCancelDiffBusinessKeys', car);
      foundMessages = [];

      const response = await DELETE(
        `/odata/v4/annotation/MultiCancelDiffBusinessKeys('${car.ID}')`,
      );

      expect(response.status).toBe(204);

      const cancelMsgs = findCancelMessages();
      expect(cancelMsgs.length).toBe(2);

      // Unqualified cancel: @bpm.process.businessKey: (ID), cascade: true
      const msg1 = cancelMsgs.find((m: any) => m.data.cascade === true);
      // Qualified cancel #two: @bpm.process.businessKey#two: (model || '-' || manufacturer), cascade: false
      const msg2 = cancelMsgs.find((m: any) => m.data.cascade === false);

      expect(msg1).toBeDefined();
      expect(msg2).toBeDefined();

      expect(msg1!.data.businessKey).toBe(car.ID);
      expect(msg2!.data.businessKey).toBe(`${car.model}-${car.manufacturer}`);
    });
  });

  // ================================================
  // Two cancels on DELETE with condition
  // ================================================
  describe('Two cancels on DELETE with condition', () => {
    it('should trigger only the unconditional cancel when condition is NOT met', async () => {
      const car = createTestCar({ mileage: 100 }); // mileage <= 500, condition not met

      await POST('/odata/v4/annotation/MultiCancelWithCondition', car);
      foundMessages = [];

      const response = await DELETE(
        `/odata/v4/annotation/MultiCancelWithCondition('${car.ID}')`,
      );

      expect(response.status).toBe(204);

      const cancelMsgs = findCancelMessages();
      expect(cancelMsgs.length).toBe(1);
      expect(cancelMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });

    it('should trigger both cancels when condition IS met', async () => {
      const car = createTestCar({ mileage: 600 }); // mileage > 500, condition met

      await POST('/odata/v4/annotation/MultiCancelWithCondition', car);
      foundMessages = [];

      const response = await DELETE(
        `/odata/v4/annotation/MultiCancelWithCondition('${car.ID}')`,
      );

      expect(response.status).toBe(204);

      const cancelMsgs = findCancelMessages();
      expect(cancelMsgs.length).toBe(2);

      const cascadeValues = cancelMsgs.map((m: any) => m.data.cascade).sort();
      expect(cascadeValues).toEqual([false, true]);

      cancelMsgs.forEach((m: any) => {
        expect(m.data.businessKey).toBe(car.ID);
      });
    });
  });

  // ================================================
  // Two suspends on DELETE
  // ================================================
  describe('Two suspends on DELETE', () => {
    it('should trigger both suspend annotations on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiSuspendOnDelete', car);
      foundMessages = [];

      const response = await DELETE(`/odata/v4/annotation/MultiSuspendOnDelete('${car.ID}')`);

      expect(response.status).toBe(204);

      const suspendMsgs = findSuspendMessages();
      expect(suspendMsgs.length).toBe(2);

      const cascadeValues = suspendMsgs.map((m: any) => m.data.cascade).sort();
      expect(cascadeValues).toEqual([false, true]);

      suspendMsgs.forEach((m: any) => {
        expect(m.data.businessKey).toBe(car.ID);
      });
    });
  });

  // ================================================
  // Two resumes on DELETE
  // ================================================
  describe('Two resumes on DELETE', () => {
    it('should trigger both resume annotations on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiResumeOnDelete', car);
      foundMessages = [];

      const response = await DELETE(`/odata/v4/annotation/MultiResumeOnDelete('${car.ID}')`);

      expect(response.status).toBe(204);

      const resumeMsgs = findResumeMessages();
      expect(resumeMsgs.length).toBe(2);

      const cascadeValues = resumeMsgs.map((m: any) => m.data.cascade).sort();
      expect(cascadeValues).toEqual([false, true]);

      resumeMsgs.forEach((m: any) => {
        expect(m.data.businessKey).toBe(car.ID);
      });
    });
  });

  // ================================================
  // Two suspends on different events (DELETE + UPDATE)
  // ================================================
  describe('Two suspends on different events (DELETE + UPDATE)', () => {
    it('should trigger only the UPDATE suspend on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiSuspendDiffEvents', car);
      foundMessages = [];

      const response = await PATCH(`/odata/v4/annotation/MultiSuspendDiffEvents('${car.ID}')`, {
        mileage: 200,
      });

      expect(response.status).toBe(200);

      const suspendMsgs = findSuspendMessages();
      expect(suspendMsgs.length).toBe(1);
      expect(suspendMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should trigger only the DELETE suspend on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiSuspendDiffEvents', car);
      foundMessages = [];

      const response = await DELETE(`/odata/v4/annotation/MultiSuspendDiffEvents('${car.ID}')`);

      expect(response.status).toBe(204);

      const suspendMsgs = findSuspendMessages();
      expect(suspendMsgs.length).toBe(1);
      expect(suspendMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });
  });

  // ================================================
  // Two resumes on different events (DELETE + UPDATE)
  // ================================================
  describe('Two resumes on different events (DELETE + UPDATE)', () => {
    it('should trigger only the UPDATE resume on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiResumeDiffEvents', car);
      foundMessages = [];

      const response = await PATCH(`/odata/v4/annotation/MultiResumeDiffEvents('${car.ID}')`, {
        mileage: 200,
      });

      expect(response.status).toBe(200);

      const resumeMsgs = findResumeMessages();
      expect(resumeMsgs.length).toBe(1);
      expect(resumeMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should trigger only the DELETE resume on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiResumeDiffEvents', car);
      foundMessages = [];

      const response = await DELETE(`/odata/v4/annotation/MultiResumeDiffEvents('${car.ID}')`);

      expect(response.status).toBe(204);

      const resumeMsgs = findResumeMessages();
      expect(resumeMsgs.length).toBe(1);
      expect(resumeMsgs[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });
  });
});
