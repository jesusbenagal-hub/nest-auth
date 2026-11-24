import type { DynamicModule, Type } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";

/**
 * A Nest app like an API that uses the package: NestAuthModule (from
 * forRoot or forRootAsync) and the test's controllers, ready for
 * `app.inject`.
 */
export async function createTestApp(
  authModule: DynamicModule,
  controllers: Type[],
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [authModule],
    controllers,
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
