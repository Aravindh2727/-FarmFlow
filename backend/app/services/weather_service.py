import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

WEATHER_CODE_DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

def decode_weather_code(code: Optional[int]) -> str:
    if code is None:
        return "Unknown"
    return WEATHER_CODE_DESCRIPTIONS.get(int(code), "Variable conditions")

class WeatherService:
    async def get_weather(self, location: str) -> Optional[Dict[str, Any]]:
        if not location or not location.strip():
            return None

        # Geocoding via Open-Meteo
        geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location.strip()}&count=1&language=en&format=json"
        
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                geo_resp = await client.get(geocode_url)
                if geo_resp.status_code != 200:
                    logger.warning("Geocoding failed for '%s': HTTP %s", location, geo_resp.status_code)
                    return None

                geo_data = geo_resp.json()
                results = geo_data.get("results")
                if not results or len(results) == 0:
                    logger.info("No geocoding results found for location: %s", location)
                    return None
                    
                lat = results[0]["latitude"]
                lon = results[0]["longitude"]
                resolved_name = results[0].get("name", location)
                admin1 = results[0].get("admin1", "")
                country = results[0].get("country", "")
                display_location = f"{resolved_name}, {admin1}, {country}".strip(", ")
                
                # Fetch Weather via Open-Meteo
                weather_url = (
                    f"https://api.open-meteo.com/v1/forecast"
                    f"?latitude={lat}&longitude={lon}"
                    f"&current=temperature_2m,relative_humidity_2m,precipitation,weather_code"
                    f"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
                    f"&timezone=auto"
                )
                
                weather_resp = await client.get(weather_url)
                if weather_resp.status_code != 200:
                    logger.warning("Open-Meteo weather fetch failed for '%s': HTTP %s", location, weather_resp.status_code)
                    return None

                weather_data = weather_resp.json()
                current = weather_data.get("current", {})
                daily = weather_data.get("daily", {})
                
                if current and "weather_code" in current:
                    current["condition"] = decode_weather_code(current.get("weather_code"))

                return {
                    "location": display_location or location,
                    "latitude": lat,
                    "longitude": lon,
                    "current": current,
                    "daily": daily
                }
            except Exception as e:
                logger.error("Error fetching weather data for '%s': %s", location, e)
                return None

weather_service = WeatherService()
