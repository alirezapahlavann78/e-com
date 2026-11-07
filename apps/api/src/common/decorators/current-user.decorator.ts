import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type AuthUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  permissions: string[];
};

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  return request.user;
});
