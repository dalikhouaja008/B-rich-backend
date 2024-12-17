import { Test, TestingModule } from '@nestjs/testing';
import { OrcaController } from './orca.controller';
import { OrcaService } from './orca.service';

describe('OrcaController', () => {
  let controller: OrcaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrcaController],
      providers: [OrcaService],
    }).compile();

    controller = module.get<OrcaController>(OrcaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
