import { Injectable } from '@nestjs/common';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class PredictionService {

  async predict(inputData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Chemin vers votre script Python
      const pythonScript = path.join(process.cwd(), 'src/prediction/python/predict.py');
      
      // Lancer le processus Python
      const pythonProcess = spawn('python', [
        pythonScript,
        JSON.stringify(inputData),
      ]);

      let result = '';
      let error = '';

      // Récupérer la sortie du script Python
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Erreur Python: ${error}`));
          return;
        }
        try {
          const prediction = JSON.parse(result);
          resolve(prediction);
        } catch (e) {
          reject(new Error('Erreur de parsing du résultat'));
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
