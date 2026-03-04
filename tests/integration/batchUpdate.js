const CRLF = '\r\n';
const batchBoundary = 'batch';
const changesetBoundary = 'changeset';
const server = 'http://localhost:4004';
const baseUrl = `${server}/odata/v4/bulk`;

const shipments = [
  { ID: '1', name: 'Shipment 1 Updated' },
  { ID: '2', name: 'Shipment 2 Updated' },
  { ID: '3', name: 'Shipment 3 Updated' },
  { ID: '4', name: 'Shipment 4 Updated' },
  { ID: '5', name: 'Shipment 5 Updated' },
];

function buildChangeset(items) {
  const parts = items.map((item) => {
    const { ID, ...patch } = item;
    const body = JSON.stringify(patch);
    return [
      `--${changesetBoundary}`,
      'Content-Type: application/http',
      'Content-Transfer-Encoding: binary',
      '',
      `PATCH StartEntity(${ID}) HTTP/1.1`,
      'Content-Type: application/json',
      `Content-Length: ${Buffer.byteLength(body)}`,
      '',
      body,
    ].join(CRLF);
  });

  return [...parts, `--${changesetBoundary}--`].join(CRLF);
}

function buildBatchBody(changesetBody) {
  return [
    `--${batchBoundary}`,
    `Content-Type: multipart/mixed; boundary=${changesetBoundary}`,
    '',
    changesetBody,
    `--${batchBoundary}--`,
    '',
  ].join(CRLF);
}

async function sendBatch() {
  const changesetBody = buildChangeset(shipments);
  const batchBody = buildBatchBody(changesetBody);

  const response = await fetch(`${baseUrl}/$batch`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/mixed; boundary=${batchBoundary}`,
    },
    body: batchBody,
  });

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}

sendBatch().catch(console.error);
