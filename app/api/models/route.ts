export async function GET() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        success: false,
        error: 'Google Generative AI API key is not configured.'
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          error: 'Unable to fetch models right now. Please try again later.'
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const models = (data.models || []).map((model: any) => ({
      name: model.name,
      displayName: model.displayName,
      description: model.description
    }));

    return Response.json({ success: true, models });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: 'We are facing short-term resource shortages. Please try again in a few moments.'
      },
      { status: 503 }
    );
  }
}
