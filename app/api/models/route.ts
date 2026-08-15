const PERMANENT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it'
];

export async function GET() {
  return Response.json({
    success: true,
    models: PERMANENT_MODELS.map((model) => ({
      id: model,
      name: model,
      displayName: model,
      description: 'Permanent model option'
    }))
  });
}
