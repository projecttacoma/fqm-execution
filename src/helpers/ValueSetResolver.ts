import { R4 } from '@ahryman40k/ts-fhir-types';
import axios, { AxiosInstance } from 'axios';

export class ValueSetResolver {
  protected apiKey: string;
  public instance: AxiosInstance;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.instance = axios.create({
      headers: {
        Accept: 'application/fhir+json',
        Authorization: `Basic ${this.authHeaderValue()}`
      },
      // Timeout is in ms, not seconds
      timeout: 60_000,
      withCredentials: true
    });
  }

  private authHeaderValue(): string {
    return Buffer.from(`apikey:${this.apiKey}`).toString('base64');
  }

  async getExpansionForValuesetUrls(urls: string[]): Promise<[R4.IValueSet[], string[]]> {
    const valuesets: R4.IValueSet[] = [];
    const errors: string[] = [];

    // Make the actual requests. We use 'for.. of' here because we want to send requests individually
    // to avoid 500 errors on VSAC
    for (const url of urls) {
      // Go through the results and find any that failed.
      // If there are failures, build an error string
      try {
        const res = await this.instance.get<R4.IValueSet>(`${url}/$expand`);
        valuesets.push(res.data);
      } catch (e) {
        errors.push(`Valueset with URL ${url} could not be retrieved. Reason: ${e.message}`);
      }
    }

    // If we couldn't retrieve any valuesets, return and let the user know
    if (errors.length > 0) {
      return [valuesets, errors];
    }

    // Check to make sure we have all the valueset URLs we think we're going to
    const missingValuesets = this.findMissingValuesets(urls, valuesets);
    return [valuesets, missingValuesets];
  }

  findMissingValuesets(missingVSURLs: string[], expansions: R4.IValueSet[]): string[] {
    const stillMissingValuesets: string[] = [...missingVSURLs];
    // remove any valuesets we got from their URLs from the "missing" list
    expansions.forEach(vs => {
      if (vs.url) {
        const index = stillMissingValuesets.indexOf(vs.url);
        if (index > -1) {
          stillMissingValuesets.splice(index, 1);
        }
      }
    });
    return stillMissingValuesets;
  }
}
