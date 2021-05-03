import { R4 } from '@ahryman40k/ts-fhir-types';
import axios, { AxiosInstance } from 'axios';

export class ValueSetResolver {
  protected apiKey: string;
  protected instance: AxiosInstance;

  constructor(apiKey: string|undefined) {
    this.apiKey = apiKey || '';
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

  async getExpansionForValuesetUrls(urls: string[]): Promise<[R4.IValueSet[], string[]]> {
    // Make the actual requests. We use 'allSettled' here because we want all the results,
    // whether the requests succeed or fail.
    const results = await Promise.allSettled(
      urls.map((url) => {
        return this.instance.get<R4.IValueSet>(`${url}/$expand`);
      })
    );

    const valuesets: R4.IValueSet[] = [];
    const errors: string[] = [];
    // Go through the results and find any that failed.
    // If there are failures, build an error string
    results.forEach((r) => {
      if (r.status == 'fulfilled') {
        valuesets.push(r.value.data);
      } else {
        errors.push(`Valueset with URL ${r.reason.config.url} could not be retrieved: ${r.reason}`);
      }
    });

    // If we couldn't retrieve any valuesets, return and let the user know
    if (errors.length > 0) {
      return [valuesets, errors];
    }
    
    // See if there are still any valuesets missing (not sure this will ever get hit?)
    const missingValuesets = this.findMissingValuesets(urls, valuesets);
    return [valuesets, missingValuesets];
  }

  findMissingValuesets(missingVSURLs:string[], expansions:R4.IValueSet[]):string[] {
    const stillMissingValuesets:string[] = [];
    // remove any valuesets we got from their URLs from the "missing" list
    expansions.forEach((vs) => {
      if (vs.url) {
        const index = missingVSURLs.indexOf(vs.url);
        if (index > -1) {
          stillMissingValuesets.push(vs.url);
        }
      }
    });
    return stillMissingValuesets;
  }

}