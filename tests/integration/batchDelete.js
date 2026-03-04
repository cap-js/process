const CRLF = '\r\n';
const batchBoundary = 'batch';
const changesetBoundary = 'changeset';
const server = 'http://localhost:4004';
const baseUrl = `${server}/odata/v4/bulk`;

const ids = ['1', '2', '3', '4', '5'];

function buildChangeset(ids) {
  const parts = ids.map((id) => {
    return [
      `--${changesetBoundary}`,
      'Content-Type: application/http',
      'Content-Transfer-Encoding: binary',
      '',
      `DELETE StartEntity(${id}) HTTP/1.1`,
      '',
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
  const changesetBody = buildChangeset(ids);
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
