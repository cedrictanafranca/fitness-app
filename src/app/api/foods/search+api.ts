import { searchRemoteFoods } from '../../../server/foods';
import { ApiError, errorResponse, json } from '../../../server/http';

export async function GET(request: Request): Promise<Response> {
  try {
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) throw new ApiError(400, 'Invalid request: q must be at least 2 characters.');
    if (q.length > 100) throw new ApiError(400, 'Invalid request: q is too long.');
    const candidates = await searchRemoteFoods(q);
    return json({ candidates }, 200, { 'cache-control': 'private, max-age=600' });
  } catch (err) {
    return errorResponse(err);
  }
}
