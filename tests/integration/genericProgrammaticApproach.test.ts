/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { POST } = cds.test(app);

const DEFINITION_ID = 'eu12.cdsmunich.capprocesspluginhybridtest.programmatic_Lifecycle_Process';

describe('Generic ProcessService Integration Tests', () => {
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
    // Wait for background jobs spawned by outbox processing to complete before Jest teardown
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  function generateID(): string {
    return cds.utils.uuid();
  }

  async function genericStart(businessKey: string, context?: Record<string, unknown>) {
    const startContext = context ?? { ID: businessKey };
    return POST('/odata/v4/programmatic/genericStart', {
      definitionId: DEFINITION_ID,
      businessKey,
      context: JSON.stringify(startContext),
    });
  }

  async function genericCancel(businessKey: string, cascade = false) {
    return POST('/odata/v4/programmatic/genericCancel', {
      businessKey,
      cascade,
    });
  }

  async function genericSuspend(businessKey: string, cascade = false) {
    return POST('/odata/v4/programmatic/genericSuspend', {
      businessKey,
      cascade,
    });
  }

  async function genericResume(businessKey: string, cascade = false) {
    return POST('/odata/v4/programmatic/genericResume', {
      businessKey,
      cascade,
    });
  }

  describe('Process Start Event', () => {
    it('should emit a start event to the outbox', async () => {
      const businessKey = generateID();
      const response = await genericStart(businessKey);

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('start');
    });

    it('should include definitionId in the start event payload', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe(DEFINITION_ID);
    });

    it('should include the businessKey as context ID in the start event', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context.ID).toEqual(businessKey);
    });

    it('should emit separate start events for multiple processes', async () => {
      const keyA = generateID();
      const keyB = generateID();

      await genericStart(keyA);
      await genericStart(keyB);

      expect(foundMessages.length).toBe(2);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('start');
      expect(foundMessages[0].data.context.ID).toEqual(keyA);
      expect(foundMessages[1].data.context.ID).toEqual(keyB);
    });
  });

  describe('Process Cancel Event', () => {
    it('should emit a cancel event to the outbox', async () => {
      const businessKey = generateID();
      const response = await genericCancel(businessKey);

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data.businessKey).toEqual(businessKey);
    });

    it('should include cascade=false by default in cancel payload', async () => {
      const businessKey = generateID();
      await genericCancel(businessKey);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.cascade).toBe(false);
    });
  });

  describe('Process Suspend Event', () => {
    it('should emit a suspend event to the outbox', async () => {
      const businessKey = generateID();
      const response = await genericSuspend(businessKey);

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data.businessKey).toEqual(businessKey);
    });

    it('should include cascade=false by default in suspend payload', async () => {
      const businessKey = generateID();
      await genericSuspend(businessKey);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.cascade).toBe(false);
    });
  });

  describe('Process Resume Event', () => {
    it('should emit a resume event to the outbox', async () => {
      const businessKey = generateID();
      const response = await genericResume(businessKey);

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data.businessKey).toEqual(businessKey);
    });

    it('should include cascade=false by default in resume payload', async () => {
      const businessKey = generateID();
      await genericResume(businessKey);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.cascade).toBe(false);
    });
  });

  describe('Sequential lifecycle operations', () => {
    it('should emit start, suspend, and resume events in order', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);
      await genericSuspend(businessKey);
      await genericResume(businessKey);

      expect(foundMessages.length).toBe(3);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('suspend');
      expect(foundMessages[2].event).toBe('resume');
    });

    it('should emit start then cancel events in order', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);
      await genericCancel(businessKey);

      expect(foundMessages.length).toBe(2);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('cancel');
      expect(foundMessages[0].data.context.ID).toEqual(businessKey);
      expect(foundMessages[1].data.businessKey).toEqual(businessKey);
    });

    it('should emit start, suspend, resume, and cancel events in order', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);
      await genericSuspend(businessKey);
      await genericResume(businessKey);
      await genericCancel(businessKey);

      expect(foundMessages.length).toBe(4);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('suspend');
      expect(foundMessages[2].event).toBe('resume');
      expect(foundMessages[3].event).toBe('cancel');
    });
  });

  describe('Custom context in start event', () => {
    it('should pass custom context through to the outbox message', async () => {
      const businessKey = generateID();
      const customContext = { ID: businessKey, customField: 'customValue', number: 42 };

      await genericStart(businessKey, customContext);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[0].data.context.customField).toEqual('customValue');
      expect(foundMessages[0].data.context.number).toEqual(42);
    });
  });
});
