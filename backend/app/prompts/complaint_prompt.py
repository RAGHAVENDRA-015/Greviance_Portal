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

{{
  "category": "",
  "priority": "",
  "department": "",
  "summary": "",
  "confidence": 0.95
}}

Complaint:
"""

IMAGE_VALIDATION_PROMPT = """
You are strictly validating whether an uploaded image is genuine photographic evidence for a civic complaint.

Complaint category: "{category}"
Complaint description: "{description}"

Analyze the image and respond ONLY with valid JSON, no markdown and no other text.

Return exactly:

{{
  "relevant": true,
  "reason": "short explanation"
}}

Rules:

Mark "relevant": false if ANY of these apply:
- The image is a screenshot (phone, app, website, chat, document, etc.)
- The image is a meme, illustration, drawing, cartoon, or AI-generated image
- The image is a selfie or unrelated personal photo
- The image is blank, extremely blurry, or a solid-color image
- The image does not show real-world physical evidence matching the complaint category and description

Mark "relevant": true ONLY if the image is a genuine real-world photograph that plausibly shows the reported civic issue (for example: a pothole, garbage pile, broken streetlight, water leakage, damaged road, blocked drainage, etc.) consistent with the complaint.

Be strict. If you are uncertain, return:

{{
  "relevant": false,
  "reason": "The image does not provide sufficient evidence for this complaint."
}}
"""