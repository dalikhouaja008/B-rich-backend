import { Injectable } from '@nestjs/common';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class PredictionService {

 async getPredictions(date: string, currencies: string[]) {
    return new Promise((resolve, reject) => {
      const inputData = JSON.stringify({
        date: date,
        currencies: currencies
      });

      const pythonScript = path.join(process.cwd(), 'src/prediction/python/predict.py');

      const pythonProcess = spawn('python', [
        pythonScript,
        inputData,
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(`Python script exited with code ${code}: ${error}`);
        } else {
          try {
            resolve(JSON.parse(result));
          } catch (parseError) {
            reject(`Failed to parse result: ${parseError}`);
          }
        }
      });
    });
  }

  create(createPredictionDto: CreatePredictionDto) {
    return 'This action adds a new prediction';
  }

  findAll() {
    return `This action returns all prediction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} prediction`;
  }

  update(id: number, updatePredictionDto: UpdatePredictionDto) {
    return `This action updates a #${id} prediction`;
  }

  remove(id: number) {
    return `This action removes a #${id} prediction`;
  }
}
