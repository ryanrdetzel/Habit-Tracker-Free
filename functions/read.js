export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { key } = await context.request.json();

  if (!key) {
    return new Response("Bad Request: Missing key", { status: 400 });
  }

  const content = await context.env.DB.get(key);

  if (!content) {
    return new Response(
      JSON.stringify([
        { name: "Drink 2 Glasses Of Water", color: "blue", completed: {} },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
