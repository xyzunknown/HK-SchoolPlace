export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json({ data }, { status: 200, ...init });
}

export function jsonCreated(data: unknown) {
  return Response.json({ data }, { status: 201 });
}

export function jsonError(code: string, message: string, status: number) {
  return Response.json(
    {
      error: {
        code,
        message
      }
    },
    { status }
  );
}
