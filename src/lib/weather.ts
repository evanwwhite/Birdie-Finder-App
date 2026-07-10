// Open-Meteo course conditions with graceful fallback (same API as the web app).
export type Weather = { tempF: number; sky: string; windMph: number; rain24In: number };

const CODES: Record<number, string> = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 51: 'Drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Snow', 80: 'Showers', 95: 'Thunderstorm',
};

export async function fetchWeather(lat: number, lng: number): Promise<Weather | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code,wind_speed_10m&daily=precipitation_sum` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=1`,
      { signal: ctl.signal }
    );
    clearTimeout(t);
    const j = await res.json();
    return {
      tempF: Math.round(j.current.temperature_2m),
      sky: CODES[j.current.weather_code] ?? 'Fair',
      windMph: Math.round(j.current.wind_speed_10m),
      rain24In: j.daily?.precipitation_sum?.[0] ?? 0,
    };
  } catch {
    return null; // graceful fallback — UI shows "Conditions unavailable offline"
  }
}
