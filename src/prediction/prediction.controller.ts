import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';


export interface DatePredictionInput {
  day: number;
  month: number;
  year: number;
}

export interface PredictionResult {
  predicted_value: number;
}
@Controller('prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Post('/create-prediction')
  async predict(@Body() inputData: DatePredictionInput): Promise<PredictionResult> {
    return await this.predictionService.predict(inputData);
  }

  @Post()
  create(@Body() createPredictionDto: CreatePredictionDto) {
    return this.predictionService.create(createPredictionDto);
  }

  @Get()
  findAll() {
    return this.predictionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.predictionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePredictionDto: UpdatePredictionDto) {
    return this.predictionService.update(+id, updatePredictionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.predictionService.remove(+id);
  }
}
