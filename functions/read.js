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
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0].replace(/-/g, "");
    return new Response(
      JSON.stringify([
        {
          name: "Drink Water Daily",
          color: "blue",
          completed: { [formattedDate]: 1 },
        },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
