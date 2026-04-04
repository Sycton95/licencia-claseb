export type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export function setJsonHeaders(response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
}

export function sendJson(response: ApiResponse, statusCode: number, body: unknown) {
  setJsonHeaders(response);
  response.status(statusCode).json(body);
}

export function readJsonBody<TBody>(request: ApiRequest): TBody {
  if (!request.body) {
    return {} as TBody;
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as TBody;
  }

  return request.body as TBody;
}

export function getBearerToken(request: ApiRequest) {
  const headerValue = request.headers.authorization;
  const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!normalizedHeader?.startsWith('Bearer ')) {
    return null;
  }

  return normalizedHeader.slice('Bearer '.length).trim() || null;
}
