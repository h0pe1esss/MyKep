import cloudscraper
import json
import chompjs
import re

URL = "https://kep.nung.edu.ua/pages/education/schedule"
CLASS_DURATION = 60

def fetch_schedule():
    try:
        scraper = cloudscraper.create_scraper(browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True
        })
        
        response = scraper.get(URL, timeout=15)
        response.raise_for_status()
        html_content = response.text
        
        match = re.search(r'const\s+scheduleData\s*=\s*(\{.*?\})\s*,\s*lessonTimes', html_content, re.DOTALL)
        
        if match:
            js_obj_str = match.group(1)
            schedule_dict = chompjs.parse_js_object(js_obj_str)
            
            final_data = {
                "duration": CLASS_DURATION,
                "schedule": schedule_dict
            }
            
            with open("schedule_data.json", "w", encoding="utf-8") as f:
                json.dump(final_data, f, ensure_ascii=False, indent=4)
                
            return final_data
        return None
            
    except Exception as e:
        return None

if __name__ == "__main__":
    fetch_schedule()