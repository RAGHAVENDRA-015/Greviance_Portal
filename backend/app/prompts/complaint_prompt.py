"""
Prompt templates for Gemini AI complaint classification.

Stored separately from service logic for:
- Easy iteration without touching service code
- A/B testing different prompt versions
- Future multi-prompt support (sentiment, translation, suggestions)
"""

COMPLAINT_CLASSIFICATION_PROMPT = """
You are an AI assistant for a Government Citizen Grievance Portal.

Your job is to analyze a citizen complaint and return ONLY valid JSON.

Classify the complaint into one of these categories:

- Water Supply
- Roads
- Electricity
- Garbage
- Drainage
- Public Safety
- Health
- Corruption
- Other

Priority:

- Low
- Medium
- High

Assign one department based on the complaint category and context.

Generate a concise one-sentence summary of the complaint.

Return JSON in exactly this format (no markdown, no explanation):

{
  "category": "",
  "priority": "",
  "department": "",
  "summary": "",
  "confidence": 0.95
}

Complaint:
"""

IMAGE_VALIDATION_PROMPT = """You are strictly validating whether an uploaded image is genuine photographic evidence for a civic complaint.

Complaint category: \"{category}\"
Complaint description: \"{description}\"

Analyze the image and respond ONLY with JSON, no other text:
{"relevant": true or false, "reason": "short explanation"}

Mark relevant:false if ANY of these apply:
- The image is a screenshot (of a phone, app, website, chat, document, etc.)
- The image is a meme, illustration, drawing, or AI-generated image
- The image is a selfie or unrelated personal photo
- The image is blank, blurry beyond recognition, or a solid color
- The image does not show real-world physical evidence matching the complaint category and description

Mark relevant:true ONLY if the image is a genuine real-world photograph that plausibly shows the issue described (e.g., an actual pothole, actual garbage pile, actual broken streetlight, actual water leakage, etc. matching the category).

Be strict. When in doubt, mark false.
"""

