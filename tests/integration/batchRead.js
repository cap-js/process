const server = 'http://localhost:4004';
const baseUrl = `${server}/odata/v4/bulk`;

async function getAll() {
  const response = await fetch(`${baseUrl}/StartEntity`, {
    headers: {
      Accept: 'application/json',
    },
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Entities:', JSON.stringify(data, null, 2));
}

getAll().catch(console.error);
