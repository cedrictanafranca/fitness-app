import { callStructured } from '../../../server/anthropic';
import { errorResponse, json, parseBody, ApiError } from '../../../server/http';
import { ANALYZE_MEAL_SYSTEM, buildAnalyzeMealUserText } from '../../../server/prompts';
import { sanitizeAnalyzedMeal } from '../../../server/sanitize';
import { analyzeMealRequestSchema, analyzedMealSchema } from '../../../server/schemas';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseBody(request, analyzeMealRequestSchema);
    if (!body.imageBase64 && !body.text?.trim()) {
      throw new ApiError(400, 'Invalid request: provide a photo or a description.');
    }
    const meal = await callStructured({
      system: ANALYZE_MEAL_SYSTEM,
      text: buildAnalyzeMealUserText(body),
      image: body.imageBase64
        ? { base64: body.imageBase64, mimeType: body.imageMimeType ?? 'image/jpeg' }
        : undefined,
      schema: analyzedMealSchema,
    });
    return json(analyzedMealSchema.parse(sanitizeAnalyzedMeal(meal, body)));
  } catch (err) {
    return errorResponse(err);
  }
}
