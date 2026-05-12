import { getInstances, WorkflowStatus } from '../../lib/api/workflow-client';

const SERVICE_URL = 'https://example.sbpa.com';
const JWT = 'test-jwt';
const BASE = `${SERVICE_URL}/public/workflow/rest/v1/workflow-instances`;

function mockFetch(instances: unknown[] = []) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => instances,
  } as Response);
}

function capturedUrl(): string {
  return (global.fetch as jest.Mock).mock.calls[0][0] as string;
}

describe('getInstances – URL building', () => {
  beforeEach(() => mockFetch());

  it('builds URL with no params', async () => {
    await getInstances(SERVICE_URL, JWT, {});
    expect(capturedUrl()).toBe(BASE);
  });

  it('filters by businessKey', async () => {
    await getInstances(SERVICE_URL, JWT, { businessKey: 'my-key' });
    expect(capturedUrl()).toContain('businessKey=my-key');
  });

  it('encodes status values', async () => {
    await getInstances(SERVICE_URL, JWT, { status: [WorkflowStatus.RUNNING] });
    expect(capturedUrl()).toContain('status=RUNNING');
    // verify it's encoded (no raw spaces or special chars)
    expect(capturedUrl()).not.toContain('status= ');
  });

  it('filters by single status', async () => {
    await getInstances(SERVICE_URL, JWT, { status: [WorkflowStatus.RUNNING] });
    expect(capturedUrl()).toContain('status=RUNNING');
  });

  it('filters by multiple statuses', async () => {
    await getInstances(SERVICE_URL, JWT, {
      status: [WorkflowStatus.RUNNING, WorkflowStatus.SUSPENDED],
    });
    const url = capturedUrl();
    expect(url).toContain('status=RUNNING');
    expect(url).toContain('status=SUSPENDED');
  });

  it('remaps orderBy to $orderby', async () => {
    await getInstances(SERVICE_URL, JWT, { orderBy: 'startedAt desc' });
    expect(capturedUrl()).toContain('$orderby=startedAt%20desc');
  });

  it('remaps top to $top', async () => {
    await getInstances(SERVICE_URL, JWT, { top: 10 });
    expect(capturedUrl()).toContain('$top=10');
  });

  it('remaps skip to $skip', async () => {
    await getInstances(SERVICE_URL, JWT, { skip: 5 });
    expect(capturedUrl()).toContain('$skip=5');
  });

  it('remaps inlinecount to $inlinecount', async () => {
    await getInstances(SERVICE_URL, JWT, { inlinecount: 'allpages' });
    expect(capturedUrl()).toContain('$inlinecount=allpages');
  });

  it('skips null and undefined params', async () => {
    await getInstances(SERVICE_URL, JWT, { businessKey: null, definitionId: null });
    expect(capturedUrl()).toBe(BASE);
  });

  it('encodes special characters in param values', async () => {
    await getInstances(SERVICE_URL, JWT, { subject: 'hello world & more' });
    expect(capturedUrl()).toContain('subject=hello%20world%20%26%20more');
  });

  it('combines multiple direct params with status', async () => {
    await getInstances(SERVICE_URL, JWT, {
      businessKey: 'bk-1',
      definitionId: 'def-1',
      status: [WorkflowStatus.RUNNING],
      top: 20,
    });
    const url = capturedUrl();
    expect(url).toContain('businessKey=bk-1');
    expect(url).toContain('definitionId=def-1');
    expect(url).toContain('status=RUNNING');
    expect(url).toContain('$top=20');
  });

  it('includes startedFrom and startedUpTo as direct params', async () => {
    await getInstances(SERVICE_URL, JWT, {
      startedFrom: '2024-01-01T00:00:00Z',
      startedUpTo: '2024-12-31T23:59:59Z',
    });
    const url = capturedUrl();
    expect(url).toContain('startedFrom=');
    expect(url).toContain('startedUpTo=');
  });

  it('sends Bearer token in Authorization header', async () => {
    await getInstances(SERVICE_URL, JWT, {});
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers.Authorization).toBe(`Bearer ${JWT}`);
  });

  it('throws on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'Not allowed',
    } as unknown as Response);

    await expect(getInstances(SERVICE_URL, JWT, {})).rejects.toBeDefined();
  });
});
