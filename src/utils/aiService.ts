
// AI service for code analysis and generation

// Gemini API integration for code analysis
export async function analyzeWithGemini(code: string, language: string, userSkillLevel: string): Promise<any[]> {
  try {
    const GEMINI_API_KEY = "AIzaSyDdu5gj6baE7Q3ZEsUVnXfx4Zv-IsepZzI"; // This is a dummy API key
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    
    // Construct the prompt for Gemini
    const prompt = `
      Analyze this ${language} code and identify educational opportunities where I should blank out code to create a fill-in-the-blank exercise.
      For a ${userSkillLevel} level developer, identify 3-5 important concepts or patterns that would be educational to blank out.
      
      For each blank, provide:
      1. The line number
      2. The start and end character positions
      3. A title for the concept
      4. Documentation explaining the concept
      5. Logic explaining why this code works this way
      6. An example of similar usage
      
      Code to analyze:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Return the analysis as a JSON array of objects with this structure:
      [
        {
          "lineNumber": number,
          "start": number,
          "end": number,
          "hint": {
            "title": string,
            "docs": string,
            "logic": string,
            "example": string
          }
        }
      ]
    `;
    
    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract and parse the JSON response from Gemini
    let jsonResult;
    try {
      const textResponse = data.candidates[0].content.parts[0].text;
      // Find the JSON part in the response (it might be wrapped in markdown code blocks)
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      return [];
    }
    
    return jsonResult || [];
    
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Return empty array to fall back to regex approach
    return [];
  }
}

// Use Gemini API to retrieve more accurate documentation
export async function retrieveDocsFromGemini(feature: string, language: string): Promise<any> {
  try {
    const GEMINI_API_KEY = "AIzaSyDdu5gj6baE7Q3ZEsUVnXfx4Zv-IsepZzI"; // This is a dummy API key
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    
    const prompt = `
      Provide concise documentation for the "${feature}" feature in ${language}.
      Return a JSON object with this structure:
      {
        "syntax": "The syntax pattern for this feature",
        "description": "A concise description of how this feature works and when to use it",
        "docs_link": "A URL to the official documentation"
      }
    `;
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract and parse the JSON response
    let jsonResult;
    try {
      const textResponse = data.candidates[0].content.parts[0].text;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      return null;
    }
    
    return jsonResult;
    
  } catch (error) {
    console.error("Error calling Gemini API for documentation:", error);
    return null;
  }
}

// Generate code using Gemini API
export async function generateWithGemini(prompt: string, language: string): Promise<string | null> {
  try {
    const GEMINI_API_KEY = "AIzaSyDdu5gj6baE7Q3ZEsUVnXfx4Zv-IsepZzI"; // This is a dummy API key
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    
    const apiPrompt = `
      Generate ${language} code based on this request: "${prompt}"
      
      Requirements:
      - Code should be well-commented
      - Include example usage
      - Follow best practices for ${language}
      - Be concise but complete
      
      Return only the code, no explanations before or after.
    `;
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: apiPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract code from the response (remove any markdown code blocks)
    const codeResult = generatedText.replace(/```[\w]*\n/g, '').replace(/```$/g, '');
    
    return codeResult;
    
  } catch (error) {
    console.error("Error calling Gemini API for code generation:", error);
    return null;
  }
}
