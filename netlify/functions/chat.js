const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        `Anthropic API error (status ${response.status}):`,
        JSON.stringify(data)
      );
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("chat.js exception:", error.message || error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message || "Error interno del servidor" }),
    };
  }
};
