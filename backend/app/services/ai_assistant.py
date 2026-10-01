from app.core.config import settings
from app.core.database import db
from app.services.weather_service import weather_service
from app.services.ai_providers.factory import get_ai_provider
from typing import Dict, Any, List, Optional
import json
import logging
from datetime import datetime, timezone
from bson import ObjectId

logger = logging.getLogger(__name__)

class AIAssistantService:
    async def classify_intent(self, message: str) -> str:
        m = message.lower().strip()
        
        # Weather intent keywords (English + Tamil)
        weather_keywords = [
            "weather", "rain", "temperature", "climate", "forecast", 
            "irrigate", "irrigation", "sunny", "humid", "storm",
            "வானிலை", "மழை", "வெப்பநிலை", "வெயில்", "ஈரப்பதம்"
        ]
        if any(kw in m for kw in weather_keywords):
            return "weather"

        # Finance intent keywords (English + Tamil)
        finance_keywords = [
            "profit", "loss", "spend", "spent", "spending", "expense", "expenses",
            "cost", "income", "revenue", "budget", "financial", "finance", "money",
            "செலவு", "வருமானம்", "லாபம்", "பணம்", "கணக்கு"
        ]
        if any(kw in m for kw in finance_keywords):
            return "finance"

        # Crop intent keywords (English + Tamil)
        crop_keywords = [
            "crop", "crops", "harvest", "yield", "growing", "planted", 
            "variety", "paddy", "wheat", "corn", "seed",
            "பயிர்", "விளைச்சல்", "அறுவடை", "விதை"
        ]
        if any(kw in m for kw in crop_keywords):
            return "crop_data"

        # Livestock intent keywords (English + Tamil)
        livestock_keywords = [
            "cow", "cows", "livestock", "animal", "animals", "milk", "egg", "eggs",
            "cattle", "goat", "sheep", "poultry", "chicken", "feed", "vaccin", 
            "veterinary", "treatment", "vet",
            "மாடு", "கால்நடை", "பால்", "ஆடு", "கோழி", "தடுப்பூசி", "மருத்துவம்"
        ]
        if any(kw in m for kw in livestock_keywords):
            return "livestock_data"

        # Farm / Field intent keywords (English + Tamil)
        farm_keywords = [
            "farm", "farms", "field", "fields", "acreage", "land", "soil", "location",
            "பண்ணை", "நிலம்", "தோட்டம்", "மண்"
        ]
        if any(kw in m for kw in farm_keywords):
            return "farm_data"

        return "general"

    async def get_farm_data(self, user_id: str) -> Dict[str, Any]:
        """Fetch farms and associated fields for the authenticated user only."""
        farms = await db.farms.find({"user_id": user_id}).to_list(length=100)
        fields = await db.fields.find({"user_id": user_id}).to_list(length=200)

        farm_map = {}
        for f in farms:
            f_id = str(f["_id"])
            farm_map[f_id] = {
                "id": f_id,
                "name": f.get("name", "Unnamed Farm"),
                "location": f.get("location", "Not specified"),
                "total_area": f.get("total_area", 0),
                "area_unit": f.get("area_unit", "acres"),
                "fields": []
            }

        for fld in fields:
            parent_farm = str(fld.get("farm_id", ""))
            if parent_farm in farm_map:
                farm_map[parent_farm]["fields"].append({
                    "name": fld.get("name", "Unnamed Field"),
                    "area": fld.get("area", 0),
                    "soil_type": fld.get("soil_type", "Unknown")
                })

        return {
            "total_farms": len(farms),
            "farms": list(farm_map.values())
        }

    async def get_crop_data(self, user_id: str) -> Dict[str, Any]:
        """Fetch crops belonging strictly to the authenticated user."""
        crops = await db.crops.find({"user_id": user_id}).to_list(length=100)
        
        growing = []
        harvested = []
        planned = []
        
        for c in crops:
            status = str(c.get("status", "unknown")).lower()
            crop_name = c.get("crop_type") or c.get("name") or c.get("variety") or "Crop"
            item = {
                "name": crop_name,
                "crop_type": c.get("crop_type", c.get("variety", "Standard")),
                "variety": c.get("variety", ""),
                "status": status,
                "area": c.get("area", 0),
                "planting_date": str(c.get("planting_date") or c.get("sowing_date") or ""),
                "expected_harvest_date": str(c.get("expected_harvest_date", "")),
            }
            if status in ["growing", "vegetative", "flowering", "ripening", "germination", "active"]:
                growing.append(item)
            elif status in ["harvested", "sold"]:
                harvested.append(item)
            else:
                planned.append(item)

        return {
            "total_crops": len(crops),
            "growing_crops_count": len(growing),
            "growing_crops": growing,
            "planned_crops": planned,
            "harvested_crops": harvested
        }

    async def get_finance_data(self, user_id: str) -> Dict[str, Any]:
        """Fetch finances and compute aggregations strictly for the authenticated user."""
        expenses = await db.expenses.find({"user_id": user_id}).to_list(length=300)
        incomes = await db.income.find({"user_id": user_id}).to_list(length=300)
        farms = await db.farms.find({"user_id": user_id}).to_list(length=100)
        farm_names = {str(f["_id"]): f.get("name", "Unnamed Farm") for f in farms}

        now = datetime.now(timezone.utc)
        current_year = now.year
        current_month = now.month

        total_expenses = 0.0
        expenses_this_month = 0.0
        expenses_by_category: Dict[str, float] = {}
        expenses_by_farm: Dict[str, float] = {}

        for e in expenses:
            amt = float(e.get("amount", 0.0))
            total_expenses += amt
            
            # Category breakdown
            cat = str(e.get("category", "General")).title()
            expenses_by_category[cat] = expenses_by_category.get(cat, 0.0) + amt

            # Farm breakdown
            f_id = str(e.get("farm_id", "unassigned"))
            f_name = farm_names.get(f_id, "General / Unassigned")
            expenses_by_farm[f_name] = expenses_by_farm.get(f_name, 0.0) + amt

            # Check date for this month
            e_date = e.get("expense_date") or e.get("date")
            if e_date:
                if isinstance(e_date, datetime):
                    if e_date.year == current_year and e_date.month == current_month:
                        expenses_this_month += amt
                elif isinstance(e_date, str):
                    try:
                        parsed = datetime.fromisoformat(e_date.replace("Z", "+00:00"))
                        if parsed.year == current_year and parsed.month == current_month:
                            expenses_this_month += amt
                    except Exception:
                        pass

        total_income = 0.0
        for i in incomes:
            total_income += float(i.get("amount", 0.0))

        net_profit = total_income - total_expenses

        # Identify highest expense farm and category
        highest_farm = max(expenses_by_farm.items(), key=lambda x: x[1])[0] if expenses_by_farm else "None"
        highest_category = max(expenses_by_category.items(), key=lambda x: x[1])[0] if expenses_by_category else "None"

        return {
            "total_expenses": round(total_expenses, 2),
            "expenses_this_month": round(expenses_this_month, 2),
            "total_income": round(total_income, 2),
            "net_profit": round(net_profit, 2),
            "highest_expense_farm": highest_farm,
            "highest_expense_category": highest_category,
            "expenses_by_category": {k: round(v, 2) for k, v in expenses_by_category.items()},
            "expenses_by_farm": {k: round(v, 2) for k, v in expenses_by_farm.items()},
            "recent_expenses": [
                {"category": e.get("category"), "amount": e.get("amount"), "date": str(e.get("expense_date") or e.get("date"))}
                for e in sorted(expenses, key=lambda x: str(x.get("expense_date") or x.get("date", "")), reverse=True)[:5]
            ]
        }

    async def get_livestock_data(self, user_id: str) -> Dict[str, Any]:
        """Fetch livestock and treatments strictly for the authenticated user."""
        livestock = await db.livestock.find({"user_id": user_id}).to_list(length=100)
        vaccinations = await db.vaccinations.find({"user_id": user_id}).to_list(length=100)

        species_count: Dict[str, int] = {}
        animals = []
        for l in livestock:
            species = str(l.get("species", "Livestock")).title()
            species_count[species] = species_count.get(species, 0) + 1
            animals.append({
                "tag_id": l.get("tag_id", "No Tag"),
                "species": species,
                "breed": l.get("breed", "Unknown"),
                "status": l.get("status", "Healthy")
            })

        return {
            "total_animals": len(livestock),
            "species_summary": species_count,
            "animals": animals,
            "pending_vaccinations_count": len([v for v in vaccinations if v.get("status") != "completed"])
        }

    async def get_farm_weather(self, user_id: str, message: str) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Fetch real-time Open-Meteo weather based on actual user farm location."""
        farms = await db.farms.find({"user_id": user_id}).to_list(length=10)
        if not farms:
            return None, "No farms found for this user."

        target_farm = None
        # Check if user mentioned a specific farm
        m = message.lower()
        for f in farms:
            if f.get("name") and f["name"].lower() in m:
                target_farm = f
                break
        
        # Fallback to first farm with a location
        if not target_farm:
            for f in farms:
                if f.get("location") and f["location"].strip():
                    target_farm = f
                    break

        if not target_farm or not target_farm.get("location"):
            return None, "No location specified in your farm records."

        loc = target_farm["location"]
        weather_info = await weather_service.get_weather(loc)
        return weather_info, loc

    async def generate_response(
        self,
        user_id: str,
        message: str,
        intent: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        weather_info = None
        context_sections = []
        weather_err_msg = None

        # Build context securely based on authenticated user_id
        crops_data = None
        finance_data = None
        livestock_data = None
        farm_data = None

        if intent == "weather" or "weather" in message.lower() or "வானிலை" in message:
            weather_info, location_note = await self.get_farm_weather(user_id, message)
            if weather_info:
                curr = weather_info.get("current", {})
                w_summary = (
                    f"Location: {weather_info.get('location')}\n"
                    f"Temperature: {curr.get('temperature_2m')}°C\n"
                    f"Condition: {curr.get('condition', 'N/A')}\n"
                    f"Relative Humidity: {curr.get('relative_humidity_2m')}%\n"
                    f"Precipitation: {curr.get('precipitation')} mm"
                )
                context_sections.append(f"CURRENT WEATHER DATA (from Open-Meteo):\n{w_summary}")
            else:
                weather_err_msg = "I couldn't retrieve current weather data right now."
                context_sections.append(f"WEATHER STATUS: {weather_err_msg} (Details: {location_note})")

            # Also provide crop context if question relates to weather impact on crops
            if any(k in message.lower() for k in ["crop", "plant", "harvest", "irrigate", "irrigation", "பயிர்"]):
                crops_data = await self.get_crop_data(user_id)
                context_sections.append("USER CROPS CONTEXT:\n" + json.dumps(crops_data, indent=2))

        elif intent == "finance":
            finance_data = await self.get_finance_data(user_id)
            context_sections.append("USER FINANCIAL CONTEXT:\n" + json.dumps(finance_data, indent=2))

        elif intent == "crop_data":
            crops_data = await self.get_crop_data(user_id)
            context_sections.append("USER CROPS CONTEXT:\n" + json.dumps(crops_data, indent=2))

        elif intent == "livestock_data":
            livestock_data = await self.get_livestock_data(user_id)
            context_sections.append("USER LIVESTOCK CONTEXT:\n" + json.dumps(livestock_data, indent=2))

        elif intent == "farm_data":
            farm_data = await self.get_farm_data(user_id)
            context_sections.append("USER FARMS CONTEXT:\n" + json.dumps(farm_data, indent=2))

        else:
            # General agricultural question or overview
            farm_data = await self.get_farm_data(user_id)
            crops_data = await self.get_crop_data(user_id)
            context_sections.append("USER GENERAL FARM OVERVIEW:\n" + json.dumps({
                "farms": [f["name"] for f in farm_data.get("farms", [])],
                "active_crops": [c["name"] for c in crops_data.get("growing_crops", [])]
            }))

        context_text = "\n\n".join(context_sections)

        system_prompt = (
            "You are AgriFlow AI Assistant, an expert, friendly, and practical farming companion.\n"
            "You provide intelligent agricultural insights, farm guidance, and data summarization.\n\n"
            "MANDATORY INSTRUCTIONS:\n"
            "1. Base answers on the User Farm Data Context provided below whenever relevant.\n"
            "2. If the user asks about specific metrics (e.g. expenses this month, profit, growing crops, farms), use the exact figures from context.\n"
            "3. If requested data is not present in their records, politely explain that it is not yet recorded.\n"
            "4. NEVER invent or hallucinate financial numbers, harvest dates, or weather data.\n"
            "5. If weather data could not be retrieved, clearly state: 'I couldn't retrieve current weather data right now.'\n"
            "6. Support English and Tamil (தமிழ்). If the user asks in Tamil, reply in helpful and natural Tamil. If in English, reply in English.\n"
            "7. Format responses neatly with bullet points or markdown tables where helpful.\n"
            "8. Never expose internal MongoDB IDs (ObjectIds) or raw JSON syntax.\n"
            "9. Always format monetary values in Indian Rupee (₹), never use $ or USD.\n\n"
            f"=== USER FARM DATA CONTEXT ===\n{context_text}"
        )

        provider = get_ai_provider()

        def _generate_deterministic_fallback() -> str:
            msg_lower = message.lower()
            if intent == "farm_data":
                if not farm_data:
                    return "You currently have no farms recorded."
                farms = farm_data.get("farms", [])
                total = len(farms)
                if total == 0:
                    return "You currently have no farms recorded."
                ans = f"You have {total} farm(s):\n\n"
                for i, f in enumerate(farms, 1):
                    ans += f"{i}. {f.get('name', 'Unnamed')} — {f.get('total_area')} {f.get('area_unit', 'acres')}\n"
                ans += "\nYou can open the Farms section to view their fields and crops."
                return ans
            
            if intent == "crop_data":
                if not crops_data:
                    return "You currently have no crops recorded."
                total = crops_data.get("total_crops", 0)
                if total == 0:
                    return "You currently have no crops recorded."
                ans = f"You have {total} crop(s) in total.\n"
                growing = crops_data.get("growing_crops", [])
                if growing:
                    ans += "\nCurrently growing:\n"
                    for c in growing:
                        ans += f"- {c.get('name')} ({c.get('area')} acres)\n"
                return ans

            if intent == "finance":
                if not finance_data:
                    return "I don't have access to your financial records right now."
                if "profit" in msg_lower or "லாபம்" in msg_lower:
                    profit = finance_data.get("net_profit", 0)
                    return f"Your current net profit is ₹{profit:,.2f}.\n(Total Income: ₹{finance_data.get('total_income', 0):,.2f}, Total Expenses: ₹{finance_data.get('total_expenses', 0):,.2f})"
                if "spend" in msg_lower or "spent" in msg_lower or "expense" in msg_lower or "cost" in msg_lower or "செலவு" in msg_lower:
                    exp = finance_data.get("expenses_this_month", 0)
                    return f"You have spent ₹{exp:,.2f} this month. Your total expenses overall are ₹{finance_data.get('total_expenses', 0):,.2f}."
                if "income" in msg_lower or "revenue" in msg_lower or "வருமானம்" in msg_lower:
                    return f"Your total income is ₹{finance_data.get('total_income', 0):,.2f}."
                profit = finance_data.get("net_profit", 0)
                return f"Financial summary:\n- Total Income: ₹{finance_data.get('total_income', 0):,.2f}\n- Total Expenses: ₹{finance_data.get('total_expenses', 0):,.2f}\n- Net Profit: ₹{profit:,.2f}"
            
            if intent == "weather" and weather_info:
                curr = weather_info.get("current", {})
                return f"Current weather in {weather_info.get('location')}:\nTemperature: {curr.get('temperature_2m')}°C\nCondition: {curr.get('condition', 'N/A')}\nHumidity: {curr.get('relative_humidity_2m')}%\nPrecipitation: {curr.get('precipitation')} mm"
            
            if intent == "livestock_data":
                if not livestock_data:
                    return "You currently have no livestock recorded."
                total = livestock_data.get("total_animals", 0)
                if total == 0:
                    return "You currently have no livestock recorded."
                ans = f"You have {total} animal(s).\n"
                summary = livestock_data.get("species_summary", {})
                for k, v in summary.items():
                    ans += f"- {k}: {v}\n"
                return ans

            return None # Return None if no deterministic fallback is suitable

        try:
            answer = await provider.generate_response(
                system_prompt=system_prompt,
                user_prompt=message,
                history=history or []
            )
            return {
                "answer": answer,
                "intent": intent,
                "weather": weather_info
            }
        except RuntimeError as re:
            err_text = str(re)
            fallback = _generate_deterministic_fallback()
            if fallback:
                return {
                    "answer": fallback,
                    "intent": intent,
                    "weather": weather_info,
                    "source": "farmflow_data"
                }

            # Handle specific friendly error messages
            if "Local AI service is not running" in err_text:
                safe_msg = "Local AI service is not running. Please start Ollama and try again."
            elif "configured local AI model is not installed" in err_text:
                safe_msg = "The configured local AI model is not installed. Please install the configured model and try again."
            elif "timed out" in err_text:
                safe_msg = "Local AI service took too long to respond. Please try again shortly."
            elif intent == "weather" and weather_err_msg:
                safe_msg = weather_err_msg
            else:
                safe_msg = err_text

            return {
                "answer": safe_msg,
                "intent": intent,
                "weather": weather_info
            }
        except Exception as e:
            logger.exception("Error generating AI response: %s", str(e))
            fallback = _generate_deterministic_fallback()
            if fallback:
                return {
                    "answer": fallback,
                    "intent": intent,
                    "weather": weather_info,
                    "source": "farmflow_data"
                }
            return {
                "answer": "The AI service is temporarily unavailable. Please try again shortly.",
                "intent": intent,
                "weather": weather_info
            }

ai_assistant_service = AIAssistantService()
