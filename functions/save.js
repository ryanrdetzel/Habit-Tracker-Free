export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const clientIP =
    context.request.headers.get("CF-Connecting-IP") || "anonymous";
  const currentTime = Date.now();
  const rateLimitKey = `rate-limit-${clientIP}`;
  const rateLimitData = await context.env.DB.get(rateLimitKey);

  const rateLimitWindow = 60 * 1000; // 1 minute window
  const maxRequests = 25; // Max  requests per minute
  let requestCount = 0;

  if (rateLimitData) {
    const parsedData = JSON.parse(rateLimitData);
    if (currentTime - parsedData.timestamp < rateLimitWindow) {
      requestCount = parsedData.count;
      if (requestCount >= maxRequests) {
        return new Response("Rate Limit Exceeded", { status: 429 });
      }
    }
  }

  requestCount++;
  await context.env.DB.put(
    rateLimitKey,
    JSON.stringify({ count: requestCount, timestamp: currentTime })
  );

  const { key, content } = await context.request.json();

  if (!key || !content) {
    return new Response("Bad Request: Missing key or content", { status: 400 });
  }

  await context.env.DB.put(key, JSON.stringify(content));
  return new Response("Data stored successfully!", { status: 200 });
}
