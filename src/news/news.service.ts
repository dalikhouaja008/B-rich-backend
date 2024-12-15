import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NewsService {
  private readonly API_TOKEN = '674c45b8d6c612.53095591';
  private readonly API_URL = 'https://eodhd.com/api/news';

  async getAppleNews() {
    try {
      const response = await axios.get(this.API_URL, {
        params: {
          s: 'AAPL.US',
          offset: 0,
          limit: 10,
          api_token: this.API_TOKEN,
          fmt: 'json'
        }
      });

      return response.data.map(article => ({
        id: article.date,
        title: article.title,
        content: article.content,
        link: article.link,
        date: new Date(article.date).toLocaleDateString()
      }));
    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }
}