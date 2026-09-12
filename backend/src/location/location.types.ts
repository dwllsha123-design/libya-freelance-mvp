export type ResolvedLocation = {
  countryCode: string;
  country: string;
  city: string;
  region: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  source: 'IP' | 'HEADER' | 'TIMEZONE' | 'DEFAULT' | 'MANUAL' | 'PROFILE';
};

export type IpLookupResult = {
  countryCode: string;
  country: string;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

export interface IpGeolocationProvider {
  readonly name: string;
  lookup(ip: string): Promise<IpLookupResult | null>;
}

export type PrayerCityOption = {
  countryCode: string;
  country: string;
  countryAr: string;
  city: string;
  cityAr: string;
  latitude: number;
  longitude: number;
  timezone: string;
};
