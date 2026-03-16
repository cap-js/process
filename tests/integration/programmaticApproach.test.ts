/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { test, POST } = cds.test(app);

describe('Programatic Approach Integration Tests', () => {
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

  function generateID(): string {
    return cds.utils.uuid();
  }

  async function startProcess(ID: string) {
    return POST('/odata/v4/programatical/startLifeCycleProcess', { ID });
  }

  describe('Process Start Event', () => {
    it('should emit a start event to the outbox', async () => {
      const ID = generateID();
      const response = await startProcess(ID);

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('start');
    });

    it('should include definitionId in the start event payload', async () => {
      const ID = generateID();
      await startProcess(ID);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBeDefined();
    });

    it('should include the ID in the start event context', async () => {
      const ID = generateID();
      await startProcess(ID);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context.ID).toEqual(ID);
    });

    it('should emit separate start events for multiple processes', async () => {
      const idA = generateID();
      const idB = generateID();

      await startProcess(idA);
      await startProcess(idB);

      expect(foundMessages.length).toBe(2);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('start');
      expect(foundMessages[0].data.context.ID).toEqual(idA);
      expect(foundMessages[1].data.context.ID).toEqual(idB);
    });
  });

  describe('Process Cancel Event', () => {
    it('should emit a cancel event to the outbox', async () => {
      const ID = generateID();
      const response = await POST('/odata/v4/programatical/cancelProcess', { ID });

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data.businessKey).toEqual(ID);
    });

    it('should include cascade=false by default in cancel payload', async () => {
      const ID = generateID();
      await POST('/odata/v4/programatical/cancelProcess', { ID });

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.cascade).toBe(false);
    });
  });

  describe('Process Suspend Event', () => {
    it('should emit a suspend event to the outbox', async () => {
      const ID = generateID();
      const response = await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data.businessKey).toEqual(ID);
    });

    it('should include cascade=false by default in suspend payload', async () => {
      const ID = generateID();
      await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.cascade).toBe(false);
    });
  });

  describe('Process Resume Event', () => {
    it('should emit a resume event to the outbox', async () => {
      const ID = generateID();
      const response = await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'RESUME',
      });

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data.businessKey).toEqual(ID);
    });

    it('should include cascade=false by default in resume payload', async () => {
      const ID = generateID();
      await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'RESUME',
      });

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.cascade).toBe(false);
    });
  });

  describe('Sequential lifecycle operations', () => {
    it('should emit start, suspend, and resume events in order', async () => {
      const ID = generateID();

      await startProcess(ID);
      await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });
      await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'RESUME',
      });

      expect(foundMessages.length).toBe(3);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('suspend');
      expect(foundMessages[2].event).toBe('resume');
    });

    it('should emit start then cancel events in order', async () => {
      const ID = generateID();

      await startProcess(ID);
      await POST('/odata/v4/programatical/cancelProcess', { ID });

      expect(foundMessages.length).toBe(2);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('cancel');
      expect(foundMessages[0].data.context.ID).toEqual(ID);
      expect(foundMessages[1].data.businessKey).toEqual(ID);
    });
  });

  describe('Output Process Start Event', () => {
    async function startOutputProcess(
      ID: string,
      mandetory_date: string,
      mandetory_string: string,
      optional_string?: string,
      optional_date?: string,
    ) {
      return POST('/odata/v4/programatical/startForGetOutputs', {
        ID,
        mandetory_date,
        mandetory_string,
        optional_string,
        optional_date,
      });
    }

    it('should emit a start event with input context to the outbox', async () => {
      const ID = generateID();
      const mandetory_date = new Date().toISOString();
      const mandetory_string = 'test-output-string';

      const response = await startOutputProcess(ID, mandetory_date, mandetory_string);

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[0].data.definitionId).toBeDefined();
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context.ID).toEqual(ID);
      expect(foundMessages[0].data.context.mandetory_date).toEqual(mandetory_date);
      expect(foundMessages[0].data.context.mandetory_string).toEqual(mandetory_string);
    });

    it('should include optional fields in context when provided', async () => {
      const ID = generateID();
      const mandetory_date = new Date().toISOString();
      const mandetory_string = 'test-mandatory';
      const optional_string = 'test-optional';
      const optional_date = new Date().toISOString();

      await startOutputProcess(ID, mandetory_date, mandetory_string, optional_string, optional_date);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[0].data.context.optional_string).toEqual(optional_string);
      expect(foundMessages[0].data.context.optional_date).toEqual(optional_date);
    });
  });
});
