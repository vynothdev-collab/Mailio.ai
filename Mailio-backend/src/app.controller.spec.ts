import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    })
      .overrideProvider(getDataSourceToken())
      .useValue({ isInitialized: true })
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return ok status', async () => {
      const result = await appController.health();
      expect(result.status).toBe('ok');
    });
  });
});
