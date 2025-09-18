const fs = require('fs');
const path = require('path');

function normalizeBaseUrl(url) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function uploadToDify(filePath, fileName) {
  const baseUrl = normalizeBaseUrl(process.env.DIFY_BASE_URL);
  const kbId = process.env.DIFY_KB_ID;
  const apiKey = process.env.DIFY_API_KEY;

  if (!baseUrl || !kbId || !apiKey) {
    throw new Error('Missing Dify configuration. Ensure DIFY_BASE_URL, DIFY_KB_ID, and DIFY_API_KEY are set.');
  }

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  await fs.promises.access(absolutePath, fs.constants.R_OK);

  const fileStream = fs.createReadStream(absolutePath);
  const formData = new FormData();
  formData.append('file', fileStream, fileName);

  const response = await fetch(`${baseUrl}/v1/knowledge-bases/${kbId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dify upload failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  if (payload?.data?.id) {
    return payload.data.id;
  }

  if (payload?.id) {
    return payload.id;
  }

  return null;
}

module.exports = {
  uploadToDify,
};
