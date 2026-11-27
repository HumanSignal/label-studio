const sanityClient = require('@sanity/client');

const client = sanityClient({
  projectId: 'k7elabj6',
  dataset: 'production',
  apiVersion: '2021-03-25',
  token: process.env.SANITY_CREATE_TOKEN,
})

const MAX_BODY_LENGTH = 16 * 1024;

const MAX_LENGTHS = {
  feedback: 5000,
  email: 254,
  pageURL: 2048,
  pageTitle: 500,
};

const badRequest = (message) => ({ statusCode: 400, body: message });

const hostOf = (value) => {
  try {
    return new URL(value).host.toLowerCase();
  } catch (e) {
    return null;
  }
};

// The feedback form only ever posts to its own origin, so a browser request
// carrying an Origin header for a different host is not ours.
const isCrossOrigin = (event) => {
  const headers = event.headers || {};
  const origin = headers.origin;

  if (!origin) return false;

  const originHost = hostOf(origin);
  const ownHosts = [
    headers.host,
    headers["x-forwarded-host"],
    event.rawUrl && hostOf(event.rawUrl),
  ]
    .filter(Boolean)
    .map((host) => host.toLowerCase());

  return !originHost || !ownHosts.includes(originHost);
};

// Returns the trimmed string, null when the field is empty/absent,
// or undefined when the value is not acceptable.
const optionalString = (value, maxLength) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > maxLength) return undefined;

  return value.trim() || null;
};

const parseFeedback = (rawBody) => {
  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return { error: "Invalid JSON" };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Invalid payload" };
  }

  const { helpful, submittedOn } = payload;

  if (helpful !== "yes" && helpful !== "no") {
    return { error: "Invalid field: helpful" };
  }

  if (typeof submittedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(submittedOn)) {
    return { error: "Invalid field: submittedOn" };
  }

  const doc = { "_type": "docsFeedback", helpful, submittedOn };

  for (const field of ["feedback", "email", "pageURL", "pageTitle"]) {
    const value = optionalString(payload[field], MAX_LENGTHS[field]);

    if (value === undefined) return { error: `Invalid field: ${field}` };
    if (value !== null) doc[field] = value;
  }

  if (!doc.pageURL || !/^https?:\/\//i.test(doc.pageURL) || !hostOf(doc.pageURL)) {
    return { error: "Invalid field: pageURL" };
  }

  if (doc.email && !/^[^\s@]+@[^\s@]+$/.test(doc.email)) {
    return { error: "Invalid field: email" };
  }

  return { doc };
};

const handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (isCrossOrigin(event)) {
    return { statusCode: 403, body: "Forbidden" };
  }

  if (typeof event.body !== "string" || !event.body) {
    return badRequest("Invalid JSON");
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  if (rawBody.length > MAX_BODY_LENGTH) {
    return { statusCode: 413, body: "Payload Too Large" };
  }

  const { doc, error } = parseFeedback(rawBody);

  if (error) {
    return badRequest(error);
  }

  try {
    await client.create(doc);

    return { statusCode: 200 };
  } catch (e) {
    console.error("Failed to store docs feedback:", e && e.message);

    return { statusCode: 500, body: "Internal Server Error" };
  }
}

module.exports = { handler }
