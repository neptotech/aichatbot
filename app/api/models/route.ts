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
    const models = (data.models || [])
      .filter((model: any) =>
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes('generateContent')
      )
      .map((model: any) => {
        const name = String(model.name || '').replace(/^models\//, '');
        return {
          id: name,
          name,
          displayName: model.displayName || name,
          description: model.description || ''
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

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
