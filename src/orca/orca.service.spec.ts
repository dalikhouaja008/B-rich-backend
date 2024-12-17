import { Test, TestingModule } from '@nestjs/testing';
import { OrcaService } from './orca.service';

describe('OrcaService', () => {
  let service: OrcaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrcaService],
    }).compile();

    service = module.get<OrcaService>(OrcaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
