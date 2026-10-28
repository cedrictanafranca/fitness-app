import { callStructured } from '../../../server/anthropic';
import { errorResponse, json, parseBody } from '../../../server/http';
import { EXTRACT_RECIPE_SYSTEM } from '../../../server/prompts';
import { sanitizeRecipe } from '../../../server/sanitize';
import { extractRecipeRequestSchema, extractedRecipeSchema } from '../../../server/schemas';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseBody(request, extractRecipeRequestSchema);
    const recipe = await callStructured({
      system: EXTRACT_RECIPE_SYSTEM,
      text: `Recipe description:\n${body.text.trim() || '(none; see photo)'}${body.imageBase64 ? '\n\nA photo is attached.' : ''}`,
      image: body.imageBase64
        ? { base64: body.imageBase64, mimeType: body.imageMimeType ?? 'image/jpeg' }
        : undefined,
      schema: extractedRecipeSchema,
    });
    return json(extractedRecipeSchema.parse(sanitizeRecipe(recipe)));
  } catch (err) {
    return errorResponse(err);
  }
}
