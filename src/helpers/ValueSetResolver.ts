import { R4 } from '@ahryman40k/ts-fhir-types';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class ValueSetResolver {
  protected apiKey: string;
  protected instance: AxiosInstance;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.instance = axios.create({
      headers: {
        'Accept': 'application/fhir+json',
        'Authorization': `Basic ${this.generateAuthHeaderValue()}`
      },
      timeout: 1000,
      withCredentials: true
    });
  }

  private generateAuthHeaderValue():string {
    const buff = Buffer.from(`apikey:${this.apiKey}`);
    return buff.toString('base64');
  }

  async getExpansionForValuesetUrls(urls: string[]): Promise<R4.IValueSet[]> {
    const results = await Promise.all(
      urls.map((url) => {
        return this.instance.get<R4.IValueSet>(`${url}/$expand`);
      })
    );
    return results.map(r => r.data);
  }

}